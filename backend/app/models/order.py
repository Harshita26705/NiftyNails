from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow
from app.models.design import CustomDesign


class Order(TimestampMixin, Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    email: Mapped[str] = mapped_column(String(254), index=True)
    # {"full_name", "phone", "line1", "line2", "city", "state", "pincode", "country"}
    shipping: Mapped[dict] = mapped_column(JSON)
    notes: Mapped[str] = mapped_column(Text, default="")

    subtotal_paise: Mapped[int] = mapped_column(Integer)
    shipping_paise: Mapped[int] = mapped_column(Integer, default=0)
    discount_paise: Mapped[int] = mapped_column(Integer, default=0)
    total_paise: Mapped[int] = mapped_column(Integer)

    payment_method: Mapped[str] = mapped_column(String(20))
    payment_status: Mapped[str] = mapped_column(String(12), default="PENDING", index=True)
    payment_reference: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(16), default="NEW", index=True)
    tracking_number: Mapped[str | None] = mapped_column(String(80))
    courier: Mapped[str | None] = mapped_column(String(60))

    items: Mapped[list["OrderItem"]] = relationship(cascade="all, delete-orphan", lazy="selectin")
    events: Mapped[list["OrderStatusEvent"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", order_by="OrderStatusEvent.created_at"
    )

    @property
    def has_custom_items(self) -> bool:
        return any(item.kind == "custom" for item in self.items)


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (CheckConstraint("quantity > 0", name="quantity_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(12))  # OrderItemKind
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), index=True)
    custom_design_id: Mapped[int | None] = mapped_column(ForeignKey("custom_designs.id", ondelete="SET NULL"))
    gift_bundle_id: Mapped[int | None] = mapped_column(ForeignKey("gift_bundles.id", ondelete="SET NULL"))
    gift_item_id: Mapped[int | None] = mapped_column(ForeignKey("gift_items.id", ondelete="SET NULL"))
    # Personalised card message etc.
    gift_message: Mapped[str | None] = mapped_column(Text)

    # Snapshots so historical orders never change when the catalogue does.
    name: Mapped[str] = mapped_column(String(160))
    image_url: Mapped[str | None] = mapped_column(String(500))
    unit_price_paise: Mapped[int] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    # {"label": "M"} or {"label": "CUSTOM", "fingers": {"thumb": 2, ...}}
    sizes: Mapped[dict | None] = mapped_column(JSON)
    snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    ai_request_id: Mapped[int | None] = mapped_column(ForeignKey("ai_requests.id", ondelete="SET NULL"))

    custom_design: Mapped[CustomDesign | None] = relationship(lazy="joined")
    customization: Mapped["OrderCustomization | None"] = relationship(
        cascade="all, delete-orphan", uselist=False, lazy="joined"
    )

    @property
    def line_total_paise(self) -> int:
        return self.unit_price_paise * self.quantity


class OrderCustomization(Base):
    """Production sheet for a custom line: exactly what the nail artist has to make."""

    __tablename__ = "order_customizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_item_id: Mapped[int] = mapped_column(ForeignKey("order_items.id", ondelete="CASCADE"), unique=True)
    shape: Mapped[str | None] = mapped_column(String(40))
    length: Mapped[str | None] = mapped_column(String(10))
    finish: Mapped[str | None] = mapped_column(String(40))
    base_colour: Mapped[str | None] = mapped_column(String(40))
    charms: Mapped[list[dict]] = mapped_column(JSON, default=list)  # [{"type": "bow", "quantity": 2}]
    sizes: Mapped[dict | None] = mapped_column(JSON)
    notes: Mapped[str] = mapped_column(Text, default="")


class OrderStatusEvent(Base):
    __tablename__ = "order_status_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(16))
    note: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
