from sqlalchemy import JSON, Boolean, CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.catalog import Product


class GiftItem(TimestampMixin, Base):
    """Non-nail add-ons: gift boxes, cards, care kits, accessories, packaging."""

    __tablename__ = "gift_items"
    __table_args__ = (CheckConstraint("stock >= 0", name="stock_non_negative"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    item_type: Mapped[str] = mapped_column(String(12), index=True)  # GiftItemType
    description: Mapped[str] = mapped_column(Text, default="")
    price_paise: Mapped[int] = mapped_column(Integer)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[str | None] = mapped_column(String(500))
    # Keywords the gift engine matches against ("barbie", "self-care", "minimal" ...)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_personalisable: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class GiftBundle(TimestampMixin, Base):
    """Curated bundle with an optional bundle price (discount vs. sum of parts)."""

    __tablename__ = "gift_bundles"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    bundle_price_paise: Mapped[int | None] = mapped_column(Integer)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"))
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    product: Mapped[Product | None] = relationship(lazy="joined")
    items: Mapped[list["GiftBundleItem"]] = relationship(cascade="all, delete-orphan", lazy="selectin")

    @property
    def parts_total_paise(self) -> int:
        product_price = self.product.price_paise if self.product else 0
        return product_price + sum(bi.item.price_paise * bi.quantity for bi in self.items)

    @property
    def price_paise(self) -> int:
        return self.bundle_price_paise if self.bundle_price_paise is not None else self.parts_total_paise


class GiftBundleItem(Base):
    __tablename__ = "gift_bundle_items"

    bundle_id: Mapped[int] = mapped_column(ForeignKey("gift_bundles.id", ondelete="CASCADE"), primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("gift_items.id", ondelete="CASCADE"), primary_key=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    item: Mapped[GiftItem] = relationship(lazy="joined")
