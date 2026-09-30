"use client";

import { Ruler, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/bits";
import { api } from "@/lib/api";
import { dateShort } from "@/lib/format";
import { saveSizes } from "@/lib/sizes";
import { FINGERS, type Finger } from "@/lib/types";

type Measurement = { id: number; label: string; method: string; confidence: number | null; fingers: Record<Finger, { size: number; width_mm: number | null }>; created_at?: string };

export default function MySizes() {
  const [rows, setRows] = useState<Measurement[] | null>(null);
  useEffect(() => { api<Measurement[]>("/me/measurements").then(setRows).catch(() => setRows([])); }, []);
  if (!rows) return <div className="skeleton h-40 rounded-3xl" />;
  if (!rows.length) return <EmptyState icon={<Ruler className="size-7" />} title="No sizes saved" body="Measure from a photo or enter your sizes by hand." action={<ButtonLink href="/size">Find my size</ButtonLink>} />;
  return (
    <div className="space-y-3">
      {rows.map((m, i) => (
        <div key={m.id} className="rounded-3xl bg-surface p-5 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{m.label} {i === 0 && <span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-success">Current</span>}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => saveSizes(Object.fromEntries(FINGERS.map((f) => [f, m.fingers[f].size])) as Record<Finger, number>, m.method === "photo" ? "photo" : "manual")}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-pink hover:bg-blush-50">Use for custom fits</button>
              <button aria-label="Delete measurement" onClick={async () => { await api(`/me/measurements/${m.id}`, { method: "DELETE" }); setRows(rows.filter((r) => r.id !== m.id)); }}
                className="flex size-9 items-center justify-center rounded-full text-ink-2 hover:text-danger"><Trash2 className="size-4" /></button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {FINGERS.map((f) => (
              <div key={f} className="rounded-2xl bg-blush-50 py-2.5 text-center">
                <p className="font-display text-2xl leading-none">{m.fingers[f]?.size}</p>
                <p className="mt-1 text-[11px] text-ink-2 capitalize">{f}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink-3">{m.method === "photo" ? `Photo sizing${m.confidence ? ` · ${Math.round(m.confidence * 100)}% confidence` : ""}` : "Entered by hand"}{m.created_at ? ` · ${dateShort(m.created_at)}` : ""}</p>
        </div>
      ))}
    </div>
  );
}
