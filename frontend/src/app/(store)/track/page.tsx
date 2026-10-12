"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { OrderDetail } from "@/components/store/OrderView";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/bits";
import { Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import type { Order } from "@/lib/types";

export default function TrackPage() {
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setOrder(await api<Order>("/orders/track", { query: { number: number.trim().toUpperCase(), email: email.trim() } }));
    } catch (err) {
      setOrder(null);
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-5 pt-8 md:px-6 md:pt-12">
      <h1 className="font-display text-[44px] leading-none uppercase md:text-[66px]">Track your <em className="font-normal text-pink italic normal-case">order</em></h1>
      <Card className="mt-6 max-w-xl">
        <form onSubmit={track} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input label="Order number" placeholder="NN-260925-AB12C" value={number} onChange={(e) => setNumber(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" loading={busy} icon={<Search className="size-4" />} className="h-12">Track</Button>
        </form>
        {error && <p className="mt-3 text-sm font-medium text-danger" role="alert">{error}</p>}
      </Card>
      {order && <div className="mt-8 animate-fade-up"><OrderDetail order={order} /></div>}
    </main>
  );
}
