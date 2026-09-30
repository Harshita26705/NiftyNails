"""Admin configuration: nail sizes, size kits, inventory overview, gifting, settings, uploads."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, DbSession, OwnerUser
from app.core.config import get_settings
from app.core.rate_limit import upload_limiter
from app.models import Charm, GiftBundle, GiftBundleItem, GiftItem, Inventory, NailSize, Product, SizeKit
from app.schemas.catalog import NailSizeIn, NailSizeOut, SizeKitIn, SizeKitOut
from app.schemas.common import Message
from app.services.settings import DEFAULTS, get_setting, set_setting
from app.storage.images import decode_image_bytes, get_storage, prepare_for_storage

router = APIRouter()


# ------------------------------------------------------------------ sizes


@router.get("/nail-sizes", response_model=list[NailSizeOut], tags=["admin:sizes"])
def nail_sizes(db: DbSession, _: AdminUser) -> list[NailSize]:
    return list(db.scalars(select(NailSize).order_by(NailSize.size)))


@router.put("/nail-sizes", response_model=list[NailSizeOut], tags=["admin:sizes"])
def set_nail_sizes(rows: list[NailSizeIn], db: DbSession, _: OwnerUser) -> list[NailSize]:
    if sorted(r.size for r in rows) != list(range(10)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide dimensions for every size 0–9.")
    widths = [r.width_mm for r in sorted(rows, key=lambda r: r.size)]
    if any(a <= b for a, b in zip(widths, widths[1:], strict=False)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "Widths must get smaller from size 0 (widest) to size 9 (narrowest).")
    for r in rows:
        row = db.get(NailSize, r.size) or NailSize(size=r.size)
        row.width_mm, row.length_mm = r.width_mm, r.length_mm
        db.add(row)
    db.commit()
    return list(db.scalars(select(NailSize).order_by(NailSize.size)))


@router.get("/size-kits", response_model=list[SizeKitOut], tags=["admin:sizes"])
def size_kits(db: DbSession, _: AdminUser) -> list[SizeKit]:
    return list(db.scalars(select(SizeKit).order_by(SizeKit.sort_order)))


@router.put("/size-kits", response_model=list[SizeKitOut], tags=["admin:sizes"])
def set_size_kits(rows: list[SizeKitIn], db: DbSession, _: OwnerUser) -> list[SizeKit]:
    for r in rows:
        row = db.get(SizeKit, r.label) or SizeKit(label=r.label)
        row.fingers, row.sort_order = dict(r.fingers), r.sort_order
        db.add(row)
    db.commit()
    return list(db.scalars(select(SizeKit).order_by(SizeKit.sort_order)))


# ------------------------------------------------------------------ inventory overview


@router.get("/inventory", tags=["admin:inventory"])
def inventory_overview(db: DbSession, _: AdminUser) -> dict:
    products = db.scalars(select(Product).order_by(Product.name)).unique()
    rows = []
    for p in products:
        stock = {inv.size_label: {"quantity": inv.quantity, "low": inv.quantity <= inv.low_stock_threshold}
                 for inv in p.inventory}
        rows.append({"id": p.id, "name": p.name, "sku": p.sku, "is_active": p.is_active,
                     "made_to_order": "CUSTOM" in p.available_sizes, "stock": stock})
    charms = [{"id": c.id, "name": c.name, "slug": c.slug, "stock": c.stock, "is_active": c.is_active,
               "low": c.stock <= 10} for c in db.scalars(select(Charm).order_by(Charm.stock))]
    gifts = [{"id": g.id, "name": g.name, "item_type": g.item_type, "stock": g.stock, "low": g.stock <= 5}
             for g in db.scalars(select(GiftItem).order_by(GiftItem.stock))]
    return {"products": rows, "charms": charms, "gift_items": gifts}


class StockAdjustIn(BaseModel):
    kind: Literal["product", "charm", "gift_item"]
    id: int
    size_label: Literal["XS", "S", "M", "L"] | None = None
    quantity: int = Field(ge=0, le=100_000)


@router.post("/inventory/adjust", response_model=Message, tags=["admin:inventory"])
def adjust_stock(data: StockAdjustIn, db: DbSession, _: AdminUser) -> Message:
    if data.kind == "product":
        if not data.size_label:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Choose a size.")
        row = db.scalar(select(Inventory).where(Inventory.product_id == data.id,
                                                Inventory.size_label == data.size_label))
        if row is None:
            if db.get(Product, data.id) is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found.")
            row = Inventory(product_id=data.id, size_label=data.size_label)
            db.add(row)
        row.quantity = data.quantity
    else:
        model = Charm if data.kind == "charm" else GiftItem
        row = db.get(model, data.id)
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
        row.stock = data.quantity
    db.commit()
    return Message(message="Stock updated")


# ------------------------------------------------------------------ gifting


class GiftItemIn(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    name: str = Field(min_length=1, max_length=120)
    item_type: Literal["box", "card", "care", "accessory", "packaging"]
    description: str = Field(default="", max_length=2000)
    price_paise: int = Field(ge=0)
    stock: int = Field(default=0, ge=0)
    image_url: str | None = Field(default=None, max_length=500)
    tags: list[str] = Field(default_factory=list, max_length=30)
    is_personalisable: bool = False
    is_active: bool = True


class GiftItemOut(GiftItemIn):
    id: int


class GiftBundleIn(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)
    bundle_price_paise: int | None = Field(default=None, ge=0)
    product_id: int | None = None
    tags: list[str] = Field(default_factory=list, max_length=30)
    items: list[dict] = Field(default_factory=list, description='[{"item_id": 1, "quantity": 1}]')
    is_active: bool = True


def _commit(db) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "That slug is already in use.") from exc


@router.get("/gift-items", response_model=list[GiftItemOut], tags=["admin:gifting"])
def list_gift_items(db: DbSession, _: AdminUser) -> list[GiftItem]:
    return list(db.scalars(select(GiftItem).order_by(GiftItem.item_type, GiftItem.name)))


@router.post("/gift-items", response_model=GiftItemOut, status_code=201, tags=["admin:gifting"])
def create_gift_item(data: GiftItemIn, db: DbSession, _: AdminUser) -> GiftItem:
    row = GiftItem(**data.model_dump())
    db.add(row)
    _commit(db)
    return row


@router.put("/gift-items/{item_id}", response_model=GiftItemOut, tags=["admin:gifting"])
def update_gift_item(item_id: int, data: GiftItemIn, db: DbSession, _: AdminUser) -> GiftItem:
    row = db.get(GiftItem, item_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    for k, v in data.model_dump().items():
        setattr(row, k, v)
    _commit(db)
    return row


@router.delete("/gift-items/{item_id}", response_model=Message, tags=["admin:gifting"])
def delete_gift_item(item_id: int, db: DbSession, _: AdminUser) -> Message:
    row = db.get(GiftItem, item_id)
    if row:
        row.is_active = False  # keep history intact for past orders
        db.commit()
    return Message(message="Gift item archived")


def _bundle_out(b: GiftBundle) -> dict:
    return {"id": b.id, "slug": b.slug, "name": b.name, "description": b.description,
            "bundle_price_paise": b.bundle_price_paise, "price_paise": b.price_paise,
            "parts_total_paise": b.parts_total_paise, "product_id": b.product_id, "tags": b.tags,
            "is_active": b.is_active,
            "items": [{"item_id": bi.item_id, "name": bi.item.name, "quantity": bi.quantity} for bi in b.items]}


def _apply_bundle(db, bundle: GiftBundle, data: GiftBundleIn) -> None:
    for k in ("slug", "name", "description", "bundle_price_paise", "product_id", "tags", "is_active"):
        setattr(bundle, k, getattr(data, k))
    bundle.items.clear()
    db.flush()
    for entry in data.items:
        item = db.get(GiftItem, int(entry.get("item_id", 0)))
        if item is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown gift item in bundle.")
        bundle.items.append(GiftBundleItem(item_id=item.id, quantity=max(1, int(entry.get("quantity", 1)))))


@router.get("/gift-bundles", tags=["admin:gifting"])
def list_bundles(db: DbSession, _: AdminUser) -> list[dict]:
    return [_bundle_out(b) for b in db.scalars(select(GiftBundle).order_by(GiftBundle.name)).unique()]


@router.post("/gift-bundles", status_code=201, tags=["admin:gifting"])
def create_bundle(data: GiftBundleIn, db: DbSession, _: AdminUser) -> dict:
    bundle = GiftBundle(slug=data.slug, name=data.name)
    db.add(bundle)
    _apply_bundle(db, bundle, data)
    _commit(db)
    db.refresh(bundle)
    return _bundle_out(bundle)


@router.put("/gift-bundles/{bundle_id}", tags=["admin:gifting"])
def update_bundle(bundle_id: int, data: GiftBundleIn, db: DbSession, _: AdminUser) -> dict:
    bundle = db.get(GiftBundle, bundle_id)
    if bundle is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    _apply_bundle(db, bundle, data)
    _commit(db)
    db.refresh(bundle)
    return _bundle_out(bundle)


@router.delete("/gift-bundles/{bundle_id}", response_model=Message, tags=["admin:gifting"])
def delete_bundle(bundle_id: int, db: DbSession, _: AdminUser) -> Message:
    bundle = db.get(GiftBundle, bundle_id)
    if bundle:
        bundle.is_active = False
        db.commit()
    return Message(message="Bundle archived")


# ------------------------------------------------------------------ settings


@router.get("/settings", tags=["admin:settings"])
def all_settings(db: DbSession, _: AdminUser) -> dict:
    return {key: get_setting(db, key) for key in DEFAULTS}


@router.put("/settings/{key}", tags=["admin:settings"])
def update_setting(key: Literal["pricing", "site", "sizing"], value: dict, db: DbSession, _: OwnerUser) -> dict:
    current = get_setting(db, key)
    unknown = set(value) - set(DEFAULTS[key])
    if unknown:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown setting(s): {', '.join(sorted(unknown))}")
    for k, v in value.items():
        expected = type(DEFAULTS[key][k])
        if expected in (int, float) and isinstance(v, (int, float)) and not isinstance(v, bool):
            if v < 0:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"{k} can't be negative.")
            v = expected(v)
        elif not isinstance(v, expected):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"{k} has the wrong type.")
        if isinstance(v, str) and len(v) > 500:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"{k} is too long.")
        current[k] = v
    return set_setting(db, key, current)


# ------------------------------------------------------------------ uploads (charms, categories, gifts)


@router.post("/uploads/{folder}", tags=["admin:uploads"], dependencies=[Depends(upload_limiter)])
def upload_image(
    folder: Literal["charms", "categories", "gifts", "content"],
    _: AdminUser,
    file: Annotated[UploadFile, File()],
) -> dict:
    limit = get_settings().max_upload_mb * 1024 * 1024
    image = prepare_for_storage(decode_image_bytes(file.file.read(limit + 1)), max_side=1200)
    return {"url": get_storage().save(image, folder)}
