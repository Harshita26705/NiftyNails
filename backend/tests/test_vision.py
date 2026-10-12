"""Computer-vision tests on synthetic images with known geometry."""

import cv2
import numpy as np
import pytest

from app.ml.colour import delta_e, hex_to_lab
from app.ml.outfit import analyse_outfit
from app.ml.sizing import HandLandmarks, ReferenceFit, closest_size, detect_coin, estimate_sizes

SIZES = [(s, 18.0 - s) for s in range(10)]  # size 0 = 18 mm … size 9 = 9 mm
RATIOS = {"thumb": 0.8, "index": 0.76, "middle": 0.76, "ring": 0.75, "pinky": 0.74}
PX_PER_MM = 8.0
COIN_MM = 27.0


def test_delta_e_reference_values():
    # Sharma et al. CIEDE2000 test pair #1
    assert delta_e((50.0, 2.6772, -79.7751), (50.0, 0.0, -82.7485)) == pytest.approx(2.0425, abs=1e-3)
    assert delta_e(hex_to_lab("#FFFFFF"), hex_to_lab("#FFFFFF")) == 0


def test_closest_size_prefers_wider_when_between():
    assert closest_size(13.0, SIZES) == 5
    assert closest_size(12.6, SIZES) == 5  # between 5 (13 mm) and 6 (12 mm) → wider
    assert closest_size(12.6, SIZES, prefer_larger=False) == 5
    assert closest_size(30, SIZES) == 0
    assert closest_size(5, SIZES) == 9


# finger → (true finger width mm, base point, tip point) in pixels
FINGERS = {
    "thumb": (19.0, (170, 700), (130, 560)),
    "index": (16.0, (330, 480), (320, 300)),
    "middle": (16.5, (450, 460), (450, 260)),
    "ring": (15.5, (595, 480), (605, 300)),
    "pinky": (13.5, (715, 540), (735, 390)),
}


def _synthetic_hand():
    img = np.full((900, 1000, 3), 245, np.uint8)  # plain paper background
    skin = (224, 172, 150)
    # palm
    cv2.rectangle(img, (250, 500), (760, 820), skin, -1)
    for width_mm, base, tip in FINGERS.values():
        half = width_mm * PX_PER_MM / 2
        b, t = np.array(base, float), np.array(tip, float)
        axis = (t - b) / np.linalg.norm(t - b)
        n = np.array([-axis[1], axis[0]])
        start = b - axis * 120
        pts = np.array([start + n * half, t + n * half, t - n * half, start - n * half], np.int32)
        cv2.fillConvexPoly(img, pts, skin)
        cv2.circle(img, tuple(int(v) for v in t), int(half), skin, -1)
    # ₹10 coin, 27 mm → radius 108 px
    cv2.circle(img, (860, 150), int(COIN_MM * PX_PER_MM / 2), (150, 150, 158), -1)
    cv2.circle(img, (860, 150), int(COIN_MM * PX_PER_MM / 2) - 18, (170, 168, 172), 3)

    pts = np.zeros((21, 2))
    idx = {"thumb": (3, 4), "index": (7, 8), "middle": (11, 12), "ring": (15, 16), "pinky": (19, 20)}
    for f, (_, base, tip) in FINGERS.items():
        a, b = idx[f]
        pts[a], pts[b] = base, tip
    pts[5], pts[17] = (300, 620), (740, 640)  # knuckle span ≈ 55 mm
    pts[0] = (480, 860)
    return cv2.GaussianBlur(img, (3, 3), 0), HandLandmarks(points=pts, handedness="Right", score=0.97)


class FakeDetector:
    def __init__(self, hand):
        self.hand = hand

    def detect(self, rgb):
        return self.hand


def test_coin_detection_recovers_scale():
    img, hand = _synthetic_hand()
    fit = detect_coin(img, COIN_MM, hand)
    assert fit is not None
    assert fit.mm_per_px == pytest.approx(1 / PX_PER_MM, rel=0.04)
    assert fit.quality > 0.6


def test_sizing_pipeline_measures_known_widths():
    img, hand = _synthetic_hand()
    result = estimate_sizes(img, "coin_10", SIZES, RATIOS, detector=FakeDetector(hand))
    assert result.ok, result.warnings
    for finger, (true_width, _, _) in FINGERS.items():
        r = result.fingers[finger]
        assert r.width_mm == pytest.approx(true_width, abs=1.0), finger
        expected = closest_size(true_width * RATIOS[finger], SIZES)
        assert abs(r.size - expected) <= 1, finger
    assert result.preview_jpeg_b64


def test_sizing_without_reference_fails_honestly():
    img, hand = _synthetic_hand()
    cv2.circle(img, (860, 150), 120, (245, 245, 245), -1)  # remove the coin
    result = estimate_sizes(img, "coin_10", SIZES, RATIOS, detector=FakeDetector(hand))
    assert not result.ok
    assert result.recommendation == "manual"
    assert all(f.size is None for f in result.fingers.values())


def test_sizing_without_hand_fails_honestly():
    img, _ = _synthetic_hand()
    result = estimate_sizes(img, "coin_10", SIZES, RATIOS, detector=FakeDetector(None))
    assert not result.ok and "hand" in result.warnings[0]


def test_weak_reference_match_is_refused_not_calibrated_on(monkeypatch):
    # A geometrically weak reference match (cluttered background, steep tilt, partial occlusion) still
    # returns *some* mm_per_px — calibrating on it would produce confidently-wrong-looking sizes instead of
    # an honest "we're not sure", so it must be refused outright rather than silently used.
    img, hand = _synthetic_hand()
    weak = ReferenceFit(kind="coin", mm_per_px=1 / PX_PER_MM, quality=0.2, geometry={"cx": 860, "cy": 150, "r": 108})
    monkeypatch.setattr("app.ml.sizing.detect_coin", lambda *a, **k: weak)
    result = estimate_sizes(img, "coin_10", SIZES, RATIOS, detector=FakeDetector(hand))
    assert not result.ok
    assert result.recommendation == "manual"
    assert all(f.size is None for f in result.fingers.values())


def test_outfit_palette_and_metallic():
    img = np.full((600, 400, 3), (60, 60, 70), np.uint8)  # dark backdrop
    cv2.ellipse(img, (200, 330), (130, 250), 0, 0, 360, (242, 170, 196), -1)  # pink dress
    rng = np.random.default_rng(1)
    for _ in range(900):  # gold sequins
        x, y = rng.integers(110, 290), rng.integers(150, 560)
        cv2.circle(img, (int(x), int(y)), 2, (222, 184, 90), -1)
        cv2.circle(img, (int(x), int(y)), 1, (255, 246, 214), -1)
    result = analyse_outfit(img)
    dominant = result.palette[0]
    assert "pink" in dominant.name or "rose" in dominant.name or "blush" in dominant.name
    assert result.metallic == "gold"
    assert "glam" in result.keywords
