"""Catalogue: products and the reusable design elements they are built from."""

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow


class LookupMixin:
    """Shared columns for admin-managed vocabularies (categories, styles, colours ...).

    `synonyms` feed the AI attribute parser, so the admin controls what customers can ask for.
    """

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    synonyms: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Category(LookupMixin, Base):
    __tablename__ = "categories"
    image_url: Mapped[str | None] = mapped_column(String(500))


class Style(LookupMixin, Base):
    __tablename__ = "styles"


class Occasion(LookupMixin, Base):
    __tablename__ = "occasions"


class Pattern(LookupMixin, Base):
    __tablename__ = "patterns"
    surcharge_paise: Mapped[int] = mapped_column(Integer, default=0)


class Tag(LookupMixin, Base):
    __tablename__ = "tags"


class Colour(LookupMixin, Base):
    __tablename__ = "colours"
    hex: Mapped[str] = mapped_column(String(7))
    family: Mapped[str] = mapped_column(String(30), default="neutral")  # pink, red, nude, metallic ...


class Finish(LookupMixin, Base):
    __tablename__ = "finishes"
    surcharge_paise: Mapped[int] = mapped_column(Integer, default=0)
    # "sparkle" level feeds the "not too flashy" preference (0 = matte/cream, 3 = glitter/chrome)
    flashiness: Mapped[int] = mapped_column(Integer, default=1)


class NailShape(LookupMixin, Base):
    __tablename__ = "nail_shapes"
    svg_key: Mapped[str] = mapped_column(String(30))  # renderer key: almond, coffin, square, oval, stiletto, squoval
    surcharge_paise: Mapped[int] = mapped_column(Integer, default=0)


class Charm(LookupMixin, TimestampMixin, Base):
    __tablename__ = "charms"
    __table_args__ = (CheckConstraint("stock >= 0", name="stock_non_negative"),)

    category: Mapped[str] = mapped_column(String(40), index=True)  # bow, pearl, star, gem, 3d, character ...
    asset_key: Mapped[str] = mapped_column(String(40))  # built-in vector render; image_url overrides
    image_url: Mapped[str | None] = mapped_column(String(500))
    price_paise: Mapped[int] = mapped_column(Integer, default=0)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    is_3d: Mapped[bool] = mapped_column(Boolean, default=False)
    flashiness: Mapped[int] = mapped_column(Integer, default=1)


product_tags = Table(
    "product_tags",
    Base.metadata,
    Column("product_id", ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)
product_patterns = Table(
    "product_patterns",
    Base.metadata,
    Column("product_id", ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("pattern_id", ForeignKey("patterns.id", ondelete="CASCADE"), primary_key=True),
)
product_occasions = Table(
    "product_occasions",
    Base.metadata,
    Column("product_id", ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("occasion_id", ForeignKey("occasions.id", ondelete="CASCADE"), primary_key=True),
)


class ProductColour(Base):
    __tablename__ = "product_colours"

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    colour_id: Mapped[int] = mapped_column(ForeignKey("colours.id", ondelete="CASCADE"), primary_key=True, index=True)
    role: Mapped[str] = mapped_column(String(10), default="accent")  # base | accent
    position: Mapped[int] = mapped_column(Integer, default=0)

    colour: Mapped[Colour] = relationship(lazy="joined")


class ProductCharm(Base):
    __tablename__ = "product_charms"

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    charm_id: Mapped[int] = mapped_column(ForeignKey("charms.id", ondelete="CASCADE"), primary_key=True, index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    charm: Mapped[Charm] = relationship(lazy="joined")


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (CheckConstraint("price_paise >= 0", name="price_non_negative"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    tagline: Mapped[str] = mapped_column(String(160), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    price_paise: Mapped[int] = mapped_column(Integer)
    compare_at_paise: Mapped[int | None] = mapped_column(Integer)

    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), index=True)
    style_id: Mapped[int | None] = mapped_column(ForeignKey("styles.id", ondelete="SET NULL"), index=True)
    shape_id: Mapped[int | None] = mapped_column(ForeignKey("nail_shapes.id", ondelete="SET NULL"), index=True)
    finish_id: Mapped[int | None] = mapped_column(ForeignKey("finishes.id", ondelete="SET NULL"), index=True)

    length: Mapped[str] = mapped_column(String(10), default="medium")
    difficulty: Mapped[str] = mapped_column(String(12), default="simple")
    # Subset of SIZE_OPTIONS; "CUSTOM" = made to the customer's per-finger sizes.
    available_sizes: Mapped[list[str]] = mapped_column(JSON, default=lambda: ["XS", "S", "M", "L", "CUSTOM"])
    # Procedural artwork spec used until real photos are uploaded (see frontend NailSetArt).
    art: Mapped[dict] = mapped_column(JSON, default=dict)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    popularity: Mapped[int] = mapped_column(Integer, default=0)  # denormalised units sold

    category: Mapped[Category | None] = relationship(lazy="joined")
    style: Mapped[Style | None] = relationship(lazy="joined")
    shape: Mapped[NailShape | None] = relationship(lazy="joined")
    finish: Mapped[Finish | None] = relationship(lazy="joined")
    images: Mapped[list["ProductImage"]] = relationship(
        cascade="all, delete-orphan", order_by="ProductImage.position", lazy="selectin"
    )
    colours: Mapped[list[ProductColour]] = relationship(
        cascade="all, delete-orphan", order_by="ProductColour.position", lazy="selectin"
    )
    charms: Mapped[list[ProductCharm]] = relationship(cascade="all, delete-orphan", lazy="selectin")
    tags: Mapped[list[Tag]] = relationship(secondary=product_tags, lazy="selectin")
    patterns: Mapped[list[Pattern]] = relationship(secondary=product_patterns, lazy="selectin")
    occasions: Mapped[list[Occasion]] = relationship(secondary=product_occasions, lazy="selectin")
    inventory: Mapped[list["Inventory"]] = relationship(cascade="all, delete-orphan", lazy="selectin")

    @property
    def base_colour(self) -> Colour | None:
        if not self.colours:
            return None
        return next((pc for pc in self.colours if pc.role == "base"), self.colours[0]).colour

    def stock_for(self, size_label: str) -> int | None:
        """Units in stock for a ready-made size kit; None = made to order (CUSTOM)."""
        if size_label == "CUSTOM":
            return None
        row = next((inv for inv in self.inventory if inv.size_label == size_label), None)
        return row.quantity if row else 0


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(500))
    alt: Mapped[str] = mapped_column(String(200), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)


class Inventory(Base):
    """Ready-to-ship stock for a product in a standard size kit (XS/S/M/L)."""

    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint("product_id", "size_label", name="product_size"),
        CheckConstraint("quantity >= 0", name="quantity_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    size_label: Mapped[str] = mapped_column(String(10))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=3)


class NailSize(Base):
    """Physical dimensions of Nifty Nails press-on sizes 0 (widest) … 9 (narrowest)."""

    __tablename__ = "nail_sizes"

    size: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    width_mm: Mapped[float] = mapped_column(Float)
    length_mm: Mapped[float | None] = mapped_column(Float)


class SizeKit(Base):
    """Standard kit label → per-finger sizes, e.g. M = thumb 2, index 5, middle 4, ring 5, pinky 8."""

    __tablename__ = "size_kits"

    label: Mapped[str] = mapped_column(String(10), primary_key=True)
    fingers: Mapped[dict] = mapped_column(JSON)  # {"thumb": 2, "index": 5, ...}
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class ProductEmbedding(Base):
    __tablename__ = "product_embeddings"

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    model: Mapped[str] = mapped_column(String(80))
    dim: Mapped[int] = mapped_column(Integer)
    # Sparse vectors from the hashing model are stored as {"i": [...], "v": [...]};
    # dense models store {"v": [...]}. pgvector can replace this column without API changes.
    vector: Mapped[dict] = mapped_column(JSON)
    text_hash: Mapped[str] = mapped_column(String(64))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Review(TimestampMixin, Base):
    __tablename__ = "reviews"
    __table_args__ = (CheckConstraint("rating BETWEEN 1 AND 5", name="rating_range"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    author_name: Mapped[str] = mapped_column(String(80))
    rating: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(120), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    product: Mapped[Product | None] = relationship()


class Favourite(Base):
    __tablename__ = "favourites"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    product: Mapped[Product] = relationship(lazy="joined")
