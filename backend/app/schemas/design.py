"""The design configuration contract shared by the chat designer, the drawing editor and orders."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel

NAIL_KEYS = ("L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5")  # 1 = thumb … 5 = pinky
FINGER_BY_INDEX = {"1": "thumb", "2": "index", "3": "middle", "4": "ring", "5": "pinky"}
NailKey = Literal["L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"]

HEX = r"^#[0-9a-fA-F]{3,8}$"


class CharmPlacement(BaseModel):
    charm: str = Field(max_length=80)
    x: float = Field(ge=0, le=1, description="Horizontal position relative to the nail box")
    y: float = Field(ge=0, le=1)
    scale: float = Field(default=1.0, ge=0.2, le=3.0)
    rotation: float = Field(default=0.0, ge=-720, le=720)


# ------------------------------------------------------------------ design studio objects (freehand/shapes/text/
# gradients/French tips). Structured and editable — never flattened to a bitmap. `charms` above stay separate:
# they're physical, stock-tracked decorations with bill-of-materials implications; these are purely visual.


class ObjectBase(BaseModel):
    id: str = Field(max_length=40)
    name: str = Field(default="", max_length=40)
    hidden: bool = False
    locked: bool = False
    opacity: float = Field(default=1.0, ge=0, le=1)


class Point(BaseModel):
    x: float = Field(ge=-0.2, le=1.2)
    y: float = Field(ge=-0.2, le=1.2)


class StrokeObject(ObjectBase):
    type: Literal["stroke"] = "stroke"
    points: list[Point] = Field(min_length=2, max_length=400)
    width: float = Field(ge=0.2, le=20)
    color: str = Field(pattern=HEX)
    brush: Literal["round", "flat", "marker"] = "round"


class ShapeObject(ObjectBase):
    type: Literal["shape"] = "shape"
    shape: Literal["circle", "rect", "rounded_rect", "triangle", "polygon", "star", "heart", "diamond", "line"]
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    scale: float = Field(default=1.0, ge=0.05, le=4)
    rotation: float = Field(default=0.0, ge=-720, le=720)
    fill: str | None = Field(default=None, pattern=HEX)
    stroke: str | None = Field(default=None, pattern=HEX)
    stroke_width: float = Field(default=0, ge=0, le=10)
    sides: int = Field(default=6, ge=3, le=12)


class TextObject(ObjectBase):
    type: Literal["text"] = "text"
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    scale: float = Field(default=1.0, ge=0.2, le=4)
    rotation: float = Field(default=0.0, ge=-720, le=720)
    text: str = Field(max_length=60)
    font: Literal["display", "sans"] = "sans"
    size: float = Field(default=12, ge=4, le=40)
    color: str = Field(pattern=HEX)
    align: Literal["left", "center", "right"] = "center"


class GradientStop(BaseModel):
    color: str = Field(pattern=HEX)
    offset: float = Field(ge=0, le=1)


class GradientObject(ObjectBase):
    type: Literal["gradient"] = "gradient"
    stops: list[GradientStop] = Field(min_length=2, max_length=6)
    angle: float = Field(default=180, ge=0, le=360)


class FrenchTipObject(ObjectBase):
    type: Literal["french_tip"] = "french_tip"
    style: Literal["classic", "deep", "micro", "colored", "double", "asymmetric"] = "classic"
    color: str = Field(pattern=HEX)
    secondary_color: str | None = Field(default=None, pattern=HEX)
    depth: float = Field(default=0.22, ge=0.04, le=0.65)
    curve: float = Field(default=0.5, ge=0, le=1)
    thickness: float = Field(default=1.0, ge=0.2, le=2)
    offset_x: float = Field(default=0, ge=-0.3, le=0.3)
    offset_y: float = Field(default=0, ge=-0.2, le=0.2)


class ImageObject(ObjectBase):
    type: Literal["image"] = "image"
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    scale: float = Field(default=1.0, ge=0.05, le=4)
    rotation: float = Field(default=0.0, ge=-720, le=720)
    # Data URL from the editor (converted to a media URL on save) or an existing media URL — same handling as `paint`.
    url: str = Field(max_length=600_000)


DesignObject = Annotated[
    StrokeObject | ShapeObject | TextObject | GradientObject | FrenchTipObject | ImageObject,
    Field(discriminator="type"),
]


class NailConfig(BaseModel):
    colour: str | None = Field(default=None, max_length=80)
    finish: str | None = Field(default=None, max_length=80)
    pattern: str | None = Field(default=None, max_length=80)
    pattern_colour: str | None = Field(default=None, max_length=80)
    # PNG data URL from the editor (converted to a media URL on save) or an existing media URL.
    paint: str | None = Field(default=None, max_length=600_000)
    charms: list[CharmPlacement] = Field(default_factory=list, max_length=12)
    # Freehand strokes, shapes, text, gradients and French tips — rendered in order, clipped to the nail outline.
    objects: list[DesignObject] = Field(default_factory=list, max_length=60)


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
    complexity: int = 0
    tier: str = "Essential"


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
    complexity: int = 0
    tier: str = "Essential"


class DesignReviewIn(BaseModel):
    status: Literal["in_review", "approved", "rejected", "production", "completed", "cancelled"]
    review_notes: str = Field(default="", max_length=2000)
    price_paise: int | None = Field(default=None, ge=0)
