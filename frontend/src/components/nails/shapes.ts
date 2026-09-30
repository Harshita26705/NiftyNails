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
