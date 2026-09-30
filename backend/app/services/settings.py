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
        # Design-studio complexity → tier pricing (Priority 14–18). Weight is added per matching object/effect
        # found anywhere across the ten nails; the weighted total maps to a tier band below.
        "complexity_weights": {
            "gradient": 1,
            "french_tip": 1,
            "shape": 1,
            "line_art": 2,       # a stroke made of few, short points (a simple line)
            "freehand": 4,       # a stroke made of many points (an illustration)
            "text": 1,
            "image": 2,
            "chrome_finish": 2,
            "decoration_3d": 3,  # charms flagged is_3d
        },
        "tiers": [
            {"name": "Essential", "min": 0, "max": 3, "price_paise": 79900},
            {"name": "Signature", "min": 4, "max": 7, "price_paise": 89900},
            {"name": "Atelier", "min": 8, "max": 12, "price_paise": 109900},
            {"name": "Couture", "min": 13, "max": 18, "price_paise": 139900},
            {"name": "Bespoke", "min": 19, "max": 999, "price_paise": 179900},
        ],
        "premium_finishes": {"chrome": 5000, "cat-eye": 3000, "glazed": 3000},
        "min_price_paise": 59900,
        "max_price_paise": 499900,
    },
    "site": {
        "announcement": "Free shipping on orders over ₹999 · Every set handmade in India",
        "hero_title": "Your nails, considered.",
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
