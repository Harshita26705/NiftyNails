"use client";

import { useRef } from "react";
import { frenchTipPath, shapeGeometry } from "@/components/nails/shapes";
import type { DesignObject, ImageObject, ShapeObject, TextObject } from "@/lib/types";
import { objectId } from "./studioModel";

const W = 100;
const TEXT_ANCHOR = { left: "start", center: "middle", right: "end" } as const;
const MIN_SCALE = 0.15;
const MAX_SCALE = 3.5;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const TRANSFORMABLE = new Set<DesignObject["type"]>(["shape", "text", "image"]);
type Transformable = ShapeObject | TextObject | ImageObject;

type Gesture =
  | { kind: "drag"; id: string; pointer: number; startX: number; startY: number; origX: number; origY: number }
  | { kind: "pinch"; id: string; pointers: Map<number, [number, number]>; startDist: number; startAngle: number; origScale: number; origRot: number }
  | { kind: "handle"; id: string; pointer: number; cx: number; cy: number; startDist: number; startAngle: number; origScale: number; origRot: number }
  | { kind: "draw"; id: string; pointer: number; last: { x: number; y: number } }
  | { kind: "erase"; pointer: number };

const ERASE_RADIUS = 3.5; // nail units

function distToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
  const px = a.x + t * dx, py = a.y + t * dy;
  return Math.hypot(p.x - px, p.y - py);
}

export type StageMode = "select" | "draw" | "erase" | "none";

export function ObjectStage({
  objects, h, uid, mode, brushColour, brushSize, brushOpacity, brushType,
  selected, onSelect, onGestureStart, onAdd, onUpdate, onRemove,
}: {
  objects: DesignObject[];
  h: number; // nail units
  uid: string;
  mode: StageMode;
  brushColour: string;
  brushSize: number;
  brushOpacity: number;
  brushType: "round" | "flat" | "marker";
  selected: string | null;
  onSelect: (id: string | null) => void;
  onGestureStart: () => void;
  onAdd: (obj: DesignObject) => void;
  // Loosely typed on purpose: the patch shape depends on the object's variant, which the caller merges at runtime.
  onUpdate: (id: string, patch: Record<string, unknown>, record?: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const toNail = (e: { clientX: number; clientY: number }) => {
    const rect = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * h };
  };

  const startDrag = (e: React.PointerEvent, o: Transformable) => {
    if (mode !== "select" || o.locked) return;
    e.stopPropagation();
    onSelect(o.id);
    onGestureStart();
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    gesture.current = { kind: "drag", id: o.id, pointer: e.pointerId, startX: e.clientX, startY: e.clientY, origX: o.x, origY: o.y };
  };

  const startHandle = (e: React.PointerEvent, o: Transformable) => {
    e.stopPropagation();
    onGestureStart();
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    const rect = svg.current!.getBoundingClientRect();
    const cx = rect.left + o.x * rect.width;
    const cy = rect.top + o.y * rect.height;
    gesture.current = {
      kind: "handle", id: o.id, pointer: e.pointerId, cx, cy,
      startDist: Math.hypot(e.clientX - cx, e.clientY - cy), startAngle: Math.atan2(e.clientY - cy, e.clientX - cx),
      origScale: o.scale, origRot: o.rotation,
    };
  };

  const eraseAt = (p: { x: number; y: number }) => {
    for (const o of objects) {
      if (o.type !== "stroke" || o.locked) continue;
      const pts = o.points.map((pt) => ({ x: pt.x * W, y: pt.y * h }));
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSegment(p, pts[i], pts[i + 1]) < ERASE_RADIUS) {
          onRemove(o.id);
          break;
        }
      }
    }
  };

  const onStageDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (mode === "select") {
      if (e.target === e.currentTarget) onSelect(null);
      return;
    }
    if (mode === "none") return;
    e.preventDefault();
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    const p = toNail(e);
    if (mode === "erase") {
      onGestureStart();
      gesture.current = { kind: "erase", pointer: e.pointerId };
      eraseAt(p);
      return;
    }
    // draw
    onGestureStart();
    const id = objectId();
    onAdd({
      id, type: "stroke", name: "", hidden: false, locked: false, opacity: brushOpacity,
      points: [{ x: p.x / W, y: p.y / h }], width: brushSize, color: brushColour, brush: brushType,
    });
    gesture.current = { kind: "draw", id, pointer: e.pointerId, last: p };
  };

  const onStageMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "draw" && e.pointerId === g.pointer) {
      const p = toNail(e);
      if (Math.hypot(p.x - g.last.x, p.y - g.last.y) < 1.1) return;
      const stroke = objects.find((o) => o.id === g.id);
      if (stroke?.type === "stroke" && stroke.points.length < 400) {
        onUpdate(g.id, { points: [...stroke.points, { x: p.x / W, y: p.y / h }] }, false);
      }
      g.last = p;
    } else if (g.kind === "erase" && e.pointerId === g.pointer) {
      eraseAt(toNail(e));
    } else if (g.kind === "drag" && e.pointerId === g.pointer) {
      onUpdate(g.id, {
        x: clamp(g.origX + (e.clientX - g.startX) / (svg.current!.getBoundingClientRect().width / W), 0.02, 0.98),
        y: clamp(g.origY + (e.clientY - g.startY) / (svg.current!.getBoundingClientRect().height / h), 0.02, 0.98),
      }, false);
    } else if (g.kind === "pinch" && g.pointers.has(e.pointerId)) {
      g.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      const [a, b] = [...g.pointers.values()];
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      onUpdate(g.id, {
        scale: clamp(g.origScale * (dist / Math.max(g.startDist, 1)), MIN_SCALE, MAX_SCALE),
        rotation: Math.round(g.origRot + ((angle - g.startAngle) * 180) / Math.PI),
      }, false);
    } else if (g.kind === "handle" && e.pointerId === g.pointer) {
      const dist = Math.hypot(e.clientX - g.cx, e.clientY - g.cy);
      const angle = Math.atan2(e.clientY - g.cy, e.clientX - g.cx);
      onUpdate(g.id, {
        scale: clamp(g.origScale * (dist / Math.max(g.startDist, 1)), MIN_SCALE, MAX_SCALE),
        rotation: Math.round(g.origRot + ((angle - g.startAngle) * 180) / Math.PI),
      }, false);
    }
  };

  const onStageUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch") {
      g.pointers.delete(e.pointerId);
      if (g.pointers.size < 2) gesture.current = null;
      return;
    }
    if ("pointer" in g && g.pointer === e.pointerId) gesture.current = null;
  };

  const startPinch = (e: React.PointerEvent, o: Transformable) => {
    const g = gesture.current;
    if (mode !== "select" || o.locked) return;
    e.stopPropagation();
    onSelect(o.id);
    if (g && g.kind === "drag" && g.id === o.id && g.pointer !== e.pointerId) {
      const pointers = new Map<number, [number, number]>([[g.pointer, [e.clientX, e.clientY]], [e.pointerId, [e.clientX, e.clientY]]]);
      const [a, b] = [...pointers.values()];
      gesture.current = {
        kind: "pinch", id: o.id, pointers, startDist: Math.hypot(b[0] - a[0], b[1] - a[1]),
        startAngle: Math.atan2(b[1] - a[1], b[0] - a[0]), origScale: o.scale, origRot: o.rotation,
      };
      (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    } else {
      startDrag(e, o);
    }
  };

  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${h}`} className="absolute inset-0 size-full overflow-visible"
      style={{ touchAction: mode === "none" ? "auto" : "none", cursor: mode === "draw" ? "crosshair" : mode === "erase" ? "cell" : "default", pointerEvents: mode === "none" ? "none" : "auto" }}
      onPointerDown={onStageDown} onPointerMove={onStageMove} onPointerUp={onStageUp} onPointerCancel={onStageUp}
      aria-label={mode === "draw" ? "Drawing canvas" : mode === "erase" ? "Eraser canvas" : "Design objects"}>
      {objects.filter((o) => !o.hidden).map((o) => {
        if (o.type === "stroke") {
          const d = o.points.length < 2 ? "" : `M ${o.points.map((pt) => `${pt.x * W} ${pt.y * h}`).join(" L ")}`;
          return <path key={o.id} d={d} fill="none" stroke={o.color} strokeWidth={o.width} strokeOpacity={o.opacity}
            strokeLinecap={o.brush === "flat" ? "butt" : "round"} strokeLinejoin="round" />;
        }
        if (o.type === "gradient") {
          const gid = `edit-grad-${uid}-${o.id}`;
          const a = (o.angle * Math.PI) / 180;
          const dx = Math.sin(a) / 2, dy = -Math.cos(a) / 2;
          return (
            <g key={o.id}>
              <defs>
                <linearGradient id={gid} x1={0.5 - dx} y1={0.5 - dy} x2={0.5 + dx} y2={0.5 + dy}>
                  {o.stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />)}
                </linearGradient>
              </defs>
              <rect x={-5} y={-5} width={W + 10} height={h + 10} fill={`url(#${gid})`} opacity={o.opacity}
                onPointerDown={(e) => { if (mode === "select") { e.stopPropagation(); onSelect(o.id); } }} />
            </g>
          );
        }
        if (o.type === "french_tip") {
          const effectiveDepth = Math.min(0.65, o.depth * o.thickness);
          const d = frenchTipPath(h, effectiveDepth, o.curve, o.offset_x, o.offset_y);
          return (
            <path key={o.id} d={d} fill={o.color} opacity={o.opacity}
              onPointerDown={(e) => { if (mode === "select") { e.stopPropagation(); onSelect(o.id); } }} />
          );
        }
        if (!TRANSFORMABLE.has(o.type)) return null;
        const t = o as Transformable;
        const isSel = mode === "select" && selected === t.id;
        return (
          <g key={t.id} opacity={t.opacity}
            transform={`translate(${t.x * W} ${t.y * h}) rotate(${t.rotation}) scale(${t.scale})`}
            onPointerDown={(e) => startPinch(e, t)} style={{ cursor: mode === "select" && !t.locked ? "grab" : "default" }}>
            {t.type === "shape" && (() => {
              const geo = shapeGeometry(t.shape, t.sides);
              return (
                <g fill={t.fill ?? "none"} stroke={t.stroke ?? "none"} strokeWidth={t.stroke ? t.stroke_width : 0}>
                  {geo.tag === "ellipse" && <ellipse rx={10} ry={10} />}
                  {geo.tag === "path" && <path d={geo.d} />}
                  {geo.tag === "polygon" && <polygon points={geo.points} />}
                  {!t.fill && !t.stroke && <ellipse rx={10} ry={10} fill="#00000012" />}
                </g>
              );
            })()}
            {t.type === "text" && (
              <text x={0} y={0} fill={t.color} textAnchor={TEXT_ANCHOR[t.align]} dominantBaseline="middle"
                fontSize={t.size} fontFamily={t.font === "display" ? "var(--font-display, serif)" : "var(--font-sans, sans-serif)"}>
                {t.text || "Text"}
              </text>
            )}
            {t.type === "image" && (
              <image href={t.url} x={-15} y={-15} width={30} height={30} preserveAspectRatio="xMidYMid meet" />
            )}
            {isSel && (
              <g stroke="var(--color-pink, #7a2e3a)" strokeOpacity={0.7} fill="none">
                <rect x={-13} y={-13} width={26} height={26} strokeWidth={0.6} strokeDasharray="1.4 1.4" />
                <g transform="translate(13 13)" onPointerDown={(e) => startHandle(e, t)} style={{ cursor: "nwse-resize" }}>
                  <circle r={2.6} fill="var(--color-pink, #7a2e3a)" stroke="none" />
                </g>
                <g transform="translate(-13 -13)" onPointerDown={(e) => { e.stopPropagation(); onRemove(t.id); }} style={{ cursor: "pointer" }}>
                  <circle r={2.6} fill="var(--color-ink, #2b2420)" stroke="none" />
                  <path d="M -1 -1 L 1 1 M 1 -1 L -1 1" stroke="#fff" strokeWidth={0.5} />
                </g>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
