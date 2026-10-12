"""Personal skin-tone colour analysis — classical CV, no external models.

Pipeline
1. Isolate the subject (GrabCut, same routine as the outfit analyser) and, within it, the skin-toned
   pixels (YCrCb threshold).
2. Median LAB of those pixels → warm/cool/neutral undertone (a hue-balance heuristic) and depth
   (Individual Typology Angle, a standard dermatological lightness metric).
3. Score every catalogue nail colour against that tone (undertone-family match + depth-appropriate
   lightness) so recommendations stay explainable rather than a black box.
"""

from dataclasses import dataclass

import cv2
import numpy as np

from app.ml.colour import rgb_to_hex, rgb_to_lab
from app.ml.outfit import ANALYSIS_SIDE, skin_mask, subject_mask

DEPTH_ADJECTIVE = {"fair": "soft, light", "light": "light", "medium": "medium-depth", "tan": "rich", "deep": "deep, bold"}


@dataclass
class SkinToneAnalysis:
    hex: str
    lab: tuple[float, float, float]
    undertone: str  # warm | cool | neutral
    depth: str  # fair | light | medium | tan | deep
    ita: float
    sample_size: int
    isolated: bool


def _undertone(a: float, b: float) -> str:
    # Yellow (b*) vs red (a*) balance: warm skin reads more yellow/golden, cool skin more pink/rosy.
    # An explainable heuristic tuned on typical skin LAB ranges — not a clinical measurement.
    ratio = b / max(a, 1e-3)
    if ratio > 1.9:
        return "warm"
    if ratio < 1.35:
        return "cool"
    return "neutral"


def _depth(ita: float) -> str:
    if ita > 48:
        return "fair"
    if ita > 30:
        return "light"
    if ita > 12:
        return "medium"
    if ita > -20:
        return "tan"
    return "deep"


def analyse_skin_tone(rgb: np.ndarray) -> SkinToneAnalysis:
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    scale = ANALYSIS_SIDE / max(bgr.shape[:2])
    if scale < 1:
        bgr = cv2.resize(bgr, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    fg, isolated = subject_mask(bgr)
    skin = skin_mask(bgr) & (fg > 0)
    rgb_full = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    pixels = rgb_full[skin]
    if len(pixels) < 200:
        # Not enough clearly-skin pixels (heavy makeup, low light, hair covering most of the frame) —
        # fall back to the whole isolated subject so we still return a best-effort tone.
        pixels = rgb_full[fg > 0]
    if len(pixels) > 20_000:
        idx = np.random.default_rng(7).choice(len(pixels), 20_000, replace=False)
        pixels = pixels[idx]

    rgb_median = np.median(pixels, axis=0)
    l, a, b = rgb_to_lab(tuple(float(c) for c in rgb_median))
    # Individual Typology Angle (ITA°) — standard dermatological skin-lightness metric.
    ita = float(np.degrees(np.arctan2(l - 50, b)))
    return SkinToneAnalysis(
        hex=rgb_to_hex(rgb_median), lab=(l, a, b), undertone=_undertone(a, b), depth=_depth(ita),
        ita=round(ita, 1), sample_size=int(len(pixels)), isolated=isolated,
    )


# Ideal polish lightness (L*) per skin depth — richer/darker shades read as "flattering pop" on deeper
# skin, softer/lighter shades on fairer skin, per common nail-styling guidance.
_IDEAL_L = {"fair": 78, "light": 70, "medium": 60, "tan": 50, "deep": 40}


def recommend_colours(analysis: SkinToneAnalysis, catalogue: list, limit: int = 6) -> list[tuple[object, str]]:
    """Ranks catalogue colour entries (VocabEntry: `.slug`, `.name`, `.get("hex")`) against the analysed skin tone."""
    ideal_l = _IDEAL_L[analysis.depth]
    scored = []
    for entry in catalogue:
        l, a, b = rgb_to_lab(_hex_to_rgb(entry.get("hex")))
        tone = _undertone(a, b)
        undertone_score = 1.0 if tone == analysis.undertone else (0.6 if "neutral" in (tone, analysis.undertone) else 0.25)
        depth_score = max(0.0, 1 - abs(l - ideal_l) / 40)
        scored.append((entry, 0.6 * undertone_score + 0.4 * depth_score, (l, a, b), tone))

    scored.sort(key=lambda t: -t[1])
    picked: list[tuple[object, str]] = []
    picked_lab: list[tuple[float, float, float]] = []
    for entry, _score, lab, tone in scored:
        if any(_delta_e_lite(lab, p) < 9 for p in picked_lab):
            continue
        reason = (
            f"Complements your {analysis.undertone} undertone" if tone == analysis.undertone
            else f"A {DEPTH_ADJECTIVE[analysis.depth]} shade suited to your skin"
        )
        picked.append((entry, reason))
        picked_lab.append(lab)
        if len(picked) >= limit:
            break
    return picked


def _hex_to_rgb(hex_value: str) -> tuple[float, float, float]:
    h = hex_value.lstrip("#")
    return float(int(h[0:2], 16)), float(int(h[2:4], 16)), float(int(h[4:6], 16))


def _delta_e_lite(lab1: tuple[float, float, float], lab2: tuple[float, float, float]) -> float:
    # A cheap Euclidean LAB distance for de-duplication only (full CIEDE2000 is overkill here).
    return float(np.linalg.norm(np.array(lab1) - np.array(lab2)))
