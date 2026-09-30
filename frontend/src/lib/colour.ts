function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function toHex([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return toHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
}

export const lighten = (hex: string, t: number) => mix(hex, "#ffffff", t);
export const darken = (hex: string, t: number) => mix(hex, "#1a0610", t);

export function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const isDark = (hex: string) => luminance(hex) < 0.18;

/** A soft pastel backdrop derived from a design's base colour (keeps grids feeling curated). */
export function backdropFor(hex: string): string {
  if (isDark(hex)) return mix(hex, "#f6f0e6", 0.9);
  // Very pale nails (milky, white, nude) need a deeper blush card so they don't disappear.
  if (luminance(hex) > 0.7) return mix(hex, "#e3d4b8", 0.75);
  return mix(hex, "#faf6ef", 0.8);
}

const METALLIC_FILLS: Record<string, string> = {
  "#D4AF37": "url(#nn-gold)",
  "#C9CDD2": "url(#nn-silver)",
  "#E0A99A": "url(#nn-rosegold)",
};

/** Metallic catalogue colours render with a foil gradient instead of a flat fill. */
export function paintFor(hex: string): string {
  return METALLIC_FILLS[hex.toUpperCase()] ?? hex;
}

/** Deterministic PRNG so glitter/sparkle layouts are stable between renders (no hydration mismatch). */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
