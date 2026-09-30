import type { NailArt } from "@/lib/types";
import { NailGroup, type NailCharm, type NailSpec } from "./Nail";
import { SMALL_CHARMS } from "./charms";
import { FINGER_SCALE, nailHeight } from "./shapes";

// Display order left → right: pinky, ring, middle, index, thumb (back of a left hand).
const ORDER = ["pinky", "ring", "middle", "index", "thumb"] as const;
const FINGER_INDEX = { thumb: 0, index: 1, middle: 2, ring: 3, pinky: 4 } as const;

// Patterns that look best only on accent nails rather than the whole set.
const ACCENT_ONLY_PATTERNS = new Set(["hearts", "florals", "checkerboard", "leopard"]);

const BIG_SLOTS: [number, number][] = [[0.5, 0.5], [0.5, 0.24]];
const SMALL_SLOTS: [number, number][] = [[0.5, 0.82], [0.25, 0.75], [0.75, 0.75], [0.5, 0.66], [0.26, 0.58], [0.74, 0.58]];

/** Distribute a product's charms across its accent nails. */
function charmLayout(charms: string[], accentNails: number[]): Record<number, NailCharm[]> {
  const out: Record<number, NailCharm[]> = {};
  if (!charms.length) return out;
  const nails = accentNails.length ? accentNails : [3];
  nails.forEach((n) => {
    const big = charms.filter((c) => !SMALL_CHARMS.has(c));
    const small = charms.filter((c) => SMALL_CHARMS.has(c));
    const list: NailCharm[] = [];
    const distinctBig = [...new Set(big)];
    distinctBig.slice(0, 2).forEach((kind, i) => {
      const [x, y] = distinctBig.length === 1 ? [0.5, 0.46] : BIG_SLOTS[i];
      list.push({ kind, x, y, scale: distinctBig.length > 1 ? 1.75 : 2.2 });
    });
    small.slice(0, distinctBig.length ? 3 : 6).forEach((kind, i) => {
      const [x, y] = SMALL_SLOTS[i];
      list.push({ kind, x, y, scale: 1.45 });
    });
    out[n] = list;
  });
  return out;
}

export function nailSpecsFromArt(art: NailArt): Record<number, NailSpec> {
  const accentNails = art.accent_nails ?? (art.charms.length > 2 ? [3, 1] : [3]);
  const charms = charmLayout(art.charms, art.charms.length ? accentNails : []);
  const patternNails = art.pattern && ACCENT_ONLY_PATTERNS.has(art.pattern)
    ? (art.charms.length ? [2] : [3, 1])
    : [0, 1, 2, 3, 4];
  const specs: Record<number, NailSpec> = {};
  for (let i = 0; i < 5; i++) {
    specs[i] = {
      shape: art.shape,
      length: art.length,
      base: art.base,
      finish: art.finish,
      pattern: patternNails.includes(i) && !(charms[i]?.length && ACCENT_ONLY_PATTERNS.has(art.pattern ?? "")) ? art.pattern : null,
      patternColour: art.accents[0] ?? null,
      accent2: art.accents[1] ?? null,
      charms: charms[i],
    };
  }
  return specs;
}

type Layout = "fan" | "row";

/**
 * A set of five nails (one hand) rendered from catalogue attributes.
 * `layout="fan"` arcs the nails like a product flat-lay; `row` lines them up.
 */
export function NailSetArt({ art, layout = "fan", className, title }: {
  art: NailArt; layout?: Layout; className?: string; title?: string;
}) {
  const specs = nailSpecsFromArt(art);
  const h = nailHeight(art.length);
  const gap = 16;
  const placed: { finger: (typeof ORDER)[number]; x: number; s: number; w: number; i: number }[] = [];
  let cursor = 0;
  for (const [i, finger] of ORDER.entries()) {
    const s = FINGER_SCALE[finger];
    placed.push({ finger, x: cursor, s, w: 100 * s, i });
    cursor += 100 * s + gap;
  }
  const totalW = cursor - gap;
  const maxH = h * FINGER_SCALE.thumb;
  const pad = 12;
  const vbH = maxH + pad * 2 + (layout === "fan" ? 30 : 0);

  return (
    <svg viewBox={`${-pad} ${-pad} ${totalW + pad * 2} ${vbH}`} className={className} role="img"
      aria-label={title ?? "Nail set preview"}>
      {placed.map(({ finger, x: nx, s, w, i }) => {
        const nailH = h * s;
        // Fan: middle nail highest, outer nails dip and tilt outward.
        const offset = i - 2;
        const lift = layout === "fan" ? Math.abs(offset) * Math.abs(offset) * 7 + (finger === "thumb" ? 10 : 0) : 0;
        const tilt = layout === "fan" ? offset * 4.5 + (finger === "thumb" ? 6 : 0) : 0;
        const y = maxH - nailH + lift;
        return (
          <g key={finger} transform={`translate(${nx} ${y}) rotate(${tilt} ${w / 2} ${nailH}) scale(${s})`}>
            <NailGroup spec={specs[FINGER_INDEX[finger]]} />
          </g>
        );
      })}
    </svg>
  );
}

/** A single enlarged nail (product detail zoom, editor thumbnails). */
export function SingleNail({ spec, className, title }: { spec: NailSpec; className?: string; title?: string }) {
  const h = nailHeight(spec.length);
  return (
    <svg viewBox={`-14 -14 128 ${h + 30}`} className={className} role="img" aria-label={title ?? "Nail"}>
      <NailGroup spec={spec} />
    </svg>
  );
}
