"use client";

import { specsFromConfig, useCatalog } from "@/lib/catalog";
import type { DesignConfig, NailKey } from "@/lib/types";
import { cn } from "@/lib/format";
import { NailGroup } from "./Nail";
import { FINGER_SCALE, nailHeight } from "./shapes";

const FINGER_OF = { "1": "thumb", "2": "index", "3": "middle", "4": "ring", "5": "pinky" } as const;
// Backs of both hands side by side: left hand pinky→thumb, right hand thumb→pinky.
const LEFT: NailKey[] = ["L5", "L4", "L3", "L2", "L1"];
const RIGHT: NailKey[] = ["R1", "R2", "R3", "R4", "R5"];

/** Renders all ten nails of a custom design. */
export function DesignHands({ config, className, hands = "both" }: {
  config: DesignConfig; className?: string; hands?: "both" | "left";
}) {
  const catalog = useCatalog();
  const specs = specsFromConfig(config, catalog);
  const h = nailHeight(config.length);
  const gap = 12;
  const handGap = 44;
  const rows = hands === "both" ? [LEFT, RIGHT] : [LEFT];

  const placed: { key: NailKey; x: number; s: number; idx: number }[] = [];
  let cursor = 0;
  for (const [r, row] of rows.entries()) {
    if (r > 0) cursor += handGap - gap;
    for (const [idx, key] of row.entries()) {
      const s = FINGER_SCALE[FINGER_OF[key[1] as keyof typeof FINGER_OF]];
      placed.push({ key, x: cursor, s, idx });
      cursor += 100 * s + gap;
    }
  }
  const total = cursor - gap;
  const maxH = h * FINGER_SCALE.thumb;
  const pad = 18;

  return (
    <svg viewBox={`${-pad} ${-pad} ${total + pad * 2} ${maxH + pad * 2 + 24}`} className={cn("w-full", className)} role="img"
      aria-label="Custom nail design preview">
      {placed.map(({ key, x: nx, s, idx }) => {
        const nailH = h * s;
        const fromCentre = Math.abs(idx - 2);
        const lift = fromCentre * fromCentre * 5;
        return (
          <g key={key} transform={`translate(${nx} ${maxH - nailH + lift}) scale(${s})`}>
            <NailGroup spec={specs[key]} />
          </g>
        );
      })}
    </svg>
  );
}
