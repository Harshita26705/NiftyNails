"use client";

import { useEffect, useRef } from "react";
import { nailPath } from "@/components/nails/shapes";

/** Paint layers are stored at 3× nail units (300 px wide) regardless of on-screen size. */
export const PAINT_SCALE = 3;

type Props = {
  shape: string;
  nailH: number; // nail units
  paint: string | null; // PNG data URL (or media URL)
  tool: "brush" | "eraser";
  colour: string;
  brushSize: number; // nail units
  active: boolean; // receives pointer input
  onStrokeStart: () => void;
  onCommit: (dataUrl: string | null) => void;
};

/**
 * Freehand painting constrained to the nail outline. The nail's SVG path is reused as a Path2D clip, so
 * paint can never leave the nail — exactly what the artist will reproduce.
 */
export function PaintCanvas({ shape, nailH, paint, tool, colour, brushSize, active, onStrokeStart, onCommit }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ id: number; last: [number, number]; mid: [number, number] } | null>(null);
  const width = 100 * PAINT_SCALE;
  const height = Math.round(nailH * PAINT_SCALE);

  // Load the stored layer whenever it changes from outside (switching nails, undo/redo).
  const lastCommitted = useRef<string | null>(null);
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    if (paint === lastCommitted.current && paint !== null) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    lastCommitted.current = paint;
    if (!paint) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
    };
    img.src = paint;
  }, [paint, width, height]);

  const toCanvas = (e: React.PointerEvent | PointerEvent): [number, number] => {
    const rect = canvas.current!.getBoundingClientRect();
    // nail units
    return [((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * nailH];
  };

  const prepare = () => {
    const ctx = canvas.current!.getContext("2d")!;
    ctx.setTransform(PAINT_SCALE, 0, 0, PAINT_SCALE, 0, 0);
    ctx.save();
    ctx.clip(new Path2D(nailPath(shape, nailH)));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    return ctx;
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active || drawing.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onStrokeStart();
    const p = toCanvas(e);
    const ctx = prepare();
    ctx.beginPath();
    ctx.arc(p[0], p[1], brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    drawing.current = { id: e.pointerId, last: p, mid: p };
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drawing.current;
    if (!d || e.pointerId !== d.id) return;
    const ctx = canvas.current!.getContext("2d")!;
    const events = typeof e.nativeEvent.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [e.nativeEvent];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const p = toCanvas(ev);
      const mid: [number, number] = [(d.last[0] + p[0]) / 2, (d.last[1] + p[1]) / 2];
      ctx.beginPath();
      ctx.moveTo(d.mid[0], d.mid[1]);
      ctx.quadraticCurveTo(d.last[0], d.last[1], mid[0], mid[1]);
      ctx.stroke();
      d.last = p;
      d.mid = mid;
    }
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drawing.current;
    if (!d || e.pointerId !== d.id) return;
    drawing.current = null;
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let empty = true;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] !== 0) { empty = false; break; }
    }
    const url = empty ? null : c.toDataURL("image/png");
    lastCommitted.current = url;
    onCommit(url);
  };

  return (
    <canvas
      ref={canvas}
      width={width}
      height={height}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="absolute inset-0 size-full"
      style={{ touchAction: active ? "none" : "auto", pointerEvents: active ? "auto" : "none", cursor: active ? "crosshair" : "default" }}
      aria-label={active ? `${tool === "eraser" ? "Eraser" : "Paint brush"} canvas — draw on the nail` : undefined}
    />
  );
}
