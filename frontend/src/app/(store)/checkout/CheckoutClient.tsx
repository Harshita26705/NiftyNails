"use client";

import { ArrowLeft, Banknote, Lock, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LineVisual } from "@/components/store/LineVisual";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/bits";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toApiLines, useCart } from "@/lib/cart";
import { cn, money } from "@/lib/format";
import type { Order } from "@/lib/types";
import { OrderSummary, sizeLabel, useCartQuote } from "../bag/BagClient";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

type Form = { email: string; full_name: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string; notes: string };
type Errors = Partial<Record<keyof Form, string>>;

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = "Enter a valid email.";
  if (f.full_name.trim().length < 2) e.full_name = "Enter your full name.";
  if (!/^(?:\+?91[\s-]?)?[6-9]\d{9}$/.test(f.phone.trim())) e.phone = "Enter a 10-digit Indian mobile number.";
  if (f.line1.trim().length < 3) e.line1 = "Enter your address.";
  if (f.city.trim().length < 2) e.city = "Enter your city.";
  if (!f.state) e.state = "Choose your state.";
  if (!/^[1-9][0-9]{5}$/.test(f.pincode.trim())) e.pincode = "Enter a 6-digit PIN code.";
  return e;
}

export function CheckoutClient() {
  const { lines, clear } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const { quote } = useCartQuote();
  const [form, setForm] = useState<Form>({ email: "", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", notes: "" });
  const [payment, setPayment] = useState<"cod" | "upi_manual">("upi_manual");
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill contact details once the signed-in user is known (state adjusted during render).
  const [prefilledFor, setPrefilledFor] = useState<number | null>(null);
  if (user && prefilledFor !== user.id) {
    setPrefilledFor(user.id);
    setForm((f) => ({ ...f, email: f.email || user.email, full_name: f.full_name || user.full_name, phone: f.phone || user.phone || "" }));
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const placeOrder = async () => {
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) {
      document.querySelector("[aria-invalid=true]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await api<{ order: Order; payment_instructions: string | null }>("/orders", {
        method: "POST",
        body: {
          lines: toApiLines(lines), email: form.email.trim(), payment_method: payment, notes: form.notes,
          shipping: { full_name: form.full_name, phone: form.phone, line1: form.line1, line2: form.line2, city: form.city, state: form.state, pincode: form.pincode },
        },
      });
      try { sessionStorage.setItem(`nifty.order.${res.order.number}`, JSON.stringify(res)); } catch { /* ignore */ }
      clear();
      router.replace(`/order/${res.order.number}?email=${encodeURIComponent(res.order.email)}`);
    } catch (e) {
      const issues = e instanceof ApiError ? (e.details as { detail?: { issues?: string[] } })?.detail?.issues : null;
      setSubmitError(issues?.join(" ") || (e instanceof ApiError ? e.message : "Couldn't place your order."));
      setBusy(false);
    }
  };

  if (!lines.length && !busy) {
    return (
      <main className="mx-auto max-w-3xl px-5 pt-10">
        <EmptyState title="Nothing to check out" body="Your bag is empty." action={<Link href="/shop" className="font-semibold text-pink">Shop designs →</Link>} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pt-5 pb-16 md:px-6 md:pt-8">
      <Link href="/bag" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink"><ArrowLeft className="size-4" /> Back to bag</Link>
      <h1 className="mt-3 font-display text-[42px] leading-none uppercase md:text-[62px]">Checkout</h1>

      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <Card>
            <p className="font-display text-xl">Contact</p>
            {!user && <p className="mt-1 text-[13px] text-ink-2">Checking out as a guest · <Link href="/account?next=/checkout" className="font-semibold text-pink">Sign in</Link> to save this order to your account.</p>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="Email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} error={errors.email} />
              <Input label="Mobile number" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={set("phone")} error={errors.phone} placeholder="98765 43210" />
            </div>
          </Card>
          <Card>
            <p className="font-display text-xl">Delivery address</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input className="sm:col-span-2" label="Full name" autoComplete="name" value={form.full_name} onChange={set("full_name")} error={errors.full_name} />
              <Input className="sm:col-span-2" label="House / flat, street" autoComplete="address-line1" value={form.line1} onChange={set("line1")} error={errors.line1} />
              <Input className="sm:col-span-2" label="Area, landmark (optional)" autoComplete="address-line2" value={form.line2} onChange={set("line2")} />
              <Input label="City" autoComplete="address-level2" value={form.city} onChange={set("city")} error={errors.city} />
              <Input label="PIN code" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={form.pincode} onChange={set("pincode")} error={errors.pincode} />
              <Select className="sm:col-span-2" label="State" autoComplete="address-level1" value={form.state} onChange={set("state")} error={errors.state}>
                <option value="">Choose state…</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
          </Card>
          <Card>
            <p className="font-display text-xl">Payment</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
              {([
                ["upi_manual", "UPI", "Pay by UPI after ordering — we confirm and start making it.", Smartphone],
                ["cod", "Cash on delivery", "Pay when your nails arrive.", Banknote],
              ] as const).map(([value, title, body, Icon]) => (
                <button key={value} type="button" role="radio" aria-checked={payment === value} onClick={() => setPayment(value)}
                  className={cn("flex gap-3 rounded-2xl p-4 text-left ring-1 ring-inset transition", payment === value ? "bg-blush-50 ring-2 ring-pink" : "bg-surface ring-line")}>
                  <Icon className="mt-0.5 size-5 shrink-0 text-pink" />
                  <span><span className="block text-[14px] font-semibold">{title}</span><span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{body}</span></span>
                </button>
              ))}
            </div>
            <Textarea className="mt-4" label="Order notes (optional)" rows={2} maxLength={1000} value={form.notes} onChange={set("notes")}
              placeholder="Anything our nail artist should know?" />
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <OrderSummary quote={quote}>
            <ul className="mt-4 space-y-3 border-t border-line pt-4">
              {lines.map((l, i) => (
                <li key={l.key} className="flex items-center gap-3 text-[13px]">
                  <LineVisual kind={l.kind} art={quote?.lines[i]?.art ?? l.art} config={quote?.lines[i]?.design_config ?? l.design_config} className="size-12" />
                  <span className="min-w-0 flex-1"><span className="line-clamp-1 font-semibold">{l.name}</span><span className="text-ink-2">{sizeLabel(l.size)} {l.quantity > 1 && `× ${l.quantity}`}</span></span>
                  <span className="tabular-nums">{money((quote?.lines[i]?.unit_price_paise ?? l.price_paise) * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <Button full size="lg" className="mt-5" loading={busy} disabled={!quote?.valid} onClick={placeOrder} icon={<Lock className="size-4" />}>
              Place order{quote ? ` · ${money(quote.total_paise)}` : ""}
            </Button>
            {submitError && <p className="mt-3 text-[13px] font-medium text-danger" role="alert">{submitError}</p>}
            <p className="mt-3 text-center text-[11.5px] text-ink-3">Prices are confirmed by our server at checkout.</p>
          </OrderSummary>
        </div>
      </div>
    </main>
  );
}
