import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.models.enums import SIZE_OPTIONS
from app.schemas.common import ORMModel

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def _validate_slug(value: str) -> str:
    if not SLUG_RE.match(value):
        raise ValueError("Use lowercase letters, numbers and hyphens only (e.g. baby-pink).")
    return value


# ---------- Lookup vocabularies ----------


class LookupOut(ORMModel):
    id: int
    name: str
    slug: str
    description: str = ""
    synonyms: list[str] = []
    is_active: bool = True
    sort_order: int = 0


class ColourOut(LookupOut):
    hex: str
    family: str


class FinishOut(LookupOut):
    surcharge_paise: int
    flashiness: int


class ShapeOut(LookupOut):
    svg_key: str
    surcharge_paise: int


class PatternOut(LookupOut):
    surcharge_paise: int


class CategoryOut(LookupOut):
    image_url: str | None = None


class CharmOut(LookupOut):
    category: str
    asset_key: str
    image_url: str | None
    price_paise: int
    stock: int
    is_3d: bool
    flashiness: int


class LookupIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=2000)
    synonyms: list[str] = Field(default_factory=list, max_length=40)
    is_active: bool = True
    sort_order: int = 0

    _slug = field_validator("slug")(_validate_slug)

    @field_validator("synonyms")
    @classmethod
    def _clean_synonyms(cls, values: list[str]) -> list[str]:
        return sorted({v.strip().lower() for v in values if v.strip()})


class ColourIn(LookupIn):
    hex: str
    family: str = Field(default="neutral", max_length=30)

    @field_validator("hex")
    @classmethod
    def _hex(cls, value: str) -> str:
        if not HEX_RE.match(value):
            raise ValueError("Colour must be a hex value like #F7C6D9.")
        return value.upper()


class FinishIn(LookupIn):
    surcharge_paise: int = Field(default=0, ge=0)
    flashiness: int = Field(default=1, ge=0, le=3)


class ShapeIn(LookupIn):
    svg_key: Literal["almond", "coffin", "square", "oval", "stiletto", "squoval"]
    surcharge_paise: int = Field(default=0, ge=0)


class PatternIn(LookupIn):
    surcharge_paise: int = Field(default=0, ge=0)


class CategoryIn(LookupIn):
    image_url: str | None = Field(default=None, max_length=500)


class CharmIn(LookupIn):
    category: str = Field(min_length=1, max_length=40)
    asset_key: str = Field(min_length=1, max_length=40)
    image_url: str | None = Field(default=None, max_length=500)
    price_paise: int = Field(default=0, ge=0)
    stock: int = Field(default=0, ge=0)
    is_3d: bool = False
    flashiness: int = Field(default=1, ge=0, le=3)


# ---------- Products ----------


class ProductImageOut(ORMModel):
    id: int
    url: str
    alt: str
    position: int


class ProductColourOut(BaseModel):
    name: str
    slug: str
    hex: str
    role: str


class ProductCharmOut(BaseModel):
    name: str
    slug: str
    asset_key: str
    quantity: int


class RefOut(ORMModel):
    id: int
    name: str
    slug: str


class ShapeRefOut(RefOut):
    svg_key: str


class InventoryOut(ORMModel):
    size_label: str
    quantity: int
    low_stock_threshold: int


class ProductOut(BaseModel):
    """Card-level representation used in grids and search results."""

    id: int
    sku: str
    slug: str
    name: str
    tagline: str
    price_paise: int
    compare_at_paise: int | None
    category: RefOut | None
    style: RefOut | None
    shape: ShapeRefOut | None
    finish: RefOut | None
    length: str
    difficulty: str
    colours: list[ProductColourOut]
    charms: list[ProductCharmOut]
    tags: list[RefOut]
    images: list[ProductImageOut]
    art: dict
    is_featured: bool
    is_active: bool
    in_stock: bool


class ProductDetailOut(ProductOut):
    description: str
    patterns: list[RefOut]
    occasions: list[RefOut]
    available_sizes: list[str]
    size_availability: dict[str, int | None]  # label → units (None = made to order)
    rating_average: float | None
    rating_count: int


class ProductAdminOut(ProductDetailOut):
    inventory: list[InventoryOut]
    popularity: int
    created_at: datetime
    updated_at: datetime


class ProductColourIn(BaseModel):
    colour_id: int
    role: Literal["base", "accent"] = "accent"


class ProductCharmIn(BaseModel):
    charm_id: int
    quantity: int = Field(default=1, ge=1, le=50)


class InventoryIn(BaseModel):
    size_label: Literal["XS", "S", "M", "L"]
    quantity: int = Field(ge=0, le=100_000)
    low_stock_threshold: int = Field(default=3, ge=0)


class ProductIn(BaseModel):
    sku: str = Field(min_length=1, max_length=40)
    slug: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=120)
    tagline: str = Field(default="", max_length=160)
    description: str = Field(default="", max_length=5000)
    price_paise: int = Field(ge=0, le=10_000_000)
    compare_at_paise: int | None = Field(default=None, ge=0)
    category_id: int | None = None
    style_id: int | None = None
    shape_id: int | None = None
    finish_id: int | None = None
    length: Literal["short", "medium", "long", "xlong"] = "medium"
    difficulty: Literal["simple", "detailed", "intricate"] = "simple"
    available_sizes: list[str] = Field(default_factory=lambda: list(SIZE_OPTIONS))
    colours: list[ProductColourIn] = Field(default_factory=list)
    charms: list[ProductCharmIn] = Field(default_factory=list)
    tag_ids: list[int] = Field(default_factory=list)
    pattern_ids: list[int] = Field(default_factory=list)
    occasion_ids: list[int] = Field(default_factory=list)
    inventory: list[InventoryIn] = Field(default_factory=list)
    art: dict = Field(default_factory=dict)
    is_active: bool = True
    is_featured: bool = False

    _slug = field_validator("slug")(_validate_slug)

    @field_validator("available_sizes")
    @classmethod
    def _sizes(cls, values: list[str]) -> list[str]:
        invalid = set(values) - set(SIZE_OPTIONS)
        if invalid:
            raise ValueError(f"Unknown size option(s): {', '.join(sorted(invalid))}")
        return [s for s in SIZE_OPTIONS if s in values]


class ImageOrderIn(BaseModel):
    image_ids: list[int]


# ---------- Catalogue options & sizes ----------


class NailSizeOut(ORMModel):
    size: int
    width_mm: float
    length_mm: float | None


class NailSizeIn(BaseModel):
    size: int = Field(ge=0, le=9)
    width_mm: float = Field(gt=3, lt=30)
    length_mm: float | None = Field(default=None, gt=3, lt=60)


class SizeKitOut(ORMModel):
    label: str
    fingers: dict[str, int]
    sort_order: int


class SizeKitIn(BaseModel):
    label: Literal["XS", "S", "M", "L"]
    fingers: dict[Literal["thumb", "index", "middle", "ring", "pinky"], int]
    sort_order: int = 0

    @field_validator("fingers")
    @classmethod
    def _range(cls, value: dict[str, int]) -> dict[str, int]:
        if len(value) != 5 or any(not 0 <= v <= 9 for v in value.values()):
            raise ValueError("Provide a size between 0 and 9 for all five fingers.")
        return value


class CatalogOptionsOut(BaseModel):
    categories: list[CategoryOut]
    styles: list[LookupOut]
    occasions: list[LookupOut]
    patterns: list[PatternOut]
    tags: list[LookupOut]
    colours: list[ColourOut]
    finishes: list[FinishOut]
    shapes: list[ShapeOut]
    charms: list[CharmOut]
    nail_sizes: list[NailSizeOut]
    size_kits: list[SizeKitOut]
    price_range: tuple[int, int]


class ReviewOut(ORMModel):
    id: int
    author_name: str
    rating: int
    title: str
    body: str
    created_at: datetime
    product_name: str | None = None
    product_slug: str | None = None


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str = Field(default="", max_length=120)
    body: str = Field(min_length=3, max_length=2000)
