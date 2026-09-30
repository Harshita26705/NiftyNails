"use client";

import { Gift, Package } from "lucide-react";
import { DesignHands } from "@/components/nails/DesignHands";
import { NailSetArt } from "@/components/nails/NailSetArt";
import { backdropFor } from "@/lib/colour";
import { cn } from "@/lib/format";
import type { DesignConfig, NailArt } from "@/lib/types";

/** Thumbnail for a bag/order line: product art, custom design, or a gift add-on icon. */
export function LineVisual({ art, config, imageUrl, kind, className }: {
  art?: NailArt | null; config?: DesignConfig | null; imageUrl?: string | null; kind: string; className?: string;
}) {
  const base = art?.base ?? "#E3D4B8";
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-2xl", className)} style={{ background: backdropFor(base) }}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="size-full object-cover" />
      ) : art ? (
        <NailSetArt art={art} className="w-[92%]" />
      ) : config ? (
        <DesignHands config={config} hands="left" className="w-[92%]" />
      ) : kind === "gift_item" ? (
        <Gift className="size-7 text-pink" />
      ) : (
        <Package className="size-7 text-pink" />
      )}
    </div>
  );
}
