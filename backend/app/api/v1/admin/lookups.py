"""Generic admin CRUD for design-element vocabularies (colours, finishes, shapes, charms ...)."""

from dataclasses import dataclass

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, DbSession
from app.models import (
    Category,
    Charm,
    Colour,
    Finish,
    NailShape,
    Occasion,
    Pattern,
    Product,
    ProductCharm,
    ProductColour,
    Style,
    Tag,
)
from app.models.catalog import product_occasions, product_patterns, product_tags
from app.schemas import catalog as s
from app.schemas.common import Message


@dataclass(frozen=True)
class LookupResource:
    path: str
    model: type
    schema_in: type[BaseModel]
    schema_out: type[BaseModel]
    label: str
    usage: object  # callable(db, id) -> int


def _fk_usage(column):
    return lambda db, id_: db.scalar(select(func.count()).where(column == id_)) or 0


def _assoc_usage(table, column_name):
    return lambda db, id_: db.scalar(select(func.count()).select_from(table).where(table.c[column_name] == id_)) or 0


RESOURCES = [
    LookupResource("colours", Colour, s.ColourIn, s.ColourOut, "colour",
                   _fk_usage(ProductColour.colour_id)),
    LookupResource("finishes", Finish, s.FinishIn, s.FinishOut, "finish", _fk_usage(Product.finish_id)),
    LookupResource("shapes", NailShape, s.ShapeIn, s.ShapeOut, "shape", _fk_usage(Product.shape_id)),
    LookupResource("charms", Charm, s.CharmIn, s.CharmOut, "charm", _fk_usage(ProductCharm.charm_id)),
    LookupResource("patterns", Pattern, s.PatternIn, s.PatternOut, "pattern",
                   _assoc_usage(product_patterns, "pattern_id")),
    LookupResource("categories", Category, s.CategoryIn, s.CategoryOut, "category", _fk_usage(Product.category_id)),
    LookupResource("styles", Style, s.LookupIn, s.LookupOut, "style", _fk_usage(Product.style_id)),
    LookupResource("occasions", Occasion, s.LookupIn, s.LookupOut, "occasion",
                   _assoc_usage(product_occasions, "occasion_id")),
    LookupResource("tags", Tag, s.LookupIn, s.LookupOut, "tag", _assoc_usage(product_tags, "tag_id")),
]


def build_router(res: LookupResource) -> APIRouter:
    router = APIRouter(prefix=f"/{res.path}", tags=[f"admin:{res.path}"])
    model, schema_in, schema_out = res.model, res.schema_in, res.schema_out

    def get_or_404(db, item_id: int):
        row = db.get(model, item_id)
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"That {res.label} doesn't exist.")
        return row

    def commit(db) -> None:
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(status.HTTP_409_CONFLICT, f"A {res.label} with that slug already exists.") from exc

    @router.get("", response_model=list[schema_out])
    def list_items(db: DbSession, _: AdminUser):
        return list(db.scalars(select(model).order_by(model.sort_order, model.name)))

    @router.post("", response_model=schema_out, status_code=201)
    def create_item(data: schema_in, db: DbSession, _: AdminUser):  # type: ignore[valid-type]
        row = model(**data.model_dump())
        db.add(row)
        commit(db)
        db.refresh(row)
        return row

    @router.put("/{item_id}", response_model=schema_out)
    def update_item(item_id: int, data: schema_in, db: DbSession, _: AdminUser):  # type: ignore[valid-type]
        row = get_or_404(db, item_id)
        for key, value in data.model_dump().items():
            setattr(row, key, value)
        commit(db)
        db.refresh(row)
        return row

    @router.delete("/{item_id}", response_model=Message)
    def delete_item(item_id: int, db: DbSession, _: AdminUser):
        row = get_or_404(db, item_id)
        used = res.usage(db, item_id)
        if used:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"This {res.label} is used by {used} product(s). Deactivate it instead so past designs stay intact.",
            )
        db.delete(row)
        db.commit()
        return Message(message=f"{res.label.title()} deleted")

    return router


router = APIRouter()
for resource in RESOURCES:
    router.include_router(build_router(resource))
