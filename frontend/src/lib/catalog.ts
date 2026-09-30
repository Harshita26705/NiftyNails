"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { CatalogOptions, DesignConfig, NailKey } from "./types";
import type { NailSpec } from "@/components/nails/Nail";

/** A stored charm scale of 1 renders at this multiple of the base charm artwork. */
export const CHARM_BASE_SCALE = 1.8;

let pending: Promise<CatalogOptions> | null = null;
let cached: CatalogOptions | null = null;

/** Catalogue vocab (colours, finishes, shapes, charms, sizes) — fetched once per page load. */
export function useCatalog() {
  const [data, setData] = useState<CatalogOptions | null>(cached);
  useEffect(() => {
    if (cached) return;
    pending ??= api<CatalogOptions>("/catalog/options");
    let alive = true;
    pending
      .then((d) => {
        cached = d;
        if (alive) setData(d);
      })
      .catch(() => {
        pending = null;
      });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

/** Turn a stored design config (slugs) into renderable nail specs (hex colours, svg keys). */
export function specsFromConfig(config: DesignConfig, catalog: CatalogOptions | null): Record<NailKey, NailSpec> {
  const colour = (slug?: string | null) => catalog?.colours.find((c) => c.slug === slug)?.hex;
  const shape = catalog?.shapes.find((s) => s.slug === config.shape)?.svg_key ?? "almond";
  const charmKey = (slug: string) => catalog?.charms.find((c) => c.slug === slug)?.asset_key ?? slug;
  const out = {} as Record<NailKey, NailSpec>;
  const keys: NailKey[] = ["L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"];
  for (const key of keys) {
    const nail = config.nails?.[key];
    out[key] = {
      shape,
      length: config.length,
      base: colour(nail?.colour) ?? colour(config.base_colour) ?? "#F8C8D8",
      finish: nail?.finish ?? config.finish,
      pattern: nail?.pattern ?? null,
      patternColour: colour(nail?.pattern_colour) ?? null,
      paintUrl: nail?.paint ?? null,
      objects: nail?.objects ?? [],
      charms: (nail?.charms ?? []).map((c) => ({
        kind: charmKey(c.charm), x: c.x, y: c.y, scale: (c.scale ?? 1) * CHARM_BASE_SCALE, rotation: c.rotation,
      })),
    };
  }
  return out;
}
