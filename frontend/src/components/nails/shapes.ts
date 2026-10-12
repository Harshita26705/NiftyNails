import type { NailLength, ShapeKey } from "@/lib/types";

/** Nail coordinate system: width 100, height depends on length. Free edge at the top (y=0), cuticle at the bottom. */
export const NAIL_WIDTH = 100;

export const LENGTH_HEIGHT: Record<NailLength, number> = { short: 118, medium: 146, long: 176, xlong: 206 };

export function nailHeight(length: NailLength | string | undefined): number {
  return LENGTH_HEIGHT[(length as NailLength) ?? "medium"] ?? LENGTH_HEIGHT.medium;
}

/** Outline of a press-on nail. Shared by the renderer (fill) and the editor (paint mask). */
export function nailPath(shape: ShapeKey | string | undefined, h: number): string {
  const b = h - 34; // where the sidewalls meet the cuticle curve
  const cuticle = `M 4 ${b} C 4 ${h - 6} 22 ${h} 50 ${h} C 78 ${h} 96 ${h - 6} 96 ${b}`;
  switch (shape) {
    case "square":
      return `${cuticle} L 96 13 Q 96 2 85 2 L 15 2 Q 4 2 4 13 Z`;
    case "squoval":
      return `${cuticle} L 96 28 C 96 9 84 2 50 2 C 16 2 4 9 4 28 Z`;
    case "oval":
      return `${cuticle} L 96 ${h * 0.36} C 96 ${h * 0.08} 76 2 50 2 C 24 2 4 ${h * 0.08} 4 ${h * 0.36} Z`;
    case "stiletto":
      return `${cuticle} C 96 ${h * 0.52} 70 ${h * 0.17} 52.5 3 Q 50 -1 47.5 3 C 30 ${h * 0.17} 4 ${h * 0.52} 4 ${b} Z`;
    case "coffin":
      return `${cuticle} L 80 8 Q 79 2 72 2 L 28 2 Q 21 2 20 8 Z`;
    case "almond":
    default:
      return `${cuticle} C 96 ${h * 0.42} 83 ${h * 0.12} 57 4 Q 50 0 43 4 C 17 ${h * 0.12} 4 ${h * 0.42} 4 ${b} Z`;
  }
}

/** Relative nail widths within a hand (thumb widest). */
export const FINGER_SCALE = { thumb: 1.16, index: 0.95, middle: 1, ring: 0.92, pinky: 0.78 } as const;

// ------------------------------------------------------------------ design-studio shape/French-tip geometry
// Shapes are generated in a local unit box (radius ~10, centred on the origin) so a shared
// `translate(x,y) rotate(r) scale(s)` transform can position/size/rotate any of them identically.

function polygonPoints(sides: number, r: number, rotate = -Math.PI / 2): string {
  return Array.from({ length: sides }, (_, i) => {
    const a = rotate + (i * 2 * Math.PI) / sides;
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

function starPoints(sides: number, rOuter: number, rInner: number, rotate = -Math.PI / 2): string {
  const n = sides * 2;
  return Array.from({ length: n }, (_, i) => {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = rotate + (i * Math.PI) / sides;
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

/** A shape's outline as an SVG path/points string in local unit space (for a <path> or <polygon>). */
export function shapeGeometry(shape: string, sides: number): { tag: "path" | "polygon" | "ellipse"; d?: string; points?: string } {
  switch (shape) {
    case "circle":
      return { tag: "ellipse" };
    case "rect":
      return { tag: "path", d: "M -10 -10 L 10 -10 L 10 10 L -10 10 Z" };
    case "rounded_rect":
      return { tag: "path", d: "M -6 -10 Q 10 -10 10 -6 L 10 6 Q 10 10 6 10 L -6 10 Q -10 10 -10 6 L -10 -6 Q -10 -10 -6 -10 Z" };
    case "triangle":
      return { tag: "polygon", points: polygonPoints(3, 10.5) };
    case "diamond":
      return { tag: "polygon", points: polygonPoints(4, 10, 0) };
    case "polygon":
      return { tag: "polygon", points: polygonPoints(Math.max(3, Math.min(12, sides)), 10) };
    case "star":
      return { tag: "polygon", points: starPoints(Math.max(3, Math.min(10, sides)), 10, 4.2) };
    case "line":
      return { tag: "path", d: "M -10 0 L 10 0" };
    case "heart":
    default:
      return { tag: "path", d: heartPathAt(0, 3, 1.55) };
  }
}

/** Local-space heart outline (reused from the "hearts" pattern math, generalised to any centre/scale). */
export function heartPathAt(x: number, y: number, s: number): string {
  return `M ${x} ${y + 6 * s} C ${x - 8 * s} ${y + 1 * s} ${x - 8 * s} ${y - 6 * s} ${x - 3.5 * s} ${y - 6 * s} C ${x - 1.5 * s} ${y - 6 * s} ${x} ${y - 4.5 * s} ${x} ${y - 3.5 * s} C ${x} ${y - 4.5 * s} ${x + 1.5 * s} ${y - 6 * s} ${x + 3.5 * s} ${y - 6 * s} C ${x + 8 * s} ${y - 6 * s} ${x + 8 * s} ${y + 1 * s} ${x} ${y + 6 * s} Z`;
}

/**
 * A French-tip band as a filled path, clipped to the nail outline by the caller. `depth`/`curve` are 0–1
 * fractions of the nail height; `offsetX`/`offsetY` (also 0–1-ish, signed) nudge the band for asymmetric tips.
 * The smile line is a single smooth cubic (both control points at the same height), which reads as a gentle,
 * even curve rather than a pointed dip — and `bow` is capped independent of `depth`, so a deep tip stays a
 * classic smile line instead of turning into a sharp chevron.
 */
export function frenchTipPath(h: number, depth: number, curve: number, offsetX = 0, offsetY = 0): string {
  const d = Math.max(2, depth * h + offsetY * h);
  const bow = curve * 14;
  const shift = offsetX * 40;
  return `M -8 -8 L 108 -8 L 108 ${d} C ${108 + shift} ${d + bow} ${-8 + shift} ${d + bow} -8 ${d} Z`;
}
