"""Design Studio object serialization + complexity/tier pricing (Priorities 13-18)."""

from app.schemas.design import DesignConfig
from app.services.designs import Catalogue, compute_complexity, resolve_tier
from app.services.settings import DEFAULTS

API = "/api/v1"


def _base_config(**nails):
    return {"shape": "almond", "length": "medium", "base_colour": "baby-pink", "finish": "glossy", "nails": nails}


def _rich_nail():
    """One nail exercising every object type plus a chrome finish and a 3D charm."""
    return {
        "finish": "chrome",
        "charms": [{"charm": "3d-rose", "x": 0.5, "y": 0.5}],
        "objects": [
            {"type": "stroke", "id": "s1", "points": [{"x": 0.1, "y": 0.1}, {"x": 0.2, "y": 0.2}, {"x": 0.3, "y": 0.3}],
             "width": 2, "color": "#FFFFFF"},
            {"type": "stroke", "id": "s2", "points": [{"x": i / 20, "y": i / 20} for i in range(15)],
             "width": 2, "color": "#FFFFFF"},
            {"type": "shape", "id": "sh1", "shape": "circle", "x": 0.5, "y": 0.5, "fill": "#FFFFFF"},
            {"type": "text", "id": "t1", "x": 0.5, "y": 0.5, "text": "hi", "color": "#000000"},
            {"type": "gradient", "id": "g1", "stops": [{"color": "#FFFFFF", "offset": 0}, {"color": "#000000", "offset": 1}]},
            {"type": "french_tip", "id": "f1", "color": "#FFFFFF"},
            {"type": "image", "id": "i1", "x": 0.5, "y": 0.5, "url": "/media/paint/x.png"},
        ],
    }


def test_design_object_round_trips_through_the_schema():
    config = DesignConfig.model_validate(_base_config(L1=_rich_nail()))
    dumped = config.model_dump()
    assert len(dumped["nails"]["L1"]["objects"]) == 7
    # reloadable without losing editability: re-validating the dump gives back the same structured objects.
    again = DesignConfig.model_validate(dumped)
    assert [o.id for o in again.nails["L1"].objects] == ["s1", "s2", "sh1", "t1", "g1", "f1", "i1"]


def test_compute_complexity_matches_configured_weights(db):
    cat = Catalogue.load(db)
    weights = DEFAULTS["pricing"]["complexity_weights"]
    config = DesignConfig.model_validate(_base_config(L1=_rich_nail()))
    score = compute_complexity(config, cat, weights)
    expected = (
        weights["chrome_finish"] + weights["line_art"] + weights["freehand"] + weights["shape"]
        + weights["text"] + weights["gradient"] + weights["french_tip"] + weights["image"] + weights["decoration_3d"]
    )
    assert score == expected


def test_compute_complexity_is_zero_for_a_plain_design(db):
    cat = Catalogue.load(db)
    weights = DEFAULTS["pricing"]["complexity_weights"]
    config = DesignConfig.model_validate(_base_config(L1={}))
    assert compute_complexity(config, cat, weights) == 0


def test_resolve_tier_picks_the_matching_band_and_top_band_beyond_range():
    tiers = DEFAULTS["pricing"]["tiers"]
    assert resolve_tier(0, tiers)["name"] == "Essential"
    assert resolve_tier(5, tiers)["name"] == "Signature"
    assert resolve_tier(10_000, tiers)["name"] == tiers[-1]["name"]


def test_quote_endpoint_prices_a_rich_design_into_a_higher_tier(client):
    q = client.post(f"{API}/designs/quote", json=_base_config(L1=_rich_nail())).json()
    assert q["manufacturable"]
    assert q["complexity"] > 3
    assert q["tier"] != "Essential"
    assert q["price_paise"] > DEFAULTS["pricing"]["custom_base_paise"]


def test_quote_endpoint_zero_complexity_matches_essential_tier(client):
    q = client.post(f"{API}/designs/quote", json=_base_config(L1={})).json()
    assert q["complexity"] == 0
    assert q["tier"] == "Essential"


def test_design_object_rejects_out_of_range_coordinates(client):
    bad = _base_config(L1={"objects": [{"type": "shape", "id": "s1", "shape": "circle", "x": 5, "y": 0.5, "fill": "#FFF"}]})
    assert client.post(f"{API}/designs/quote", json=bad).status_code == 422


def test_design_object_rejects_oversized_stroke():
    bad = _base_config(L1={"objects": [{"type": "stroke", "id": "s1",
                                        "points": [{"x": 0.1, "y": 0.1}] * 401, "width": 2, "color": "#FFFFFF"}]})
    try:
        DesignConfig.model_validate(bad)
        raised = False
    except Exception:  # noqa: BLE001 — asserting Pydantic's ValidationError is raised, not its exact type
        raised = True
    assert raised


def test_design_object_rejects_unknown_discriminator(client):
    bad = _base_config(L1={"objects": [{"type": "sparkle-bomb", "id": "x1"}]})
    assert client.post(f"{API}/designs/quote", json=bad).status_code == 422
