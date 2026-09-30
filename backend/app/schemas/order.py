import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.common import ORMModel

PINCODE_RE = re.compile(r"^[1-9][0-9]{5}$")
PHONE_RE = re.compile(r"^(?:\+?91[\s-]?)?[6-9]\d{9}$")

Finger = Literal["thumb", "index", "middle", "ring", "pinky"]


class SizeSelection(BaseModel):
    label: Literal["XS", "S", "M", "L", "CUSTOM"]
    fingers: dict[Finger, int] | None = None

    @model_validator(mode="after")
    def _custom_needs_fingers(self) -> "SizeSelection":
        if self.label == "CUSTOM":
            if not self.fingers or len(self.fingers) != 5:
                raise ValueError("Custom sizing needs a size for all five fingers.")
            if any(not 0 <= v <= 9 for v in self.fingers.values()):
                raise ValueError("Sizes run from 0 to 9.")
        return self


class CartLineIn(BaseModel):
    kind: Literal["product", "custom", "gift_bundle", "gift_item"]
    product_id: int | None = None
    design_public_id: str | None = Field(default=None, max_length=16)
    gift_bundle_id: int | None = None
    gift_item_id: int | None = None
    quantity: int = Field(default=1, ge=1, le=10)
    size: SizeSelection | None = None
    gift_message: str | None = Field(default=None, max_length=300)
    ai_request_id: int | None = None

    @model_validator(mode="after")
    def _reference(self) -> "CartLineIn":
        needed = {"product": self.product_id, "custom": self.design_public_id,
                  "gift_bundle": self.gift_bundle_id, "gift_item": self.gift_item_id}[self.kind]
        if needed is None:
            raise ValueError(f"A {self.kind} line needs its id.")
        if self.kind in ("product", "custom") and self.size is None:
            raise ValueError("Please choose a size.")
        return self


class CartQuoteIn(BaseModel):
    lines: list[CartLineIn] = Field(max_length=30)


class QuotedLine(BaseModel):
    index: int
    kind: str
    name: str
    image_url: str | None
    art: dict | None = None
    design_config: dict | None = None
    unit_price_paise: int
    quantity: int
    line_total_paise: int
    size: SizeSelection | None
    lead_days: int
    issues: list[str]


class CartQuoteOut(BaseModel):
    lines: list[QuotedLine]
    subtotal_paise: int
    shipping_paise: int
    discount_paise: int
    total_paise: int
    free_shipping_threshold_paise: int
    free_shipping_remaining_paise: int
    estimated_dispatch_days: int
    valid: bool


class ShippingIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(max_length=16)
    line1: str = Field(min_length=3, max_length=200)
    line2: str = Field(default="", max_length=200)
    city: str = Field(min_length=2, max_length=80)
    state: str = Field(min_length=2, max_length=80)
    pincode: str
    country: Literal["IN"] = "IN"

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        if not PHONE_RE.match(v.strip()):
            raise ValueError("Enter a valid 10-digit Indian mobile number.")
        return re.sub(r"\D", "", v)[-10:]

    @field_validator("pincode")
    @classmethod
    def _pin(cls, v: str) -> str:
        if not PINCODE_RE.match(v.strip()):
            raise ValueError("Enter a valid 6-digit PIN code.")
        return v.strip()


class CheckoutIn(BaseModel):
    lines: list[CartLineIn] = Field(min_length=1, max_length=30)
    email: EmailStr
    shipping: ShippingIn
    payment_method: Literal["cod", "upi_manual"]
    notes: str = Field(default="", max_length=1000)


class OrderEventOut(ORMModel):
    status: str
    note: str
    created_at: datetime


class OrderCustomizationOut(ORMModel):
    shape: str | None
    length: str | None
    finish: str | None
    base_colour: str | None
    charms: list[dict]
    sizes: dict | None
    notes: str


class OrderItemOut(ORMModel):
    id: int
    kind: str
    product_id: int | None
    custom_design_id: int | None
    gift_bundle_id: int | None
    gift_item_id: int | None
    name: str
    image_url: str | None
    unit_price_paise: int
    quantity: int
    line_total_paise: int
    sizes: dict | None
    snapshot: dict
    gift_message: str | None
    customization: OrderCustomizationOut | None


class OrderOut(ORMModel):
    id: int
    number: str
    email: str
    shipping: dict
    notes: str
    subtotal_paise: int
    shipping_paise: int
    discount_paise: int
    total_paise: int
    payment_method: str
    payment_status: str
    status: str
    tracking_number: str | None
    courier: str | None
    created_at: datetime
    items: list[OrderItemOut]
    events: list[OrderEventOut]


class OrderSummaryOut(ORMModel):
    id: int
    number: str
    email: str
    total_paise: int
    status: str
    payment_status: str
    payment_method: str
    created_at: datetime
    item_count: int = 0
    customer_name: str = ""
    has_custom: bool = False


class CheckoutOut(BaseModel):
    order: OrderOut
    payment_instructions: str | None


class OrderStatusIn(BaseModel):
    status: Literal["NEW", "DESIGN_REVIEW", "APPROVED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED", "CANCELLED"]
    note: str = Field(default="", max_length=1000)
    tracking_number: str | None = Field(default=None, max_length=80)
    courier: str | None = Field(default=None, max_length=60)


class PaymentStatusIn(BaseModel):
    payment_status: Literal["PENDING", "PAID", "FAILED", "REFUNDED"]
    payment_reference: str | None = Field(default=None, max_length=120)
