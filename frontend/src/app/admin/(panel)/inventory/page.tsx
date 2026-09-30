"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader, Panel, Table, useApi } from "@/components/admin/ui";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/format";

type Inventory = {
  products: { id: number; name: string; sku: string; is_active: boolean; made_to_order: boolean; stock: Record<string, { quantity: number; low: boolean }> }[];
  charms: { id: number; name: string; slug: string; stock: number; is_active: boolean; low: boolean }[];
  gift_items: { id: number; name: string; item_type: string; stock: number; low: boolean }[];
};

function StockInput({ value, low, onSave, label }: { value: number; low: boolean; onSave: (v: number) => Promise<void>; label: string }) {
  const [v, setV] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setV(String(value));
  }
  const commit = async () => {
    const n = Math.max(0, Math.floor(Number(v)));
    if (n === value || Number.isNaN(n)) { setV(String(value)); return; }
    setSaving(true);
    try { await onSave(n); } finally { setSaving(false); }
  };
  return (
    <input aria-label={label} type="number" min={0} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={cn("h-9 w-20 rounded-xl bg-surface px-2 text-center tabular-nums ring-1 ring-line outline-none focus:ring-2 focus:ring-pink",
        low && "bg-danger/5 font-bold text-danger ring-danger/30", saving && "opacity-50")} />
  );
}

export default function InventoryPage() {
  const { data, reload } = useApi<Inventory>("/admin/inventory");
  const { toast } = useToast();
  const adjust = async (body: Record<string, unknown>) => {
    try {
      await api("/admin/inventory/adjust", { method: "POST", body });
      toast("Stock updated");
      await reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't update", { tone: "error" });
    }
  };
  return (
    <div>
      <PageHeader title="Inventory" subtitle="Ready-to-ship kits, charms and gift add-ons. Edit a number and press Enter. Red = at or below the low-stock alert." />
      <div className="space-y-6">
        <Table head={["Design", "XS", "S", "M", "L", "Custom fit"]} empty={data?.products.length === 0}>
          {data?.products.map((p) => (
            <tr key={p.id} className={cn(!p.is_active && "opacity-50")}>
              <td className="px-4 py-2"><Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-pink">{p.name}</Link><p className="text-[12px] text-ink-3">{p.sku}</p></td>
              {["XS", "S", "M", "L"].map((l) => (
                <td key={l} className="px-4 py-2">
                  <StockInput label={`${p.name} ${l}`} value={p.stock[l]?.quantity ?? 0} low={!!p.stock[l]?.low} onSave={(quantity) => adjust({ kind: "product", id: p.id, size_label: l, quantity })} />
                </td>
              ))}
              <td className="px-4 py-2 text-[12.5px] text-ink-2">{p.made_to_order ? "Made to order" : "—"}</td>
            </tr>
          ))}
        </Table>
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Charms">
            <ul className="divide-y divide-line">
              {data?.charms.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-[13.5px]">
                  <span className={cn(!c.is_active && "text-ink-3")}>{c.name}</span>
                  <StockInput label={`${c.name} stock`} value={c.stock} low={c.low} onSave={(quantity) => adjust({ kind: "charm", id: c.id, quantity })} />
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Gift add-ons">
            <ul className="divide-y divide-line">
              {data?.gift_items.map((g) => (
                <li key={g.id} className="flex items-center justify-between py-2 text-[13.5px]">
                  <span>{g.name} <span className="text-[11.5px] text-ink-3">· {g.item_type}</span></span>
                  <StockInput label={`${g.name} stock`} value={g.stock} low={g.low} onSave={(quantity) => adjust({ kind: "gift_item", id: g.id, quantity })} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
