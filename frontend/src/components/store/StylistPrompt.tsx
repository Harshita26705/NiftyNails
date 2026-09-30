"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/format";

export const EXAMPLE_PROMPTS = [
  "Baby pink almond nails with chrome, little bows and pearls",
  "Something classy for the office, nude and short",
  "Gold and wine for a wedding sangeet, no glitter",
  "Cute strawberry nails under ₹1000",
];

/** Inline "describe your nails" box that hands off to the AI stylist. */
export function StylistPrompt({ className, dark }: { className?: string; dark?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (text: string) => {
    const t = text.trim();
    if (t.length >= 2) router.push(`/stylist?q=${encodeURIComponent(t)}`);
  };
  return (
    <div className={className}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className={cn(
          "flex items-center gap-2 rounded-full p-1.5 pl-5 ring-1 transition focus-within:ring-2 focus-within:ring-pink",
          dark ? "bg-white/10 ring-white/20" : "bg-surface shadow-soft ring-line",
        )}
      >
        <Sparkles className={cn("size-5 shrink-0", dark ? "text-blush-300" : "text-pink")} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Describe your dream nails…"
          aria-label="Describe the nails you want"
          className={cn("h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none", dark ? "text-white placeholder:text-white/50" : "placeholder:text-ink-3")}
        />
        <button type="submit" aria-label="Find designs" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-pink text-white transition hover:bg-pink-deep active:scale-95">
          <ArrowUp className="size-5" />
        </button>
      </form>
      <div className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {EXAMPLE_PROMPTS.map((p) => (
          <button key={p} onClick={() => go(p)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-medium transition",
              dark ? "bg-white/10 text-white/85 hover:bg-white/20" : "bg-blush-100 text-pink-deep hover:bg-blush-200",
            )}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
