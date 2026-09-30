"""Rank catalogue products against structured attributes + semantic similarity.

Never invents products: every result is an existing active product with an explainable score.
"""

from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.attribute_parser import ParsedQuery
from app.ml.colour import colour_similarity
from app.ml.embeddings import get_embedding_provider, text_hash
from app.ml.lexicon import SIMILAR_SHAPES
from app.ml.vocabulary import Vocabulary
from app.models import Product, ProductEmbedding

LENGTH_ORDER = ["short", "medium", "long", "xlong"]


@dataclass
class ScoredProduct:
    product: Product
    score: float
    matched: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)

    @property
    def percent(self) -> int:
        return int(round(self.score * 100))


def product_document(p: Product) -> str:
    parts = [p.name, p.tagline, p.description, p.length, "nails"]
    for ref in (p.category, p.style, p.shape, p.finish):
        if ref:
            parts += [ref.name, *(ref.synonyms or [])]
    for pc in p.colours:
        parts += [pc.colour.name, *(pc.colour.synonyms or [])]
    for pc in p.charms:
        parts += [pc.charm.name, pc.charm.category, *(pc.charm.synonyms or [])]
    for group in (p.patterns, p.occasions, p.tags):
        for ref in group:
            parts += [ref.name, *(ref.synonyms or [])]
    return " ".join(x for x in parts if x)


def ensure_embeddings(db: Session, products: list[Product]) -> dict[int, dict]:
    """Return {product_id: vector}, (re)computing stale or missing embeddings."""
    provider = get_embedding_provider()
    existing = {
        e.product_id: e
        for e in db.scalars(select(ProductEmbedding).where(ProductEmbedding.product_id.in_([p.id for p in products])))
    }
    stale: list[tuple[Product, str, str]] = []
    vectors: dict[int, dict] = {}
    for p in products:
        doc = product_document(p)
        h = text_hash(doc)
        row = existing.get(p.id)
        if row and row.text_hash == h and row.model == provider.model_name:
            vectors[p.id] = row.vector
        else:
            stale.append((p, doc, h))
    if stale:
        embedded = provider.embed([doc for _, doc, _ in stale])
        for (p, _, h), vec in zip(stale, embedded, strict=True):
            row = existing.get(p.id) or ProductEmbedding(product_id=p.id)
            row.model, row.dim, row.vector, row.text_hash = provider.model_name, provider.dim, vec, h
            db.add(row)
            vectors[p.id] = vec
        db.commit()
    return vectors


def product_flashiness(p: Product, requested: ParsedQuery | None = None) -> int:
    """0 (matte, bare) … 3 (chrome/glitter/bling). Elements the customer explicitly asked for don't count
    against a "not too flashy" preference — they chose them."""
    finish_requested = requested is not None and p.finish is not None and p.finish.slug in requested.finishes
    levels = [1 if finish_requested or not p.finish else p.finish.flashiness]
    levels += [pc.charm.flashiness for pc in p.charms if requested is None or pc.charm.slug not in requested.charms]
    charm_count = sum(pc.quantity for pc in p.charms)
    return min(3, max(levels) + (1 if charm_count >= 10 else 0))


def _price_fit(price: int, lo: int | None, hi: int | None) -> float:
    if hi is not None and price > hi:
        return max(0.0, 1 - (price - hi) / max(hi, 1) * 3)
    if lo is not None and price < lo:
        return max(0.0, 1 - (lo - price) / max(lo, 1) * 3)
    return 1.0


def score_product(p: Product, q: ParsedQuery, vocab: Vocabulary, semantic: float) -> ScoredProduct:
    parts: list[tuple[float, float]] = []
    matched: list[str] = []
    missing: list[str] = []

    def name_of(kind: str, slug: str) -> str:
        entry = vocab.find(kind, slug)
        return entry.name if entry else slug.replace("-", " ").title()

    if q.colours:
        product_colours = [(pc.colour.hex, pc.role == "base") for pc in p.colours]
        values = []
        for slug in q.colours:
            entry = vocab.find("colour", slug)
            if not entry or not product_colours:
                values.append(0.0)
                continue
            best = max(colour_similarity(entry.get("hex"), hx) * (1.0 if is_base else 0.9) for hx, is_base in product_colours)
            values.append(best)
            (matched if best >= 0.75 else missing).append(entry.name)
        parts.append((3.0, sum(values) / len(values)))

    if q.finishes:
        hit = p.finish is not None and p.finish.slug in q.finishes
        parts.append((2.0, 1.0 if hit else 0.0))
        for slug in q.finishes:
            (matched if hit and p.finish.slug == slug else missing).append(name_of("finish", slug))

    if q.shapes:
        shape = p.shape.slug if p.shape else None
        svg = p.shape.svg_key if p.shape else None
        wanted_keys = [vocab.find("shape", s).get("svg_key") for s in q.shapes if vocab.find("shape", s)]
        if shape in q.shapes:
            parts.append((1.5, 1.0))
            matched.append(p.shape.name)
        else:
            similar = any(svg in SIMILAR_SHAPES.get(k, []) for k in wanted_keys)
            parts.append((1.5, 0.5 if similar else 0.0))
            missing += [name_of("shape", s) for s in q.shapes]

    if q.charms:
        product_charms = {pc.charm.slug for pc in p.charms}
        product_charm_cats = {pc.charm.category for pc in p.charms}
        values = []
        for slug in q.charms:
            entry = vocab.find("charm", slug)
            if slug in product_charms:
                values.append(1.0)
                matched.append(name_of("charm", slug))
            elif entry and entry.get("category") in product_charm_cats:
                values.append(0.45)
                missing.append(name_of("charm", slug))
            else:
                values.append(0.0)
                missing.append(name_of("charm", slug))
        parts.append((2.5, sum(values) / len(values)))

    def simple(kind: str, wanted: list[str], have: set[str], weight: float) -> None:
        if not wanted:
            return
        hits = [s for s in wanted if s in have]
        parts.append((weight, len(hits) / len(wanted)))
        matched.extend(name_of(kind, s) for s in hits)
        missing.extend(name_of(kind, s) for s in wanted if s not in have)

    # Vibe words ("cute", "classy") are softer signals than concrete colours, finishes and charms.
    simple("category", q.categories, {p.category.slug} if p.category else set(), 1.0)
    simple("style", q.styles, {p.style.slug} if p.style else set(), 1.0)
    simple("pattern", q.patterns, {x.slug for x in p.patterns}, 1.5)
    simple("occasion", q.occasions, {x.slug for x in p.occasions}, 1.0)
    simple("tag", q.tags, {x.slug for x in p.tags}, 0.75)

    if q.length:
        dist = abs(LENGTH_ORDER.index(p.length) - LENGTH_ORDER.index(q.length)) if p.length in LENGTH_ORDER else 2
        parts.append((0.75, max(0.0, 1 - dist * 0.5)))
        if dist == 0:
            matched.append(f"{q.length} length")

    if q.price_min_paise is not None or q.price_max_paise is not None:
        fit = _price_fit(p.price_paise, q.price_min_paise, q.price_max_paise)
        parts.append((1.5, fit))
        if fit == 1.0:
            matched.append("within budget")
        else:
            missing.append("over budget" if q.price_max_paise and p.price_paise > q.price_max_paise else "price")

    if q.flash_preference:
        flash = product_flashiness(p, q)
        value = (1.0 if flash <= 1 else 0.5 if flash == 2 else 0.1) if q.flash_preference == "low" else (
            1.0 if flash >= 2 else 0.4
        )
        parts.append((0.75, value))
        if value >= 1.0:
            matched.append("subtle" if q.flash_preference == "low" else "statement")

    # Semantic similarity (already normalised against the best candidate) always contributes;
    # it carries the whole score for vague queries.
    parts.append((1.0 if parts else 4.0, semantic))

    total_weight = sum(w for w, _ in parts)
    score = sum(w * v for w, v in parts) / total_weight

    penalty = 1.0
    if p.finish and p.finish.slug in q.excluded_finishes:
        penalty *= 0.3
    if any(pc.colour.slug in q.excluded_colours and pc.role == "base" for pc in p.colours):
        penalty *= 0.3
    if any(pc.charm.slug in q.excluded_charms for pc in p.charms):
        penalty *= 0.3
    return ScoredProduct(p, round(score * penalty, 4), list(dict.fromkeys(matched)), list(dict.fromkeys(missing)))


def rank_products(
    db: Session,
    products: list[Product],
    query_text: str,
    parsed: ParsedQuery,
    vocab: Vocabulary,
    limit: int = 12,
    min_score: float = 0.3,
) -> list[ScoredProduct]:
    if not products:
        return []
    provider = get_embedding_provider()
    vectors = ensure_embeddings(db, products)
    query_vec = provider.embed([query_text or ""])[0]
    raw = {p.id: max(0.0, provider.similarity(query_vec, vectors[p.id])) for p in products}
    best = max(raw.values(), default=0.0)
    # Hashing similarities live on a compressed scale; relative closeness is what matters.
    # A floor keeps an unrelated catalogue from looking like a strong match.
    scale = max(best, 0.25)
    scored = [score_product(p, parsed, vocab, min(1.0, raw[p.id] / scale)) for p in products]
    scored.sort(key=lambda s: (s.score, s.product.popularity), reverse=True)
    return [s for s in scored if s.score >= min_score][:limit]
