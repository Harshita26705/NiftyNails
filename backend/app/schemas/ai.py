from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.catalog import ProductOut


class UnavailableOut(BaseModel):
    requested: str
    kind: str
    reason: str
    suggestion_slug: str | None
    suggestion_name: str | None
    message: str


class ParsedAttributesOut(BaseModel):
    colours: list[str]
    excluded_colours: list[str]
    finishes: list[str]
    shapes: list[str]
    charms: dict[str, int | None]
    patterns: list[str]
    styles: list[str]
    categories: list[str]
    occasions: list[str]
    length: str | None
    price_min_paise: int | None
    price_max_paise: int | None
    flash_preference: str | None
    chips: list[str] = Field(description="Human-readable labels for the UI")


class MatchOut(BaseModel):
    product: ProductOut
    match_percent: int
    matched: list[str]
    missing: list[str]


class SearchIn(BaseModel):
    query: str = Field(min_length=2, max_length=600)
    limit: int = Field(default=9, ge=1, le=24)


class SearchOut(BaseModel):
    request_id: int
    attributes: ParsedAttributesOut
    unavailable: list[UnavailableOut]
    matches: list[MatchOut]
    message: str


class PaletteColourOut(BaseModel):
    hex: str
    weight: float
    name: str
    closest_catalogue_colour: dict | None


class StylistOut(BaseModel):
    request_id: int
    summary: str
    palette: list[PaletteColourOut]
    metallic: str | None
    pattern: str
    style_keywords: list[str]
    attributes: ParsedAttributesOut
    matches: list[MatchOut]
    custom_request_available: bool = True


class SkinToneOut(BaseModel):
    hex: str
    undertone: Literal["warm", "cool", "neutral"]
    depth: Literal["fair", "light", "medium", "tan", "deep"]


class ColourRecommendationOut(BaseModel):
    slug: str
    name: str
    hex: str
    reason: str


class ColorAnalysisOut(BaseModel):
    request_id: int
    summary: str
    tone: SkinToneOut
    recommended_colours: list[ColourRecommendationOut]
    matches: list[MatchOut]


class SizingFingerOut(BaseModel):
    finger: str
    width_mm: float | None
    nail_width_mm: float | None
    size: int | None
    confidence: float


class SizingOut(BaseModel):
    request_id: int | None
    ok: bool
    fingers: list[SizingFingerOut]
    overall_confidence: float
    confidence_label: Literal["high", "medium", "low"]
    recommendation: Literal["confident", "verify", "manual"]
    closest_kit: str | None
    reference: dict | None
    handedness: str | None
    warnings: list[str]
    preview_image: str | None


class ReferenceOptionOut(BaseModel):
    key: str
    label: str
    kind: str


class GiftRequestIn(BaseModel):
    description: str = Field(default="", max_length=800)
    recipient: str | None = Field(default=None, max_length=60)
    relationship: str | None = Field(default=None, max_length=60)
    age_range: str | None = Field(default=None, max_length=20)
    occasion: str | None = Field(default=None, max_length=60)
    favourite_colours: list[str] = Field(default_factory=list, max_length=8)
    style: str | None = Field(default=None, max_length=60)
    interests: list[str] = Field(default_factory=list, max_length=12)
    nail_preferences: str | None = Field(default=None, max_length=120)
    budget_rupees: int = Field(ge=100, le=100_000)


class GiftLineOut(BaseModel):
    kind: Literal["product", "gift_item"]
    id: int
    name: str
    price_paise: int
    item_type: str
    personalisable: bool = False


class GiftBundleOptionOut(BaseModel):
    title: str
    product: ProductOut | None
    lines: list[GiftLineOut]
    total_paise: int
    budget_left_paise: int
    match_percent: int | None
    reasons: list[str]
    bundle_id: int | None = None
    bundle_saving_paise: int = 0


class GiftOut(BaseModel):
    request_id: int
    options: list[GiftBundleOptionOut]
    message: str | None
