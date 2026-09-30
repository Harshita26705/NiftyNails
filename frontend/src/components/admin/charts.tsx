"use client";

import { useEffect, useRef, useState } from "react";
import { cn, money } from "@/lib/format";

type Point = { date: string; sales_paise: number; orders: number };

const SERIES = "#e0218a"; // single series → one brand hue (no categorical palette needed)

function niceMax(v: number) {
  if (v <= 0) return 100000;
  const exp = 10 ** Math.floor(Math.log10(v));
  const n = v / exp;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * exp;
}

function compactMoney(paise: number) {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(r % 100000 ? 1 : 0)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(r % 1000 ? 1 : 0)}k`;
  return `₹${Math.round(r)}`;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Daily revenue: area + 2px line, one y-axis, crosshair tooltip, table view for screen readers. */
export function SalesChart({ data, height = 240 }: { data: Point[]; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { l: 56, r: 12, t: 12, b: 26 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => d.sales_paise), 0));
  const x = (i: number) => pad.l + (data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => pad.t + h - (v / max) * h;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.sales_paise).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${pad.t + h} L${x(0)},${pad.t + h} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(w / 70)));

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))));
  };

  const total = data.reduce((s, d) => s + d.sales_paise, 0);
  const hp = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12.5px] text-ink-2">Revenue · last {data.length} days · <b className="text-ink">{money(total)}</b></p>
        <button onClick={() => setAsTable((v) => !v)} className="rounded-full px-2.5 py-1 text-[12px] font-semibold text-ink-2 ring-1 ring-line hover:text-ink">
          {asTable ? "Show chart" : "View as table"}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-[260px] overflow-y-auto rounded-xl ring-1 ring-line">
          <table className="w-full text-[12.5px]">
            <thead className="sticky top-0 bg-blush-50 text-left"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">Revenue</th><th className="px-3 py-2 text-right">Orders</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.map((d) => <tr key={d.date}><td className="px-3 py-1.5">{shortDate(d.date)}</td><td className="px-3 py-1.5 text-right tabular-nums">{money(d.sales_paise)}</td><td className="px-3 py-1.5 text-right tabular-nums">{d.orders}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={box} className="relative">
          <svg width={width} height={height} role="img" aria-label={`Daily revenue for the last ${data.length} days, total ${money(total)}`}>
            <defs>
              <linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES} stopOpacity="0.18" />
                <stop offset="100%" stopColor={SERIES} stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="#2a0f1f" strokeOpacity={t === 0 ? 0.18 : 0.06} />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#a0879a">{compactMoney(t)}</text>
              </g>
            ))}
            {data.map((d, i) => i % labelEvery === 0 && (
              <text key={d.date} x={x(i)} y={height - 6} textAnchor="middle" fontSize="11" fill="#a0879a">{shortDate(d.date)}</text>
            ))}
            <path d={area} fill="url(#sales-area)" />
            <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {hp && hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + h} stroke="#2a0f1f" strokeOpacity={0.25} strokeDasharray="3 3" />
                <circle cx={x(hover)} cy={y(hp.sales_paise)} r={5} fill={SERIES} stroke="#fff" strokeWidth={2} />
              </g>
            )}
            <rect x={pad.l} y={pad.t} width={w} height={h} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
          </svg>
          {hp && hover !== null && (
            <div className="pointer-events-none absolute top-2 rounded-xl bg-ink px-3 py-2 text-[12px] text-white shadow-lg"
              style={{ left: Math.min(Math.max(x(hover) - 70, 0), width - 150) }}>
              <p className="font-semibold">{shortDate(hp.date)}</p>
              <p className="tabular-nums">{money(hp.sales_paise)} · {hp.orders} order{hp.orders === 1 ? "" : "s"}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Ranked horizontal bars for one measure (one hue). Optional per-row swatch shows the entity's own colour. */
export function BarList({ rows, format = (v) => String(v), empty = "No data yet." }: {
  rows: { label: string; value: number; swatch?: string; sub?: string }[];
  format?: (v: number) => string;
  empty?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return <p className="py-6 text-center text-[13px] text-ink-3">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${format(r.value)}`}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              {r.swatch && <span className="size-3.5 shrink-0 rounded-full ring-1 ring-ink/10" style={{ background: r.swatch }} />}
              <span className="truncate font-medium">{r.label}</span>
              {r.sub && <span className="truncate text-ink-3">{r.sub}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-ink-2">{format(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blush-50">
            <div className={cn("h-full rounded-full bg-pink/80 transition-all group-hover:bg-pink")} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
