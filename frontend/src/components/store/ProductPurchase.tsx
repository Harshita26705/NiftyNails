"use client";

import { Minus, Plus, ShoppingBag, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Price } from "@/components/ui/bits";
import { useToast } from "@/components/ui/Toast";
import { useCart } from "@/lib/cart";
import type { ProductDetail, SizeKit, SizeSelection } from "@/lib/types";
import { FavouriteButton } from "./ProductCard";
import { SizePicker } from "./SizePicker";

export function Stepper({ value, onChange, min = 1, max = 10 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex h-12 items-center rounded-full bg-surface ring-1 ring-line ring-inset">
      <button type="button" aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(value - 1)}
        className="flex size-12 items-center justify-center rounded-full text-ink disabled:text-ink-3"><Minus className="size-4" /></button>
      <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)}
        className="flex size-12 items-center justify-center rounded-full text-ink disabled:text-ink-3"><Plus className="size-4" /></button>
    </div>
  );
}

export function ProductPurchase({ product, kits }: { product: ProductDetail; kits: SizeKit[] }) {
  const { add } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const firstInStock = product.available_sizes.find((s) => s !== "CUSTOM" && (product.size_availability[s] ?? 0) > 0);
  const [size, setSize] = useState<SizeSelection | null>(firstInStock ? { label: firstInStock as SizeSelection["label"] } : null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const addToBag = () => {
    if (!size) {
      setError("Choose a size first.");
      return;
    }
    add({
      kind: "product", product_id: product.id, quantity: qty, size, name: product.name, art: product.art,
      image_url: product.images[0]?.url ?? null, price_paise: product.price_paise, slug: product.slug,
    });
    toast(`${product.name} added to your bag`, { action: { label: "View bag", onClick: () => router.push("/bag") } });
  };

  return (
    <div className="space-y-6">
      <SizePicker available={product.available_sizes} availability={product.size_availability} kits={kits}
        value={size} onChange={(v) => { setSize(v); setError(null); }} />
      {error && <p className="-mt-3 text-[13px] font-medium text-danger" role="alert">{error}</p>}

      <div className="hidden items-center gap-3 md:flex">
        <Stepper value={qty} onChange={setQty} />
        <Button size="lg" className="flex-1" onClick={addToBag} icon={<ShoppingBag className="size-4" />}>
          Add to bag · <Price paise={product.price_paise * qty} className="text-white" />
        </Button>
        <FavouriteButton productId={product.id} className="size-13 ring-1 ring-line" />
      </div>
      <ButtonLink href={`/create/draw?from=${product.slug}`} variant="soft" full icon={<Wand2 className="size-4" />}>
        Customise this design
      </ButtonLink>

      {/* Sticky purchase bar on phones */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-[12px] text-ink-2">{size ? (size.label === "CUSTOM" ? "Custom fit" : `Size ${size.label}`) : "Choose a size"}</p>
            <Price paise={product.price_paise * qty} />
          </div>
          <Button className="ml-auto flex-1" onClick={addToBag} icon={<ShoppingBag className="size-4" />}>Add to bag</Button>
        </div>
      </div>
    </div>
  );
}
