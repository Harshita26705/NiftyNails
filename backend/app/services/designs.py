"""Custom design validation, bill of materials and pricing.

The catalogue is the source of truth: a design may only reference active colours, finishes,
shapes, patterns and in-stock charms. Anything else is rejected with a clear message.
"""

import secrets
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Charm, Colour, CustomDesign, CustomDesignElement, Finish, NailShape, Pattern
from app.schemas.design import NAIL_KEYS, BomLine, DesignConfig, DesignOut, DesignQuoteOut, PriceLine
from app.services.settings import get_setting
from app.storage.images import decode_png_data_url, get_storage

LENGTH_LABEL = {"short": "Short", "medium": "Medium", "long": "Long", "xlong": "Extra long"}


@dataclass
class Catalogue:
    colours: dict[str, Colour]
    finishes: dict[str, Finish]
    shapes: dict[str, NailShape]
    patterns: dict[str, Pattern]
    charms: dict[str, Charm]

    @classmethod
    def load(cls, db: Session) -> "Catalogue":
        def by_slug(model):
            return {row.slug: row for row in db.scalars(select(model))}

        return cls(by_slug(Colour), by_slug(Finish), by_slug(NailShape), by_slug(Pattern), by_slug(Charm))


@dataclass
class DesignAnalysis:
    breakdown: list[PriceLine]
    bom: list[BomLine]
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    @property
    def price_paise(self) -> int:
        return sum(line.amount_paise for line in self.breakdown)


def analyse_design(db: Session, config: DesignConfig, sets: int = 1, catalogue: Catalogue | None = None) -> DesignAnalysis:
    cat = catalogue or Catalogue.load(db)
    pricing = get_setting(db, "pricing")
    errors: list[str] = []
    warnings: list[str] = []

    def require(kind: str, table: dict, slug: str | None):
        if slug is None:
            return None
        row = table.get(slug)
        if row is None or not row.is_active:
            errors.append(f"The {kind} “{slug.replace('-', ' ')}” isn't something we currently offer.")
            return None
        return row

    shape = require("shape", cat.shapes, config.shape)
    base_colour = require("colour", cat.colours, config.base_colour)
    base_finish = require("finish", cat.finishes, config.finish)

    colours_used: dict[str, list[str]] = defaultdict(list)
    finishes_used: dict[str, list[str]] = defaultdict(list)
    patterns_used: dict[str, list[str]] = defaultdict(list)
    charms_used: dict[str, list[str]] = defaultdict(list)
    painted_nails = 0

    for key in NAIL_KEYS:
        nail = config.nails.get(key)
        colour = require("colour", cat.colours, nail.colour) if nail and nail.colour else base_colour
        finish = require("finish", cat.finishes, nail.finish) if nail and nail.finish else base_finish
        if colour:
            colours_used[colour.slug].append(key)
        if finish:
            finishes_used[finish.slug].append(key)
        if not nail:
            continue
        if nail.pattern and (pattern := require("pattern", cat.patterns, nail.pattern)):
            patterns_used[pattern.slug].append(key)
            if nail.pattern_colour:
                require("colour", cat.colours, nail.pattern_colour)
        if nail.paint or nail.pattern:
            painted_nails += 1
        for placement in nail.charms:
            charm = cat.charms.get(placement.charm)
            if charm is None or not charm.is_active:
                errors.append(f"The charm “{placement.charm.replace('-', ' ')}” isn't something we currently offer.")
                continue
            charms_used[charm.slug].append(key)

    bom: list[BomLine] = []
    for slug, keys in charms_used.items():
        charm = cat.charms[slug]
        qty = len(keys)
        if charm.stock < qty * sets:
            errors.append(
                f"We only have {charm.stock} × {charm.name} in stock right now (this design needs {qty * sets})."
            )
        bom.append(BomLine(element_type="charm", slug=slug, name=charm.name, quantity=qty,
                           nail_positions=list(dict.fromkeys(keys)), unit_cost_paise=charm.price_paise))
    for slug, keys in colours_used.items():
        bom.append(BomLine(element_type="colour", slug=slug, name=cat.colours[slug].name, quantity=len(keys),
                           nail_positions=keys))
    for slug, keys in finishes_used.items():
        f = cat.finishes[slug]
        bom.append(BomLine(element_type="finish", slug=slug, name=f.name, quantity=len(keys), nail_positions=keys,
                           unit_cost_paise=f.surcharge_paise))
    for slug, keys in patterns_used.items():
        p = cat.patterns[slug]
        bom.append(BomLine(element_type="pattern", slug=slug, name=p.name, quantity=len(keys), nail_positions=keys,
                           unit_cost_paise=p.surcharge_paise))

    breakdown = [PriceLine(label="Custom handmade set (10 nails)", amount_paise=pricing["custom_base_paise"])]
    if shape and shape.surcharge_paise:
        breakdown.append(PriceLine(label=f"{shape.name} shape", amount_paise=shape.surcharge_paise))
    length_fee = pricing["length_surcharge_paise"].get(config.length, 0)
    if length_fee:
        breakdown.append(PriceLine(label=f"{LENGTH_LABEL[config.length]} length", amount_paise=length_fee))
    for slug in finishes_used:
        if cat.finishes[slug].surcharge_paise:
            breakdown.append(PriceLine(label=f"{cat.finishes[slug].name} finish",
                                       amount_paise=cat.finishes[slug].surcharge_paise))
    for slug in patterns_used:
        if cat.patterns[slug].surcharge_paise:
            breakdown.append(PriceLine(label=f"{cat.patterns[slug].name} art",
                                       amount_paise=cat.patterns[slug].surcharge_paise))
    if painted_nails:
        breakdown.append(PriceLine(label=f"Hand-painted art × {painted_nails} nail{'s' if painted_nails != 1 else ''}",
                                   amount_paise=painted_nails * pricing["painted_nail_paise"]))
    for line in bom:
        if line.element_type == "charm" and line.unit_cost_paise:
            breakdown.append(PriceLine(label=f"{line.name} × {line.quantity}",
                                       amount_paise=line.unit_cost_paise * line.quantity))

    total_charms = sum(len(v) for v in charms_used.values())
    if total_charms > 30:
        warnings.append("That's a lot of charms — our artist may suggest trimming a few so the set stays wearable.")
    if config.length == "xlong" and shape and shape.svg_key == "square":
        warnings.append("Extra-long square nails are more prone to snapping; coffin is a sturdier alternative.")
    return DesignAnalysis(breakdown=breakdown, bom=bom, warnings=warnings, errors=list(dict.fromkeys(errors)))


def quote(db: Session, config: DesignConfig) -> DesignQuoteOut:
    a = analyse_design(db, config)
    return DesignQuoteOut(
        price_paise=a.price_paise,
        breakdown=a.breakdown,
        bill_of_materials=a.bom,
        warnings=a.warnings + a.errors,
        manufacturable=not a.errors,
    )


def _persist_paint_layers(config: DesignConfig) -> DesignConfig:
    storage = get_storage()
    for nail in config.nails.values():
        if nail.paint and nail.paint.startswith("data:"):
            nail.paint = storage.save(decode_png_data_url(nail.paint), "paint", fmt="PNG")
        elif nail.paint and not nail.paint.startswith("/media/paint/"):
            nail.paint = None  # never accept arbitrary external URLs
    return config


def _apply(design: CustomDesign, db: Session, config: DesignConfig, analysis: DesignAnalysis) -> None:
    cat_shape = db.scalar(select(NailShape).where(NailShape.slug == config.shape))
    cat_finish = db.scalar(select(Finish).where(Finish.slug == config.finish))
    cat_colour = db.scalar(select(Colour).where(Colour.slug == config.base_colour))
    design.shape_id = cat_shape.id if cat_shape else None
    design.finish_id = cat_finish.id if cat_finish else None
    design.base_colour_id = cat_colour.id if cat_colour else None
    design.length = config.length
    design.config = config.model_dump()
    design.price_paise = analysis.price_paise
    ids = {
        "charm": {c.slug: c.id for c in db.scalars(select(Charm))},
        "colour": {c.slug: c.id for c in db.scalars(select(Colour))},
        "finish": {f.slug: f.id for f in db.scalars(select(Finish))},
        "pattern": {p.slug: p.id for p in db.scalars(select(Pattern))},
    }
    design.elements.clear()
    for line in analysis.bom:
        design.elements.append(
            CustomDesignElement(
                element_type=line.element_type,
                element_id=ids[line.element_type][line.slug],
                element_slug=line.slug,
                quantity=line.quantity,
                nail_positions=line.nail_positions,
                unit_cost_paise=line.unit_cost_paise,
            )
        )


def save_design(
    db: Session,
    *,
    user_id: int | None,
    name: str,
    source: str,
    config: DesignConfig,
    brief: str,
    submit: bool,
    existing: CustomDesign | None = None,
) -> CustomDesign:
    analysis = analyse_design(db, config)
    if analysis.errors:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, {"message": "Design can't be made as-is.",
                                                                   "errors": analysis.errors})
    config = _persist_paint_layers(config)
    design = existing or CustomDesign(public_id=secrets.token_urlsafe(9)[:12], user_id=user_id, source=source)
    design.name = name
    design.brief = brief
    if submit or design.status in ("rejected",):
        design.status = "submitted" if submit else "draft"
    _apply(design, db, config, analysis)
    db.add(design)
    db.commit()
    db.refresh(design)
    return design


def design_to_out(design: CustomDesign) -> DesignOut:
    out = DesignOut.model_validate(design)
    out.bill_of_materials = [
        BomLine(
            element_type=e.element_type,
            slug=e.element_slug,
            name=e.element_slug.replace("-", " ").title(),
            quantity=e.quantity,
            nail_positions=e.nail_positions,
            unit_cost_paise=e.unit_cost_paise,
        )
        for e in design.elements
    ]
    return out


def production_charms(design: CustomDesign) -> list[dict]:
    """The manufacturing summary format: [{"type": "bow", "quantity": 2}, ...]."""
    return [{"type": e.element_slug, "quantity": e.quantity, "nails": e.nail_positions}
            for e in design.elements if e.element_type == "charm"]
