"use client";

import { Check, Clock, PackageCheck, Paintbrush, Search, Sparkles, Truck, X } from "lucide-react";
import { Card } from "@/components/ui/bits";
import { cn, dateShort, dateTime, money, ORDER_STATUS_LABEL } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { LineVisual } from "./LineVisual";

const FLOW: OrderStatus[] = ["NEW", "DESIGN_REVIEW", "APPROVED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"];
const ICON: Record<string, typeof Check> = {
  NEW: Sparkles, DESIGN_REVIEW: Search, APPROVED: Check, IN_PRODUCTION: Paintbrush, READY: PackageCheck, SHIPPED: Truck, DELIVERED: Check,
};

export function StatusTimeline({ order }: { order: Order }) {
  if (order.status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-danger/5 px-4 py-3 text-danger">
        <X className="size-5" /> This order was cancelled. {order.events.at(-1)?.note}
      </div>
    );
  }
  const hasReview = order.items.some((i) => i.kind === "custom") || order.events.some((e) => e.status === "DESIGN_REVIEW");
  const steps = FLOW.filter((s) => s !== "DESIGN_REVIEW" || hasReview);
  const current = steps.indexOf(order.status);
  const eventAt = (s: string) => order.events.find((e) => e.status === s)?.created_at;
  return (
    <ol className="relative space-y-0">
      {steps.map((s, i) => {
        const done = i <= current;
        const Icon = ICON[s] ?? Clock;
        const at = eventAt(s);
        return (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && <span className={cn("absolute top-9 left-[17px] h-[calc(100%-2.25rem)] w-0.5", i < current ? "bg-pink" : "bg-line")} />}
            <span className={cn("relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full",
              done ? "bg-pink text-white" : "bg-surface text-ink-3 ring-1 ring-line", i === current && "ring-4 ring-blush-200")}>
              <Icon className="size-4" />
            </span>
            <div className="pt-1.5">
              <p className={cn("text-[14px] font-semibold", !done && "text-ink-3")}>{ORDER_STATUS_LABEL[s]}</p>
              {at && <p className="text-[12px] text-ink-2">{dateTime(at)}</p>}
              {s === "SHIPPED" && order.tracking_number && done && (
                <p className="mt-0.5 text-[12.5px] text-ink-2">{order.courier ?? "Courier"} · {order.tracking_number}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItems({ order }: { order: Order }) {
  return (
    <ul className="divide-y divide-line">
      {order.items.map((it) => (
        <li key={it.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
          <LineVisual kind={it.kind} art={it.snapshot?.art} config={it.snapshot?.config} imageUrl={it.image_url} className="size-16" />
          <div className="min-w-0 flex-1 text-[13.5px]">
            <p className="font-semibold">{it.name} {it.quantity > 1 && <span className="text-ink-2">× {it.quantity}</span>}</p>
            <p className="text-ink-2">
              {it.kind === "custom" && "Custom design · "}
              {it.sizes?.label === "CUSTOM" ? `Custom fit ${it.sizes.fingers ? Object.values(it.sizes.fingers).join("·") : ""}` : it.sizes?.label ? `Size ${it.sizes.label}` : ""}
            </p>
            {it.gift_message && <p className="text-ink-2 italic">“{it.gift_message}”</p>}
          </div>
          <p className="shrink-0 font-semibold tabular-nums">{money(it.line_total_paise)}</p>
        </li>
      ))}
    </ul>
  );
}

export function OrderDetail({ order, instructions }: { order: Order; instructions?: string | null }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {instructions && (
          <div className="rounded-[0.625rem] bg-champagne px-5 py-4 text-[14px] leading-relaxed">
            <p className="font-semibold">Payment</p>
            <p className="mt-1 text-ink-2">{instructions}</p>
          </div>
        )}
        <Card>
          <p className="mb-5 font-display text-2xl">Order status</p>
          <StatusTimeline order={order} />
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <p className="mb-4 font-display text-2xl">Items</p>
          <OrderItems order={order} />
          <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-[13.5px]">
            <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd className="tabular-nums">{money(order.subtotal_paise)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Shipping</dt><dd className="tabular-nums">{order.shipping_paise ? money(order.shipping_paise) : "Free"}</dd></div>
            <div className="flex justify-between pt-1 text-[15px] font-semibold"><dt>Total</dt><dd className="tabular-nums">{money(order.total_paise)}</dd></div>
          </dl>
        </Card>
        <Card>
          <p className="text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">Shipping to</p>
          <p className="mt-2 text-[14px] leading-relaxed">
            {order.shipping.full_name}<br />{order.shipping.line1}{order.shipping.line2 ? `, ${order.shipping.line2}` : ""}<br />
            {order.shipping.city}, {order.shipping.state} {order.shipping.pincode}
          </p>
          <p className="mt-3 text-[12.5px] text-ink-2">Placed {dateShort(order.created_at)} · {order.payment_method === "cod" ? "Cash on delivery" : "UPI"} · payment {order.payment_status.toLowerCase()}</p>
        </Card>
      </div>
    </div>
  );
}
