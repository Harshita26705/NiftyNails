"""Customer account area. Every query is scoped to the signed-in user."""

from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import Favourite, NailMeasurement, Order, Product, Review, SavedDesign
from app.schemas.catalog import ProductOut, ReviewIn
from app.schemas.common import Message
from app.schemas.design import DesignOut
from app.schemas.order import OrderOut, OrderSummaryOut
from app.services.catalog import product_to_out
from app.services.designs import design_to_out
from app.services.orders import reorder_lines

router = APIRouter(prefix="/me", tags=["account"])


def _own_order(db, user, number: str) -> Order:
    order = db.scalar(select(Order).where(Order.number == number.upper(), Order.user_id == user.id))
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    return order


@router.get("/orders", response_model=list[OrderSummaryOut])
def my_orders(user: CurrentUser, db: DbSession) -> list[OrderSummaryOut]:
    orders = db.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()))
    out = []
    for o in orders:
        s = OrderSummaryOut.model_validate(o)
        s.item_count = sum(i.quantity for i in o.items)
        s.has_custom = o.has_custom_items
        out.append(s)
    return out


@router.get("/orders/{number}", response_model=OrderOut)
def my_order(number: str, user: CurrentUser, db: DbSession) -> Order:
    return _own_order(db, user, number)


@router.post("/orders/{number}/reorder")
def reorder(number: str, user: CurrentUser, db: DbSession) -> dict:
    return {"lines": reorder_lines(_own_order(db, user, number))}


@router.get("/designs", response_model=list[DesignOut])
def my_designs(user: CurrentUser, db: DbSession) -> list[DesignOut]:
    saved = db.scalars(select(SavedDesign).where(SavedDesign.user_id == user.id)
                       .order_by(SavedDesign.created_at.desc()))
    return [design_to_out(s.design) for s in saved]


@router.get("/favourites", response_model=list[ProductOut])
def favourites(user: CurrentUser, db: DbSession) -> list[ProductOut]:
    favs = db.scalars(select(Favourite).where(Favourite.user_id == user.id).order_by(Favourite.created_at.desc()))
    return [product_to_out(f.product) for f in favs if f.product.is_active]


@router.get("/favourites/ids", response_model=list[int])
def favourite_ids(user: CurrentUser, db: DbSession) -> list[int]:
    return list(db.scalars(select(Favourite.product_id).where(Favourite.user_id == user.id)))


@router.put("/favourites/{product_id}", response_model=Message)
def add_favourite(product_id: int, user: CurrentUser, db: DbSession) -> Message:
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design not found.")
    if db.get(Favourite, (user.id, product_id)) is None:
        db.add(Favourite(user_id=user.id, product_id=product_id))
        db.commit()
    return Message(message="Saved to favourites")


@router.delete("/favourites/{product_id}", response_model=Message)
def remove_favourite(product_id: int, user: CurrentUser, db: DbSession) -> Message:
    fav = db.get(Favourite, (user.id, product_id))
    if fav:
        db.delete(fav)
        db.commit()
    return Message(message="Removed from favourites")


class MeasurementIn(BaseModel):
    label: str = Field(default="My sizes", max_length=60)
    method: Literal["manual", "photo", "kit"] = "manual"
    fingers: dict[Literal["thumb", "index", "middle", "ring", "pinky"], dict]
    confidence: float | None = Field(default=None, ge=0, le=1)

    @field_validator("fingers")
    @classmethod
    def _valid(cls, value: dict) -> dict:
        if len(value) != 5:
            raise ValueError("Provide all five fingers.")
        for finger, data in value.items():
            size = data.get("size")
            if not isinstance(size, int) or not 0 <= size <= 9:
                raise ValueError(f"{finger}: size must be 0–9.")
            width = data.get("width_mm")
            if width is not None and not (3 < float(width) < 30):
                raise ValueError(f"{finger}: width looks wrong.")
        return {f: {"size": d["size"], "width_mm": d.get("width_mm")} for f, d in value.items()}


class MeasurementOut(MeasurementIn):
    id: int


@router.get("/measurements", response_model=list[MeasurementOut])
def measurements(user: CurrentUser, db: DbSession) -> list[NailMeasurement]:
    return list(db.scalars(select(NailMeasurement).where(NailMeasurement.user_id == user.id)
                           .order_by(NailMeasurement.created_at.desc())))


@router.post("/measurements", response_model=MeasurementOut, status_code=201)
def save_measurement(data: MeasurementIn, user: CurrentUser, db: DbSession) -> NailMeasurement:
    row = NailMeasurement(user_id=user.id, **data.model_dump())
    db.add(row)
    db.commit()
    return row


@router.delete("/measurements/{measurement_id}", response_model=Message)
def delete_measurement(measurement_id: int, user: CurrentUser, db: DbSession) -> Message:
    row = db.get(NailMeasurement, measurement_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    db.delete(row)
    db.commit()
    return Message(message="Deleted")


@router.post("/reviews/{product_id}", response_model=Message, status_code=201)
def write_review(product_id: int, data: ReviewIn, user: CurrentUser, db: DbSession) -> Message:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design not found.")
    # Reviews are moderated before they appear on the site.
    db.add(Review(product_id=product_id, user_id=user.id, author_name=user.full_name.split(" ")[0],
                  rating=data.rating, title=data.title, body=data.body, is_published=False))
    db.commit()
    return Message(message="Thanks! Your review will appear once it's approved.")
