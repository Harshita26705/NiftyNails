from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import DbSession
from app.models import GiftBundle, GiftItem, Product, Review
from app.schemas.catalog import CatalogOptionsOut, ProductDetailOut, ProductOut, ReviewOut
from app.schemas.common import Page
from app.services.catalog import ProductFilters, catalog_options, list_products, product_to_detail, product_to_out
from app.services.settings import get_setting

router = APIRouter(tags=["catalogue"])

CsvList = Annotated[list[str] | None, Query()]


def _split(values: list[str] | None) -> list[str]:
    out: list[str] = []
    for v in values or []:
        out += [x.strip() for x in v.split(",") if x.strip()]
    return out[:20]


@router.get("/products", response_model=Page[ProductOut])
def products(
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    category: CsvList = None,
    style: CsvList = None,
    shape: CsvList = None,
    finish: CsvList = None,
    colour: CsvList = None,
    charm: CsvList = None,
    occasion: CsvList = None,
    length: CsvList = None,
    min_price: Annotated[int | None, Query(ge=0)] = None,
    max_price: Annotated[int | None, Query(ge=0)] = None,
    featured: bool | None = None,
    sort: Literal["featured", "newest", "price_asc", "price_desc", "popular"] = "featured",
    page: Annotated[int, Query(ge=1, le=500)] = 1,
    page_size: Annotated[int, Query(ge=1, le=48)] = 12,
) -> Page[ProductOut]:
    filters = ProductFilters(
        q=q, categories=_split(category), styles=_split(style), shapes=_split(shape), finishes=_split(finish),
        colours=_split(colour), charms=_split(charm), occasions=_split(occasion), lengths=_split(length),
        min_price=min_price, max_price=max_price, featured=featured, sort=sort,
    )
    items, total = list_products(db, filters, page, page_size)
    return Page(items=[product_to_out(p) for p in items], total=total, page=page, page_size=page_size)


@router.get("/products/{slug}", response_model=ProductDetailOut)
def product_detail(slug: str, db: DbSession) -> ProductDetailOut:
    product = db.scalar(select(Product).where(Product.slug == slug, Product.is_active.is_(True)))
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "We couldn't find that design.")
    return product_to_detail(db, product)


@router.get("/products/{slug}/related", response_model=list[ProductOut])
def related(slug: str, db: DbSession) -> list[ProductOut]:
    product = db.scalar(select(Product).where(Product.slug == slug))
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "We couldn't find that design.")
    stmt = (
        select(Product)
        .where(Product.is_active.is_(True), Product.id != product.id)
        .where((Product.category_id == product.category_id) | (Product.style_id == product.style_id))
        .order_by(Product.popularity.desc())
        .limit(4)
    )
    return [product_to_out(p) for p in db.scalars(stmt).unique()]


@router.get("/products/{slug}/reviews", response_model=list[ReviewOut])
def product_reviews(slug: str, db: DbSession) -> list[Review]:
    stmt = (
        select(Review).join(Product).where(Product.slug == slug, Review.is_published.is_(True))
        .order_by(Review.created_at.desc()).limit(50)
    )
    return list(db.scalars(stmt))


@router.get("/catalog/options", response_model=CatalogOptionsOut)
def options(db: DbSession) -> CatalogOptionsOut:
    return catalog_options(db)


@router.get("/reviews/featured", response_model=list[ReviewOut])
def featured_reviews(db: DbSession) -> list[ReviewOut]:
    stmt = (
        select(Review).where(Review.is_published.is_(True), Review.is_featured.is_(True))
        .order_by(Review.created_at.desc()).limit(9)
    )
    out = []
    for r in db.scalars(stmt):
        item = ReviewOut.model_validate(r)
        if r.product:
            item.product_name, item.product_slug = r.product.name, r.product.slug
        out.append(item)
    return out


@router.get("/site")
def site_content(db: DbSession) -> dict:
    """Public, non-sensitive site copy (announcement bar, hero text, socials)."""
    site = get_setting(db, "site")
    pricing = get_setting(db, "pricing")
    return {
        **{k: site[k] for k in ("announcement", "hero_title", "hero_subtitle", "instagram_handle", "support_email")},
        "free_shipping_over_paise": pricing["free_shipping_over_paise"],
        "custom_lead_days": pricing["custom_lead_days"],
        "custom_base_paise": pricing["custom_base_paise"],
    }


@router.get("/gift-items")
def gift_items(db: DbSession) -> list[dict]:
    stmt = select(GiftItem).where(GiftItem.is_active.is_(True)).order_by(GiftItem.item_type, GiftItem.price_paise)
    return [
        {"id": g.id, "slug": g.slug, "name": g.name, "item_type": g.item_type, "description": g.description,
         "price_paise": g.price_paise, "image_url": g.image_url, "in_stock": g.stock > 0,
         "is_personalisable": g.is_personalisable}
        for g in db.scalars(stmt)
    ]


@router.get("/gift-bundles")
def gift_bundles(db: DbSession) -> list[dict]:
    stmt = select(GiftBundle).where(GiftBundle.is_active.is_(True))
    return [
        {"id": b.id, "slug": b.slug, "name": b.name, "description": b.description, "price_paise": b.price_paise,
         "parts_total_paise": b.parts_total_paise, "tags": b.tags,
         "product": product_to_out(b.product).model_dump() if b.product else None,
         "items": [{"name": bi.item.name, "item_type": bi.item.item_type, "quantity": bi.quantity} for bi in b.items]}
        for b in db.scalars(stmt).unique()
    ]
