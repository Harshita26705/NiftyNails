"use client";

import { AlertCircle, ArrowRight, ShoppingBag, Sparkles, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LineVisual } from "@/components/store/LineVisual";
import { Stepper } from "@/components/store/ProductPurchase";
import { SizePicker } from "@/components/store/SizePicker";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { api } from "@/lib/api";
import { toApiLines, useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/catalog";
import { money } from "@/lib/format";
import type { CartLine, CartQuote, SizeSelection } from "@/lib/types";

export function sizeLabel(size?: SizeSelection | null) {
  if (!size) return null;
  if (size.label === "CUSTOM") return size.fingers ? `Custom fit · ${Object.values(size.fingers).join("·")}` : "Custom fit";
  return `Size ${size.label}`;
}

export function useCartQuote() {
  const { lines } = useCart();
  const payload = JSON.stringify(toApiLines(lines));
  // The quote remembers which bag it priced; while the bag differs we're "loading".
  const [result, setResult] = useState<{ payload: string; quote: CartQuote | null } | null>(null);
  useEffect(() => {
    if (payload === "[]") return;
    let alive = true;
    const t = setTimeout(() => {
      api<CartQuote>("/cart/quote", { method: "POST", body: { lines: JSON.parse(payload) } })
        .then((q) => alive && setResult({ payload, quote: q }))
        .catch(() => alive && setResult({ payload, quote: null }));
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [payload]);
  if (!lines.length) return { quote: null, loading: false };
  // Show the last quote while re-pricing, so totals don't flicker.
  return { quote: result?.quote ?? null, loading: result?.payload !== payload };
}

export function OrderSummary({ quote, children }: { quote: CartQuote | null; children?: React.ReactNode }) {
  if (!quote) return <Card><div className="skeleton h-32 rounded-2xl" /></Card>;
  const pct = Math.min(100, Math.round(((quote.free_shipping_threshold_paise - quote.free_shipping_remaining_paise) / quote.free_shipping_threshold_paise) * 100));
  return (
    <Card>
      <p className="font-display text-2xl">Summary</p>
      <div className="mt-4 rounded-2xl bg-blush-50 p-3.5">
        <p className="flex items-center gap-2 text-[13px] font-semibold">
          <Truck className="size-4 text-pink" />
          {quote.free_shipping_remaining_paise > 0 ? <>Add {money(quote.free_shipping_remaining_paise)} for free shipping</> : <>You&apos;ve unlocked free shipping 🎉</>}
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-pink transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-[14px]">
        <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd className="tabular-nums">{money(quote.subtotal_paise)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-2">Shipping</dt><dd className="tabular-nums">{quote.shipping_paise ? money(quote.shipping_paise) : "Free"}</dd></div>
        <div className="flex justify-between border-t border-line pt-3 text-[16px] font-semibold"><dt>Total</dt><dd className="tabular-nums">{money(quote.total_paise)}</dd></div>
      </dl>
      {quote.estimated_dispatch_days > 0 && (
        <p className="mt-3 text-[12.5px] text-ink-2">
          Dispatches in about {quote.estimated_dispatch_days} day{quote.estimated_dispatch_days > 1 ? "s" : ""}
          {quote.lines.some((l) => l.kind === "custom" || l.size?.label === "CUSTOM") && " — custom sets are handmade to order"}.
        </p>
      )}
      {children}
    </Card>
  );
}

export function BagClient() {
  const { lines, setQuantity, remove, replace } = useCart();
  const { quote, loading } = useCartQuote();
  const catalog = useCatalog();
  const [editing, setEditing] = useState<CartLine | null>(null);
  const [draftSize, setDraftSize] = useState<SizeSelection | null>(null);

  if (!lines.length) {
    return (
      <main className="mx-auto max-w-3xl px-5 pt-10 md:px-6">
        <EmptyState icon={<ShoppingBag className="size-7" />} title="Your bag is empty"
          body="Find a set you love, or design your own — we'll make it by hand."
          action={<div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/shop">Shop designs</ButtonLink>
            <ButtonLink href="/create" variant="secondary" icon={<Sparkles className="size-4" />}>Create your own</ButtonLink>
          </div>} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pt-6 md:px-6 md:pt-10">
      <h1 className="font-display text-[38px] leading-none tracking-[-0.02em] md:text-[52px]">Your <em className="text-pink italic">bag</em></h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-line">
          {lines.map((line, i) => {
            const q = quote?.lines[i];
            const price = q?.unit_price_paise ?? line.price_paise;
            return (
              <li key={line.key} className="flex gap-4 py-5 first:pt-0">
                <LineVisual art={q?.art ?? line.art} config={q?.design_config ?? line.design_config} imageUrl={q?.image_url ?? line.image_url}
                  kind={line.kind} className="size-24 md:size-28" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {line.slug ? (
                        <Link href={`/shop/${line.slug}`} className="font-semibold hover:text-pink">{line.name}</Link>
                      ) : <p className="font-semibold">{line.name}</p>}
                      <p className="mt-0.5 text-[12.5px] text-ink-2">
                        {line.kind === "custom" ? "Custom design · " : line.kind === "gift_bundle" ? "Gift bundle · " : ""}
                        {sizeLabel(line.size) ?? (line.kind === "gift_item" ? "Gift add-on" : "")}
                      </p>
                      {line.gift_message && <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-2 italic">“{line.gift_message}”</p>}
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">{money(price * line.quantity)}</p>
                  </div>
                  {q?.issues.map((issue) => (
                    <p key={issue} className="mt-2 flex items-start gap-1.5 text-[12.5px] font-medium text-danger"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{issue}</p>
                  ))}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Stepper value={line.quantity} onChange={(v) => setQuantity(line.key, v)} />
                    {line.size && (
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(line); setDraftSize(line.size ?? null); }}>Change size</Button>
                    )}
                    <button onClick={() => remove(line.key)} aria-label={`Remove ${line.name}`} className="ml-auto inline-flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-danger/5 hover:text-danger">
                      <Trash2 className="size-[18px]" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary quote={quote}>
            <ButtonLink href="/checkout" size="lg" full className="mt-5" icon={<ArrowRight className="order-last size-4" />}
              aria-disabled={!quote?.valid || loading}
              onClick={(e) => { if (!quote?.valid) e.preventDefault(); }}>
              Checkout
            </ButtonLink>
            {quote && !quote.valid && <p className="mt-2 text-center text-[12.5px] text-danger">Please fix the highlighted items first.</p>}
          </OrderSummary>
        </div>
      </div>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Change size"
        footer={<Button full onClick={() => {
          if (editing && draftSize) replace(lines.map((l) => (l.key === editing.key ? { ...l, size: draftSize } : l)));
          setEditing(null);
        }}>Update size</Button>}>
        {editing && (
          <SizePicker available={["XS", "S", "M", "L", "CUSTOM"]} kits={catalog?.size_kits ?? []} value={draftSize} onChange={setDraftSize} />
        )}
      </Sheet>
    </main>
  );
}
