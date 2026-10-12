"use client";

import { Camera } from "lucide-react";
import { useMemo, useState } from "react";
import { LiveTryOn } from "@/components/editor/LiveTryOn";
import { studioFromProduct } from "@/components/editor/studioModel";
import { useCatalog } from "@/lib/catalog";
import { cn } from "@/lib/format";
import type { Product } from "@/lib/types";

/** Opens the live webcam try-on for a catalogue product's own design. Works from a card or a detail page. */
export function TryOnLiveButton({ product, className, variant = "icon" }: {
  product: Product; className?: string; variant?: "icon" | "full";
}) {
  const catalog = useCatalog();
  const [open, setOpen] = useState(false);
  const studio = useMemo(() => (catalog ? studioFromProduct(product, catalog) : null), [product, catalog]);

  const onOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      {variant === "full" ? (
        <button type="button" disabled={!studio} onClick={onOpen}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-[12.5px] font-semibold ring-1 ring-line hover:bg-blush-50 disabled:opacity-50",
            className,
          )}>
          <Camera className="size-4 text-pink" /> Try on live
        </button>
      ) : (
        <button type="button" aria-label="Try on live" disabled={!studio} onClick={onOpen}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-full bg-paper/90 backdrop-blur transition hover:scale-105 active:scale-95 disabled:opacity-50 md:size-10",
            className,
          )}>
          <Camera className="size-[18px] text-ink" strokeWidth={1.5} />
        </button>
      )}
      {open && studio && catalog && <LiveTryOn studio={studio} catalog={catalog} onClose={() => setOpen(false)} />}
    </>
  );
}
