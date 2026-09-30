"use client";

import { Check, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { CharmIcon } from "@/components/nails/charms";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { cn, money } from "@/lib/format";
import type { CatalogOptions } from "@/lib/types";

const PRICE_BANDS = [
  { label: "Under ₹700", max: 70000 },
  { label: "₹700 – ₹1,000", min: 70000, max: 100000 },
  { label: "Over ₹1,000", min: 100000 },
];
const LENGTHS = [["short", "Short"], ["medium", "Medium"], ["long", "Long"], ["xlong", "Extra long"]];
export const SORTS = [
  ["featured", "Featured"], ["popular", "Most loved"], ["newest", "Newest"], ["price_asc", "Price: low to high"], ["price_desc", "Price: high to low"],
];

function useFilterState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const values = (key: string) => (params.get(key) ?? "").split(",").filter(Boolean);
  const push = useCallback((next: URLSearchParams) => {
    next.delete("page");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }, [pathname, router]);

  const toggle = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    const current = new Set(values(key));
    if (current.has(value)) current.delete(value);
    else current.add(value);
    if (current.size) next.set(key, [...current].join(","));
    else next.delete(key);
    push(next);
  };
  const set = (entries: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(entries)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    push(next);
  };
  const clear = () => {
    const next = new URLSearchParams();
    if (params.get("sort")) next.set("sort", params.get("sort")!);
    push(next);
  };
  const activeCount = ["category", "style", "shape", "finish", "colour", "charm", "occasion", "length"]
    .reduce((n, k) => n + values(k).length, 0) + (params.get("min_price") || params.get("max_price") ? 1 : 0);
  return { params, values, toggle, set, clear, pending, activeCount };
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-line py-5 last:border-0">
      <legend className="mb-3 text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function FilterPanel({ options, state }: { options: CatalogOptions; state: ReturnType<typeof useFilterState> }) {
  const { values, toggle, set, params } = state;
  const has = (k: string, v: string) => values(k).includes(v);
  const minP = params.get("min_price");
  const maxP = params.get("max_price");
  return (
    <div>
      <Group title="Style">
        {options.categories.map((c) => (
          <Chip key={c.slug} selected={has("category", c.slug)} onClick={() => toggle("category", c.slug)}>{c.name}</Chip>
        ))}
      </Group>
      <Group title="Colour">
        {options.colours.map((c) => (
          <button key={c.slug} type="button" onClick={() => toggle("colour", c.slug)} aria-pressed={has("colour", c.slug)}
            title={c.name} aria-label={c.name}
            className={cn("relative size-10 rounded-full ring-1 ring-ink/10 ring-inset transition active:scale-95",
              has("colour", c.slug) && "ring-2 ring-ink ring-offset-2 ring-offset-paper")}
            style={{ background: c.hex }}>
            {has("colour", c.slug) && <Check className="absolute inset-0 m-auto size-4 text-white mix-blend-difference" />}
          </button>
        ))}
      </Group>
      <Group title="Shape">
        {options.shapes.map((s) => (
          <Chip key={s.slug} selected={has("shape", s.slug)} onClick={() => toggle("shape", s.slug)}>{s.name}</Chip>
        ))}
      </Group>
      <Group title="Finish">
        {options.finishes.map((f) => (
          <Chip key={f.slug} selected={has("finish", f.slug)} onClick={() => toggle("finish", f.slug)}>{f.name}</Chip>
        ))}
      </Group>
      <Group title="Charms">
        {options.charms.map((c) => (
          <Chip key={c.slug} selected={has("charm", c.slug)} onClick={() => toggle("charm", c.slug)}
            icon={<CharmIcon kind={c.asset_key} size={20} />}>{c.name}</Chip>
        ))}
      </Group>
      <Group title="Occasion">
        {options.occasions.map((o) => (
          <Chip key={o.slug} selected={has("occasion", o.slug)} onClick={() => toggle("occasion", o.slug)}>{o.name}</Chip>
        ))}
      </Group>
      <Group title="Length">
        {LENGTHS.map(([v, l]) => (
          <Chip key={v} selected={has("length", v)} onClick={() => toggle("length", v)}>{l}</Chip>
        ))}
      </Group>
      <Group title="Price">
        {PRICE_BANDS.map((b) => {
          const active = String(b.min ?? "") === (minP ?? "") && String(b.max ?? "") === (maxP ?? "");
          return (
            <Chip key={b.label} selected={active}
              onClick={() => set(active ? { min_price: null, max_price: null } : { min_price: b.min ? String(b.min) : null, max_price: b.max ? String(b.max) : null })}>
              {b.label}
            </Chip>
          );
        })}
        {options.price_range[1] > 0 && (
          <p className="w-full pt-1 text-xs text-ink-3">Designs from {money(options.price_range[0])} to {money(options.price_range[1])}</p>
        )}
      </Group>
    </div>
  );
}

/** Mobile: quick category chips + a Filters sheet. Desktop: sticky sidebar. */
export function ShopFilters({ options, total }: { options: CatalogOptions; total: number }) {
  const state = useFilterState();
  const [open, setOpen] = useState(false);
  const { values, toggle, set, params, clear, activeCount, pending } = state;

  return (
    <>
      {/* Mobile / tablet bar */}
      <div className="lg:hidden">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)} icon={<SlidersHorizontal className="size-4" />}>
            Filters{activeCount ? ` · ${activeCount}` : ""}
          </Button>
          <select value={params.get("sort") ?? "featured"} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort"
            className="h-9 min-w-0 flex-1 appearance-none truncate rounded-full bg-surface px-4 text-[13px] font-semibold ring-1 ring-line ring-inset outline-none">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="scrollbar-none -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip selected={!values("category").length} onClick={() => set({ category: null })}>All</Chip>
          {options.categories.map((c) => (
            <Chip key={c.slug} selected={values("category").includes(c.slug)} onClick={() => toggle("category", c.slug)}>{c.name}</Chip>
          ))}
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Filters"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={clear} disabled={!activeCount}>Clear</Button>
            <Button full loading={pending} onClick={() => setOpen(false)}>Show {total} designs</Button>
          </div>
        }>
        <FilterPanel options={options} state={state} />
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2 lg:block">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Filters</p>
          {activeCount > 0 && (
            <button onClick={clear} className="inline-flex items-center gap-1 text-[13px] font-semibold text-pink">
              <X className="size-3.5" /> Clear all
            </button>
          )}
        </div>
        <FilterPanel options={options} state={state} />
      </aside>
    </>
  );
}

export function SortSelect() {
  const { params, set } = useFilterState();
  return (
    <select value={params.get("sort") ?? "featured"} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort designs"
      className="h-10 appearance-none rounded-full bg-surface px-4 pr-9 text-[13px] font-semibold ring-1 ring-line ring-inset outline-none focus:ring-pink">
      {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
