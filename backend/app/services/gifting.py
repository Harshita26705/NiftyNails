"""Gift recommendations that only use real products and never exceed the budget."""

import itertools
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.attribute_parser import AttributeParser
from app.ml.text import tokenize
from app.ml.vocabulary import Vocabulary
from app.models import GiftBundle, GiftItem
from app.schemas.ai import GiftBundleOptionOut, GiftLineOut, GiftRequestIn
from app.services.catalog import active_products, product_to_out
from app.services.matching import rank_products

# How much each add-on type contributes to a "complete" gift.
TYPE_VALUE = {"box": 3.0, "card": 2.2, "care": 2.0, "accessory": 1.4, "packaging": 1.0}
TYPE_LIMIT = {"box": 1, "card": 1, "care": 1, "accessory": 2, "packaging": 1}


@dataclass
class _Candidate:
    item: GiftItem
    value: float


def _interest_terms(req: GiftRequestIn) -> set[str]:
    text = " ".join([req.description, req.occasion or "", req.style or "", req.relationship or "",
                     *req.interests, *req.favourite_colours, req.nail_preferences or ""])
    return set(tokenize(text))


def _score_items(items: list[GiftItem], terms: set[str]) -> list[_Candidate]:
    out = []
    for item in items:
        tags = set(tokenize(" ".join(item.tags or [])))
        overlap = len(tags & terms)
        out.append(_Candidate(item, TYPE_VALUE.get(item.item_type, 1.0) * (1 + 0.35 * overlap)))
    return out


def _best_addons(cands: list[_Candidate], budget_left: int) -> tuple[list[_Candidate], float]:
    """Exhaustive search over one-per-type choices (small catalogues) → best value within budget."""
    by_type: dict[str, list[_Candidate]] = {}
    for c in sorted(cands, key=lambda c: -c.value):
        by_type.setdefault(c.item.item_type, []).append(c)
    choices_per_type = []
    for t, group in by_type.items():
        group = group[:5]
        limit = TYPE_LIMIT.get(t, 1)
        options: list[tuple[_Candidate, ...]] = [()]
        for n in range(1, limit + 1):
            options += list(itertools.combinations(group, n))
        choices_per_type.append(options)

    best: tuple[list[_Candidate], float, int] = ([], 0.0, 0)
    for combo in itertools.product(*choices_per_type) if choices_per_type else [()]:
        chosen = [c for group in combo for c in group]
        cost = sum(c.item.price_paise for c in chosen)
        if cost > budget_left:
            continue
        value = sum(c.value for c in chosen)
        # Prefer higher value; on ties prefer spending less.
        if value > best[1] or (value == best[1] and cost < best[2]):
            best = (chosen, value, cost)
    return best[0], best[1]


def recommend_gifts(db: Session, req: GiftRequestIn) -> tuple[list[GiftBundleOptionOut], str | None]:
    budget = req.budget_rupees * 100
    vocab = Vocabulary.from_db(db)
    query_text = " ".join([req.description, *req.favourite_colours, req.style or "", req.occasion or "",
                           *req.interests, req.nail_preferences or ""])
    parsed = AttributeParser(vocab).parse(query_text)
    parsed.price_max_paise = None  # budget is handled for the whole bundle below
    parsed.price_min_paise = None

    products = [p for p in active_products(db) if p.price_paise <= budget]
    if not products:
        cheapest = min((p.price_paise for p in active_products(db)), default=None)
        hint = f" Our nail sets start at ₹{cheapest // 100:,}." if cheapest else ""
        return [], f"That budget is a little under our smallest gift.{hint}"

    ranked = rank_products(db, products, query_text, parsed, vocab, limit=6, min_score=0.0)
    items = list(db.scalars(select(GiftItem).where(GiftItem.is_active.is_(True), GiftItem.stock > 0)))
    terms = _interest_terms(req)
    candidates = _score_items(items, terms)

    options: list[GiftBundleOptionOut] = []
    seen_products: set[int] = set()
    for scored in ranked:
        p = scored.product
        if p.id in seen_products:
            continue
        addons, _ = _best_addons(candidates, budget - p.price_paise)
        lines = [GiftLineOut(kind="product", id=p.id, name=p.name, price_paise=p.price_paise, item_type="nail_set")]
        lines += [
            GiftLineOut(kind="gift_item", id=c.item.id, name=c.item.name, price_paise=c.item.price_paise,
                        item_type=c.item.item_type, personalisable=c.item.is_personalisable)
            for c in sorted(addons, key=lambda c: list(TYPE_VALUE).index(c.item.item_type))
        ]
        total = sum(line.price_paise for line in lines)
        reasons = scored.matched[:4] or ["a crowd-pleasing bestseller"]
        options.append(GiftBundleOptionOut(
            title=["Our top pick", "Also lovely", "Another idea"][len(options)],
            product=product_to_out(p),
            lines=lines,
            total_paise=total,
            budget_left_paise=budget - total,
            match_percent=scored.percent,
            reasons=reasons,
        ))
        seen_products.add(p.id)
        if len(options) == 3:
            break

    # Curated bundles that fit the budget and share interests are offered too.
    for bundle in db.scalars(select(GiftBundle).where(GiftBundle.is_active.is_(True))):
        if bundle.price_paise > budget or not (set(tokenize(" ".join(bundle.tags))) & terms):
            continue
        if bundle.product and bundle.product.id in seen_products:
            continue
        lines = []
        if bundle.product:
            lines.append(GiftLineOut(kind="product", id=bundle.product.id, name=bundle.product.name,
                                     price_paise=bundle.product.price_paise, item_type="nail_set"))
        lines += [GiftLineOut(kind="gift_item", id=bi.item.id, name=bi.item.name, price_paise=bi.item.price_paise,
                              item_type=bi.item.item_type, personalisable=bi.item.is_personalisable)
                  for bi in bundle.items]
        options.append(GiftBundleOptionOut(
            title=f"Curated: {bundle.name}",
            product=product_to_out(bundle.product) if bundle.product else None,
            lines=lines,
            total_paise=bundle.price_paise,
            budget_left_paise=budget - bundle.price_paise,
            match_percent=None,
            reasons=["hand-picked bundle"],
            bundle_id=bundle.id,
            bundle_saving_paise=max(0, bundle.parts_total_paise - bundle.price_paise),
        ))
        break
    return options, None
