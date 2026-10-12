"""Orchestration for the AI features: smart search, outfit stylist, photo sizing, logging."""

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.attribute_parser import AttributeParser, ParsedQuery
from app.ml.colour import hex_distance
from app.ml.outfit import analyse_outfit
from app.ml.sizing import HandLandmarks, estimate_sizes
from app.ml.skin_tone import analyse_skin_tone, recommend_colours
from app.ml.vocabulary import Vocabulary
from app.models import AIRequest, NailSize, SizeKit
from app.schemas.ai import (
    ColorAnalysisOut,
    ColourRecommendationOut,
    MatchOut,
    PaletteColourOut,
    ParsedAttributesOut,
    SearchOut,
    SizingFingerOut,
    SizingOut,
    SkinToneOut,
    StylistOut,
    UnavailableOut,
)
from app.services.catalog import active_products, product_to_out
from app.services.matching import ScoredProduct, rank_products
from app.services.settings import get_setting

KIND_LABEL = {"charm": "decoration", "colour": "colour", "shape": "shape", "finish": "finish"}


def log_request(db: Session, kind: str, user_id: int | None, input_: dict, output: dict,
                product_ids: list[int] | None = None, needs_review: bool = False) -> AIRequest:
    row = AIRequest(kind=kind, user_id=user_id, input=input_, output=output,
                    result_product_ids=product_ids or [], needs_review=needs_review)
    db.add(row)
    db.commit()
    return row


def unavailable_out(parsed: ParsedQuery) -> list[UnavailableOut]:
    out = []
    for u in parsed.unavailable:
        what = KIND_LABEL.get(u.kind, u.kind)
        if u.reason == "out_of_stock":
            head = f"{u.requested} is out of stock right now."
        else:
            head = f"We don't currently offer {u.requested} as a {what}."
        tail = f" The closest we can create uses {u.suggestion_name}." if u.suggestion_name else ""
        out.append(UnavailableOut(**u.__dict__, message=head + tail))
    return out


def attributes_out(parsed: ParsedQuery, vocab: Vocabulary) -> ParsedAttributesOut:
    def name(kind: str, slug: str) -> str:
        e = vocab.find(kind, slug)
        return e.name if e else slug

    chips: list[str] = []
    chips += [name("colour", c) for c in parsed.colours]
    chips += [name("shape", s) for s in parsed.shapes]
    chips += [name("finish", f) for f in parsed.finishes]
    chips += [(f"{q}× " if q else "") + name("charm", c) for c, q in parsed.charms.items()]
    chips += [name("pattern", p) for p in parsed.patterns]
    chips += [name("style", s) for s in parsed.styles]
    chips += [name("category", s) for s in parsed.categories]
    chips += [name("occasion", o) for o in parsed.occasions]
    if parsed.length:
        chips.append({"xlong": "Extra long"}.get(parsed.length, parsed.length.title()))
    if parsed.price_max_paise:
        chips.append(f"Under ₹{parsed.price_max_paise // 100:,}")
    if parsed.price_min_paise:
        chips.append(f"Over ₹{parsed.price_min_paise // 100:,}")
    if parsed.flash_preference:
        chips.append("Subtle" if parsed.flash_preference == "low" else "Statement")
    chips += [f"No {name('colour', c)}" for c in parsed.excluded_colours]
    chips += [f"No {name('finish', f)}" for f in parsed.excluded_finishes]
    return ParsedAttributesOut(
        colours=parsed.colours, excluded_colours=parsed.excluded_colours, finishes=parsed.finishes,
        shapes=parsed.shapes, charms=parsed.charms, patterns=parsed.patterns, styles=parsed.styles,
        categories=parsed.categories, occasions=parsed.occasions, length=parsed.length,
        price_min_paise=parsed.price_min_paise, price_max_paise=parsed.price_max_paise,
        flash_preference=parsed.flash_preference, chips=list(dict.fromkeys(chips)),
    )


def _matches(scored: list[ScoredProduct]) -> list[MatchOut]:
    return [MatchOut(product=product_to_out(s.product), match_percent=s.percent, matched=s.matched,
                     missing=s.missing) for s in scored]


def smart_search(db: Session, query: str, limit: int, user_id: int | None) -> SearchOut:
    vocab = Vocabulary.from_db(db)
    parsed = AttributeParser(vocab).parse(query)
    scored = rank_products(db, active_products(db), query, parsed, vocab, limit=limit)
    if not scored:
        message = "Nothing in our catalogue is close enough — but we can make it for you as a custom design."
    elif scored[0].percent >= 85:
        message = "We found designs that match beautifully."
    else:
        message = "These are the closest designs we currently make."
    matches = _matches(scored)
    attrs = attributes_out(parsed, vocab)
    unavailable = unavailable_out(parsed)
    row = log_request(db, "search", user_id, {"query": query}, {
        "attributes": attrs.model_dump(), "unavailable": [u.model_dump() for u in unavailable],
        "top": [(m.product.id, m.match_percent) for m in matches[:5]],
    }, [m.product.id for m in matches])
    return SearchOut(request_id=row.id, attributes=attrs, unavailable=unavailable, matches=matches, message=message)


def _join(words: list[str]) -> str:
    return words[0] if len(words) == 1 else ", ".join(words[:-1]) + " and " + words[-1]


def stylist(db: Session, rgb: np.ndarray, note: str, user_id: int | None) -> StylistOut:
    analysis = analyse_outfit(rgb)
    vocab = Vocabulary.from_db(db)
    colours = vocab.available("colour")

    palette_out: list[PaletteColourOut] = []
    catalogue_slugs: list[str] = []
    for pc in analysis.palette:
        closest = min(colours, key=lambda c: hex_distance(c.get("hex"), pc.hex)) if colours else None
        close_enough = closest and hex_distance(closest.get("hex"), pc.hex) < 25
        palette_out.append(PaletteColourOut(
            hex=pc.hex, weight=pc.weight, name=pc.name,
            closest_catalogue_colour={"slug": closest.slug, "name": closest.name, "hex": closest.get("hex")}
            if close_enough else None,
        ))
        if close_enough and closest.slug not in catalogue_slugs and len(catalogue_slugs) < 3:
            catalogue_slugs.append(closest.slug)

    keyword_text = " ".join(analysis.keywords)
    parser = AttributeParser(vocab)
    parsed = parser.parse(f"{keyword_text} {note}")
    parsed.unavailable = [u for u in parsed.unavailable if u.kind != "colour"]
    parsed.colours = list(dict.fromkeys(catalogue_slugs + [c for c in parsed.colours if c not in catalogue_slugs]))
    parsed.flash_preference = "high" if analysis.metallic or analysis.pattern == "printed" else (
        "low" if "minimal" in analysis.keywords else parsed.flash_preference)

    scored = rank_products(db, active_products(db), f"{keyword_text} {note}", parsed, vocab, limit=9, min_score=0.25)

    names = list(dict.fromkeys(p.name for p in analysis.palette[:3]))
    summary = f"Your outfit has {_join(names)}" if names else "We analysed your photo"
    if analysis.metallic:
        summary += f" with {analysis.metallic.replace('-', ' ')} metallic accents"
    if analysis.pattern == "printed":
        summary += " and printed or embellished details"
    elif analysis.pattern == "textured":
        summary += " and subtle texture"
    summary += "."

    matches = _matches(scored)
    attrs = attributes_out(parsed, vocab)
    row = log_request(db, "stylist", user_id, {"note": note}, {
        "summary": summary, "palette": [p.model_dump() for p in palette_out], "metallic": analysis.metallic,
        "pattern": analysis.pattern, "keywords": analysis.keywords,
        "top": [(m.product.id, m.match_percent) for m in matches[:5]],
    }, [m.product.id for m in matches])
    return StylistOut(
        request_id=row.id, summary=summary, palette=palette_out, metallic=analysis.metallic,
        pattern=analysis.pattern, style_keywords=analysis.keywords, attributes=attrs, matches=matches,
    )


def color_analysis(db: Session, rgb: np.ndarray, user_id: int | None) -> ColorAnalysisOut:
    analysis = analyse_skin_tone(rgb)
    vocab = Vocabulary.from_db(db)
    colours = vocab.available("colour")
    picks = recommend_colours(analysis, colours, limit=6)
    recommended = [ColourRecommendationOut(slug=c.slug, name=c.name, hex=c.get("hex"), reason=reason) for c, reason in picks]
    slugs = [c.slug for c, _ in picks]

    parser = AttributeParser(vocab)
    parsed = parser.parse("")
    parsed.colours = slugs
    scored = rank_products(db, active_products(db), " ".join(slugs), parsed, vocab, limit=9, min_score=0.2)

    undertone_word = {"warm": "warm", "cool": "cool", "neutral": "balanced"}[analysis.undertone]
    summary = f"You have a {undertone_word} undertone with a {analysis.depth} depth — here's what we'd reach for."

    matches = _matches(scored)
    row = log_request(db, "tone", user_id, {}, {
        "hex": analysis.hex, "undertone": analysis.undertone, "depth": analysis.depth,
        "recommended": slugs, "top": [(m.product.id, m.match_percent) for m in matches[:5]],
    }, [m.product.id for m in matches])
    return ColorAnalysisOut(
        request_id=row.id, summary=summary,
        tone=SkinToneOut(hex=analysis.hex, undertone=analysis.undertone, depth=analysis.depth),
        recommended_colours=recommended, matches=matches,
    )


def _closest_kit(db: Session, sizes: dict[str, int | None]) -> str | None:
    kits = list(db.scalars(select(SizeKit).order_by(SizeKit.sort_order)))
    known = {f: s for f, s in sizes.items() if s is not None}
    if not kits or len(known) < 3:
        return None
    best = min(kits, key=lambda k: sum(abs(k.fingers.get(f, 5) - s) for f, s in known.items()))
    error = sum(abs(best.fingers.get(f, 5) - s) for f, s in known.items()) / len(known)
    return best.label if error <= 1.0 else None


def photo_sizing(db: Session, rgb: np.ndarray, reference: str, custom_diameter_mm: float | None,
                 user_id: int | None, client_hand: HandLandmarks | None = None) -> SizingOut:
    settings = get_setting(db, "sizing")
    sizes = [(s.size, s.width_mm) for s in db.scalars(select(NailSize).order_by(NailSize.size))]
    if not sizes:
        raise RuntimeError("Nail sizes are not configured")
    result = estimate_sizes(
        rgb, reference, sizes, settings["nail_to_finger_ratio"], settings["min_confidence"],
        settings["prefer_larger_between_sizes"], custom_diameter_mm, client_hand=client_hand,
    )
    per_finger = {f: r.size for f, r in result.fingers.items()}
    label = "high" if result.overall_confidence >= settings["min_confidence"] else (
        "medium" if result.overall_confidence >= settings["min_confidence"] * 0.6 else "low")
    out = SizingOut(
        request_id=None,
        ok=result.ok,
        fingers=[SizingFingerOut(**r.__dict__) for r in result.fingers.values()],
        overall_confidence=result.overall_confidence,
        confidence_label=label,
        recommendation=result.recommendation,
        closest_kit=_closest_kit(db, per_finger) if result.ok else None,
        reference=result.reference,
        handedness=result.handedness,
        warnings=result.warnings,
        preview_image=f"data:image/jpeg;base64,{result.preview_jpeg_b64}" if result.preview_jpeg_b64 else None,
    )
    # Log measurements only (never the photo) for quality monitoring.
    row = log_request(db, "sizing", user_id, {"reference": reference, "client_landmarks": client_hand is not None}, {
        "ok": out.ok, "confidence": out.overall_confidence, "sizes": per_finger, "warnings": out.warnings,
    }, needs_review=not out.ok or label == "low")
    out.request_id = row.id
    return out
