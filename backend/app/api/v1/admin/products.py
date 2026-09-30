from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, DbSession
from app.core.config import get_settings
from app.core.rate_limit import upload_limiter
from app.models import Inventory, Occasion, OrderItem, Pattern, Product, ProductCharm, ProductColour, ProductImage, Tag
from app.schemas.catalog import ImageOrderIn, InventoryIn, ProductAdminOut, ProductImageOut, ProductIn
from app.schemas.common import Message, Page
from app.services.catalog import ProductFilters, list_products, product_to_admin
from app.services.matching import ensure_embeddings
from app.storage.images import decode_image_bytes, get_storage, prepare_for_storage

router = APIRouter(prefix="/products", tags=["admin:products"])


def _get(db, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found.")
    return product


def _apply(db, product: Product, data: ProductIn) -> None:
    scalar_fields = ("sku", "slug", "name", "tagline", "description", "price_paise", "compare_at_paise",
                     "category_id", "style_id", "shape_id", "finish_id", "length", "difficulty",
                     "available_sizes", "art", "is_active", "is_featured")
    for field in scalar_fields:
        setattr(product, field, getattr(data, field))

    if len({c.colour_id for c in data.colours}) != len(data.colours):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Each colour can only be added once.")
    if sum(1 for c in data.colours if c.role == "base") > 1:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Choose a single base colour.")
    product.colours = [ProductColour(colour_id=c.colour_id, role=c.role, position=i)
                       for i, c in enumerate(data.colours)]
    merged: dict[int, int] = {}
    for c in data.charms:
        merged[c.charm_id] = merged.get(c.charm_id, 0) + c.quantity
    product.charms = [ProductCharm(charm_id=cid, quantity=qty) for cid, qty in merged.items()]
    product.tags = list(db.scalars(select(Tag).where(Tag.id.in_(data.tag_ids)))) if data.tag_ids else []
    product.patterns = (list(db.scalars(select(Pattern).where(Pattern.id.in_(data.pattern_ids))))
                        if data.pattern_ids else [])
    product.occasions = (list(db.scalars(select(Occasion).where(Occasion.id.in_(data.occasion_ids))))
                         if data.occasion_ids else [])

    existing = {inv.size_label: inv for inv in product.inventory}
    for inv in data.inventory:
        row = existing.get(inv.size_label)
        if row:
            row.quantity, row.low_stock_threshold = inv.quantity, inv.low_stock_threshold
        else:
            product.inventory.append(Inventory(size_label=inv.size_label, quantity=inv.quantity,
                                               low_stock_threshold=inv.low_stock_threshold))


def _commit(db, product: Product) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        detail = str(exc.orig).lower()
        field = "SKU" if "sku" in detail else "slug" if "slug" in detail else "value"
        raise HTTPException(status.HTTP_409_CONFLICT, f"Another product already uses that {field}.") from exc
    db.refresh(product)
    ensure_embeddings(db, [product])


@router.get("", response_model=Page[ProductAdminOut])
def list_admin_products(
    db: DbSession,
    _: AdminUser,
    q: Annotated[str | None, Query(max_length=100)] = None,
    status_filter: Annotated[Literal["all", "active", "inactive"], Query(alias="status")] = "all",
    sort: Literal["featured", "newest", "price_asc", "price_desc", "popular"] = "newest",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
) -> Page[ProductAdminOut]:
    active = {"all": None, "active": True, "inactive": False}[status_filter]
    items, total = list_products(db, ProductFilters(q=q, active=active, sort=sort), page, page_size)
    return Page(items=[product_to_admin(db, p) for p in items], total=total, page=page, page_size=page_size)


@router.get("/{product_id}", response_model=ProductAdminOut)
def get_product(product_id: int, db: DbSession, _: AdminUser) -> ProductAdminOut:
    return product_to_admin(db, _get(db, product_id))


@router.post("", response_model=ProductAdminOut, status_code=201)
def create_product(data: ProductIn, db: DbSession, _: AdminUser) -> ProductAdminOut:
    product = Product(sku=data.sku, slug=data.slug, name=data.name, price_paise=data.price_paise)
    db.add(product)
    _apply(db, product, data)
    _commit(db, product)
    return product_to_admin(db, product)


@router.put("/{product_id}", response_model=ProductAdminOut)
def update_product(product_id: int, data: ProductIn, db: DbSession, _: AdminUser) -> ProductAdminOut:
    product = _get(db, product_id)
    _apply(db, product, data)
    _commit(db, product)
    return product_to_admin(db, product)


@router.delete("/{product_id}", response_model=Message)
def delete_product(product_id: int, db: DbSession, _: AdminUser) -> Message:
    product = _get(db, product_id)
    if db.scalar(select(OrderItem.id).where(OrderItem.product_id == product_id).limit(1)):
        product.is_active = False
        db.commit()
        return Message(message="This design has orders, so it was archived (hidden from the shop) instead.")
    storage = get_storage()
    for image in product.images:
        storage.delete(image.url)
    db.delete(product)
    db.commit()
    return Message(message="Product deleted")


@router.put("/{product_id}/inventory", response_model=ProductAdminOut)
def set_inventory(product_id: int, rows: list[InventoryIn], db: DbSession, _: AdminUser) -> ProductAdminOut:
    product = _get(db, product_id)
    existing = {inv.size_label: inv for inv in product.inventory}
    for inv in rows:
        if row := existing.get(inv.size_label):
            row.quantity, row.low_stock_threshold = inv.quantity, inv.low_stock_threshold
        else:
            product.inventory.append(Inventory(**inv.model_dump()))
    db.commit()
    db.refresh(product)
    return product_to_admin(db, product)


@router.post("/{product_id}/images", response_model=list[ProductImageOut], status_code=201,
             dependencies=[Depends(upload_limiter)])
def upload_images(
    product_id: int,
    db: DbSession,
    _: AdminUser,
    files: Annotated[list[UploadFile], File(description="JPG, PNG or WebP")],
    alt: Annotated[str, Form(max_length=200)] = "",
) -> list[ProductImage]:
    product = _get(db, product_id)
    if len(files) > 10 or len(product.images) + len(files) > 16:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "A product can have up to 16 images.")
    limit = get_settings().max_upload_mb * 1024 * 1024
    storage = get_storage()
    start = max((img.position for img in product.images), default=-1) + 1
    for i, upload in enumerate(files):
        image = prepare_for_storage(decode_image_bytes(upload.file.read(limit + 1)))
        url = storage.save(image, "products")
        product.images.append(ProductImage(url=url, alt=alt or product.name, position=start + i))
    db.commit()
    db.refresh(product)
    return product.images


@router.put("/{product_id}/images/order", response_model=list[ProductImageOut])
def reorder_images(product_id: int, data: ImageOrderIn, db: DbSession, _: AdminUser) -> list[ProductImage]:
    product = _get(db, product_id)
    by_id = {img.id: img for img in product.images}
    if set(data.image_ids) != set(by_id):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Send every image id exactly once.")
    for position, image_id in enumerate(data.image_ids):
        by_id[image_id].position = position
    db.commit()
    db.refresh(product)
    return product.images


@router.delete("/{product_id}/images/{image_id}", response_model=Message)
def delete_image(product_id: int, image_id: int, db: DbSession, _: AdminUser) -> Message:
    image = db.get(ProductImage, image_id)
    if image is None or image.product_id != product_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found.")
    get_storage().delete(image.url)
    db.delete(image)
    db.commit()
    return Message(message="Image removed")
