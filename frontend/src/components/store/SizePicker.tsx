"use client";

import { Ruler } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/format";
import { loadSizes } from "@/lib/sizes";
import { FINGERS, type Finger, type SizeKit, type SizeSelection } from "@/lib/types";

const KIT_LABEL: Record<string, string> = { XS: "XS", S: "S", M: "M", L: "L", CUSTOM: "Custom fit" };
const DEFAULT_FINGERS: Record<Finger, number> = { thumb: 2, index: 5, middle: 4, ring: 5, pinky: 8 };

export function FingerSizeInputs({ value, onChange }: {
  value: Record<Finger, number>; onChange: (v: Record<Finger, number>) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {FINGERS.map((f) => (
        <label key={f} className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-semibold text-ink-2 capitalize">{f}</span>
          <select value={value[f]} onChange={(e) => onChange({ ...value, [f]: Number(e.target.value) })}
            className="h-12 w-full appearance-none rounded-2xl bg-surface text-center font-display text-xl ring-1 ring-line ring-inset outline-none focus:ring-2 focus:ring-pink">
            {Array.from({ length: 10 }, (_, i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}

/** Choose a standard kit (XS–L, shows stock) or custom per-finger sizes 0–9. */
export function SizePicker({ available, availability, kits, value, onChange }: {
  available: string[];
  availability?: Record<string, number | null>;
  kits: SizeKit[];
  value: SizeSelection | null;
  onChange: (v: SizeSelection) => void;
}) {
  // Saved sizes only affect the custom-fit panel, which is never server-rendered (it opens on user action),
  // so reading storage in the initialiser can't cause a hydration mismatch.
  const [saved] = useState(() => (typeof window === "undefined" ? null : loadSizes()));
  const [fingers, setFingers] = useState<Record<Finger, number>>(saved?.fingers ?? DEFAULT_FINGERS);
  const fromSaved = !!saved;

  const select = (label: string) => {
    if (label === "CUSTOM") onChange({ label: "CUSTOM", fingers });
    else onChange({ label: label as SizeSelection["label"] });
  };
  const kit = kits.find((k) => k.label === value?.label);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold">Size</p>
        <Link href="/size" className="inline-flex items-center gap-1 text-[13px] font-semibold text-pink">
          <Ruler className="size-3.5" /> Find my size
        </Link>
      </div>
      <div className="mt-2.5 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Size">
        {available.map((label) => {
          const stock = availability?.[label];
          const soldOut = label !== "CUSTOM" && stock !== undefined && stock !== null && stock <= 0;
          const active = value?.label === label;
          return (
            <button key={label} type="button" role="radio" aria-checked={active} disabled={soldOut} onClick={() => select(label)}
              className={cn(
                "relative flex h-12 flex-col items-center justify-center rounded-2xl text-[14px] font-semibold ring-1 ring-inset transition active:scale-[0.97]",
                label === "CUSTOM" && "col-span-5 h-11 sm:col-span-1",
                active ? "bg-ink text-white ring-ink" : "bg-surface ring-line hover:ring-line-strong",
                soldOut && "cursor-not-allowed text-ink-3 line-through opacity-60",
              )}>
              {KIT_LABEL[label] ?? label}
              {!soldOut && label !== "CUSTOM" && typeof stock === "number" && stock <= 3 && (
                <span className={cn("absolute -top-2 right-1 rounded-full px-1.5 text-[9.5px] font-bold", active ? "bg-pink text-white" : "bg-blush-100 text-pink-deep")}>
                  {stock} left
                </span>
              )}
            </button>
          );
        })}
      </div>

      {kit && (
        <p className="mt-2.5 text-[12.5px] text-ink-2">
          Kit {kit.label} fits: {FINGERS.map((f) => `${f} ${kit.fingers[f]}`).join(" · ")} — plus spare sizes in the box.
        </p>
      )}
      {value?.label === "CUSTOM" && (
        <div className="mt-4 rounded-3xl bg-blush-50 p-4 ring-1 ring-line">
          <p className="mb-3 text-[12.5px] text-ink-2">
            {fromSaved ? "Using your saved sizes — adjust if needed." : "Enter your sizes (0 = widest, 9 = narrowest)."} Made to order for your fingers.
          </p>
          <FingerSizeInputs value={fingers} onChange={(v) => {
            setFingers(v);
            onChange({ label: "CUSTOM", fingers: v });
          }} />
        </div>
      )}
    </div>
  );
}
