"""Admin operations: dashboard, orders, customers, custom-design review, AI requests, reviews."""

from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select

from app.api.deps import AdminUser, DbSession, OwnerUser
from app.models import AIRequest, CustomDesign, Order, Review, Role, User
from app.models.enums import OrderStatus
from app.schemas.catalog import ReviewOut
from app.schemas.common import Message, Page
from app.schemas.design import DesignOut, DesignReviewIn
from app.schemas.order import OrderOut, OrderStatusIn, OrderSummaryOut, PaymentStatusIn
from app.services import analytics
from app.services.designs import design_to_out
from app.services.orders import ALLOWED_TRANSITIONS, change_status

router = APIRouter()


# ------------------------------------------------------------------ dashboard / analytics


@router.get("/dashboard", tags=["admin:dashboard"])
def dashboard(db: DbSession, _: AdminUser, days: Annotated[int, Query(ge=7, le=365)] = 30) -> dict:
    return analytics.dashboard(db, days)


# ------------------------------------------------------------------ orders


def _summary(o: Order) -> OrderSummaryOut:
    s = OrderSummaryOut.model_validate(o)
    s.item_count = sum(i.quantity for i in o.items)
    s.customer_name = (o.shipping or {}).get("full_name", "")
    s.has_custom = o.has_custom_items
    return s


@router.get("/orders", response_model=Page[OrderSummaryOut], tags=["admin:orders"])
def list_orders(
    db: DbSession,
    _: AdminUser,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    custom_only: bool = False,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
) -> Page[OrderSummaryOut]:
    stmt = select(Order)
    if status_filter == "OPEN":
        stmt = stmt.where(Order.status.in_(analytics.OPEN_STATUSES))
    elif status_filter:
        stmt = stmt.where(Order.status == status_filter)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Order.number).like(like), func.lower(Order.email).like(like)))
    if custom_only:
        from app.models import OrderItem

        stmt = stmt.where(Order.items.any(OrderItem.kind == "custom"))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size))
    return Page(items=[_summary(o) for o in rows.unique()], total=total, page=page, page_size=page_size)


def _order(db, number: str) -> Order:
    order = db.scalar(select(Order).where(Order.number == number))
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    return order


@router.get("/orders/{number}", tags=["admin:orders"])
def get_order(number: str, db: DbSession, _: AdminUser) -> dict:
    order = _order(db, number)
    return {
        "order": OrderOut.model_validate(order).model_dump(mode="json"),
        "allowed_transitions": sorted(ALLOWED_TRANSITIONS[OrderStatus(order.status)]),
        "customer": {"id": order.user_id, "is_guest": order.user_id is None},
    }


@router.post("/orders/{number}/status", response_model=OrderOut, tags=["admin:orders"])
def set_order_status(number: str, data: OrderStatusIn, db: DbSession, admin: AdminUser) -> Order:
    return change_status(db, _order(db, number), data.status, data.note, admin, data.tracking_number, data.courier)


@router.post("/orders/{number}/payment", response_model=OrderOut, tags=["admin:orders"])
def set_payment(number: str, data: PaymentStatusIn, db: DbSession, _: AdminUser) -> Order:
    order = _order(db, number)
    order.payment_status = data.payment_status
    if data.payment_reference:
        order.payment_reference = data.payment_reference
    db.commit()
    db.refresh(order)
    return order


# ------------------------------------------------------------------ customers


class CustomerOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: str | None
    role: str
    is_active: bool
    orders: int
    lifetime_value_paise: int
    created_at: str


@router.get("/customers", response_model=Page[CustomerOut], tags=["admin:customers"])
def customers(
    db: DbSession,
    _: AdminUser,
    q: Annotated[str | None, Query(max_length=100)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
) -> Page[CustomerOut]:
    order_stats = (
        select(Order.user_id, func.count(Order.id).label("n"), func.coalesce(func.sum(Order.total_paise), 0).label("v"))
        .where(Order.status != OrderStatus.CANCELLED)
        .group_by(Order.user_id)
        .subquery()
    )
    stmt = select(User, order_stats.c.n, order_stats.c.v).join(Role).outerjoin(order_stats,
                                                                              order_stats.c.user_id == User.id)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(User.email).like(like), func.lower(User.full_name).like(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size))
    items = [
        CustomerOut(id=u.id, email=u.email, full_name=u.full_name, phone=u.phone, role=u.role_name,
                    is_active=u.is_active, orders=int(n or 0), lifetime_value_paise=int(v or 0),
                    created_at=u.created_at.isoformat())
        for u, n, v in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/customers/{user_id}/orders", response_model=list[OrderSummaryOut], tags=["admin:customers"])
def customer_orders(user_id: int, db: DbSession, _: AdminUser) -> list[OrderSummaryOut]:
    return [_summary(o) for o in db.scalars(select(Order).where(Order.user_id == user_id)
                                            .order_by(Order.created_at.desc()))]


class CustomerUpdateIn(BaseModel):
    is_active: bool | None = None
    role: Literal["customer", "staff", "admin"] | None = None


@router.patch("/customers/{user_id}", response_model=Message, tags=["admin:customers"])
def update_customer(user_id: int, data: CustomerUpdateIn, db: DbSession, owner: OwnerUser) -> Message:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if user.id == owner.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't change your own access.")
    if data.is_active is not None:
        user.is_active = data.is_active
        user.token_version += 1
    if data.role is not None:
        role = db.scalar(select(Role).where(Role.name == data.role))
        if role is None:
            role = Role(name=data.role)
            db.add(role)
            db.flush()
        user.role_id = role.id
        user.token_version += 1
    db.commit()
    return Message(message="Customer updated")


# ------------------------------------------------------------------ custom designs


@router.get("/custom-designs", response_model=Page[DesignOut], tags=["admin:designs"])
def custom_designs(
    db: DbSession,
    _: AdminUser,
    status_filter: Annotated[str | None, Query(alias="status")] = "submitted",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 24,
) -> Page[DesignOut]:
    stmt = select(CustomDesign)
    if status_filter and status_filter != "all":
        stmt = stmt.where(CustomDesign.status == status_filter)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(CustomDesign.updated_at.desc()).offset((page - 1) * page_size).limit(page_size))
    return Page(items=[design_to_out(d) for d in rows.unique()], total=total, page=page, page_size=page_size)


@router.post("/custom-designs/{public_id}/review", response_model=DesignOut, tags=["admin:designs"])
def review_design(public_id: str, data: DesignReviewIn, db: DbSession, _: AdminUser) -> DesignOut:
    design = db.scalar(select(CustomDesign).where(CustomDesign.public_id == public_id))
    if design is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design not found.")
    design.status = data.status
    design.review_notes = data.review_notes
    if data.price_paise is not None:
        design.price_paise = data.price_paise
    db.commit()
    db.refresh(design)
    return design_to_out(design)


# ------------------------------------------------------------------ AI requests


class AIRequestOut(BaseModel):
    id: int
    kind: str
    user_id: int | None
    input: dict
    output: dict
    result_product_ids: list[int]
    converted: bool
    converted_order_id: int | None
    needs_review: bool
    created_at: str


@router.get("/ai-requests", response_model=Page[AIRequestOut], tags=["admin:ai"])
def ai_requests(
    db: DbSession,
    _: AdminUser,
    kind: str | None = None,
    needs_review: bool | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
) -> Page[AIRequestOut]:
    stmt = select(AIRequest)
    if kind:
        stmt = stmt.where(AIRequest.kind == kind)
    if needs_review is not None:
        stmt = stmt.where(AIRequest.needs_review.is_(needs_review))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(AIRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size))
    items = [AIRequestOut(**{c: getattr(r, c) for c in AIRequestOut.model_fields if c != "created_at"},
                          created_at=r.created_at.isoformat()) for r in rows]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.post("/ai-requests/{request_id}/resolve", response_model=Message, tags=["admin:ai"])
def resolve_ai_request(request_id: int, db: DbSession, _: AdminUser) -> Message:
    row = db.get(AIRequest, request_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    row.needs_review = False
    db.commit()
    return Message(message="Marked as reviewed")


# ------------------------------------------------------------------ reviews moderation


class ReviewAdminOut(ReviewOut):
    is_published: bool
    is_featured: bool


class ReviewModerationIn(BaseModel):
    is_published: bool
    is_featured: bool = False


class ReviewCreateIn(BaseModel):
    product_id: int | None = None
    author_name: str = Field(min_length=1, max_length=80)
    rating: int = Field(ge=1, le=5)
    title: str = Field(default="", max_length=120)
    body: str = Field(min_length=3, max_length=2000)
    is_published: bool = True
    is_featured: bool = False


@router.get("/reviews", response_model=list[ReviewAdminOut], tags=["admin:reviews"])
def list_reviews(db: DbSession, _: AdminUser) -> list[ReviewAdminOut]:
    out = []
    for r in db.scalars(select(Review).order_by(Review.created_at.desc()).limit(200)):
        item = ReviewAdminOut.model_validate(r)
        if r.product:
            item.product_name, item.product_slug = r.product.name, r.product.slug
        out.append(item)
    return out


@router.post("/reviews", response_model=Message, status_code=201, tags=["admin:reviews"])
def create_review(data: ReviewCreateIn, db: DbSession, _: AdminUser) -> Message:
    db.add(Review(**data.model_dump()))
    db.commit()
    return Message(message="Review added")


@router.patch("/reviews/{review_id}", response_model=Message, tags=["admin:reviews"])
def moderate_review(review_id: int, data: ReviewModerationIn, db: DbSession, _: AdminUser) -> Message:
    review = db.get(Review, review_id)
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Review not found.")
    review.is_published, review.is_featured = data.is_published, data.is_featured and data.is_published
    db.commit()
    return Message(message="Review updated")


@router.delete("/reviews/{review_id}", response_model=Message, tags=["admin:reviews"])
def delete_review(review_id: int, db: DbSession, _: AdminUser) -> Message:
    review = db.get(Review, review_id)
    if review:
        db.delete(review)
        db.commit()
    return Message(message="Review deleted")
