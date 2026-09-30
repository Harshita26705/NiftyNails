"use client";

import { Brush, Gem, Palette, Pipette, Redo2, Shapes, Sparkles, Undo2, WandSparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DesignActions, QuoteBreakdown } from "@/components/create/DesignActions";
import { NailGroup } from "@/components/nails/Nail";
import { nailHeight, nailPath } from "@/components/nails/shapes";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { useCatalog } from "@/lib/catalog";
import { cn, money } from "@/lib/format";
import type { CatalogOptions, CharmPlacement, DesignQuote, NailKey, ProductDetail } from "@/lib/types";
import { CharmLayer } from "./CharmLayer";
import { PaintCanvas } from "./PaintCanvas";
import {
  type Studio, blankStudio, charmId, emptyNail, mirrorKey, nailLabel, nailSpec, studioFromProduct, toConfig,
} from "./studioModel";
import {
  BRUSHES, CharmsPanel, ColourPanel, FinishPanel, NailTools, PaintPanel, PatternPanel, type Scope, ShapePanel,
} from "./ToolPanels";
import { useHistory } from "./useHistory";

type Tab = "colour" | "finish" | "pattern" | "paint" | "charms" | "shape" | "review";
const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: "colour", label: "Colour", icon: Palette },
  { id: "finish", label: "Finish", icon: Sparkles },
  { id: "pattern", label: "Pattern", icon: Pipette },
  { id: "paint", label: "Paint", icon: Brush },
  { id: "charms", label: "Charms", icon: Gem },
  { id: "shape", label: "Shape", icon: Shapes },
  { id: "review", label: "Review", icon: WandSparkles },
];
const LEFT: NailKey[] = ["L5", "L4", "L3", "L2", "L1"];
const RIGHT: NailKey[] = ["R1", "R2", "R3", "R4", "R5"];
const DRAFT_KEY = "nifty.studio.v1";

function Thumb({ studio, k, catalog, selected, onClick }: { studio: Studio; k: NailKey; catalog: CatalogOptions; selected: boolean; onClick: () => void }) {
  const h = nailHeight(studio.length);
  return (
    <button type="button" onClick={onClick} aria-label={nailLabel(k)} aria-pressed={selected}
      className={cn("relative flex h-16 w-11 shrink-0 items-end justify-center rounded-xl pb-1 transition lg:h-24 lg:w-16",
        selected ? "bg-blush-200 ring-2 ring-pink" : "bg-surface ring-1 ring-line hover:ring-line-strong")}>
      <svg viewBox={`-10 -10 120 ${h + 20}`} className="h-[88%] w-auto">
        <NailGroup spec={nailSpec(studio, k, catalog)} shadow={false} />
      </svg>
      <span className="absolute -top-1.5 right-0.5 rounded-full bg-white px-1 text-[9px] font-bold text-ink-2 ring-1 ring-line">{k[1]}</span>
    </button>
  );
}

export function DrawStudio() {
  const catalog = useCatalog();
  const params = useSearchParams();
  const history = useHistory<Studio | null>(null);
  const studio = history.state;
  const [active, setActive] = useState<NailKey>("L4");
  const [tab, setTab] = useState<Tab>("colour");
  const [scope, setScope] = useState<Scope>("nail");
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [brushColour, setBrushColour] = useState("white");
  const [brushSize, setBrushSize] = useState(BRUSHES[1].size);
  const [selectedCharm, setSelectedCharm] = useState<string | null>(null);
  // The last server quote, tagged with the design it priced (so "pricing…" is derived, not stored).
  const [priced, setPriced] = useState<{ config: string; quote: DesignQuote | null } | null>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 200, h: 300 });

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
  const quoteConfig = useMemo(() => (studio ? JSON.stringify(toConfig(studio, true)) : null), [studio]);
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
  const selected = nail.charms.find((c) => c.id === selectedCharm) ?? null;
  // Fall back to white (or the first colour) if the chosen brush colour isn't in the catalogue.
  const brushSlug = catalog.colours.some((c) => c.slug === brushColour)
    ? brushColour : catalog.colours.find((c) => c.slug === "white")?.slug ?? catalog.colours[0]?.slug;
  const brushHex = catalog.colours.find((c) => c.slug === brushSlug)?.hex ?? "#FFFFFF";
  const interactive: "paint" | "charms" | "none" = tab === "paint" ? "paint" : tab === "charms" ? "charms" : "none";

  const addCharm = (slug: string) => {
    const c = { id: charmId(), charm: slug, x: 0.5, y: 0.45 + (nail.charms.length % 3) * 0.12, scale: 1, rotation: 0 };
    setNail(active, { charms: [...nail.charms, c] });
    setSelectedCharm(c.id);
  };
  const updateCharm = (id: string, patch: Partial<CharmPlacement>, record = false) =>
    setNail(active, { charms: nail.charms.map((c) => (c.id === id ? { ...c, ...patch } : c)) }, record);

  const copyToAll = () => history.commit({
    ...studio,
    nails: Object.fromEntries(Object.keys(studio.nails).map((k) => [k, { ...nail, charms: nail.charms.map((c) => ({ ...c, id: charmId() })) }])) as Studio["nails"],
  });
  const mirror = () => history.commit({
    ...studio,
    nails: Object.fromEntries(Object.entries(studio.nails).map(([k, n]) => {
      const src = studio.nails[mirrorKey(k as NailKey)];
      return [k, k[0] === active[0] ? n : { ...src, charms: src.charms.map((c) => ({ ...c, id: charmId(), x: 1 - c.x, rotation: -c.rotation })) }];
    })) as Studio["nails"],
  });

  const charmCount = Object.values(studio.nails).reduce((n, x) => n + x.charms.length, 0);

  return (
    <div className="mx-auto flex h-[calc(100dvh-60px)] max-w-7xl flex-col lg:h-[calc(100dvh-72px)] lg:flex-row lg:gap-6 lg:px-6 lg:py-5">
      {/* Hands overview */}
      <div className="border-b border-line bg-paper px-3 pt-2 pb-2.5 lg:w-[180px] lg:shrink-0 lg:border-0 lg:p-0">
        <div className="flex items-center justify-between gap-2 lg:mb-3">
          <p className="text-[12px] font-semibold text-ink-2">
            <span className="text-ink">{nailLabel(active)}</span>
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
            {LEFT.map((k) => <Thumb key={k} studio={studio} k={k} catalog={catalog} selected={k === active} onClick={() => { setActive(k); setSelectedCharm(null); }} />)}
          </div>
          <span className="mx-1 h-12 w-px shrink-0 bg-line lg:hidden" />
          <div className="flex gap-1.5 lg:col-span-1 lg:flex-col lg:items-center">
            <span className="hidden text-[10px] font-bold tracking-widest text-ink-3 uppercase lg:block">Right</span>
            {RIGHT.map((k) => <Thumb key={k} studio={studio} k={k} catalog={catalog} selected={k === active} onClick={() => { setActive(k); setSelectedCharm(null); }} />)}
          </div>
        </div>
      </div>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 flex-col lg:rounded-[2rem] lg:bg-surface lg:shadow-soft lg:ring-1 lg:ring-line">
        <div className="hidden items-center justify-between px-5 pt-4 lg:flex">
          <div className="flex gap-1">
            <button type="button" aria-label="Undo (Ctrl+Z)" disabled={!history.canUndo} onClick={history.undo} className="flex size-10 items-center justify-center rounded-full disabled:text-ink-3 hover:bg-blush-100"><Undo2 className="size-5" /></button>
            <button type="button" aria-label="Redo (Ctrl+Shift+Z)" disabled={!history.canRedo} onClick={history.redo} className="flex size-10 items-center justify-center rounded-full disabled:text-ink-3 hover:bg-blush-100"><Redo2 className="size-5" /></button>
          </div>
          <NailTools onCopyAll={copyToAll} onMirror={mirror} onClear={() => setNail(active, emptyNail())} />
        </div>
        <div ref={stageBox} className="dot-grid relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
          onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedCharm(null); }}>
          <div className="relative" style={{ width: nailW, height: nailH }}>
            <svg viewBox={`0 0 100 ${h}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
              <NailGroup spec={spec} />
            </svg>
            <PaintCanvas key={`${active}-${studio.shape}-${studio.length}`} shape={shapeKey} nailH={h} paint={nail.paint}
              tool={tool} colour={brushHex} brushSize={brushSize} active={interactive === "paint"}
              onStrokeStart={history.checkpoint} onCommit={(url) => setNail(active, { paint: url }, false)} />
            {/* subtle outline so the paint boundary is always visible */}
            <svg viewBox={`0 0 100 ${h}`} className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
              <path d={nailPath(shapeKey, h)} fill="none" stroke="#2a0f1f" strokeOpacity={interactive === "paint" ? 0.25 : 0.08} strokeDasharray={interactive === "paint" ? "3 3" : undefined} strokeWidth={0.8} />
            </svg>
            <CharmLayer charms={nail.charms} assetOf={assetOf} width={nailW} height={nailH} selected={selectedCharm}
              active={interactive === "charms"} onSelect={setSelectedCharm} onGestureStart={history.checkpoint}
              onChange={(id, patch) => updateCharm(id, patch)} onRemove={(id) => { setNail(active, { charms: nail.charms.filter((c) => c.id !== id) }); setSelectedCharm(null); }} />
          </div>
          {interactive === "none" && tab !== "review" && (
            <p className="pointer-events-none absolute bottom-3 rounded-full bg-white/80 px-3 py-1 text-[11.5px] text-ink-2 backdrop-blur">
              Tip: choose <b>Paint</b> to draw or <b>Charms</b> to decorate
            </p>
          )}
        </div>
        <div className="border-t border-line px-3 py-2 lg:hidden">
          <NailTools onCopyAll={copyToAll} onMirror={mirror} onClear={() => setNail(active, emptyNail())} />
        </div>
      </div>

      {/* Tools */}
      <div className="safe-bottom flex max-h-[42dvh] flex-col border-t border-line bg-paper lg:max-h-none lg:w-[380px] lg:shrink-0 lg:overflow-hidden lg:rounded-[2rem] lg:border-0 lg:bg-surface lg:shadow-soft lg:ring-1 lg:ring-line">
        <div role="tablist" className="scrollbar-none flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2 py-1.5 lg:grid lg:grid-cols-7 lg:gap-0.5 lg:overflow-visible lg:px-2 lg:pt-3">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
              className={cn("flex min-w-[58px] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-semibold transition lg:min-w-0 lg:px-0.5 lg:text-[10.5px]",
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
          {tab === "paint" && (
            <PaintPanel catalog={catalog} tool={tool} setTool={setTool} colour={brushSlug} setColour={setBrushColour}
              size={brushSize} setSize={setBrushSize} hasPaint={!!nail.paint} onClearPaint={() => setNail(active, { paint: null })} />
          )}
          {tab === "charms" && (
            <CharmsPanel catalog={catalog} onAdd={addCharm} selected={selected}
              onUpdate={(patch) => { if (selected) { history.checkpoint(); updateCharm(selected.id, patch); } }}
              onDuplicate={() => { if (selected) { const c = { ...selected, id: charmId(), x: Math.min(0.9, selected.x + 0.12), y: Math.min(0.9, selected.y + 0.08) }; setNail(active, { charms: [...nail.charms, c] }); setSelectedCharm(c.id); } }}
              onRemove={() => { if (selected) { setNail(active, { charms: nail.charms.filter((c) => c.id !== selected.id) }); setSelectedCharm(null); } }}
              onFront={() => { if (selected) setNail(active, { charms: [...nail.charms.filter((c) => c.id !== selected.id), selected] }); }} />
          )}
          {tab === "shape" && (
            <ShapePanel catalog={catalog} shape={studio.shape} length={studio.length} base={baseHex}
              onShape={(s) => history.commit({ ...studio, shape: s })} onLength={(l) => history.commit({ ...studio, length: l as Studio["length"] })} />
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
                  <QuoteBreakdown quote={quote} />
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-ink-2"><Spinner className="size-4" /> Pricing your design…</div>
              )}
              <DesignActions config={toConfig(studio)} quote={quote} source="draw" />
              <p className="text-[11.5px] leading-relaxed text-ink-3">Every custom set is checked by our nail artist before production.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
