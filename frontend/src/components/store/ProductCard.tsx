"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NailSetArt } from "@/components/nails/NailSetArt";
import { Price } from "@/components/ui/bits";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { backdropFor } from "@/lib/colour";
import { cn } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductVisual({ product, className, layout = "fan" }: {
  product: Product; className?: string; layout?: "fan" | "row";
}) {
  const image = product.images[0];
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: backdropFor(product.art.base) }}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- media is proxied from the API; sizes vary
        <img src={image.url} alt={image.alt || product.name} loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-[5%]">
          <NailSetArt art={product.art} layout={layout} title={`${product.name} nail set`}
            className="w-full transition-transform duration-500 ease-out group-hover:scale-[1.06]" />
        </div>
      )}
    </div>
  );
}

export function FavouriteButton({ productId, className }: { productId: number; className?: string }) {
  const { user, favourites, toggleFavourite } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const active = favourites.has(productId);
  return (
    <button
      type="button"
      aria-label={active ? "Remove from favourites" : "Save to favourites"}
      aria-pressed={active}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          toast("Sign in to save favourites", { tone: "info", action: { label: "Sign in", onClick: () => router.push("/account") } });
          return;
        }
        try {
          const added = await toggleFavourite(productId);
          toast(added ? "Saved to favourites" : "Removed from favourites");
        } catch {
          toast("Couldn't update favourites", { tone: "error" });
        }
      }}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur transition hover:scale-105 active:scale-95 md:size-10",
        className,
      )}
    >
      <Heart className={cn("size-[18px] transition", active ? "fill-pink text-pink" : "text-ink")} strokeWidth={1.9} />
    </button>
  );
}

function badgeFor(p: Product): string | null {
  const names = p.tags.map((t) => t.name);
  if (!p.in_stock) return "Sold out";
  if (names.includes("Limited Edition")) return "Limited";
  if (names.includes("New")) return "New";
  if (names.includes("Bestseller")) return "Bestseller";
  return null;
}

export function ProductCard({ product, match, priority }: {
  product: Product; match?: { percent: number; matched?: string[] }; priority?: boolean;
}) {
  const badge = badgeFor(product);
  return (
    <Link href={`/shop/${product.slug}`} className="group block" prefetch={priority ? true : undefined}>
      <div className="relative">
        <ProductVisual product={product} className="aspect-square rounded-[1.6rem] ring-1 ring-black/[0.03] transition-shadow duration-300 group-hover:shadow-lift" />
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
          {match && (
            <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white tabular-nums shadow-sm">
              {match.percent}% match
            </span>
          )}
          {badge && !match && (
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-ink uppercase backdrop-blur md:px-2.5 md:py-1 md:text-[10.5px]">
              {badge}
            </span>
          )}
        </div>
        <FavouriteButton productId={product.id} className="absolute top-2 right-2" />
      </div>
      <div className="mt-3 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14.5px] leading-snug font-semibold text-ink md:text-[15px]">{product.name}</h3>
        </div>
        <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-2">
          {[product.shape?.name, product.finish?.name].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Price paise={product.price_paise} compareAt={product.compare_at_paise} size="sm" />
          <div className="flex -space-x-1">
            {product.colours.slice(0, 4).map((c) => (
              <span key={c.slug} title={c.name} className="size-3.5 rounded-full ring-2 ring-paper" style={{ background: c.hex }} />
            ))}
          </div>
        </div>
        {match?.matched && match.matched.length > 0 && (
          <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-success">✓ {match.matched.slice(0, 4).join(" · ")}</p>
        )}
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-square rounded-[1.6rem]" />
      <div className="skeleton mt-3 h-4 w-3/4 rounded-full" />
      <div className="skeleton mt-2 h-3 w-1/2 rounded-full" />
    </div>
  );
}
