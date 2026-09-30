"""AI features. Every endpoint works offline with local, open-source models."""

import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.deps import DbSession, OptionalUser
from app.core.config import get_settings
from app.core.rate_limit import ai_limiter
from app.ml.sizing import REFERENCE_OBJECTS, hand_from_normalised
from app.schemas.ai import GiftOut, GiftRequestIn, ReferenceOptionOut, SearchIn, SearchOut, SizingOut, StylistOut
from app.services import ai as ai_service
from app.services.design_chat import ChatTurnIn, ChatTurnOut, DesignChat
from app.services.gifting import recommend_gifts
from app.storage.images import decode_image_bytes, to_rgb_array

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(ai_limiter)])


def _read_image(upload: UploadFile):
    limit = get_settings().max_upload_mb * 1024 * 1024
    data = upload.file.read(limit + 1)
    return decode_image_bytes(data)


@router.post("/search", response_model=SearchOut)
def smart_search(data: SearchIn, db: DbSession, user: OptionalUser) -> SearchOut:
    return ai_service.smart_search(db, data.query, data.limit, user.id if user else None)


@router.post("/stylist", response_model=StylistOut)
def outfit_stylist(
    db: DbSession,
    user: OptionalUser,
    image: Annotated[UploadFile, File(description="Outfit, saree, makeup or palette photo")],
    note: Annotated[str, Form(max_length=300)] = "",
) -> StylistOut:
    rgb = to_rgb_array(_read_image(image), max_side=900)
    return ai_service.stylist(db, rgb, note, user.id if user else None)


@router.post("/design-chat", response_model=ChatTurnOut)
def design_chat(data: ChatTurnIn, db: DbSession, user: OptionalUser) -> ChatTurnOut:
    out = DesignChat(db).turn(data)
    if out.complete:
        ai_service.log_request(db, "chat", user.id if user else None, {"message": data.message},
                               {"state": out.state.model_dump(), "price_paise": out.quote.price_paise if out.quote
                                else None, "notices": [n.model_dump() for n in out.notices]},
                               needs_review=any(n.kind == "unavailable" for n in out.notices))
    return out


@router.get("/sizing/references", response_model=list[ReferenceOptionOut])
def sizing_references() -> list[ReferenceOptionOut]:
    return [ReferenceOptionOut(key=k, label=v["label"], kind=v["kind"]) for k, v in REFERENCE_OBJECTS.items()]


@router.post("/sizing", response_model=SizingOut)
def photo_sizing(
    db: DbSession,
    user: OptionalUser,
    image: Annotated[UploadFile, File(description="Hand photo with a reference coin or card")],
    reference: Annotated[str, Form()] = "coin_10",
    custom_diameter_mm: Annotated[float | None, Form(gt=10, lt=45)] = None,
    landmarks: Annotated[str | None, Form(max_length=4000, description=(
        'Optional browser-detected hand: {"points": [[x, y] × 21 normalised], "handedness": "Left", "score": 0.9}'
    ))] = None,
) -> SizingOut:
    if reference not in REFERENCE_OBJECTS and reference != "custom":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Choose a reference object.")
    if reference == "custom" and not custom_diameter_mm:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Enter your coin's diameter in millimetres.")
    # Photo stays in memory only — it is never written to disk or logged.
    rgb = to_rgb_array(_read_image(image), max_side=1600)
    client_hand = None
    if landmarks:
        try:
            data = json.loads(landmarks)
            client_hand = hand_from_normalised(data["points"], rgb.shape[1], rgb.shape[0],
                                               str(data.get("handedness", "Unknown")), float(data.get("score", 0.8)))
        except (ValueError, KeyError, TypeError):
            client_hand = None
        if client_hand is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Hand landmarks were malformed.")
    return ai_service.photo_sizing(db, rgb, "coin_10" if reference == "custom" else reference,
                                   custom_diameter_mm, user.id if user else None, client_hand)


@router.post("/gift", response_model=GiftOut)
def gift_finder(data: GiftRequestIn, db: DbSession, user: OptionalUser) -> GiftOut:
    options, message = recommend_gifts(db, data)
    row = ai_service.log_request(db, "gift", user.id if user else None, data.model_dump(), {
        "options": [{"title": o.title, "total_paise": o.total_paise, "lines": [ln.name for ln in o.lines]}
                    for o in options], "message": message,
    }, [o.product.id for o in options if o.product])
    return GiftOut(request_id=row.id, options=options, message=message)
