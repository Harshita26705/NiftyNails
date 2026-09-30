"use client";

import {
  ArrowDown, ArrowUp, Brush, Copy, Eraser, Eye, EyeOff, FlipHorizontal2, Layers, Lock, Minus, Plus, RotateCcw,
  RotateCw, Trash2, Unlock,
} from "lucide-react";
import type { ReactNode } from "react";
import { CharmIcon } from "@/components/nails/charms";
import { SingleNail } from "@/components/nails/NailSetArt";
import { Segmented } from "@/components/ui/bits";
import { cn, money } from "@/lib/format";
import type {
  CatalogOptions, DesignObject, FrenchTipObject, FrenchTipStyle, GradientObject, ShapeKind, ShapeObject, TextObject,
} from "@/lib/types";
import type { EditorCharm } from "./CharmLayer";

export type Scope = "nail" | "all";

export function Swatch({ hex, name, selected, onClick, disabled }: { hex: string; name: string; selected: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={name} aria-pressed={selected} title={name}
      className="flex w-14 shrink-0 flex-col items-center gap-1.5">
      <span className={cn("size-11 rounded-full ring-1 ring-ink/10 ring-inset transition",
        selected && "ring-2 ring-ink ring-offset-2 ring-offset-paper")} style={{ background: hex }} />
      <span className={cn("line-clamp-1 text-[10.5px] leading-tight", selected ? "font-semibold text-ink" : "text-ink-2")}>{name}</span>
    </button>
  );
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0", className)}>{children}</div>;
}

export function ScopeToggle({ scope, onChange }: { scope: Scope; onChange: (s: Scope) => void }) {
  return (
    <Segmented value={scope} onChange={onChange} className="scale-95 origin-left"
      options={[{ value: "nail", label: "This nail" }, { value: "all", label: "All nails" }]} />
  );
}

export function ColourPanel({ catalog, current, onPick, scope, setScope }: {
  catalog: CatalogOptions; current: string; onPick: (slug: string) => void; scope: Scope; setScope: (s: Scope) => void;
}) {
  return (
    <div className="space-y-3">
      <ScopeToggle scope={scope} onChange={setScope} />
      <Row>
        {catalog.colours.map((c) => <Swatch key={c.slug} hex={c.hex} name={c.name} selected={current === c.slug} onClick={() => onPick(c.slug)} />)}
      </Row>
    </div>
  );
}

export function FinishPanel({ catalog, current, base, shape, onPick, scope, setScope }: {
  catalog: CatalogOptions; current: string; base: string; shape: string; onPick: (slug: string) => void; scope: Scope; setScope: (s: Scope) => void;
}) {
  return (
    <div className="space-y-3">
      <ScopeToggle scope={scope} onChange={setScope} />
      <Row>
        {catalog.finishes.map((f) => (
          <button key={f.slug} type="button" onClick={() => onPick(f.slug)} aria-pressed={current === f.slug}
            className={cn("flex w-20 shrink-0 flex-col items-center gap-1 rounded-2xl p-1.5 ring-1 ring-inset transition",
              current === f.slug ? "bg-blush-100 ring-pink" : "bg-surface ring-line")}>
            <SingleNail spec={{ shape, length: "short", base, finish: f.slug }} className="h-14 w-auto" />
            <span className="text-[11px] font-semibold">{f.name}</span>
            <span className="text-[10px] text-ink-3">{f.surcharge_paise ? `+${money(f.surcharge_paise)}` : "Included"}</span>
          </button>
        ))}
      </Row>
    </div>
  );
}

export function PatternPanel({ catalog, current, patternColour, base, shape, onPick, onColour, scope, setScope }: {
  catalog: CatalogOptions; current: string | null; patternColour: string | null; base: string; shape: string;
  onPick: (slug: string | null) => void; onColour: (slug: string) => void; scope: Scope; setScope: (s: Scope) => void;
}) {
  const accentHex = catalog.colours.find((c) => c.slug === patternColour)?.hex;
  return (
    <div className="space-y-3">
      <ScopeToggle scope={scope} onChange={setScope} />
      <Row>
        <button type="button" onClick={() => onPick(null)} aria-pressed={!current}
          className={cn("flex w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl p-1.5 text-[11px] font-semibold ring-1 ring-inset",
            !current ? "bg-blush-100 ring-pink" : "bg-surface ring-line")}>
          <span className="flex h-14 items-center text-ink-3">None</span>
        </button>
        {catalog.patterns.map((p) => (
          <button key={p.slug} type="button" onClick={() => onPick(p.slug)} aria-pressed={current === p.slug}
            className={cn("flex w-20 shrink-0 flex-col items-center gap-1 rounded-2xl p-1.5 ring-1 ring-inset transition",
              current === p.slug ? "bg-blush-100 ring-pink" : "bg-surface ring-line")}>
            <SingleNail spec={{ shape, length: "short", base, pattern: p.slug, patternColour: accentHex }} className="h-14 w-auto" />
            <span className="line-clamp-1 text-[11px] font-semibold">{p.name}</span>
          </button>
        ))}
      </Row>
      {current && (
        <div>
          <p className="mb-2 text-[12px] font-semibold text-ink-2">Pattern colour</p>
          <Row>
            {catalog.colours.map((c) => <Swatch key={c.slug} hex={c.hex} name={c.name} selected={patternColour === c.slug} onClick={() => onColour(c.slug)} />)}
          </Row>
        </div>
      )}
    </div>
  );
}

export const BRUSHES = [{ size: 3, label: "Fine" }, { size: 7, label: "Medium" }, { size: 13, label: "Bold" }];

/** A hex swatch row plus a free colour picker — freehand tools aren't limited to catalogue polish colours. */
export function ColourField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <label className="flex items-center gap-3">
      <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-1 ring-ink/10 ring-inset">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
          className="absolute -inset-2 cursor-pointer" />
      </span>
      <span className="text-[12.5px] font-semibold text-ink-2">{label}</span>
    </label>
  );
}

export function OpacitySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-3 text-[12px] font-semibold text-ink-2">
      <span className="w-14 shrink-0">Opacity</span>
      <input type="range" min={0.1} max={1} step={0.05} value={value} aria-label="Opacity"
        onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-pink" />
      <span className="w-9 text-right tabular-nums">{Math.round(value * 100)}%</span>
    </label>
  );
}

export function BrushPanel({ tool, setTool, colour, setColour, size, setSize, opacity, setOpacity, onClearStrokes, hasStrokes }: {
  tool: "brush" | "eraser"; setTool: (t: "brush" | "eraser") => void; colour: string; setColour: (hex: string) => void;
  size: number; setSize: (n: number) => void; opacity: number; setOpacity: (n: number) => void;
  onClearStrokes: () => void; hasStrokes: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={tool} onChange={setTool} options={[
          { value: "brush", label: <><Brush className="size-4" /> Brush</> },
          { value: "eraser", label: <><Eraser className="size-4" /> Eraser</> },
        ]} />
        {hasStrokes && (
          <button type="button" onClick={onClearStrokes} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-semibold text-danger hover:bg-danger/5">
            <Trash2 className="size-4" /> Clear strokes
          </button>
        )}
      </div>
      {tool === "brush" && <ColourField label="Brush colour" value={colour} onChange={setColour} />}
      <div className="flex items-center gap-1 rounded-full bg-blush-100 p-1">
        {BRUSHES.map((b) => (
          <button key={b.size} type="button" onClick={() => setSize(b.size)} aria-label={`${b.label} brush`} aria-pressed={size === b.size}
            className={cn("flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-semibold", size === b.size && "bg-surface shadow-sm")}>
            <span className="rounded-full bg-ink" style={{ width: 4 + b.size * 0.9, height: 4 + b.size * 0.9 }} /> {b.label}
          </button>
        ))}
      </div>
      {tool === "brush" && <OpacitySlider value={opacity} onChange={setOpacity} />}
      <p className="text-[11.5px] text-ink-3">Strokes stay inside the nail and are fully editable afterward — select, move, resize, undo.</p>
    </div>
  );
}

const SHAPE_KINDS: { kind: ShapeKind; label: string }[] = [
  { kind: "circle", label: "Circle" }, { kind: "rect", label: "Square" }, { kind: "rounded_rect", label: "Rounded" },
  { kind: "triangle", label: "Triangle" }, { kind: "diamond", label: "Diamond" }, { kind: "polygon", label: "Polygon" },
  { kind: "star", label: "Star" }, { kind: "heart", label: "Heart" }, { kind: "line", label: "Line" },
];

export function ShapesPanel({ selected, onAdd, onUpdate, onDuplicate, onRemove }: {
  selected: ShapeObject | null;
  onAdd: (kind: ShapeKind) => void;
  onUpdate: (patch: Partial<ShapeObject>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4">
      <Row>
        {SHAPE_KINDS.map((s) => (
          <button key={s.kind} type="button" onClick={() => onAdd(s.kind)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-surface p-2 text-[11px] font-semibold ring-1 ring-line ring-inset hover:ring-pink">
            <ShapeGlyph kind={s.kind} />
            {s.label}
          </button>
        ))}
      </Row>
      {selected ? (
        <div className="space-y-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Selected shape</p>
            <div className="flex gap-1">
              <button type="button" onClick={onDuplicate} aria-label="Duplicate shape" className="flex size-10 items-center justify-center rounded-full hover:bg-blush-50"><Copy className="size-4" /></button>
              <button type="button" onClick={onRemove} aria-label="Delete shape" className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger/5"><Trash2 className="size-4" /></button>
            </div>
          </div>
          <ColourField label="Fill" value={selected.fill ?? "#ffffff"} onChange={(hex) => onUpdate({ fill: hex })} />
          <ColourField label="Stroke" value={selected.stroke ?? "#2b2420"} onChange={(hex) => onUpdate({ stroke: hex })} />
          <label className="flex items-center gap-3 text-[12px] font-semibold text-ink-2">
            <span className="w-14 shrink-0">Outline</span>
            <input type="range" min={0} max={6} step={0.5} value={selected.stroke_width} aria-label="Stroke width"
              onChange={(e) => onUpdate({ stroke_width: Number(e.target.value), stroke: selected.stroke ?? "#2b2420" })} className="flex-1 accent-pink" />
          </label>
          {(selected.shape === "polygon" || selected.shape === "star") && (
            <label className="flex items-center gap-3 text-[12px] font-semibold text-ink-2">
              <span className="w-14 shrink-0">Points</span>
              <input type="range" min={3} max={12} step={1} value={selected.sides} aria-label="Sides"
                onChange={(e) => onUpdate({ sides: Number(e.target.value) })} className="flex-1 accent-pink" />
            </label>
          )}
          <OpacitySlider value={selected.opacity} onChange={(v) => onUpdate({ opacity: v })} />
        </div>
      ) : (
        <p className="text-[12px] text-ink-2">Tap a shape to add it, then drag to move, use the pink handle to resize/rotate.</p>
      )}
    </div>
  );
}

function ShapeGlyph({ kind }: { kind: ShapeKind }) {
  return (
    <svg viewBox="-12 -12 24 24" className="size-8 text-ink-2">
      {kind === "circle" && <ellipse rx={10} ry={10} fill="currentColor" />}
      {kind === "rect" && <rect x={-10} y={-10} width={20} height={20} fill="currentColor" />}
      {kind === "rounded_rect" && <rect x={-10} y={-10} width={20} height={20} rx={5} fill="currentColor" />}
      {kind === "triangle" && <polygon points="0,-11 9.5,5.5 -9.5,5.5" fill="currentColor" />}
      {kind === "diamond" && <polygon points="0,-10 10,0 0,10 -10,0" fill="currentColor" />}
      {kind === "polygon" && <polygon points="0,-10 8.7,-5 8.7,5 0,10 -8.7,5 -8.7,-5" fill="currentColor" />}
      {kind === "star" && <polygon points="0,-10 2.4,-3.5 9.5,-3.1 3.8,1.3 5.9,8.1 0,4 -5.9,8.1 -3.8,1.3 -9.5,-3.1 -2.4,-3.5" fill="currentColor" />}
      {kind === "heart" && <path d="M 0 6.5 C -8.5 1.5 -8.5 -6 -3.6 -6 C -1.6 -6 0 -4.7 0 -3.6 C 0 -4.7 1.6 -6 3.6 -6 C 8.5 -6 8.5 1.5 0 6.5 Z" fill="currentColor" />}
      {kind === "line" && <line x1={-10} y1={0} x2={10} y2={0} stroke="currentColor" strokeWidth={2.5} />}
    </svg>
  );
}

export function TextPanel({ selected, onAdd, onUpdate, onRemove }: {
  selected: TextObject | null;
  onAdd: () => void;
  onUpdate: (patch: Partial<TextObject>) => void;
  onRemove: () => void;
}) {
  if (!selected) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={onAdd} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blush-100 py-3.5 text-[13.5px] font-semibold text-pink-deep hover:bg-blush-200">
          Add text
        </button>
        <p className="text-[12px] text-ink-2">Add a short word or initials, then drag to position and style it.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold">Text</p>
        <button type="button" onClick={onRemove} aria-label="Delete text" className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger/5"><Trash2 className="size-4" /></button>
      </div>
      <input value={selected.text} maxLength={60} placeholder="Your text…" onChange={(e) => onUpdate({ text: e.target.value })}
        className="w-full rounded-2xl bg-paper px-4 py-3 text-[15px] ring-1 ring-line ring-inset outline-none focus:ring-2 focus:ring-pink" />
      <Segmented value={selected.font} onChange={(v) => onUpdate({ font: v as TextObject["font"] })}
        options={[{ value: "sans", label: "Sans" }, { value: "display", label: "Display" }]} />
      <Segmented value={selected.align} onChange={(v) => onUpdate({ align: v as TextObject["align"] })}
        options={[{ value: "left", label: "Left" }, { value: "center", label: "Centre" }, { value: "right", label: "Right" }]} />
      <ColourField label="Colour" value={selected.color} onChange={(hex) => onUpdate({ color: hex })} />
      <label className="flex items-center gap-3 text-[12px] font-semibold text-ink-2">
        <span className="w-14 shrink-0">Size</span>
        <input type="range" min={4} max={40} step={1} value={selected.size} aria-label="Text size"
          onChange={(e) => onUpdate({ size: Number(e.target.value) })} className="flex-1 accent-pink" />
      </label>
      <OpacitySlider value={selected.opacity} onChange={(v) => onUpdate({ opacity: v })} />
    </div>
  );
}

export function GradientPanel({ selected, onAdd, onUpdate, onRemove }: {
  selected: GradientObject | null;
  onAdd: () => void;
  onUpdate: (patch: Partial<GradientObject>) => void;
  onRemove: () => void;
}) {
  if (!selected) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={onAdd} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blush-100 py-3.5 text-[13.5px] font-semibold text-pink-deep hover:bg-blush-200">
          Add ombre / gradient
        </button>
        <p className="text-[12px] text-ink-2">Build your own fade — pick any colours, direction and stops. Not limited to preset ombre designs.</p>
      </div>
    );
  }
  const setStop = (i: number, patch: Partial<{ color: string; offset: number }>) =>
    onUpdate({ stops: selected.stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  return (
    <div className="space-y-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold">Gradient</p>
        <button type="button" onClick={onRemove} aria-label="Delete gradient" className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger/5"><Trash2 className="size-4" /></button>
      </div>
      <label className="flex items-center gap-3 text-[12px] font-semibold text-ink-2">
        <span className="w-14 shrink-0">Angle</span>
        <input type="range" min={0} max={360} step={5} value={selected.angle} aria-label="Gradient angle"
          onChange={(e) => onUpdate({ angle: Number(e.target.value) })} className="flex-1 accent-pink" />
        <span className="w-10 text-right tabular-nums">{selected.angle}°</span>
      </label>
      <div className="space-y-2">
        {selected.stops.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <ColourField label={`Stop ${i + 1}`} value={s.color} onChange={(hex) => setStop(i, { color: hex })} />
            <input type="range" min={0} max={1} step={0.02} value={s.offset} aria-label={`Stop ${i + 1} position`}
              onChange={(e) => setStop(i, { offset: Number(e.target.value) })} className="flex-1 accent-pink" />
            {selected.stops.length > 2 && (
              <button type="button" aria-label="Remove stop" onClick={() => onUpdate({ stops: selected.stops.filter((_, idx) => idx !== i) })}
                className="flex size-8 items-center justify-center rounded-full text-danger hover:bg-danger/5"><Trash2 className="size-3.5" /></button>
            )}
          </div>
        ))}
        {selected.stops.length < 6 && (
          <button type="button" onClick={() => onUpdate({ stops: [...selected.stops, { color: "#ffffff", offset: 1 }] })}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-pink"><Plus className="size-3.5" /> Add colour stop</button>
        )}
      </div>
      <OpacitySlider value={selected.opacity} onChange={(v) => onUpdate({ opacity: v })} />
    </div>
  );
}

const FRENCH_STYLES: { style: FrenchTipStyle; label: string }[] = [
  { style: "classic", label: "Classic" }, { style: "deep", label: "Deep" }, { style: "micro", label: "Micro" },
  { style: "colored", label: "Colour-pop" }, { style: "double", label: "Double" }, { style: "asymmetric", label: "Asymmetric" },
];

export function FrenchTipPanel({ selected, onAdd, onUpdate, onRemove }: {
  selected: FrenchTipObject | null;
  onAdd: (style: FrenchTipStyle) => void;
  onUpdate: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4">
      <Row>
        {FRENCH_STYLES.map((s) => (
          <button key={s.style} type="button" onClick={() => onAdd(s.style)}
            className="flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-surface p-2 text-[11px] font-semibold ring-1 ring-line ring-inset hover:ring-pink">
            <svg viewBox="0 0 24 30" className="h-10 w-auto"><path d="M2 26 Q2 4 12 2 Q22 4 22 26 Z" fill="none" stroke="#c9b896" strokeWidth={1.2} /><path d={s.style === "deep" ? "M3 14 Q12 10 21 14 L21 26 Q12 29 3 26 Z" : s.style === "micro" ? "M3 20 Q12 18 21 20 L21 26 Q12 29 3 26 Z" : "M3 17 Q12 13 21 17 L21 26 Q12 29 3 26 Z"} fill="#fff" /></svg>
            {s.label}
          </button>
        ))}
      </Row>
      {selected ? (
        <div className="space-y-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">French tip · {selected.style}</p>
            <button type="button" onClick={onRemove} aria-label="Delete French tip" className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger/5"><Trash2 className="size-4" /></button>
          </div>
          <ColourField label="Colour" value={selected.color} onChange={(hex) => onUpdate({ color: hex })} />
          {selected.style === "double" && (
            <ColourField label="Second colour" value={selected.secondary_color ?? "#ffffff"} onChange={(hex) => onUpdate({ secondary_color: hex })} />
          )}
          {([["depth", "Depth", 0.04, 0.65], ["curve", "Curve", 0, 1], ["thickness", "Thickness", 0.2, 2], ["offset_x", "Position (side)", -0.3, 0.3], ["offset_y", "Position (up/down)", -0.2, 0.2]] as const).map(([key, label, min, max]) => (
            <label key={key} className="flex items-center gap-3 text-[12px] font-semibold text-ink-2">
              <span className="w-24 shrink-0">{label}</span>
              <input type="range" min={min} max={max} step={0.02} value={selected[key]} aria-label={label}
                onChange={(e) => onUpdate({ [key]: Number(e.target.value) })} className="flex-1 accent-pink" />
            </label>
          ))}
          <OpacitySlider value={selected.opacity} onChange={(v) => onUpdate({ opacity: v })} />
        </div>
      ) : (
        <p className="text-[12px] text-ink-2">Pick a style to start, then fine-tune colour, depth, curve and position — or switch to Select and move it like any other object.</p>
      )}
    </div>
  );
}

export function LayersPanel({ objects, selected, onSelect, onReorder, onToggle, onDuplicate, onRemove, onRename }: {
  objects: DesignObject[];
  selected: string | null;
  onSelect: (id: string) => void;
  onReorder: (id: string, dir: "up" | "down") => void;
  onToggle: (id: string, key: "hidden" | "locked") => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const LABEL: Record<DesignObject["type"], string> = {
    stroke: "Brush stroke", shape: "Shape", text: "Text", gradient: "Gradient", french_tip: "French tip", image: "Image",
  };
  if (objects.length === 0) {
    return <p className="text-[12px] text-ink-2">Nothing drawn on this nail yet — add a stroke, shape, gradient or French tip and it&rsquo;ll show up here.</p>;
  }
  // Front-most (last in the array) listed first, matching how it renders on top.
  const ordered = [...objects].map((o, i) => ({ o, i })).reverse();
  return (
    <ul className="space-y-1.5">
      {ordered.map(({ o, i }) => (
        <li key={o.id} className={cn("flex items-center gap-2 rounded-2xl p-2 ring-1 ring-inset", selected === o.id ? "bg-blush-100 ring-pink" : "bg-surface ring-line")}>
          <button type="button" onClick={() => onSelect(o.id)} className="min-w-0 flex-1 truncate text-left">
            <input value={o.name || LABEL[o.type]} onChange={(e) => onRename(o.id, e.target.value)} onClick={(e) => e.stopPropagation()}
              aria-label="Layer name" className="w-full truncate bg-transparent text-[13px] font-semibold outline-none" />
          </button>
          <button type="button" aria-label={o.hidden ? "Show" : "Hide"} onClick={() => onToggle(o.id, "hidden")} className="flex size-8 items-center justify-center rounded-full hover:bg-blush-50">
            {o.hidden ? <EyeOff className="size-4 text-ink-3" /> : <Eye className="size-4" />}
          </button>
          <button type="button" aria-label={o.locked ? "Unlock" : "Lock"} onClick={() => onToggle(o.id, "locked")} className="flex size-8 items-center justify-center rounded-full hover:bg-blush-50">
            {o.locked ? <Lock className="size-4 text-ink-3" /> : <Unlock className="size-4" />}
          </button>
          <button type="button" aria-label="Move up" disabled={i === objects.length - 1} onClick={() => onReorder(o.id, "up")} className="flex size-8 items-center justify-center rounded-full hover:bg-blush-50 disabled:opacity-30"><ArrowUp className="size-4" /></button>
          <button type="button" aria-label="Move down" disabled={i === 0} onClick={() => onReorder(o.id, "down")} className="flex size-8 items-center justify-center rounded-full hover:bg-blush-50 disabled:opacity-30"><ArrowDown className="size-4" /></button>
          <button type="button" aria-label="Duplicate" onClick={() => onDuplicate(o.id)} className="flex size-8 items-center justify-center rounded-full hover:bg-blush-50"><Copy className="size-4" /></button>
          <button type="button" aria-label="Delete" onClick={() => onRemove(o.id)} className="flex size-8 items-center justify-center rounded-full text-danger hover:bg-danger/5"><Trash2 className="size-4" /></button>
        </li>
      ))}
    </ul>
  );
}

export function CharmsPanel({ catalog, onAdd, selected, onUpdate, onDuplicate, onRemove, onFront }: {
  catalog: CatalogOptions;
  onAdd: (slug: string) => void;
  selected: EditorCharm | null;
  onUpdate: (patch: Partial<EditorCharm>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onFront: () => void;
}) {
  return (
    <div className="space-y-3">
      {selected ? (
        <div className="space-y-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Selected charm</p>
            <div className="flex gap-1">
              <button type="button" onClick={onFront} aria-label="Bring to front" className="flex size-10 items-center justify-center rounded-full hover:bg-blush-50"><Layers className="size-4" /></button>
              <button type="button" onClick={onDuplicate} aria-label="Duplicate charm" className="flex size-10 items-center justify-center rounded-full hover:bg-blush-50"><Copy className="size-4" /></button>
              <button type="button" onClick={onRemove} aria-label="Delete charm" className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger/5"><Trash2 className="size-4" /></button>
            </div>
          </div>
          <label className="flex items-center gap-3 text-[12px] font-semibold text-ink-2">
            <Minus className="size-4" />
            <input type="range" min={0.35} max={2.6} step={0.05} value={selected.scale} aria-label="Charm size"
              onChange={(e) => onUpdate({ scale: Number(e.target.value) })} className="flex-1 accent-[#7a2e3a]" />
            <Plus className="size-4" />
          </label>
          <label className="flex items-center gap-3 text-[12px] font-semibold text-ink-2">
            <RotateCcw className="size-4" />
            <input type="range" min={-180} max={180} step={5} value={((selected.rotation + 540) % 360) - 180} aria-label="Charm rotation"
              onChange={(e) => onUpdate({ rotation: Number(e.target.value) })} className="flex-1 accent-[#7a2e3a]" />
            <RotateCw className="size-4" />
          </label>
        </div>
      ) : (
        <p className="text-[12px] text-ink-2">Tap a charm to add it to this nail. Drag to move · pinch or use the pink handle to resize and rotate.</p>
      )}
      <Row>
        {catalog.charms.map((c) => {
          const out = c.stock <= 0;
          return (
            <button key={c.slug} type="button" disabled={out} onClick={() => onAdd(c.slug)}
              className={cn("relative flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-2xl bg-surface p-2 ring-1 ring-line ring-inset transition active:scale-95",
                out ? "opacity-45" : "hover:ring-pink")}>
              <CharmIcon kind={c.asset_key} size={40} />
              <span className="line-clamp-1 text-[11px] font-semibold">{c.name}</span>
              <span className="text-[10px] text-ink-3">{out ? "Sold out" : `+${money(c.price_paise)}`}</span>
            </button>
          );
        })}
      </Row>
    </div>
  );
}

export function ShapePanel({ catalog, shape, length, base, onShape, onLength }: {
  catalog: CatalogOptions; shape: string; length: string; base: string; onShape: (s: string) => void; onLength: (l: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Row>
        {catalog.shapes.map((s) => (
          <button key={s.slug} type="button" onClick={() => onShape(s.slug)} aria-pressed={shape === s.slug}
            className={cn("flex w-20 shrink-0 flex-col items-center gap-1 rounded-2xl p-1.5 ring-1 ring-inset",
              shape === s.slug ? "bg-blush-100 ring-pink" : "bg-surface ring-line")}>
            <SingleNail spec={{ shape: s.svg_key, length, base }} className="h-14 w-auto" />
            <span className="text-[11px] font-semibold">{s.name}</span>
          </button>
        ))}
      </Row>
      <Segmented value={length} onChange={onLength} options={[
        { value: "short", label: "Short" }, { value: "medium", label: "Medium" }, { value: "long", label: "Long" }, { value: "xlong", label: "XL" },
      ]} />
      <p className="text-[11.5px] text-ink-3">Shape and length apply to all ten nails.</p>
    </div>
  );
}

export function NailTools({ onCopyAll, onMirror, onApply, onClear }: {
  onCopyAll: () => void; onMirror: () => void; onApply: () => void; onClear: () => void;
}) {
  const btn = "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-[12.5px] font-semibold ring-1 ring-line hover:bg-blush-50";
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto">
      <button type="button" className={btn} onClick={onCopyAll}><Copy className="size-4 text-pink" /> Copy to all nails</button>
      <button type="button" className={btn} onClick={onMirror}><FlipHorizontal2 className="size-4 text-pink" /> Mirror to other hand</button>
      <button type="button" className={btn} onClick={onApply}><Layers className="size-4 text-pink" /> Apply to selected</button>
      <button type="button" className={cn(btn, "text-danger")} onClick={onClear}><Trash2 className="size-4" /> Clear nail</button>
    </div>
  );
}
