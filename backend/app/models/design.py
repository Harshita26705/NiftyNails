"""Customer-created designs and their manufacturable bill of materials."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow
from app.models.catalog import Colour, Finish, NailShape


class CustomDesign(TimestampMixin, Base):
    __tablename__ = "custom_designs"

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    source: Mapped[str] = mapped_column(String(12))  # DesignSource
    name: Mapped[str] = mapped_column(String(120), default="My Nifty design")

    shape_id: Mapped[int | None] = mapped_column(ForeignKey("nail_shapes.id", ondelete="SET NULL"))
    finish_id: Mapped[int | None] = mapped_column(ForeignKey("finishes.id", ondelete="SET NULL"))
    base_colour_id: Mapped[int | None] = mapped_column(ForeignKey("colours.id", ondelete="SET NULL"))
    length: Mapped[str] = mapped_column(String(10), default="medium")

    # Full editor/chat configuration (per-nail colours, patterns, charm placements, paint layers).
    config: Mapped[dict] = mapped_column(JSON)
    # Customer's own words (chat) or notes for the nail artist.
    brief: Mapped[str] = mapped_column(Text, default="")
    price_paise: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(12), default="draft", index=True)  # DesignStatus
    review_notes: Mapped[str] = mapped_column(Text, default="")

    shape: Mapped[NailShape | None] = relationship(lazy="joined")
    finish: Mapped[Finish | None] = relationship(lazy="joined")
    base_colour: Mapped[Colour | None] = relationship(lazy="joined")
    elements: Mapped[list["CustomDesignElement"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", back_populates="design"
    )


class CustomDesignElement(Base):
    """One line of the bill of materials, e.g. charm 'bow' × 2 on nails L2, R2."""

    __tablename__ = "custom_design_elements"

    id: Mapped[int] = mapped_column(primary_key=True)
    design_id: Mapped[int] = mapped_column(ForeignKey("custom_designs.id", ondelete="CASCADE"), index=True)
    element_type: Mapped[str] = mapped_column(String(12))  # DesignElementType
    element_id: Mapped[int] = mapped_column(Integer, index=True)
    element_slug: Mapped[str] = mapped_column(String(80))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    nail_positions: Mapped[list[str]] = mapped_column(JSON, default=list)
    unit_cost_paise: Mapped[int] = mapped_column(Integer, default=0)

    design: Mapped[CustomDesign] = relationship(back_populates="elements")


class SavedDesign(Base):
    """A design bookmarked in a customer's library (their own or a reordered one)."""

    __tablename__ = "saved_designs"
    __table_args__ = (UniqueConstraint("user_id", "design_id", name="user_design"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    design_id: Mapped[int] = mapped_column(ForeignKey("custom_designs.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    design: Mapped[CustomDesign] = relationship(lazy="joined")
