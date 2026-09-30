"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/format";

/** Fetch + reload helper for admin screens. */
export function useApi<T>(path: string | null, query?: Record<string, string | number | boolean | undefined | null>) {
  const key = path ? `${path}?${JSON.stringify(query ?? {})}` : null;
  // State is tagged with the request key it answers; "loading" is simply "no answer for this key yet".
  const [result, setResult] = useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null });
  const queryJson = JSON.stringify(query ?? {});

  useEffect(() => {
    if (!path || !key) return;
    let alive = true;
    api<T>(path, { query: JSON.parse(queryJson) })
      .then((data) => alive && setResult({ key, data, error: null }))
      .catch((e) => alive && setResult((r) => ({ key, data: r.data, error: e instanceof ApiError ? e.message : "Couldn't load data." })));
    return () => { alive = false; };
  }, [path, key, queryJson]);

  const reload = useCallback(async () => {
    if (!path) return;
    const data = await api<T>(path, { query: JSON.parse(queryJson) });
    setResult({ key, data, error: null });
  }, [path, key, queryJson]);
  const setData = useCallback((data: T | null) => setResult((r) => ({ ...r, data })), []);
  return { data: result.data, error: result.error, loading: result.key !== key, reload, setData };
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em] md:text-[36px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-surface p-5 ring-1 ring-line", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[14px] font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "warn" | "pink" }) {
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line md:p-5">
      <p className="text-[12px] font-semibold text-ink-2">{label}</p>
      <p className={cn("mt-2 font-display text-[28px] leading-none tabular-nums md:text-[32px]", tone === "warn" && "text-warning", tone === "pink" && "text-pink")}>{value}</p>
      {hint && <p className="mt-1.5 text-[12px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-surface ring-1 ring-line">
      <table className="w-full min-w-[640px] text-left text-[13.5px]">
        <thead className="border-b border-line bg-blush-50/60 text-[11px] font-bold tracking-wide text-ink-2 uppercase">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-bold whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-10 text-center text-sm text-ink-3">Nothing here yet.</p>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="h-10 w-full rounded-full bg-surface pr-4 pl-10 text-[13.5px] ring-1 ring-line outline-none focus:ring-2 focus:ring-pink md:w-72" />
    </label>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-[13px]">
      <span className="text-ink-2">Page {page} of {pages}</span>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" className="flex size-9 items-center justify-center rounded-full ring-1 ring-line disabled:opacity-40"><ChevronLeft className="size-4" /></button>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page" className="flex size-9 items-center justify-center rounded-full ring-1 ring-line disabled:opacity-40"><ChevronRight className="size-4" /></button>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-[13.5px] font-medium">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-pink" : "bg-line-strong")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      {label}
    </label>
  );
}

export const STATUS_TONE: Record<string, string> = {
  NEW: "bg-blush-100 text-pink-deep",
  DESIGN_REVIEW: "bg-[#fff1d6] text-warning",
  APPROVED: "bg-[#e6efff] text-[#2f55a4]",
  IN_PRODUCTION: "bg-[#efe6ff] text-[#6a3fb5]",
  READY: "bg-champagne text-ink-2",
  SHIPPED: "bg-[#e3f4fb] text-[#1f6f8b]",
  DELIVERED: "bg-mint text-success",
  CANCELLED: "bg-danger/10 text-danger",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap", STATUS_TONE[status] ?? "bg-blush-50 text-ink-2")}>{label}</span>;
}
