"""Outfit / inspiration photo analysis with classical computer vision (OpenCV + NumPy).

Pipeline
1. Downscale, isolate the subject with GrabCut (centre-initialised), fall back to a centre crop.
2. Suppress skin pixels when they are clearly body rather than garment.
3. LAB k-means → dominant & secondary colours (merged when perceptually identical).
4. Metallic accents: specular "sparkle" pixels + gold/silver hue analysis.
5. Pattern: Canny edge density + number of significant colours.
6. Style/occasion keywords from simple, explainable rules.
"""

from dataclasses import dataclass, field

import cv2
import numpy as np

from app.ml.colour import delta_e, hex_to_lab, rgb_to_hex, rgb_to_lab
from app.ml.lexicon import COLOUR_LEXICON

ANALYSIS_SIDE = 360
_NOT_DESCRIPTIVE = {"clear", "transparent", "holographic", "iridescent", "gray", "barbie pink", "pearl white"}
COLOUR_NAMES_FOR_DESCRIPTION = {
    name: hex_to_lab(hx) for name, hx in COLOUR_LEXICON.items() if name not in _NOT_DESCRIPTIVE
}


@dataclass
class PaletteColour:
    hex: str
    weight: float
    lab: tuple[float, float, float]
    name: str


@dataclass
class OutfitAnalysis:
    palette: list[PaletteColour]
    metallic: str | None  # gold | silver | rose-gold | None
    metallic_score: float
    pattern: str  # solid | textured | printed
    edge_density: float
    keywords: list[str] = field(default_factory=list)
    subject_isolated: bool = False

    @property
    def dominant(self) -> PaletteColour | None:
        return self.palette[0] if self.palette else None


def _describe(lab: tuple[float, float, float]) -> str:
    return min(COLOUR_NAMES_FOR_DESCRIPTION.items(), key=lambda kv: delta_e(lab, kv[1]))[0]


def subject_mask(bgr: np.ndarray) -> tuple[np.ndarray, bool]:
    h, w = bgr.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    rect = (int(w * 0.1), int(h * 0.05), int(w * 0.8), int(h * 0.9))
    try:
        bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(bgr, mask, rect, bgd, fgd, 3, cv2.GC_INIT_WITH_RECT)
        fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
        coverage = fg.mean()
        if 0.08 < coverage < 0.95:
            return fg, True
    except cv2.error:
        pass
    fg = np.zeros((h, w), np.uint8)
    fg[int(h * 0.15) : int(h * 0.85), int(w * 0.15) : int(w * 0.85)] = 1
    return fg, False


def skin_mask(bgr: np.ndarray) -> np.ndarray:
    ycrcb = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb)
    return cv2.inRange(ycrcb, (40, 138, 80), (240, 175, 125)) > 0


def _kmeans_palette(pixels_rgb: np.ndarray, k: int = 6) -> list[PaletteColour]:
    if len(pixels_rgb) > 40_000:
        idx = np.random.default_rng(7).choice(len(pixels_rgb), 40_000, replace=False)
        pixels_rgb = pixels_rgb[idx]
    lab = cv2.cvtColor(pixels_rgb.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_RGB2LAB).reshape(-1, 3)
    data = lab.astype(np.float32)
    k = max(1, min(k, len(data) // 50))
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
    cv2.setRNGSeed(7)
    _, labels, _ = cv2.kmeans(data, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    labels = labels.ravel()

    clusters: list[tuple[np.ndarray, float]] = []
    for i in range(k):
        members = pixels_rgb[labels == i]
        if len(members) == 0:
            continue
        # Median is robust to shadows/highlights inside a cluster.
        clusters.append((np.median(members, axis=0), len(members) / len(pixels_rgb)))

    # Merge perceptually identical clusters.
    merged: list[list] = []
    for rgb, weight in sorted(clusters, key=lambda c: -c[1]):
        lab_c = rgb_to_lab(tuple(float(x) for x in rgb))
        for m in merged:
            if delta_e(lab_c, m[2]) < 9:
                total = m[1] + weight
                m[0] = (m[0] * m[1] + rgb * weight) / total
                m[1] = total
                m[2] = rgb_to_lab(tuple(float(x) for x in m[0]))
                break
        else:
            merged.append([rgb.astype(np.float64), weight, lab_c])

    palette = [
        PaletteColour(hex=rgb_to_hex(rgb), weight=round(float(w), 3), lab=lab_c, name=_describe(lab_c))
        for rgb, w, lab_c in sorted(merged, key=lambda m: -m[1])
    ]
    return [p for p in palette if p.weight >= 0.04][:5]


def _metallic(bgr: np.ndarray, fg: np.ndarray, base_hex: str | None = None) -> tuple[str | None, float]:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    local_mean = cv2.blur(gray, (9, 9))
    sparkle = ((gray - local_mean) > 38) & (hsv[..., 2] > 170) & (fg > 0)
    area = max(int(fg.sum()), 1)
    sparkle_ratio = sparkle.sum() / area

    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    goldish = (h >= 12) & (h <= 32) & (s >= 70) & (s <= 210) & (v >= 120) & (fg > 0)
    rosey = (((h <= 10) | (h >= 170)) & (s >= 40) & (s <= 140) & (v >= 150)) & (fg > 0)
    silverish = (s < 30) & (v > 185) & (fg > 0)
    if base_hex:
        # A metallic *accent* must differ from the garment's own base colour.
        lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
        r, g, b = (int(base_hex[i : i + 2], 16) for i in (1, 3, 5))
        base = cv2.cvtColor(np.uint8([[[b, g, r]]]), cv2.COLOR_BGR2LAB).astype(np.float32)[0, 0]
        not_base = np.linalg.norm(lab - base, axis=2) > 18
        goldish, rosey, silverish = goldish & not_base, rosey & not_base, silverish & not_base

    # Metallic = bright specular points concentrated in metal-coloured regions.
    near = cv2.dilate(sparkle.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    scores = {
        "gold": (goldish & near).sum() / area,
        "rose-gold": (rosey & near).sum() / area,
        "silver": (silverish & near).sum() / area,
    }
    tone, score = max(scores.items(), key=lambda kv: kv[1])
    combined = min(1.0, sparkle_ratio * 12 + score * 8)
    if sparkle_ratio > 0.012 and score > 0.006:
        return tone, round(combined, 3)
    return None, round(combined, 3)


def _pattern(bgr: np.ndarray, fg: np.ndarray, palette_size: int) -> tuple[str, float]:
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (3, 3), 0), 60, 160)
    # Ignore the silhouette outline itself.
    inner = cv2.erode(fg, np.ones((9, 9), np.uint8))
    density = float((edges > 0)[inner > 0].mean()) if inner.sum() else 0.0
    if density > 0.10 or (density > 0.06 and palette_size >= 4):
        return "printed", round(density, 4)
    if density > 0.035:
        return "textured", round(density, 4)
    return "solid", round(density, 4)


def _keywords(palette: list[PaletteColour], metallic: str | None, pattern: str) -> list[str]:
    words: list[str] = []
    if not palette:
        return words
    top = palette[:3]
    lights = [p for p in top if p.lab[0] > 72]
    chroma = [float(np.hypot(p.lab[1], p.lab[2])) for p in top]
    pastel = sum(1 for p, c in zip(top, chroma, strict=True) if p.lab[0] > 72 and c < 35)
    jewel = sum(1 for p, c in zip(top, chroma, strict=True) if p.lab[0] < 55 and c > 35)
    neutral = sum(1 for c in chroma if c < 12)

    if metallic:
        words += ["glam", metallic.replace("-", " "), "chrome"]
    if jewel >= 1 and (metallic or pattern == "printed"):
        words += ["festive", "wedding", "traditional"]
    if pastel >= 1 and len(lights) >= 2:
        words += ["soft", "romantic", "coquette", "pastel"]
    if neutral >= 2 and pattern == "solid" and not metallic:
        words += ["minimal", "classy", "office", "everyday"]
    if pattern == "printed" and not metallic and jewel == 0:
        words += ["playful", "floral", "brunch"]
    if max(chroma) > 55 and palette[0].lab[0] > 45:
        words += ["bold", "party"]
    return list(dict.fromkeys(words))


def analyse_outfit(rgb: np.ndarray) -> OutfitAnalysis:
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    scale = ANALYSIS_SIDE / max(bgr.shape[:2])
    if scale < 1:
        bgr = cv2.resize(bgr, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    fg, isolated = subject_mask(bgr)
    skin = skin_mask(bgr)
    garment = (fg > 0) & ~skin
    use = garment if garment.sum() >= 0.4 * max(fg.sum(), 1) else fg > 0
    pixels = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)[use]
    if len(pixels) < 200:
        pixels = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).reshape(-1, 3)

    palette = _kmeans_palette(pixels)
    metallic, metallic_score = _metallic(bgr, fg, palette[0].hex if palette else None)
    pattern, density = _pattern(bgr, fg, len(palette))
    return OutfitAnalysis(
        palette=palette,
        metallic=metallic,
        metallic_score=metallic_score,
        pattern=pattern,
        edge_density=density,
        keywords=_keywords(palette, metallic, pattern),
        subject_isolated=isolated,
    )
