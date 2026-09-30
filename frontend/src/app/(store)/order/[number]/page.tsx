"use client";

import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderDetail } from "@/components/store/OrderView";
import { EmptyState } from "@/components/ui/bits";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import type { Order } from "@/lib/types";

function savedCheckout(number: string): { order: Order; payment_instructions: string | null } | null {
  try {
    const raw = sessionStorage.getItem(`nifty.order.${number}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function OrderConfirmationPage() {
  return (
    <ClientOnly fallback={<div className="flex h-[50vh] items-center justify-center"><Spinner className="size-8 text-pink" /></div>}>
      <OrderConfirmation />
    </ClientOnly>
  );
}

function OrderConfirmation() {
  const { number } = useParams<{ number: string }>();
  const email = useSearchParams().get("email") ?? "";
  // The checkout response (with payment instructions) shows instantly, then refreshes from the server.
  const [saved] = useState(() => savedCheckout(number));
  const [order, setOrder] = useState<Order | null>(saved?.order ?? null);
  const instructions = saved?.payment_instructions ?? null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<Order>("/orders/track", { query: { number, email } }).then(setOrder).catch(() => setFailed(true));
  }, [number, email]);

  if (!order && failed) {
    return <main className="mx-auto max-w-3xl px-5 pt-10"><EmptyState title="Order not found" body="Check the link in your confirmation email, or track it with your order number." action={<Link href="/track" className="font-semibold text-pink">Track an order →</Link>} /></main>;
  }
  if (!order) return <div className="flex h-[50vh] items-center justify-center"><Spinner className="size-8 text-pink" /></div>;

  return (
    <main className="mx-auto max-w-6xl px-5 pt-8 md:px-6 md:pt-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="flex size-16 animate-pop items-center justify-center rounded-full bg-pink text-white shadow-lift"><PartyPopper className="size-7" /></span>
        <h1 className="mt-5 font-display text-[36px] leading-tight md:text-[52px]">Thank you{order.shipping.full_name ? `, ${order.shipping.full_name.split(" ")[0]}` : ""}! 💗</h1>
        <p className="mt-2 text-[15px] text-ink-2">Order <b className="text-ink">{order.number}</b> is confirmed. We&apos;ve saved everything our nail artists need.</p>
      </div>
      <OrderDetail order={order} instructions={instructions} />
    </main>
  );
}
