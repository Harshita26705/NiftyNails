"use client";

import { Package } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/bits";
import { Tag } from "@/components/ui/Chip";
import { api } from "@/lib/api";
import { dateShort, money, ORDER_STATUS_LABEL } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";

export default function MyOrders() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  useEffect(() => { api<OrderSummary[]>("/me/orders").then(setOrders).catch(() => setOrders([])); }, []);
  if (!orders) return <div className="skeleton h-40 rounded-3xl" />;
  if (!orders.length) return <EmptyState icon={<Package className="size-7" />} title="No orders yet" body="When you order, you'll be able to track it here." action={<ButtonLink href="/shop">Shop designs</ButtonLink>} />;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/account/orders/${o.number}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-blush-50">
            <span className="font-semibold">{o.number}</span>
            {o.has_custom && <Tag>Custom</Tag>}
            <span className="text-[13px] text-ink-2">{dateShort(o.created_at)} · {o.item_count} item{o.item_count > 1 ? "s" : ""}</span>
            <span className="ml-auto flex items-center gap-3">
              <Tag tone={o.status === "CANCELLED" ? "danger" : o.status === "DELIVERED" ? "mint" : "cream"}>{ORDER_STATUS_LABEL[o.status]}</Tag>
              <span className="font-semibold tabular-nums">{money(o.total_paise)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
