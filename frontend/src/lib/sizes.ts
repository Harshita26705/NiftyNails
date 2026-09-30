"use client";

import type { Finger } from "./types";

const KEY = "nifty.sizes.v1";
export type StoredSizes = { fingers: Record<Finger, number>; source: "photo" | "manual" | "kit"; at: string };

/** Last known per-finger sizes on this device (from the sizing tool or manual entry). */
export function loadSizes(): StoredSizes | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSizes) : null;
  } catch {
    return null;
  }
}

export function saveSizes(fingers: Record<Finger, number>, source: StoredSizes["source"]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ fingers, source, at: new Date().toISOString() }));
  } catch {
    /* ignore */
  }
}
