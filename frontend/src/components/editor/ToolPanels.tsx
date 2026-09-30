"use client";

import { Brush, Copy, Eraser, FlipHorizontal2, Layers, Minus, Plus, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { CharmIcon } from "@/components/nails/charms";
import { SingleNail } from "@/components/nails/NailSetArt";
import { Segmented } from "@/components/ui/bits";
import { cn, money } from "@/lib/format";
import type { CatalogOptions } from "@/lib/types";
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

export function PaintPanel({ catalog, tool, setTool, colour, setColour, size, setSize, onClearPaint, hasPaint }: {
  catalog: CatalogOptions; tool: "brush" | "eraser"; setTool: (t: "brush" | "eraser") => void; colour: string;
  setColour: (slug: string) => void; size: number; setSize: (n: number) => void; onClearPaint: () => void; hasPaint: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={tool} onChange={setTool} options={[
          { value: "brush", label: <><Brush className="size-4" /> Brush</> },
          { value: "eraser", label: <><Eraser className="size-4" /> Eraser</> },
        ]} />
        <div className="flex items-center gap-1 rounded-full bg-blush-100 p-1">
          {BRUSHES.map((b) => (
            <button key={b.size} type="button" onClick={() => setSize(b.size)} aria-label={`${b.label} brush`} aria-pressed={size === b.size}
              className={cn("flex size-10 items-center justify-center rounded-full", size === b.size && "bg-surface shadow-sm")}>
              <span className="rounded-full bg-ink" style={{ width: 4 + b.size * 0.9, height: 4 + b.size * 0.9 }} />
            </button>
          ))}
        </div>
        {hasPaint && (
          <button type="button" onClick={onClearPaint} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-semibold text-danger hover:bg-danger/5">
            <Trash2 className="size-4" /> Clear paint
          </button>
        )}
      </div>
      {tool === "brush" && (
        <Row>
          {catalog.colours.map((c) => <Swatch key={c.slug} hex={c.hex} name={c.name} selected={colour === c.slug} onClick={() => setColour(c.slug)} />)}
        </Row>
      )}
      <p className="text-[11.5px] text-ink-3">Paint stays inside the nail. Our artist hand-paints your strokes using the same polish colours.</p>
    </div>
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
              onChange={(e) => onUpdate({ scale: Number(e.target.value) })} className="flex-1 accent-[#e0218a]" />
            <Plus className="size-4" />
          </label>
          <label className="flex items-center gap-3 text-[12px] font-semibold text-ink-2">
            <RotateCcw className="size-4" />
            <input type="range" min={-180} max={180} step={5} value={((selected.rotation + 540) % 360) - 180} aria-label="Charm rotation"
              onChange={(e) => onUpdate({ rotation: Number(e.target.value) })} className="flex-1 accent-[#e0218a]" />
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

export function NailTools({ onCopyAll, onMirror, onClear }: { onCopyAll: () => void; onMirror: () => void; onClear: () => void }) {
  const btn = "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-[12.5px] font-semibold ring-1 ring-line hover:bg-blush-50";
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto">
      <button type="button" className={btn} onClick={onCopyAll}><Copy className="size-4 text-pink" /> Copy to all nails</button>
      <button type="button" className={btn} onClick={onMirror}><FlipHorizontal2 className="size-4 text-pink" /> Mirror to other hand</button>
      <button type="button" className={cn(btn, "text-danger")} onClick={onClear}><Trash2 className="size-4" /> Clear nail</button>
    </div>
  );
}
