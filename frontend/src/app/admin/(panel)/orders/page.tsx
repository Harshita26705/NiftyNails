"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader, Pager, SearchBox, StatusPill, Table, useApi } from "@/components/admin/ui";
import { Chip } from "@/components/ui/Chip";
import { dateTime, money, ORDER_STATUS_LABEL } from "@/lib/format";
import type { OrderSummary, Page } from "@/lib/types";

const FILTERS = [["", "All"], ["OPEN", "Open"], ["NEW", "New"], ["DESIGN_REVIEW", "Design review"], ["APPROVED", "Approved"],
  ["IN_PRODUCTION", "In production"], ["READY", "Ready"], ["SHIPPED", "Shipped"], ["DELIVERED", "Delivered"], ["CANCELLED", "Cancelled"]];

function Orders() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") ?? "OPEN");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [customOnly, setCustomOnly] = useState(false);
  const { data } = useApi<Page<OrderSummary>>("/admin/orders", { status: status || undefined, q: q || undefined, page, page_size: 25, custom_only: customOnly || undefined });

  return (
    <div>
      <PageHeader title="Orders" subtitle={data ? `${data.total} order${data.total === 1 ? "" : "s"}` : " "} actions={<SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Order number or email" />} />
      <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([v, l]) => <Chip key={v} selected={status === v} onClick={() => { setStatus(v); setPage(1); }}>{l}</Chip>)}
        <Chip selected={customOnly} onClick={() => setCustomOnly((c) => !c)}>Custom only</Chip>
      </div>
      <Table head={["Order", "Placed", "Customer", "Items", "Total", "Payment", "Status"]} empty={data?.items.length === 0}>
        {data?.items.map((o) => (
          <tr key={o.id} className="hover:bg-blush-50/60">
            <td className="px-4 py-3 font-semibold"><Link href={`/admin/orders/${o.number}`} className="hover:text-pink">{o.number}</Link>{o.has_custom && <span className="ml-2 rounded-full bg-blush-100 px-1.5 py-0.5 text-[10px] font-bold text-pink-deep">CUSTOM</span>}</td>
            <td className="px-4 py-3 whitespace-nowrap text-ink-2">{dateTime(o.created_at)}</td>
            <td className="px-4 py-3"><p>{o.customer_name}</p><p className="text-[12px] text-ink-3">{o.email}</p></td>
            <td className="px-4 py-3 tabular-nums">{o.item_count}</td>
            <td className="px-4 py-3 font-semibold tabular-nums">{money(o.total_paise)}</td>
            <td className="px-4 py-3 text-[12.5px]">{o.payment_method === "cod" ? "COD" : "UPI"} · <span className={o.payment_status === "PAID" ? "text-success" : "text-ink-2"}>{o.payment_status.toLowerCase()}</span></td>
            <td className="px-4 py-3"><StatusPill status={o.status} label={ORDER_STATUS_LABEL[o.status]} /></td>
          </tr>
        ))}
      </Table>
      {data && <Pager page={page} pageSize={25} total={data.total} onPage={setPage} />}
    </div>
  );
}

export default function OrdersPage() {
  return <Suspense><Orders /></Suspense>;
}
