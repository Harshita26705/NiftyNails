"use client";

import {
  Baseline, Check, ChevronDown, Droplets, Gem, Layers as LayersIcon, Palette, Pipette, Redo2, Ruler,
  Shapes as ShapesTabIcon, Sparkles, Square, Undo2, Upload, WandSparkles, ZoomIn, ZoomOut,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DesignActions, QuoteBreakdown } from "@/components/create/DesignActions";
import { NailGroup } from "@/components/nails/Nail";
import { nailHeight, nailPath } from "@/components/nails/shapes";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { useCatalog } from "@/lib/catalog";
import { cn, money } from "@/lib/format";
import { imageFileToDataUrl } from "@/lib/image";
import type {
  CatalogOptions, CharmPlacement, DesignObject, DesignQuote, FrenchTipObject, FrenchTipStyle, GradientObject,
  NailKey, ProductDetail, ShapeKind, ShapeObject, TextObject,
} from "@/lib/types";
import { CharmLayer } from "./CharmLayer";
import { ObjectStage, type StageMode } from "./ObjectStage";
import {
  cloneNailContent, type Studio, blankStudio, charmId, emptyNail, mirrorNailContent, nailLabel, nailSpec,
  objectId, studioFromProduct, toConfig,
} from "./studioModel";
import {
  BRUSHES, BrushPanel, CharmsPanel, ColourPanel, FinishPanel, FrenchTipPanel, GradientPanel, LayersPanel, NailTools,
  PatternPanel, type Scope, ShapePanel, ShapesPanel, TextPanel,
} from "./ToolPanels";
import { useHistory } from "./useHistory";

type Tab = "colour" | "finish" | "pattern" | "brush" | "shapes" | "text" | "gradient" | "frenchtip" | "charms" | "nailshape" | "layers" | "review";
const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: "colour", label: "Colour", icon: Palette },
  { id: "finish", label: "Finish", icon: Sparkles },
  { id: "pattern", label: "Pattern", icon: Pipette },
  { id: "brush", label: "Brush", icon: Baseline },
  { id: "shapes", label: "Shapes", icon: Square },
  { id: "text", label: "Text", icon: WandSparkles },
  { id: "gradient", label: "Ombre", icon: Droplets },
  { id: "frenchtip", label: "French tip", icon: Ruler },
  { id: "charms", label: "Charms", icon: Gem },
  { id: "nailshape", label: "Nail shape", icon: ShapesTabIcon },
  { id: "layers", label: "Layers", icon: LayersIcon },
  { id: "review", label: "Review", icon: Check },
];
const LEFT: NailKey[] = ["L5", "L4", "L3", "L2", "L1"];
const RIGHT: NailKey[] = ["R1", "R2", "R3", "R4", "R5"];
const DRAFT_KEY = "nifty.studio.v1";
const SELECT_TABS = new Set<Tab>(["shapes", "text", "gradient", "frenchtip", "layers"]);

const FRENCH_DEFAULTS: Record<FrenchTipStyle, Omit<FrenchTipObject, "id" | "name" | "hidden" | "locked" | "opacity" | "style" | "type">> = {
  classic: { color: "#FFFFFF", secondary_color: null, depth: 0.24, curve: 0.5, thickness: 1, offset_x: 0, offset_y: 0 },
  deep: { color: "#FFFFFF", secondary_color: null, depth: 0.42, curve: 0.55, thickness: 1, offset_x: 0, offset_y: 0 },
  micro: { color: "#FFFFFF", secondary_color: null, depth: 0.1, curve: 0.4, thickness: 1, offset_x: 0, offset_y: 0 },
  colored: { color: "#7A2E3A", secondary_color: null, depth: 0.24, curve: 0.5, thickness: 1, offset_x: 0, offset_y: 0 },
  double: { color: "#FFFFFF", secondary_color: "#7A2E3A", depth: 0.3, curve: 0.5, thickness: 1, offset_x: 0, offset_y: 0 },
  asymmetric: { color: "#FFFFFF", secondary_color: null, depth: 0.26, curve: 0.45, thickness: 1, offset_x: 0.12, offset_y: 0 },
};

function Thumb({ studio, k, catalog, selected, marked, onClick }: {
  studio: Studio; k: NailKey; catalog: CatalogOptions; selected: boolean; marked: boolean; onClick: () => void;
}) {
  const h = nailHeight(studio.length);
  return (
    <button type="button" onClick={onClick} aria-label={nailLabel(k)} aria-pressed={selected}
      className={cn("relative flex h-16 w-11 shrink-0 items-end justify-center rounded-xl pb-1 transition lg:h-24 lg:w-16",
        marked ? "bg-champagne ring-2 ring-pink" : selected ? "bg-blush-200 ring-2 ring-pink" : "bg-surface ring-1 ring-line hover:ring-line-strong")}>
      <svg viewBox={`-10 -10 120 ${h + 20}`} className="h-[88%] w-auto">
        <NailGroup spec={nailSpec(studio, k, catalog)} shadow={false} />
      </svg>
      <span className="absolute -top-1.5 right-0.5 rounded-full bg-white px-1 text-[9px] font-bold text-ink-2 ring-1 ring-line">{k[1]}</span>
      {marked && <span className="absolute -top-1.5 left-0.5 flex size-3.5 items-center justify-center rounded-full bg-pink text-white"><Check className="size-2.5" /></span>}
    </button>
  );
}

export function DrawStudio() {
  const catalog = useCatalog();
  const params = useSearchParams();
  const { toast } = useToast();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const history = useHistory<Studio | null>(null);
  const studio = history.state;
  const [active, setActive] = useState<NailKey>("L4");
  const [tab, setTab] = useState<Tab>("colour");
  const [scope, setScope] = useState<Scope>("nail");
  const [objTool, setObjTool] = useState<"brush" | "eraser">("brush");
  const [brushColour, setBrushColour] = useState("#FFFFFF");
  const [brushSize, setBrushSize] = useState(BRUSHES[1].size);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [selectedCharm, setSelectedCharm] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [applyMode, setApplyMode] = useState(false);
  const [applyTargets, setApplyTargets] = useState<Set<NailKey>>(new Set());
  const [showBreakdown, setShowBreakdown] = useState(false);
  // The last server quote, tagged with the design it priced (so "pricing…" is derived, not stored).
  const [priced, setPriced] = useState<{ config: string; quote: DesignQuote | null } | null>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 200, h: 300 });
  const fileInput = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------- init (product prefill → draft → blank)
  useEffect(() => {
    if (!catalog || studio) return;
    const from = params.get("from");
    if (from) {
      api<ProductDetail>(`/products/${from}`)
        .then((p) => history.reset(studioFromProduct(p, catalog)))
        .catch(() => history.reset(blankStudio(catalog)));
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        history.reset(JSON.parse(raw) as Studio);
        return;
      }
    } catch { /* ignore */ }
    history.reset(blankStudio(catalog));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  // Autosave draft + debounced server quote (prices & manufacturability come from the backend).
  const quoteConfig = studio ? JSON.stringify(toConfig(studio, true)) : null;
  useEffect(() => {
    if (!studio) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(studio)); } catch { /* storage full — draft not saved */ }
  }, [studio]);
  useEffect(() => {
    if (!quoteConfig) return;
    let alive = true;
    const t = setTimeout(() => {
      api<DesignQuote>("/designs/quote", { method: "POST", body: JSON.parse(quoteConfig) })
        .then((q) => alive && setPriced({ config: quoteConfig, quote: q }))
        .catch(() => alive && setPriced({ config: quoteConfig, quote: null }));
    }, 450);
    return () => { alive = false; clearTimeout(t); };
  }, [quoteConfig]);
  const quote = priced?.quote ?? null;
  const quoting = priced?.config !== quoteConfig;

  // Fit the enlarged nail into the stage.
  const ready = studio !== null;
  useEffect(() => {
    const el = stageBox.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  // Keyboard shortcuts (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) history.redo(); else history.undo(); }
      if (e.key.toLowerCase() === "y") { e.preventDefault(); history.redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history]);

  const nail = studio?.nails[active];
  const h = nailHeight(studio?.length ?? "medium");
  const nailW = Math.max(120, Math.min(stageSize.w * 0.62, (stageSize.h * 0.9 * 100) / h, 340));
  const nailH = (nailW * h) / 100;

  const setNail = useCallback((key: NailKey, patch: Partial<Studio["nails"][NailKey]>, record = true) => {
    const fn = (s: Studio | null) => (s ? { ...s, nails: { ...s.nails, [key]: { ...s.nails[key], ...patch } } } : s);
    if (record) history.commit(fn);
    else history.update(fn);
  }, [history]);

  const applyScoped = (patch: Partial<Studio["nails"][NailKey]>, globalPatch?: Partial<Studio>) => {
    if (scope === "all" && studio) {
      history.commit({
        ...studio, ...globalPatch,
        nails: Object.fromEntries(Object.entries(studio.nails).map(([k, n]) => [k, { ...n, ...(globalPatch ? Object.fromEntries(Object.keys(patch).map((p) => [p, null])) : patch) }])) as Studio["nails"],
      });
    } else {
      setNail(active, patch);
    }
  };

  if (!catalog || !studio || !nail) {
    return <div className="flex h-[70dvh] items-center justify-center"><Spinner className="size-8 text-pink" /></div>;
  }

  const assetOf = (slug: string) => catalog.charms.find((c) => c.slug === slug)?.asset_key ?? slug;
  const spec = nailSpec(studio, active, catalog, { layers: false });
  const currentColour = nail.colour ?? studio.base_colour;
  const currentFinish = nail.finish ?? studio.finish;
  const baseHex = catalog.colours.find((c) => c.slug === currentColour)?.hex ?? "#F8C8D8";
  const shapeKey = catalog.shapes.find((s) => s.slug === studio.shape)?.svg_key ?? "almond";
  const selectedCharmObj = nail.charms.find((c) => c.id === selectedCharm) ?? null;
  const interactive: "charms" | "stage" | "none" = tab === "charms" ? "charms" : tab === "review" || tab === "colour" || tab === "finish" || tab === "pattern" || tab === "nailshape" ? "none" : "stage";
  const stageMode: StageMode = tab === "brush" ? (objTool === "brush" ? "draw" : "erase") : SELECT_TABS.has(tab) ? "select" : "none";

  // ------------------------------------------------------------ design-studio object CRUD (strokes/shapes/text/gradients/French tips)
  const objAdd = (obj: DesignObject) => setNail(active, { objects: [...nail.objects, obj] }, false);
  const objUpdate = (id: string, patch: Record<string, unknown>, record = false) =>
    setNail(active, { objects: nail.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) }, record);
  const objRemove = (id: string) => {
    setNail(active, { objects: nail.objects.filter((o) => o.id !== id) });
    if (selectedObject === id) setSelectedObject(null);
  };
  const objInsert = (obj: DesignObject) => {
    setNail(active, { objects: [...nail.objects, obj] });
    setSelectedObject(obj.id);
  };
  const objDuplicate = (id: string) => {
    const o = nail.objects.find((x) => x.id === id);
    if (!o) return;
    const copy: DesignObject = o.type === "shape" || o.type === "text" || o.type === "image"
      ? { ...o, id: objectId(), x: Math.min(0.92, o.x + 0.06), y: Math.min(0.92, o.y + 0.06) }
      : { ...o, id: objectId() };
    objInsert(copy);
  };
  const objToggle = (id: string, key: "hidden" | "locked") =>
    setNail(active, { objects: nail.objects.map((o) => (o.id === id ? { ...o, [key]: !o[key] } : o)) });
  const objRename = (id: string, name: string) =>
    setNail(active, { objects: nail.objects.map((o) => (o.id === id ? { ...o, name } : o)) }, false);
  const objReorder = (id: string, dir: "up" | "down") => {
    const idx = nail.objects.findIndex((o) => o.id === id);
    const swapWith = dir === "up" ? idx + 1 : idx - 1;
    if (idx < 0 || swapWith < 0 || swapWith >= nail.objects.length) return;
    const next = [...nail.objects];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    setNail(active, { objects: next });
  };

  const addShape = (kind: ShapeKind) => objInsert({
    id: objectId(), type: "shape", name: "", hidden: false, locked: false, opacity: 1,
    shape: kind, x: 0.5, y: 0.42, scale: 1, rotation: 0, fill: "#FFFFFF", stroke: null, stroke_width: 0, sides: 6,
  });
  const addText = () => objInsert({
    id: objectId(), type: "text", name: "", hidden: false, locked: false, opacity: 1,
    x: 0.5, y: 0.5, scale: 1, rotation: 0, text: "", font: "sans", size: 12, color: "#2B2420", align: "center",
  });
  const addGradient = () => objInsert({
    id: objectId(), type: "gradient", name: "", hidden: false, locked: false, opacity: 0.85,
    stops: [{ color: baseHex, offset: 0 }, { color: "#FFFFFF", offset: 1 }], angle: 180,
  });
  const addFrenchTip = (style: FrenchTipStyle) => objInsert({
    id: objectId(), type: "french_tip", name: "", hidden: false, locked: false, opacity: 1, style, ...FRENCH_DEFAULTS[style],
  });
  const uploadImage = async (file: File) => {
    try {
      const url = await imageFileToDataUrl(file);
      objInsert({ id: objectId(), type: "image", name: "", hidden: false, locked: false, opacity: 1, x: 0.5, y: 0.5, scale: 1, rotation: 0, url });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't add that image.", { tone: "error" });
    }
  };

  const selectedShape = (nail.objects.find((o) => o.id === selectedObject && o.type === "shape") as ShapeObject | undefined) ?? null;
  const selectedText = (nail.objects.find((o) => o.id === selectedObject && o.type === "text") as TextObject | undefined) ?? null;
  const selectedGradient = (nail.objects.find((o) => o.id === selectedObject && o.type === "gradient") as GradientObject | undefined) ?? null;
  const selectedFrenchTip = (nail.objects.find((o) => o.id === selectedObject && o.type === "french_tip") as FrenchTipObject | undefined) ?? null;
  const hasStrokes = nail.objects.some((o) => o.type === "stroke");

  const addCharm = (slug: string) => {
    const c: CharmPlacement & { id: string } = { id: charmId(), charm: slug, x: 0.5, y: 0.45 + (nail.charms.length % 3) * 0.12, scale: 1, rotation: 0 };
    setNail(active, { charms: [...nail.charms, c] });
    setSelectedCharm(c.id);
  };
  const updateCharm = (id: string, patch: Partial<CharmPlacement>, record = false) =>
    setNail(active, { charms: nail.charms.map((c) => (c.id === id ? { ...c, ...patch } : c)) }, record);

  const copyToAll = () => history.commit({
    ...studio,
    nails: Object.fromEntries(Object.keys(studio.nails).map((k) => [k, cloneNailContent(nail)])) as Studio["nails"],
  });
  const mirror = () => history.commit({
    ...studio,
    nails: Object.fromEntries(Object.entries(studio.nails).map(([k, n]) => {
      const src = studio.nails[((k[0] === "L" ? "R" : "L") + k[1]) as NailKey];
      return [k, k[0] === active[0] ? n : mirrorNailContent(src)];
    })) as Studio["nails"],
  });
  const applyToTargets = () => {
    if (applyTargets.size === 0) return;
    history.commit({
      ...studio,
      nails: Object.fromEntries(Object.entries(studio.nails).map(([k, n]) =>
        [k, applyTargets.has(k as NailKey) ? cloneNailContent(nail) : n])) as Studio["nails"],
    });
    setApplyMode(false);
    setApplyTargets(new Set());
  };

  const charmCount = Object.values(studio.nails).reduce((n, x) => n + x.charms.length, 0);

  return (
    <div className="mx-auto flex h-[calc(100dvh-60px)] max-w-7xl flex-col lg:h-[calc(100dvh-72px)] lg:flex-row lg:gap-6 lg:px-6 lg:py-5">
      {/* Hands overview */}
      <div className="border-b border-line bg-paper px-3 pt-2 pb-2.5 lg:w-[180px] lg:shrink-0 lg:border-0 lg:p-0">
        <div className="flex items-center justify-between gap-2 lg:mb-3">
          <p className="text-[12px] font-semibold text-ink-2">
            <span className="text-ink">{applyMode ? `${applyTargets.size} selected` : nailLabel(active)}</span>
          </p>
          <div className="flex items-center gap-1 lg:hidden">
            <button type="button" aria-label="Undo" disabled={!history.canUndo} onClick={history.undo} className="flex size-9 items-center justify-center rounded-full disabled:text-ink-3 hover:bg-blush-100"><Undo2 className="size-[18px]" /></button>
            <button type="button" aria-label="Redo" disabled={!history.canRedo} onClick={history.redo} className="flex size-9 items-center justify-center rounded-full disabled:text-ink-3 hover:bg-blush-100"><Redo2 className="size-[18px]" /></button>
            <button type="button" onClick={() => setTab("review")} className="ml-1 rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white">
              {quoting && !quote ? "…" : quote ? money(quote.price_paise) : "Review"}
            </button>
          </div>
        </div>
        <div className="scrollbar-none mt-1.5 flex items-end gap-1.5 overflow-x-auto pt-1.5 lg:grid lg:grid-cols-2 lg:gap-x-3 lg:gap-y-2 lg:overflow-visible">
          <div className="flex gap-1.5 lg:col-span-1 lg:flex-col lg:items-center">
            <span className="hidden text-[10px] font-bold tracking-widest text-ink-3 uppercase lg:block">Left</span>
            {LEFT.map((k) => (
              <Thumb key={k} studio={studio} k={k} catalog={catalog} selected={k === active} marked={applyTargets.has(k)}
                onClick={() => applyMode
                  ? setApplyTargets((s) => { const next = new Set(s); if (next.has(k)) next.delete(k); else if (k !== active) next.add(k); return next; })
                  : (setActive(k), setSelectedCharm(null), setSelectedObject(null))} />
            ))}
          </div>
          <span className="mx-1 h-12 w-px shrink-0 bg-line lg:hidden" />
          <div className="flex gap-1.5 lg:col-span-1 lg:flex-col lg:items-center">
            <span className="hidden text-[10px] font-bold tracking-widest text-ink-3 uppercase lg:block">Right</span>
            {RIGHT.map((k) => (
              <Thumb key={k} studio={studio} k={k} catalog={catalog} selected={k === active} marked={applyTargets.has(k)}
                onClick={() => applyMode
                  ? setApplyTargets((s) => { const next = new Set(s); if (next.has(k)) next.delete(k); else if (k !== active) next.add(k); return next; })
                  : (setActive(k), setSelectedCharm(null), setSelectedObject(null))} />
            ))}
          </div>
        </div>
        {applyMode && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface p-2 ring-1 ring-line lg:flex-wrap">
            <button type="button" onClick={() => setApplyTargets(new Set(Object.keys(studio.nails).filter((k) => k !== active) as NailKey[]))}
              className="rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-pink hover:bg-blush-50">All nails</button>
            <button type="button" onClick={applyToTargets} disabled={applyTargets.size === 0}
              className="ml-auto rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40">Apply</button>
            <button type="button" onClick={() => { setApplyMode(false); setApplyTargets(new Set()); }}
              className="rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-blush-50">Cancel</button>
          </div>
        )}
      </div>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 flex-col lg:rounded-[0.75rem] lg:bg-surface lg:shadow-soft lg:ring-1 lg:ring-line">
        <div className="hidden items-center justify-between px-5 pt-4 lg:flex">
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Undo (Ctrl+Z)" disabled={!history.canUndo} onClick={history.undo} className="flex size-10 items-center justify-center rounded-full disabled:text-ink-3 hover:bg-blush-100"><Undo2 className="size-5" /></button>
            <button type="button" aria-label="Redo (Ctrl+Shift+Z)" disabled={!history.canRedo} onClick={history.redo} className="flex size-10 items-center justify-center rounded-full disabled:text-ink-3 hover:bg-blush-100"><Redo2 className="size-5" /></button>
            <span className="mx-1.5 h-6 w-px bg-line" />
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))} className="flex size-10 items-center justify-center rounded-full hover:bg-blush-100"><ZoomOut className="size-[18px]" /></button>
            <span className="w-10 text-center text-[12px] font-semibold text-ink-2 tabular-nums">{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))} className="flex size-10 items-center justify-center rounded-full hover:bg-blush-100"><ZoomIn className="size-[18px]" /></button>
          </div>
          <NailTools onCopyAll={copyToAll} onMirror={mirror} onApply={() => setApplyMode(true)} onClear={() => setNail(active, emptyNail())} />
        </div>
        <div ref={stageBox} className="dot-grid relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
          onPointerDown={(e) => { if (e.target === e.currentTarget) { setSelectedCharm(null); setSelectedObject(null); } }}>
          <div className="relative transition-transform" style={{ width: nailW, height: nailH, transform: `scale(${zoom})` }}>
            <svg viewBox={`0 0 100 ${h}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
              <NailGroup spec={spec} />
            </svg>
            {interactive === "stage" && (
              <ObjectStage objects={nail.objects} h={h} uid={uid} mode={stageMode} brushColour={brushColour}
                brushSize={brushSize} brushOpacity={brushOpacity} brushType="round" selected={selectedObject}
                onSelect={setSelectedObject} onGestureStart={history.checkpoint} onAdd={objAdd} onUpdate={objUpdate} onRemove={objRemove} />
            )}
            {interactive !== "stage" && nail.objects.length > 0 && (
              <svg viewBox={`0 0 100 ${h}`} className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
                <NailGroup spec={{ ...spec, base: "transparent", finish: "matte", objects: nail.objects }} shadow={false} />
              </svg>
            )}
            {/* subtle outline so the nail boundary is always visible while drawing */}
            <svg viewBox={`0 0 100 ${h}`} className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
              <path d={nailPath(shapeKey, h)} fill="none" stroke="#2b2420" strokeOpacity={stageMode !== "none" ? 0.25 : 0.08} strokeDasharray={stageMode !== "none" ? "3 3" : undefined} strokeWidth={0.8} />
            </svg>
            <CharmLayer charms={nail.charms} assetOf={assetOf} width={nailW} height={nailH} selected={selectedCharm}
              active={interactive === "charms"} onSelect={setSelectedCharm} onGestureStart={history.checkpoint}
              onChange={(id, patch) => updateCharm(id, patch)} onRemove={(id) => { setNail(active, { charms: nail.charms.filter((c) => c.id !== id) }); setSelectedCharm(null); }} />
          </div>
          {interactive === "none" && tab !== "review" && (
            <p className="pointer-events-none absolute bottom-3 rounded-full bg-white/80 px-3 py-1 text-[11.5px] text-ink-2 backdrop-blur">
              Tip: choose <b>Brush</b>, <b>Shapes</b> or <b>Charms</b> to decorate
            </p>
          )}
        </div>
        <div className="border-t border-line px-3 py-2 lg:hidden">
          <NailTools onCopyAll={copyToAll} onMirror={mirror} onApply={() => setApplyMode(true)} onClear={() => setNail(active, emptyNail())} />
        </div>
      </div>

      {/* Tools */}
      <div className="safe-bottom flex max-h-[46dvh] flex-col border-t border-line bg-paper lg:max-h-none lg:w-[380px] lg:shrink-0 lg:overflow-hidden lg:rounded-[0.75rem] lg:border-0 lg:bg-surface lg:shadow-soft lg:ring-1 lg:ring-line">
        <div role="tablist" className="scrollbar-none flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2 py-1.5 lg:grid lg:grid-cols-4 lg:gap-0.5 lg:overflow-visible lg:px-2 lg:pt-3">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
              className={cn("flex min-w-[58px] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-semibold transition lg:min-w-0 lg:px-0.5 lg:py-2 lg:text-[10.5px]",
                tab === t.id ? "bg-blush-100 text-pink-deep" : "text-ink-2 hover:text-ink")}>
              <t.icon className="size-[18px]" />
              {t.label}
              {t.id === "charms" && charmCount > 0 && <span className="sr-only">({charmCount})</span>}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 lg:px-5 lg:py-4">
          {tab === "colour" && (
            <ColourPanel catalog={catalog} current={currentColour} scope={scope} setScope={setScope}
              onPick={(slug) => scope === "all" ? applyScoped({ colour: null }, { base_colour: slug }) : setNail(active, { colour: slug })} />
          )}
          {tab === "finish" && (
            <FinishPanel catalog={catalog} current={currentFinish} base={baseHex} shape={shapeKey} scope={scope} setScope={setScope}
              onPick={(slug) => scope === "all" ? applyScoped({ finish: null }, { finish: slug }) : setNail(active, { finish: slug })} />
          )}
          {tab === "pattern" && (
            <PatternPanel catalog={catalog} current={nail.pattern} patternColour={nail.pattern_colour} base={baseHex} shape={shapeKey}
              scope={scope} setScope={setScope}
              onPick={(slug) => applyScoped({ pattern: slug, pattern_colour: nail.pattern_colour ?? (slug ? "white" : null) })}
              onColour={(slug) => applyScoped({ pattern_colour: slug })} />
          )}
          {tab === "brush" && (
            <BrushPanel tool={objTool} setTool={setObjTool} colour={brushColour} setColour={setBrushColour}
              size={brushSize} setSize={setBrushSize} opacity={brushOpacity} setOpacity={setBrushOpacity}
              hasStrokes={hasStrokes} onClearStrokes={() => setNail(active, { objects: nail.objects.filter((o) => o.type !== "stroke") })} />
          )}
          {tab === "shapes" && (
            <ShapesPanel selected={selectedShape} onAdd={addShape}
              onUpdate={(patch) => selectedShape && objUpdate(selectedShape.id, patch)}
              onDuplicate={() => selectedShape && objDuplicate(selectedShape.id)}
              onRemove={() => selectedShape && objRemove(selectedShape.id)} />
          )}
          {tab === "text" && (
            <TextPanel selected={selectedText} onAdd={addText}
              onUpdate={(patch) => selectedText && objUpdate(selectedText.id, patch)}
              onRemove={() => selectedText && objRemove(selectedText.id)} />
          )}
          {tab === "gradient" && (
            <GradientPanel selected={selectedGradient} onAdd={addGradient}
              onUpdate={(patch) => selectedGradient && objUpdate(selectedGradient.id, patch)}
              onRemove={() => selectedGradient && objRemove(selectedGradient.id)} />
          )}
          {tab === "frenchtip" && (
            <FrenchTipPanel selected={selectedFrenchTip} onAdd={addFrenchTip}
              onUpdate={(patch) => selectedFrenchTip && objUpdate(selectedFrenchTip.id, patch)}
              onRemove={() => selectedFrenchTip && objRemove(selectedFrenchTip.id)} />
          )}
          {tab === "charms" && (
            <CharmsPanel catalog={catalog} onAdd={addCharm} selected={selectedCharmObj}
              onUpdate={(patch) => { if (selectedCharmObj) { history.checkpoint(); updateCharm(selectedCharmObj.id, patch); } }}
              onDuplicate={() => { if (selectedCharmObj) { const c = { ...selectedCharmObj, id: charmId(), x: Math.min(0.9, selectedCharmObj.x + 0.12), y: Math.min(0.9, selectedCharmObj.y + 0.08) }; setNail(active, { charms: [...nail.charms, c] }); setSelectedCharm(c.id); } }}
              onRemove={() => { if (selectedCharmObj) { setNail(active, { charms: nail.charms.filter((c) => c.id !== selectedCharmObj.id) }); setSelectedCharm(null); } }}
              onFront={() => { if (selectedCharmObj) setNail(active, { charms: [...nail.charms.filter((c) => c.id !== selectedCharmObj.id), selectedCharmObj] }); }} />
          )}
          {tab === "nailshape" && (
            <ShapePanel catalog={catalog} shape={studio.shape} length={studio.length} base={baseHex}
              onShape={(s) => history.commit({ ...studio, shape: s })} onLength={(l) => history.commit({ ...studio, length: l as Studio["length"] })} />
          )}
          {tab === "layers" && (
            <LayersPanel objects={nail.objects} selected={selectedObject} onSelect={setSelectedObject}
              onReorder={objReorder} onToggle={objToggle} onDuplicate={objDuplicate} onRemove={objRemove} onRename={objRename} />
          )}
          {tab === "review" && (
            <div className="space-y-4">
              {quote ? (
                <>
                  {!quote.manufacturable && (
                    <p className="rounded-2xl bg-danger/5 px-4 py-3 text-[13px] font-medium text-danger">{quote.warnings.join(" ")}</p>
                  )}
                  {quote.manufacturable && quote.warnings.length > 0 && (
                    <p className="rounded-2xl bg-[#fff6e8] px-4 py-3 text-[13px] text-[#7a4a00]">{quote.warnings.join(" ")}</p>
                  )}
                  <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold tracking-[0.14em] text-ink-3 uppercase">Your design · {quote.tier}</p>
                        <p className="mt-1 font-display text-[26px] leading-none">{money(quote.price_paise)}</p>
                      </div>
                      <button type="button" onClick={() => setShowBreakdown((v) => !v)}
                        className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-pink">
                        View price breakdown <ChevronDown className={cn("size-4 transition-transform", showBreakdown && "rotate-180")} />
                      </button>
                    </div>
                    {showBreakdown && <div className="mt-4 border-t border-dashed border-line-strong pt-3"><QuoteBreakdown quote={quote} /></div>}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-ink-2"><Spinner className="size-4" /> Pricing your design…</div>
              )}
              <DesignActions config={toConfig(studio)} quote={quote} source="draw" />
              <p className="text-[11.5px] leading-relaxed text-ink-3">Every custom set is checked by our nail artist before production.</p>
            </div>
          )}
        </div>
        {(tab === "shapes" || tab === "text") && (
          <div className="border-t border-line px-4 py-2.5 lg:px-5">
            <input ref={fileInput} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
            <button type="button" onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2 hover:text-pink">
              <Upload className="size-3.5" /> Upload an image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
