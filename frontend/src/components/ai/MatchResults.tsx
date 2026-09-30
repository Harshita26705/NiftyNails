"use client";

import { AlertCircle, Wand2 } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import type { Match, Unavailable } from "@/lib/types";

export function UnavailableNotices({ items }: { items: Unavailable[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((u, i) => (
        <div key={i} className="flex gap-3 rounded-2xl bg-[#fff6e8] px-4 py-3 text-[13.5px] leading-snug text-[#7a4a00] ring-1 ring-[#f3dcb5]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {u.message}
        </div>
      ))}
    </div>
  );
}

export function MatchGrid({ matches, customPrompt, requestId }: { matches: Match[]; customPrompt?: string; requestId?: number }) {
  return (
    <div>
      {matches.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
          {matches.map((m) => (
            <ProductCard key={m.product.id} product={m.product} match={{ percent: m.match_percent, matched: m.matched }} />
          ))}
        </div>
      )}
      <div className="mt-10 flex flex-col items-center gap-3 rounded-[0.625rem] bg-blush-50 px-6 py-8 text-center ring-1 ring-line">
        <p className="font-display text-2xl">Not quite it?</p>
        <p className="max-w-md text-sm text-ink-2">
          Turn this into a custom design request — our designer will only use colours, finishes and charms we can
          actually make, and a nail artist reviews it before production.
        </p>
        <ButtonLink href={`/create/chat${customPrompt ? `?prompt=${encodeURIComponent(customPrompt)}` : ""}${requestId ? `${customPrompt ? "&" : "?"}ref=${requestId}` : ""}`}
          icon={<Wand2 className="size-4" />}>Design it custom</ButtonLink>
      </div>
    </div>
  );
}
