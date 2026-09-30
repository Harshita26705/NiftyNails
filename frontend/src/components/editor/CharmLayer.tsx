"use client";

import { RotateCw, X } from "lucide-react";
import { useRef } from "react";
import { CharmArt } from "@/components/nails/charms";
import { CHARM_BASE_SCALE } from "@/lib/catalog";
import { cn } from "@/lib/format";
import type { CharmPlacement } from "@/lib/types";

export type EditorCharm = CharmPlacement & { id: string };

const MIN_SCALE = 0.35;
const MAX_SCALE = 2.6;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Gesture =
  | { kind: "drag"; id: string; pointer: number; startX: number; startY: number; lastX: number; lastY: number; origX: number; origY: number }
  | { kind: "pinch"; id: string; pointers: Map<number, [number, number]>; startDist: number; startAngle: number; origScale: number; origRot: number }
  | { kind: "handle"; id: string; pointer: number; cx: number; cy: number; startDist: number; startAngle: number; origScale: number; origRot: number };

/**
 * Charms on the enlarged nail. Positions are stored relative to the nail box (0‥1) so they render identically
 * in thumbnails, previews and the production sheet.
 */
export function CharmLayer({ charms, assetOf, width, height, selected, active, onSelect, onGestureStart, onChange, onRemove }: {
  charms: EditorCharm[];
  assetOf: (slug: string) => string;
  width: number; // px
  height: number; // px
  selected: string | null;
  active: boolean;
  onSelect: (id: string | null) => void;
  onGestureStart: () => void;
  onChange: (id: string, patch: Partial<CharmPlacement>) => void;
  onRemove: (id: string) => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const unit = width / 100; // px per nail unit

  const byId = (id: string) => charms.find((c) => c.id === id)!;

  const startDrag = (e: React.PointerEvent, c: EditorCharm) => {
    e.stopPropagation();
    onSelect(c.id);
    const g = gesture.current;
    // Second finger on the same charm → pinch to scale/rotate.
    if (g && g.kind === "drag" && g.id === c.id && g.pointer !== e.pointerId) {
      const first = [g.lastX, g.lastY] as [number, number];
      const pointers = new Map<number, [number, number]>([[g.pointer, first], [e.pointerId, [e.clientX, e.clientY]]]);
      const [a, b] = [...pointers.values()];
      gesture.current = {
        kind: "pinch", id: c.id, pointers,
        startDist: Math.hypot(b[0] - a[0], b[1] - a[1]), startAngle: Math.atan2(b[1] - a[1], b[0] - a[0]),
        origScale: c.scale, origRot: c.rotation,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    onGestureStart();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = {
      kind: "drag", id: c.id, pointer: e.pointerId, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY,
      origX: c.x, origY: c.y,
    };
  };

  const startHandle = (e: React.PointerEvent, c: EditorCharm) => {
    e.stopPropagation();
    onGestureStart();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = box.current!.getBoundingClientRect();
    const cx = rect.left + c.x * width;
    const cy = rect.top + c.y * height;
    gesture.current = {
      kind: "handle", id: c.id, pointer: e.pointerId, cx, cy,
      startDist: Math.hypot(e.clientX - cx, e.clientY - cy), startAngle: Math.atan2(e.clientY - cy, e.clientX - cx),
      origScale: c.scale, origRot: c.rotation,
    };
  };

  const onMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "drag" && e.pointerId === g.pointer) {
      g.lastX = e.clientX;
      g.lastY = e.clientY;
      onChange(g.id, {
        x: clamp(g.origX + (e.clientX - g.startX) / width, 0.02, 0.98),
        y: clamp(g.origY + (e.clientY - g.startY) / height, 0.02, 0.98),
      });
    } else if (g.kind === "pinch" && g.pointers.has(e.pointerId)) {
      g.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      const [a, b] = [...g.pointers.values()];
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      onChange(g.id, {
        scale: clamp(g.origScale * (dist / Math.max(g.startDist, 1)), MIN_SCALE, MAX_SCALE),
        rotation: Math.round(g.origRot + ((angle - g.startAngle) * 180) / Math.PI),
      });
    } else if (g.kind === "handle" && e.pointerId === g.pointer) {
      const dist = Math.hypot(e.clientX - g.cx, e.clientY - g.cy);
      const angle = Math.atan2(e.clientY - g.cy, e.clientX - g.cx);
      onChange(g.id, {
        scale: clamp(g.origScale * (dist / Math.max(g.startDist, 1)), MIN_SCALE, MAX_SCALE),
        rotation: Math.round(g.origRot + ((angle - g.startAngle) * 180) / Math.PI),
      });
    }
  };

  const onUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch") {
      g.pointers.delete(e.pointerId);
      if (g.pointers.size < 2) gesture.current = null;
    } else if ("pointer" in g && g.pointer === e.pointerId) {
      gesture.current = null;
    }
  };

  return (
    <div ref={box} className={cn("absolute inset-0", !active && "pointer-events-none")}
      onPointerDown={() => active && onSelect(null)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      style={{ touchAction: active ? "none" : "auto" }}>
      {charms.map((c) => {
        const size = 32 * CHARM_BASE_SCALE * c.scale * unit;
        const isSel = selected === c.id && active;
        return (
          <div key={c.id} className="absolute" style={{ left: c.x * width, top: c.y * height, width: size, height: size,
            transform: `translate(-50%, -50%) rotate(${c.rotation}deg)` }}>
            <button type="button" aria-label={`Charm ${c.charm}. Drag to move.`} onPointerDown={(e) => startDrag(e, byId(c.id))}
              className={cn("size-full rounded-xl", isSel ? "outline-2 outline-offset-2 outline-dashed outline-pink" : "", active && "cursor-grab active:cursor-grabbing")}>
              <svg viewBox="-16 -16 32 32" className="pointer-events-none size-full overflow-visible" aria-hidden>
                <g filter="url(#nn-charm-shadow)"><CharmArt kind={assetOf(c.charm)} /></g>
              </svg>
            </button>
            {isSel && (
              <>
                <button type="button" aria-label="Remove charm" onPointerDown={(e) => { e.stopPropagation(); onRemove(c.id); }}
                  className="absolute -top-4 -left-4 flex size-8 items-center justify-center rounded-full bg-ink text-white shadow-md">
                  <X className="size-4" />
                </button>
                <button type="button" aria-label="Drag to resize and rotate" onPointerDown={(e) => startHandle(e, byId(c.id))}
                  className="absolute -right-4 -bottom-4 flex size-8 cursor-nwse-resize items-center justify-center rounded-full bg-pink text-white shadow-md"
                  style={{ touchAction: "none" }}>
                  <RotateCw className="size-4" />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
