"""The design configuration contract shared by the chat designer, the drawing editor and orders."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel

NAIL_KEYS = ("L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5")  # 1 = thumb … 5 = pinky
FINGER_BY_INDEX = {"1": "thumb", "2": "index", "3": "middle", "4": "ring", "5": "pinky"}
NailKey = Literal["L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"]


class CharmPlacement(BaseModel):
    charm: str = Field(max_length=80)
    x: float = Field(ge=0, le=1, description="Horizontal position relative to the nail box")
    y: float = Field(ge=0, le=1)
    scale: float = Field(default=1.0, ge=0.2, le=3.0)
    rotation: float = Field(default=0.0, ge=-720, le=720)


class NailConfig(BaseModel):
    colour: str | None = Field(default=None, max_length=80)
    finish: str | None = Field(default=None, max_length=80)
    pattern: str | None = Field(default=None, max_length=80)
    pattern_colour: str | None = Field(default=None, max_length=80)
    # PNG data URL from the editor (converted to a media URL on save) or an existing media URL.
    paint: str | None = Field(default=None, max_length=600_000)
    charms: list[CharmPlacement] = Field(default_factory=list, max_length=12)


class DesignConfig(BaseModel):
    version: int = 1
    shape: str = Field(max_length=80)
    length: Literal["short", "medium", "long", "xlong"] = "medium"
    base_colour: str = Field(max_length=80)
    finish: str = Field(max_length=80)
    nails: dict[NailKey, NailConfig] = Field(default_factory=dict)
    notes: str = Field(default="", max_length=1000)

    @field_validator("nails")
    @classmethod
    def _fill(cls, nails: dict[str, NailConfig]) -> dict[str, NailConfig]:
        return {key: nails.get(key, NailConfig()) for key in NAIL_KEYS}


class DesignIn(BaseModel):
    name: str = Field(default="My Nifty design", min_length=1, max_length=120)
    source: Literal["chat", "draw", "stylist"]
    config: DesignConfig
    brief: str = Field(default="", max_length=2000)
    submit_for_review: bool = False


class PriceLine(BaseModel):
    label: str
    amount_paise: int


class BomLine(BaseModel):
    element_type: str
    slug: str
    name: str
    quantity: int
    nail_positions: list[str]
    unit_cost_paise: int = 0


class DesignQuoteOut(BaseModel):
    price_paise: int
    breakdown: list[PriceLine]
    bill_of_materials: list[BomLine]
    warnings: list[str]
    manufacturable: bool


class DesignOut(ORMModel):
    id: int
    public_id: str
    name: str
    source: str
    status: str
    config: dict
    brief: str
    price_paise: int
    review_notes: str
    created_at: datetime
    updated_at: datetime
    bill_of_materials: list[BomLine] = []


class DesignReviewIn(BaseModel):
    status: Literal["in_review", "approved", "rejected"]
    review_notes: str = Field(default="", max_length=2000)
    price_paise: int | None = Field(default=None, ge=0)
