import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.core.rate_limit import upload_limiter
from app.models import CustomDesign, OrderItem, SavedDesign, User
from app.schemas.common import Message
from app.schemas.design import DesignConfig, DesignIn, DesignOut, DesignQuoteOut
from app.services.designs import design_to_out, quote, save_design

router = APIRouter(prefix="/designs", tags=["designs"])
EDITABLE = {"draft", "submitted", "rejected"}


def _visible(db, public_id: str, user: User | None) -> CustomDesign:
    design = db.scalar(select(CustomDesign).where(CustomDesign.public_id == public_id))
    if design is None or (design.user_id is not None and (user is None or design.user_id != user.id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design not found.")
    return design


@router.post("/quote", response_model=DesignQuoteOut)
def quote_design(config: DesignConfig, db: DbSession) -> DesignQuoteOut:
    return quote(db, config)


@router.post("", response_model=DesignOut, status_code=201, dependencies=[Depends(upload_limiter)])
def create_design(data: DesignIn, db: DbSession, user: OptionalUser) -> DesignOut:
    design = save_design(db, user_id=user.id if user else None, name=data.name, source=data.source,
                         config=data.config, brief=data.brief, submit=data.submit_for_review)
    if user:
        db.add(SavedDesign(user_id=user.id, design_id=design.id))
        db.commit()
    return design_to_out(design, db)


@router.get("/{public_id}", response_model=DesignOut)
def get_design(public_id: str, db: DbSession, user: OptionalUser) -> DesignOut:
    return design_to_out(_visible(db, public_id, user), db)


@router.put("/{public_id}", response_model=DesignOut, dependencies=[Depends(upload_limiter)])
def update_design(public_id: str, data: DesignIn, db: DbSession, user: CurrentUser) -> DesignOut:
    design = _visible(db, public_id, user)
    if design.user_id is None:
        design.user_id = user.id
    if design.status not in EDITABLE:
        raise HTTPException(status.HTTP_409_CONFLICT, "This design is already approved — duplicate it to make changes.")
    design = save_design(db, user_id=user.id, name=data.name, source=data.source, config=data.config,
                         brief=data.brief, submit=data.submit_for_review, existing=design)
    return design_to_out(design, db)


@router.post("/{public_id}/duplicate", response_model=DesignOut, status_code=201)
def duplicate_design(public_id: str, db: DbSession, user: CurrentUser) -> DesignOut:
    original = _visible(db, public_id, user)
    copy = CustomDesign(
        public_id=secrets.token_urlsafe(9)[:12], user_id=user.id, source=original.source,
        name=f"{original.name} (copy)"[:120], shape_id=original.shape_id, finish_id=original.finish_id,
        base_colour_id=original.base_colour_id, length=original.length, config=original.config,
        brief=original.brief, price_paise=original.price_paise, status="draft",
    )
    db.add(copy)
    db.flush()
    db.add(SavedDesign(user_id=user.id, design_id=copy.id))
    db.commit()
    # Re-save through the service so the bill of materials is rebuilt and validated.
    copy = save_design(db, user_id=user.id, name=copy.name, source=copy.source,
                       config=DesignConfig.model_validate(copy.config), brief=copy.brief, submit=False, existing=copy)
    return design_to_out(copy, db)


@router.delete("/{public_id}", response_model=Message)
def delete_design(public_id: str, db: DbSession, user: CurrentUser) -> Message:
    design = _visible(db, public_id, user)
    if design.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design not found.")
    if db.scalar(select(OrderItem.id).where(OrderItem.custom_design_id == design.id).limit(1)):
        # Keep ordered designs for production records; just remove from the customer's library.
        saved = db.scalar(select(SavedDesign).where(SavedDesign.user_id == user.id,
                                                    SavedDesign.design_id == design.id))
        if saved:
            db.delete(saved)
            db.commit()
        return Message(message="Removed from your designs")
    db.delete(design)
    db.commit()
    return Message(message="Design deleted")
