"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderDetail } from "@/components/store/OrderView";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/bits";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { CartLine, Order } from "@/lib/types";

export default function MyOrder() {
  const { number } = useParams<{ number: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const { add } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => { api<Order>(`/me/orders/${number}`).then(setOrder).catch(() => setMissing(true)); }, [number]);

  const reorder = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const { lines } = await api<{ lines: Omit<CartLine, "key" | "name" | "price_paise">[] }>(`/me/orders/${number}/reorder`, { method: "POST" });
      lines.forEach((l, i) => {
        const item = order.items[i];
        add({ ...l, name: item?.name ?? "Item", price_paise: item?.unit_price_paise ?? 0, art: item?.snapshot?.art, design_config: item?.snapshot?.config });
      });
      toast("Added to your bag — prices are re-checked at checkout");
      router.push("/bag");
    } finally {
      setBusy(false);
    }
  };

  if (missing) return <EmptyState title="Order not found" action={<Link href="/account/orders" className="font-semibold text-pink">All orders →</Link>} />;
  if (!order) return <div className="skeleton h-64 rounded-3xl" />;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink"><ArrowLeft className="size-4" /> All orders</Link>
        <div className="flex items-center gap-3">
          <p className="font-display text-2xl">{order.number}</p>
          <Button variant="soft" size="sm" loading={busy} onClick={reorder} icon={<RefreshCw className="size-4" />}>Reorder</Button>
        </div>
      </div>
      <OrderDetail order={order} />
    </div>
  );
}
