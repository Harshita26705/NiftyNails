"""Admin-editable settings with safe defaults (stored as JSON rows in site_settings)."""

from copy import deepcopy

from sqlalchemy.orm import Session

from app.models import SiteSetting

DEFAULTS: dict[str, dict] = {
    "pricing": {
        "custom_base_paise": 79900,
        "painted_nail_paise": 3000,
        "length_surcharge_paise": {"short": 0, "medium": 0, "long": 10000, "xlong": 20000},
        "custom_fit_surcharge_paise": 0,
        "shipping_flat_paise": 7900,
        "free_shipping_over_paise": 99900,
        "cod_fee_paise": 0,
        "custom_lead_days": 7,
        "ready_lead_days": 2,
    },
    "site": {
        "announcement": "Free shipping on orders over ₹999 · Every set handmade in India",
        "hero_title": "Nails that feel like you.",
        "hero_subtitle": "Handmade press-ons, designed with you — sized by AI, finished by hand.",
        "instagram_handle": "niftynails.in",
        "support_email": "hello@niftynails.in",
        "whatsapp": "",
        "upi_id": "",
    },
    "sizing": {
        # Nail width ≈ finger width × ratio (distal phalanx). Tune with your own measured data.
        "nail_to_finger_ratio": {"thumb": 0.80, "index": 0.76, "middle": 0.76, "ring": 0.75, "pinky": 0.74},
        "min_confidence": 0.6,
        "prefer_larger_between_sizes": True,
    },
}


def get_setting(db: Session, key: str) -> dict:
    default = deepcopy(DEFAULTS.get(key, {}))
    row = db.get(SiteSetting, key)
    if row is None:
        return default
    merged = default
    for k, v in (row.value or {}).items():
        merged[k] = {**merged[k], **v} if isinstance(v, dict) and isinstance(merged.get(k), dict) else v
    return merged


def set_setting(db: Session, key: str, value: dict) -> dict:
    row = db.get(SiteSetting, key)
    if row is None:
        row = SiteSetting(key=key, value=value)
        db.add(row)
    else:
        row.value = value
    db.commit()
    return get_setting(db, key)
