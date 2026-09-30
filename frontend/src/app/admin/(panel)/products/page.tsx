"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader, Pager, SearchBox, Table, useApi } from "@/components/admin/ui";
import { NailSetArt } from "@/components/nails/NailSetArt";
import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { backdropFor } from "@/lib/colour";
import { cn, money } from "@/lib/format";
import type { Page, ProductDetail } from "@/lib/types";

type AdminProduct = ProductDetail & { inventory: { size_label: string; quantity: number; low_stock_threshold: number }[]; popularity: number };

export default function AdminProducts() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const { data } = useApi<Page<AdminProduct>>("/admin/products", { q: q || undefined, status, page, page_size: 25 });
  return (
    <div>
      <PageHeader title="Products" subtitle="Your nail designs. Everything customers can buy comes from here."
        actions={<><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name, SKU…" /><ButtonLink href="/admin/products/new" size="md" icon={<Plus className="size-4" />}>New product</ButtonLink></>} />
      <div className="mb-4 flex gap-2">
        {(["all", "active", "inactive"] as const).map((s) => <Chip key={s} selected={status === s} onClick={() => { setStatus(s); setPage(1); }}>{s === "inactive" ? "Archived" : s[0].toUpperCase() + s.slice(1)}</Chip>)}
      </div>
      <Table head={["Design", "SKU", "Category", "Price", "Stock (XS/S/M/L)", "Sold", "Status"]} empty={data?.items.length === 0}>
        {data?.items.map((p) => {
          const stock = ["XS", "S", "M", "L"].map((l) => p.inventory.find((i) => i.size_label === l));
          return (
            <tr key={p.id} className="hover:bg-blush-50/60">
              <td className="px-4 py-2.5">
                <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold hover:text-pink">
                  <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: backdropFor(p.art.base) }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.images[0] ? <img src={p.images[0].url} alt="" className="size-full object-cover" /> : <NailSetArt art={p.art} className="w-[90%]" />}
                  </span>
                  {p.name}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-ink-2">{p.sku}</td>
              <td className="px-4 py-2.5">{p.category?.name ?? "—"}</td>
              <td className="px-4 py-2.5 font-semibold tabular-nums">{money(p.price_paise)}</td>
              <td className="px-4 py-2.5 tabular-nums">
                {stock.map((s, i) => <span key={i} className={cn("mr-2", s && s.quantity <= s.low_stock_threshold ? "font-bold text-danger" : "text-ink-2")}>{s?.quantity ?? 0}</span>)}
              </td>
              <td className="px-4 py-2.5 tabular-nums">{p.popularity}</td>
              <td className="px-4 py-2.5">
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", p.is_active ? "bg-mint text-success" : "bg-line text-ink-2")}>{p.is_active ? "Active" : "Archived"}</span>
                {p.is_featured && <span className="ml-1.5 rounded-full bg-blush-100 px-2 py-1 text-[11px] font-bold text-pink-deep">Featured</span>}
              </td>
            </tr>
          );
        })}
      </Table>
      {data && <Pager page={page} pageSize={25} total={data.total} onPage={setPage} />}
    </div>
  );
}
