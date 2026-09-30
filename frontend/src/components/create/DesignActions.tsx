"use client";

import { Check, Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DesignHands } from "@/components/nails/DesignHands";
import { SizePicker } from "@/components/store/SizePicker";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/bits";
import { Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/catalog";
import { money } from "@/lib/format";
import type { Design, DesignConfig, DesignQuote, SizeSelection } from "@/lib/types";

export function QuoteBreakdown({ quote }: { quote: DesignQuote }) {
  return (
    <div className="space-y-1.5 text-[13px]">
      {quote.breakdown.map((l) => (
        <div key={l.label} className="flex justify-between gap-3 text-ink-2">
          <span>{l.label}</span><span className="tabular-nums">{money(l.amount_paise)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-dashed border-line-strong pt-2 text-[15px] font-semibold text-ink">
        <span>Total</span><span className="tabular-nums">{money(quote.price_paise)}</span>
      </div>
    </div>
  );
}

/**
 * Save / add-to-bag for a custom design. The design is persisted server-side first (validated against the
 * catalogue and priced there), then referenced from the bag by its public id.
 */
export function DesignActions({ config, quote, source, brief, defaultName, aiRequestId, onSaved }: {
  config: DesignConfig | null;
  quote: DesignQuote | null;
  source: "chat" | "draw" | "stylist";
  brief?: string;
  defaultName?: string;
  aiRequestId?: number | null;
  onSaved?: (d: Design) => void;
}) {
  const { user } = useAuth();
  const { add } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const catalog = useCatalog();
  const [sheet, setSheet] = useState<null | "bag" | "save">(null);
  const [name, setName] = useState(defaultName ?? "My Nifty design");
  const [size, setSize] = useState<SizeSelection | null>({ label: "M" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Design | null>(null);

  const disabled = !config || !quote || !quote.manufacturable;

  const persist = async (): Promise<Design> => {
    if (saved && JSON.stringify(saved.config) === JSON.stringify(config)) return saved;
    const design = await api<Design>("/designs", {
      method: "POST",
      body: { name: name.trim() || "My Nifty design", source, config, brief: brief ?? "", submit_for_review: false },
    });
    setSaved(design);
    onSaved?.(design);
    return design;
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const details = e instanceof ApiError ? (e.details as { detail?: { errors?: string[] } })?.detail?.errors : null;
      setError(details?.join(" ") || (e instanceof ApiError ? e.message : "Something went wrong."));
    } finally {
      setBusy(false);
    }
  };

  const addToBag = () => run(async () => {
    if (!size) throw new Error("Choose a size.");
    const design = await persist();
    add({
      kind: "custom", design_public_id: design.public_id, quantity: 1, size, name: design.name,
      design_config: design.config, price_paise: design.price_paise, ai_request_id: aiRequestId ?? null,
    });
    setSheet(null);
    toast("Custom design added to your bag", { action: { label: "View bag", onClick: () => router.push("/bag") } });
  });

  const save = () => run(async () => {
    await persist();
    setSheet(null);
    toast(user ? "Saved to your designs" : "Design saved — sign in to keep it in your account", {
      action: user ? { label: "View", onClick: () => router.push("/account/designs") } : { label: "Sign in", onClick: () => router.push("/account") },
    });
  });

  return (
    <>
      <div className="flex gap-2.5">
        <Button variant="secondary" onClick={() => setSheet("save")} disabled={disabled} icon={saved ? <Check className="size-4 text-success" /> : <Heart className="size-4" />}>
          {saved ? "Saved" : "Save"}
        </Button>
        <Button className="flex-1" onClick={() => setSheet("bag")} disabled={disabled} icon={<ShoppingBag className="size-4" />}>
          Add to bag{quote ? ` · ${money(quote.price_paise)}` : ""}
        </Button>
      </div>

      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === "bag" ? "Add to bag" : "Save design"}
        footer={
          <Button full size="lg" loading={busy} onClick={sheet === "bag" ? addToBag : save}
            icon={sheet === "bag" ? <ShoppingBag className="size-4" /> : <Heart className="size-4" />}>
            {sheet === "bag" ? "Add to bag" : "Save design"}
          </Button>
        }>
        <div className="space-y-5">
          {config && <div className="rounded-3xl bg-blush-50 p-3"><DesignHands config={config} /></div>}
          <Input label="Name your design" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          {sheet === "bag" && (
            <>
              <SizePicker available={["XS", "S", "M", "L", "CUSTOM"]} kits={catalog?.size_kits ?? []} value={size} onChange={setSize} />
              {quote && (
                <div className="rounded-3xl bg-surface p-4 ring-1 ring-line">
                  <QuoteBreakdown quote={quote} />
                </div>
              )}
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                Custom sets are reviewed by our nail artist before production — we&apos;ll email you if anything needs tweaking.
                <Price paise={quote?.price_paise ?? 0} className="sr-only" />
              </p>
            </>
          )}
          {sheet === "save" && !user && (
            <p className="rounded-2xl bg-champagne/60 px-4 py-3 text-[13px] text-ink-2">
              <Link href="/account" className="font-semibold text-pink">Sign in</Link> to keep designs in your account across devices.
            </p>
          )}
          {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
        </div>
      </Sheet>
    </>
  );
}
