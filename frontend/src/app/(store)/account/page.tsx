"use client";

import { ArrowRight, Heart, Package, Palette, Ruler } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/bits";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateShort, money, ORDER_STATUS_LABEL } from "@/lib/format";
import type { Design, OrderSummary } from "@/lib/types";

export default function AccountOverview() {
  const { favourites } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [designs, setDesigns] = useState<Design[] | null>(null);
  useEffect(() => {
    api<OrderSummary[]>("/me/orders").then(setOrders).catch(() => setOrders([]));
    api<Design[]>("/me/designs").then(setDesigns).catch(() => setDesigns([]));
  }, []);
  const latest = orders?.[0];
  const tiles = [
    { href: "/account/orders", icon: Package, label: "Orders", value: orders?.length ?? "–" },
    { href: "/account/designs", icon: Palette, label: "Saved designs", value: designs?.length ?? "–" },
    { href: "/account/favourites", icon: Heart, label: "Favourites", value: favourites.size },
    { href: "/account/sizes", icon: Ruler, label: "My sizes", value: "View" },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-3xl bg-surface p-5 ring-1 ring-line transition hover:shadow-soft">
            <t.icon className="size-5 text-pink" />
            <p className="mt-4 font-display text-3xl">{t.value}</p>
            <p className="text-[13px] text-ink-2">{t.label}</p>
          </Link>
        ))}
      </div>
      {latest && (
        <Card>
          <p className="text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">Latest order</p>
          <Link href={`/account/orders/${latest.number}`} className="mt-3 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{latest.number}</p>
              <p className="text-[13px] text-ink-2">{dateShort(latest.created_at)} · {latest.item_count} item{latest.item_count > 1 ? "s" : ""} · {money(latest.total_paise)}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blush-100 px-3 py-1.5 text-[12.5px] font-semibold text-pink-deep">
              {ORDER_STATUS_LABEL[latest.status]} <ArrowRight className="size-4" />
            </span>
          </Link>
        </Card>
      )}
    </div>
  );
}
