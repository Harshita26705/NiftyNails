from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import EmailStr
from sqlalchemy import func, select

from app.api.deps import DbSession, OptionalUser
from app.core.rate_limit import checkout_limiter
from app.models import Order
from app.schemas.order import CartQuoteIn, CartQuoteOut, CheckoutIn, CheckoutOut, OrderOut
from app.services.orders import create_order, quote_cart
from app.services.settings import get_setting

router = APIRouter(tags=["checkout"])


@router.post("/cart/quote", response_model=CartQuoteOut)
def cart_quote(data: CartQuoteIn, db: DbSession, user: OptionalUser) -> CartQuoteOut:
    return quote_cart(db, data.lines, user)


def payment_instructions(db, order: Order) -> str | None:
    if order.payment_method == "upi_manual":
        upi = get_setting(db, "site").get("upi_id")
        target = f"UPI ID {upi}" if upi else "the UPI ID we'll send by email"
        return (f"Pay ₹{order.total_paise / 100:,.0f} to {target} with note {order.number}. "
                "We'll confirm once payment is received.")
    if order.payment_method == "cod":
        return f"Pay ₹{order.total_paise / 100:,.0f} in cash or UPI when your order arrives."
    return None


@router.post("/orders", response_model=CheckoutOut, status_code=201, dependencies=[Depends(checkout_limiter)])
def checkout(data: CheckoutIn, db: DbSession, user: OptionalUser) -> CheckoutOut:
    order = create_order(db, data, user)
    return CheckoutOut(order=OrderOut.model_validate(order), payment_instructions=payment_instructions(db, order))


@router.get("/orders/track", response_model=OrderOut, dependencies=[Depends(checkout_limiter)])
def track_order(
    db: DbSession,
    number: Annotated[str, Query(min_length=6, max_length=20)],
    email: Annotated[EmailStr, Query()],
) -> Order:
    order = db.scalar(select(Order).where(Order.number == number.strip().upper(),
                                          func.lower(Order.email) == email.lower()))
    if order is None:
        # Same response whether the number or the email is wrong.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "We couldn't find an order with those details.")
    return order
