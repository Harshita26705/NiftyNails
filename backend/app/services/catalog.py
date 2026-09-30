"""Catalogue queries and product serialisation."""

from dataclasses import dataclass, field

from sqlalchemy import Select, and_, exists, func, or_, select
from sqlalchemy.orm import Session

from app.models import (
    Category,
    Charm,
    Colour,
    Finish,
    NailShape,
    NailSize,
    Occasion,
    Pattern,
    Product,
    ProductCharm,
    ProductColour,
    Review,
    SizeKit,
    Style,
    Tag,
)
from app.models.catalog import product_occasions
from app.schemas.catalog import (
    CatalogOptionsOut,
    ProductAdminOut,
    ProductCharmOut,
    ProductColourOut,
    ProductDetailOut,
    ProductOut,
)

READY_SIZES = ("XS", "S", "M", "L")


def _in_stock(product: Product) -> bool:
    if "CUSTOM" in product.available_sizes:
        return True  # made-to-order is always purchasable
    return any(inv.quantity > 0 for inv in product.inventory if inv.size_label in product.available_sizes)


def product_art(product: Product) -> dict:
    """Spec for the procedural nail-set renderer, derived from catalogue attributes.

    Admin-entered `product.art` keys (e.g. "pattern", "accent_nails", "gradient") override the defaults.
    """
    base = product.base_colour
    accents = [pc.colour.hex for pc in product.colours if base is None or pc.colour_id != base.id]
    charms: list[str] = []
    for pc in product.charms:
        charms += [pc.charm.asset_key] * min(pc.quantity, 3)
    return {
        "shape": product.shape.svg_key if product.shape else "almond",
        "length": product.length,
        "base": base.hex if base else "#F8C8D8",
        "accents": accents[:3],
        "finish": product.finish.slug if product.finish else "glossy",
        "pattern": product.patterns[0].slug if product.patterns else None,
        "charms": charms[:6],
        **(product.art or {}),
    }


def _base_fields(product: Product) -> dict:
    return {
        "id": product.id,
        "sku": product.sku,
        "slug": product.slug,
        "name": product.name,
        "tagline": product.tagline,
        "price_paise": product.price_paise,
        "compare_at_paise": product.compare_at_paise,
        "category": product.category,
        "style": product.style,
        "shape": product.shape,
        "finish": product.finish,
        "length": product.length,
        "difficulty": product.difficulty,
        "colours": [
            ProductColourOut(name=pc.colour.name, slug=pc.colour.slug, hex=pc.colour.hex, role=pc.role)
            for pc in product.colours
        ],
        "charms": [
            ProductCharmOut(name=pc.charm.name, slug=pc.charm.slug, asset_key=pc.charm.asset_key, quantity=pc.quantity)
            for pc in product.charms
        ],
        "tags": product.tags,
        "images": product.images,
        "art": product_art(product),
        "is_featured": product.is_featured,
        "is_active": product.is_active,
        "in_stock": _in_stock(product),
    }


def product_to_out(product: Product) -> ProductOut:
    return ProductOut(**_base_fields(product))


def _detail_fields(db: Session, product: Product) -> dict:
    avg, count = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.product_id == product.id, Review.is_published.is_(True)
        )
    ).one()
    return {
        **_base_fields(product),
        "description": product.description,
        "patterns": product.patterns,
        "occasions": product.occasions,
        "available_sizes": product.available_sizes,
        "size_availability": {label: product.stock_for(label) for label in product.available_sizes},
        "rating_average": round(float(avg), 1) if avg is not None else None,
        "rating_count": count,
    }


def product_to_detail(db: Session, product: Product) -> ProductDetailOut:
    return ProductDetailOut(**_detail_fields(db, product))


def product_to_admin(db: Session, product: Product) -> ProductAdminOut:
    return ProductAdminOut(
        **_detail_fields(db, product),
        inventory=product.inventory,
        popularity=product.popularity,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@dataclass
class ProductFilters:
    q: str | None = None
    categories: list[str] = field(default_factory=list)
    styles: list[str] = field(default_factory=list)
    shapes: list[str] = field(default_factory=list)
    finishes: list[str] = field(default_factory=list)
    colours: list[str] = field(default_factory=list)
    charms: list[str] = field(default_factory=list)
    occasions: list[str] = field(default_factory=list)
    lengths: list[str] = field(default_factory=list)
    min_price: int | None = None
    max_price: int | None = None
    featured: bool | None = None
    active: bool | None = True  # None = both active and archived (admin)
    sort: str = "featured"


SORTS = {
    "featured": (Product.is_featured.desc(), Product.popularity.desc(), Product.id.desc()),
    "newest": (Product.created_at.desc(), Product.id.desc()),
    "price_asc": (Product.price_paise.asc(), Product.id.asc()),
    "price_desc": (Product.price_paise.desc(), Product.id.desc()),
    "popular": (Product.popularity.desc(), Product.id.desc()),
}


def _apply_filters(stmt: Select, f: ProductFilters) -> Select:
    if f.active is not None:
        stmt = stmt.where(Product.is_active.is_(f.active))
    if f.q:
        like = f"%{f.q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.name).like(like),
                func.lower(Product.tagline).like(like),
                func.lower(Product.sku).like(like),
                func.lower(Product.description).like(like),
            )
        )
    if f.categories:
        stmt = stmt.where(Product.category.has(Category.slug.in_(f.categories)))
    if f.styles:
        stmt = stmt.where(Product.style.has(Style.slug.in_(f.styles)))
    if f.shapes:
        stmt = stmt.where(Product.shape.has(NailShape.slug.in_(f.shapes)))
    if f.finishes:
        stmt = stmt.where(Product.finish.has(Finish.slug.in_(f.finishes)))
    if f.lengths:
        stmt = stmt.where(Product.length.in_(f.lengths))
    if f.colours:
        stmt = stmt.where(
            exists().where(
                and_(
                    ProductColour.product_id == Product.id,
                    ProductColour.colour_id == Colour.id,
                    Colour.slug.in_(f.colours),
                )
            )
        )
    if f.charms:
        stmt = stmt.where(
            exists().where(
                and_(ProductCharm.product_id == Product.id, ProductCharm.charm_id == Charm.id, Charm.slug.in_(f.charms))
            )
        )
    if f.occasions:
        stmt = stmt.where(
            exists().where(
                and_(
                    product_occasions.c.product_id == Product.id,
                    product_occasions.c.occasion_id == Occasion.id,
                    Occasion.slug.in_(f.occasions),
                )
            )
        )
    if f.min_price is not None:
        stmt = stmt.where(Product.price_paise >= f.min_price)
    if f.max_price is not None:
        stmt = stmt.where(Product.price_paise <= f.max_price)
    if f.featured is not None:
        stmt = stmt.where(Product.is_featured.is_(f.featured))
    return stmt


def list_products(db: Session, f: ProductFilters, page: int, page_size: int) -> tuple[list[Product], int]:
    base = _apply_filters(select(Product), f)
    total = db.scalar(select(func.count()).select_from(base.order_by(None).subquery())) or 0
    stmt = base.order_by(*SORTS.get(f.sort, SORTS["featured"])).offset((page - 1) * page_size).limit(page_size)
    return list(db.scalars(stmt).unique()), total


def active_products(db: Session) -> list[Product]:
    return list(db.scalars(select(Product).where(Product.is_active.is_(True))).unique())


def _active(db: Session, model, order=None):
    stmt = select(model).where(model.is_active.is_(True)).order_by(order or model.sort_order, model.name)
    return list(db.scalars(stmt))


def catalog_options(db: Session) -> CatalogOptionsOut:
    lo, hi = db.execute(
        select(func.min(Product.price_paise), func.max(Product.price_paise)).where(Product.is_active.is_(True))
    ).one()
    return CatalogOptionsOut(
        categories=_active(db, Category),
        styles=_active(db, Style),
        occasions=_active(db, Occasion),
        patterns=_active(db, Pattern),
        tags=_active(db, Tag),
        colours=_active(db, Colour),
        finishes=_active(db, Finish),
        shapes=_active(db, NailShape),
        charms=_active(db, Charm),
        nail_sizes=list(db.scalars(select(NailSize).order_by(NailSize.size))),
        size_kits=list(db.scalars(select(SizeKit).order_by(SizeKit.sort_order))),
        price_range=(lo or 0, hi or 0),
    )

