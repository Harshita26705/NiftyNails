"""Nail size estimation from a photo of a hand next to a reference object.

This is an *estimation tool* built on measurable geometry — not a biometric system and not an
LLM guess. The photo is processed in memory and never stored.

Pipeline
1. Hand landmarks (MediaPipe Hand Landmarker, free/open model) → where each distal phalanx is.
2. Reference object (coin via Hough circles + ellipse refinement, or bank card via quad contour),
   searched outside the hand region → millimetres per pixel.
3. For each finger: sample several lines perpendicular to the DIP→TIP axis across the nail bed,
   find the finger edges from the colour profile, take the robust median width.
4. Nail width ≈ finger width × per-finger ratio (admin tunable) → closest Nifty size (0 … 9).
5. Confidence = reference fit × image sharpness × landmark quality × measurement consistency ×
   anatomical plausibility. Low confidence ⇒ recommend manual measurement / sizing kit.
"""

import base64
import logging
import math
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Protocol

import cv2
import numpy as np

from app.models.enums import FINGERS

log = logging.getLogger(__name__)

# Physical reference objects (mm).
REFERENCE_OBJECTS: dict[str, dict] = {
    "coin_1": {"label": "₹1 coin (2019 series)", "kind": "coin", "diameter_mm": 20.0},
    "coin_2": {"label": "₹2 coin (2019 series)", "kind": "coin", "diameter_mm": 23.0},
    "coin_5": {"label": "₹5 coin (2019 series)", "kind": "coin", "diameter_mm": 25.0},
    "coin_10": {"label": "₹10 coin", "kind": "coin", "diameter_mm": 27.0},
    "card": {"label": "Bank / ID card", "kind": "card", "width_mm": 85.60, "height_mm": 53.98},
}

# MediaPipe landmark indices: (base-of-distal-segment, tip) per finger.
DISTAL = {"thumb": (3, 4), "index": (7, 8), "middle": (11, 12), "ring": (15, 16), "pinky": (19, 20)}
# Plausible adult finger widths at the nail bed (mm) — outside this range the measurement is suspect.
PLAUSIBLE_WIDTH_MM = {"thumb": (12.0, 24.0), "index": (9.5, 20.0), "middle": (9.5, 20.0),
                      "ring": (9.0, 19.5), "pinky": (7.5, 17.0)}


@dataclass
class HandLandmarks:
    points: np.ndarray  # (21, 2) pixel coordinates
    handedness: str  # "Left" | "Right"
    score: float


class HandDetector(Protocol):
    def detect(self, rgb: np.ndarray) -> HandLandmarks | None: ...


class MediaPipeHandDetector:
    def __init__(self, model_path: Path):
        from mediapipe.tasks.python import BaseOptions, vision

        options = vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(model_path)),
            running_mode=vision.RunningMode.IMAGE,
            num_hands=1,
            min_hand_detection_confidence=0.4,
            min_hand_presence_confidence=0.4,
        )
        self._landmarker = vision.HandLandmarker.create_from_options(options)

    def detect(self, rgb: np.ndarray) -> HandLandmarks | None:
        import mediapipe as mp

        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
        result = self._landmarker.detect(image)
        if not result.hand_landmarks:
            return None
        h, w = rgb.shape[:2]
        pts = np.array([[lm.x * w, lm.y * h] for lm in result.hand_landmarks[0]], dtype=np.float64)
        handed = result.handedness[0][0] if result.handedness else None
        return HandLandmarks(
            points=pts,
            handedness=handed.category_name if handed else "Unknown",
            score=float(handed.score) if handed else 0.5,
        )


def hand_from_normalised(points: list[list[float]], width: int, height: int, handedness: str = "Unknown",
                         score: float = 0.8) -> HandLandmarks | None:
    """Validate client-supplied landmarks (21 normalised [x, y] pairs) and convert to pixels."""
    if len(points) != 21 or any(len(p) < 2 for p in points):
        return None
    arr = np.array([[float(p[0]), float(p[1])] for p in points])
    if not np.isfinite(arr).all() or (arr < -0.1).any() or (arr > 1.1).any():
        return None
    arr[:, 0] *= width
    arr[:, 1] *= height
    if np.linalg.norm(arr[5] - arr[17]) < 10:  # degenerate hand
        return None
    return HandLandmarks(points=arr, handedness=handedness if handedness in ("Left", "Right") else "Unknown",
                         score=float(min(max(score, 0.0), 1.0)))


@lru_cache
def get_hand_detector() -> HandDetector | None:
    from app.core.config import get_settings

    path = get_settings().hand_landmarker_model
    if not path.exists():
        log.warning("Hand landmarker model missing at %s — photo sizing disabled", path)
        return None
    try:
        return MediaPipeHandDetector(path)
    except Exception:  # noqa: BLE001
        log.exception("Could not initialise MediaPipe hand landmarker")
        return None


# ---------------------------------------------------------------------------- reference detection


@dataclass
class ReferenceFit:
    kind: str
    mm_per_px: float
    quality: float  # 0‥1
    geometry: dict = field(default_factory=dict)


def _hand_exclusion_mask(shape: tuple[int, int], hand: HandLandmarks | None) -> np.ndarray:
    mask = np.zeros(shape, np.uint8)
    if hand is not None:
        hull = cv2.convexHull(hand.points.astype(np.int32))
        cv2.fillConvexPoly(mask, hull, 255)
        span = float(np.linalg.norm(hand.points[5] - hand.points[17]))
        k = max(3, int(span * 0.35)) | 1
        mask = cv2.dilate(mask, np.ones((k, k), np.uint8))
    return mask


def _circle_edge_support(edges: np.ndarray, cx: float, cy: float, r: float) -> float:
    angles = np.linspace(0, 2 * np.pi, 120, endpoint=False)
    h, w = edges.shape
    hits = 0
    for a in angles:
        found = False
        for dr in (-2, -1, 0, 1, 2):
            x = int(round(cx + (r + dr) * math.cos(a)))
            y = int(round(cy + (r + dr) * math.sin(a)))
            if 0 <= x < w and 0 <= y < h and edges[y, x]:
                found = True
                break
        hits += found
    return hits / len(angles)


def detect_coin(rgb: np.ndarray, diameter_mm: float, hand: HandLandmarks | None) -> ReferenceFit | None:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape
    blurred = cv2.medianBlur(gray, 5)
    edges = cv2.Canny(blurred, 40, 120)
    exclusion = _hand_exclusion_mask(gray.shape, hand)

    if hand is not None:
        # Coins are 20–27 mm; a hand's index-to-pinky knuckle span is ~55–90 mm.
        span = float(np.linalg.norm(hand.points[5] - hand.points[17]))
        r_min, r_max = int(span * 0.09), int(span * 0.32)
    else:
        r_min, r_max = int(min(h, w) * 0.03), int(min(h, w) * 0.25)
    r_min, r_max = max(r_min, 8), max(r_max, 16)

    circles = cv2.HoughCircles(blurred, cv2.HOUGH_GRADIENT, dp=1.2, minDist=r_min * 2, param1=120, param2=28,
                               minRadius=r_min, maxRadius=r_max)
    if circles is None:
        return None
    best: tuple[float, float, float, float] | None = None
    for cx, cy, r in circles[0][:25]:
        ix, iy = int(cx), int(cy)
        if not (0 <= ix < w and 0 <= iy < h) or exclusion[iy, ix]:
            continue
        support = _circle_edge_support(edges, cx, cy, r)
        if best is None or support > best[3]:
            best = (float(cx), float(cy), float(r), support)
    if best is None or best[3] < 0.35:
        return None

    cx, cy, r, support = best
    # Sub-pixel refinement: fit an ellipse to edge points near the Hough circle.
    ys, xs = np.nonzero(edges)
    dist = np.hypot(xs - cx, ys - cy)
    ring = (np.abs(dist - r) < max(3.0, r * 0.08))
    diameter_px = 2 * r
    ellipse_ratio = 1.0
    if ring.sum() >= 20:
        pts = np.stack([xs[ring], ys[ring]], axis=1).astype(np.float32)
        (_, _), (ax1, ax2), _ = cv2.fitEllipse(pts)
        major, minor = max(ax1, ax2), min(ax1, ax2)
        if 0.7 * diameter_px < major < 1.3 * diameter_px:
            diameter_px = major  # the major axis is unaffected by tilt foreshortening
            ellipse_ratio = minor / major
    tilt_penalty = 1.0 if ellipse_ratio > 0.93 else max(0.3, (ellipse_ratio - 0.7) / 0.23)
    quality = min(1.0, support * 1.25) * tilt_penalty
    return ReferenceFit(
        kind="coin",
        mm_per_px=diameter_mm / diameter_px,
        quality=round(quality, 3),
        geometry={"cx": cx, "cy": cy, "r": diameter_px / 2, "ellipse_ratio": round(ellipse_ratio, 3)},
    )


def detect_card(rgb: np.ndarray, hand: HandLandmarks | None) -> ReferenceFit | None:
    card = REFERENCE_OBJECTS["card"]
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    edges = cv2.dilate(cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 30, 100), np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    exclusion = _hand_exclusion_mask(gray.shape, hand)
    target_ratio = card["width_mm"] / card["height_mm"]
    img_area = gray.shape[0] * gray.shape[1]
    best = None
    for c in contours:
        area = cv2.contourArea(c)
        if area < img_area * 0.01:
            continue
        rect = cv2.minAreaRect(c)
        (cx, cy), (rw, rh), _ = rect
        if min(rw, rh) == 0:
            continue
        ratio = max(rw, rh) / min(rw, rh)
        rectangularity = area / (rw * rh)
        if abs(ratio - target_ratio) > 0.25 or rectangularity < 0.8:
            continue
        overlap = exclusion[int(min(max(cy, 0), gray.shape[0] - 1)), int(min(max(cx, 0), gray.shape[1] - 1))] > 0
        if overlap:
            continue
        score = rectangularity * (1 - abs(ratio - target_ratio) / 0.25)
        if best is None or score > best[1]:
            best = (rect, score)
    if best is None:
        return None
    (cx, cy), (rw, rh), angle = best[0]
    long_px = max(rw, rh)
    return ReferenceFit(
        kind="card",
        mm_per_px=card["width_mm"] / long_px,
        quality=round(min(1.0, best[1]), 3),
        geometry={"cx": cx, "cy": cy, "w": rw, "h": rh, "angle": angle},
    )


# ---------------------------------------------------------------------------- finger measurement


@dataclass
class FingerMeasurement:
    finger: str
    width_px: float | None
    consistency: float  # 0‥1 (1 = all sample lines agree)
    samples: list[tuple[tuple[float, float], tuple[float, float]]] = field(default_factory=list)


def _edge_on_profile(profile: np.ndarray, centre_colour: np.ndarray, min_i: int, max_i: int) -> int | None:
    """First index where the colour departs strongly from the finger colour (with a sharp step)."""
    dist = np.linalg.norm(profile - centre_colour, axis=1)
    if len(dist) <= max_i:
        max_i = len(dist) - 1
    if max_i <= min_i:
        return None
    window = dist[min_i : max_i + 1]
    contrast = window.max() - dist[:min_i + 1].mean() if min_i > 0 else window.max()
    if contrast < 12:  # background is indistinguishable from skin
        return None
    threshold = dist[: max(min_i, 1)].mean() + contrast * 0.5
    above = np.nonzero(window > threshold)[0]
    return int(min_i + above[0]) if above.size else None


def measure_finger(lab: np.ndarray, base: np.ndarray, tip: np.ndarray, finger: str,
                   expected_width_px: float) -> FingerMeasurement:
    h, w = lab.shape[:2]
    axis = tip - base
    length = float(np.linalg.norm(axis))
    if length < 4:
        return FingerMeasurement(finger, None, 0.0)
    axis /= length
    normal = np.array([-axis[1], axis[0]])
    half_max = int(expected_width_px)
    half_min = max(2, int(expected_width_px * 0.2))

    widths: list[float] = []
    samples = []
    one_sided = 0
    for t in np.linspace(0.35, 0.7, 7):  # across the nail bed, away from the fingertip curve
        centre = base + axis * length * t
        cx, cy = int(round(centre[0])), int(round(centre[1]))
        if not (0 <= cx < w and 0 <= cy < h):
            continue
        patch = lab[max(0, cy - 2) : cy + 3, max(0, cx - 2) : cx + 3].reshape(-1, 3)
        centre_colour = np.median(patch, axis=0)
        sides = []
        for direction in (1, -1):
            steps = np.arange(0, half_max + 1)
            xs = np.clip(np.round(centre[0] + normal[0] * steps * direction).astype(int), 0, w - 1)
            ys = np.clip(np.round(centre[1] + normal[1] * steps * direction).astype(int), 0, h - 1)
            profile = cv2.GaussianBlur(lab[ys, xs].reshape(-1, 1, 3), (1, 5), 0).reshape(-1, 3)
            edge = _edge_on_profile(profile, centre_colour, half_min, half_max)
            sides.append(edge)
        if sides == [None, None]:
            continue
        if None in sides:
            # Touching fingers hide one edge. Landmarks sit on the finger's centre line, so mirror the
            # visible edge — less certain, which the consistency score reflects.
            visible = sides[0] if sides[0] is not None else sides[1]
            sides = [visible, visible]
            one_sided += 1
        widths.append(float(sides[0] + sides[1]))
        samples.append((
            (float(centre[0] + normal[0] * sides[0]), float(centre[1] + normal[1] * sides[0])),
            (float(centre[0] - normal[0] * sides[1]), float(centre[1] - normal[1] * sides[1])),
        ))
    if len(widths) < 3:
        return FingerMeasurement(finger, None, 0.0, samples)
    arr = np.array(widths)
    median = float(np.median(arr))
    cv = float(np.std(arr) / median) if median else 1.0
    consistency = max(0.0, 1.0 - cv / 0.15) * min(1.0, len(widths) / 5)
    consistency *= 1.0 - 0.3 * (one_sided / len(widths))
    return FingerMeasurement(finger, median, round(consistency, 3), samples)


def _expected_width_px(hand: HandLandmarks, finger: str) -> float:
    # A finger is roughly 0.25× the knuckle span (index MCP → pinky MCP) of the same hand wide;
    # thumbs ~20% wider. Only bounds the edge search (up to 2× this), never used as the measurement.
    span = float(np.linalg.norm(hand.points[5] - hand.points[17]))
    return span * (0.3 if finger == "thumb" else 0.25)


# ---------------------------------------------------------------------------- size mapping


def closest_size(width_mm: float, sizes: list[tuple[int, float]], prefer_larger: bool = True) -> int:
    """sizes: [(size_number, width_mm)]. 0 is the widest. Between two sizes, prefer the wider one
    (a slightly wide press-on can be filed; a narrow one lifts)."""
    ordered = sorted(sizes, key=lambda s: s[1])
    best = min(ordered, key=lambda s: abs(s[1] - width_mm))
    if prefer_larger and best[1] < width_mm:
        wider = [s for s in ordered if s[1] >= width_mm]
        if wider and wider[0][1] - width_mm < 1.0:
            return wider[0][0]
    return best[0]


def image_sharpness(gray: np.ndarray) -> float:
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


# ---------------------------------------------------------------------------- orchestration


@dataclass
class FingerResult:
    finger: str
    width_mm: float | None
    nail_width_mm: float | None
    size: int | None
    confidence: float


@dataclass
class SizingResult:
    ok: bool
    fingers: dict[str, FingerResult]
    overall_confidence: float
    reference: dict | None
    handedness: str | None
    warnings: list[str]
    recommendation: str
    preview_jpeg_b64: str | None = None


def _fail(message: str, warnings: list[str] | None = None, preview: str | None = None) -> SizingResult:
    return SizingResult(
        ok=False,
        fingers={f: FingerResult(f, None, None, None, 0.0) for f in FINGERS},
        overall_confidence=0.0,
        reference=None,
        handedness=None,
        warnings=[message, *(warnings or [])],
        recommendation="manual",
        preview_jpeg_b64=preview,
    )


def _preview(rgb: np.ndarray, hand: HandLandmarks | None, ref: ReferenceFit | None,
             measurements: dict[str, FingerMeasurement]) -> str:
    canvas = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR).copy()
    pink = (180, 90, 255)
    if ref and ref.kind == "coin":
        g = ref.geometry
        cv2.circle(canvas, (int(g["cx"]), int(g["cy"])), int(g["r"]), (80, 220, 120), 3)
    elif ref and ref.kind == "card":
        g = ref.geometry
        box = cv2.boxPoints(((g["cx"], g["cy"]), (g["w"], g["h"]), g["angle"])).astype(np.int32)
        cv2.polylines(canvas, [box], True, (80, 220, 120), 3)
    for m in measurements.values():
        for (x1, y1), (x2, y2) in m.samples:
            cv2.line(canvas, (int(x1), int(y1)), (int(x2), int(y2)), pink, 2, cv2.LINE_AA)
    if hand is not None:
        for _base, tip in DISTAL.values():
            cv2.circle(canvas, tuple(int(v) for v in hand.points[tip]), 4, (255, 255, 255), -1)
    scale = 720 / max(canvas.shape[:2])
    if scale < 1:
        canvas = cv2.resize(canvas, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", canvas, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return base64.b64encode(buf.tobytes()).decode("ascii") if ok else ""


def estimate_sizes(
    rgb: np.ndarray,
    reference: str,
    sizes: list[tuple[int, float]],
    ratios: dict[str, float],
    min_confidence: float = 0.6,
    prefer_larger: bool = True,
    custom_diameter_mm: float | None = None,
    detector: HandDetector | None = None,
    client_hand: HandLandmarks | None = None,
) -> SizingResult:
    """`client_hand`: landmarks from the browser's MediaPipe (WASM) detector, in this image's pixel space.
    When absent, the server-side detector is used."""
    if reference not in REFERENCE_OBJECTS and not custom_diameter_mm:
        return _fail("Unknown reference object.")
    if client_hand is None:
        detector = detector or get_hand_detector()
        if detector is None:
            return _fail("Photo sizing is temporarily unavailable.")

    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    warnings: list[str] = []
    sharpness = image_sharpness(gray)
    if sharpness < 40:
        warnings.append("The photo looks blurry — hold still and tap to focus on your hand.")

    hand = client_hand if client_hand is not None else detector.detect(rgb)
    if hand is None:
        return _fail("We couldn't find a hand in this photo. Lay your hand flat, nails facing the camera, "
                     "on a plain surface with good light.", warnings)

    if reference == "card":
        ref = detect_card(rgb, hand)
    else:
        diameter = custom_diameter_mm or REFERENCE_OBJECTS[reference]["diameter_mm"]
        ref = detect_coin(rgb, diameter, hand)
    if ref is None:
        return _fail("We couldn't find the reference coin/card. Place it flat next to your hand, fully visible and "
                     "not touching your fingers.", warnings, _preview(rgb, hand, None, {}))

    knuckle_span_mm = float(np.linalg.norm(hand.points[5] - hand.points[17])) * ref.mm_per_px
    scale_plausible = 45 <= knuckle_span_mm <= 100
    if not scale_plausible:
        warnings.append("The reference object's size doesn't match the hand — check you picked the right coin/card "
                        "and that it lies at the same distance as your hand.")

    lab = cv2.cvtColor(cv2.GaussianBlur(rgb, (3, 3), 0), cv2.COLOR_RGB2LAB).astype(np.float32)
    measurements = {
        f: measure_finger(lab, hand.points[a].copy(), hand.points[b].copy(), f, _expected_width_px(hand, f))
        for f, (a, b) in DISTAL.items()
    }

    fingers: dict[str, FingerResult] = {}
    for f in FINGERS:
        m = measurements[f]
        if m.width_px is None:
            fingers[f] = FingerResult(f, None, None, None, 0.0)
            continue
        width_mm = m.width_px * ref.mm_per_px
        nail_mm = width_mm * ratios.get(f, 0.76)
        lo, hi = PLAUSIBLE_WIDTH_MM[f]
        plausible = 1.0 if lo <= width_mm <= hi else 0.35
        conf = m.consistency * plausible
        if f == "thumb":
            conf *= 0.85  # the thumb is usually photographed at an angle
        fingers[f] = FingerResult(
            f, round(width_mm, 1), round(nail_mm, 1), closest_size(nail_mm, sizes, prefer_larger), round(conf, 3)
        )

    measured = [r for r in fingers.values() if r.width_mm is not None]
    if len(measured) < 3:
        return _fail("We could only measure some of your fingers. Try a plain, contrasting background (a sheet of "
                     "white paper works well) and spread your fingers slightly.", warnings,
                     _preview(rgb, hand, ref, measurements))

    # Anatomical ordering sanity: the pinky shouldn't be wider than the middle finger, etc.
    ordering = 1.0
    if fingers["pinky"].width_mm and fingers["middle"].width_mm and fingers["pinky"].width_mm > fingers["middle"].width_mm * 1.08:
        ordering *= 0.7
    sharp = min(1.0, sharpness / 120)
    finger_conf = float(np.mean([r.confidence for r in fingers.values()]))
    overall = ref.quality * (0.6 + 0.4 * sharp) * min(1.0, hand.score + 0.15) * finger_conf * ordering
    overall *= 1.0 if scale_plausible else 0.4
    overall = round(float(max(0.0, min(1.0, overall))), 3)

    if overall >= min_confidence:
        recommendation = "confident"
    elif overall >= min_confidence * 0.6:
        recommendation = "verify"
        warnings.append("We're fairly, but not fully, sure — double-check with a tape measure or order a sizing kit.")
    else:
        recommendation = "manual"
        warnings.append("We're not confident in this result. Please measure manually or order a sizing kit.")

    return SizingResult(
        ok=True,
        fingers=fingers,
        overall_confidence=overall,
        reference={"type": reference, "kind": ref.kind, "mm_per_px": round(ref.mm_per_px, 5), "quality": ref.quality},
        handedness=hand.handedness,
        warnings=warnings,
        recommendation=recommendation,
        preview_jpeg_b64=_preview(rgb, hand, ref, measurements),
    )
