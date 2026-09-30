import Link from "next/link";
import { cn } from "@/lib/format";

export function NailGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 28" className={className} aria-hidden>
      <path d="M2 20 C2 26 18 26 18 20 L18 13 C18 5 13 1 10 1 C7 1 2 5 2 13 Z" fill="currentColor" />
      <path d="M5.5 8 C5 11 5 14 5.5 17" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-1.5 text-ink", className)} aria-label="Nifty Nails home">
      <NailGlyph className="h-[22px] w-auto text-pink transition-transform duration-300 group-hover:-rotate-12" />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="font-display text-[25px] font-medium tracking-[-0.03em] italic">Nifty</span>
        <span className="text-[10.5px] font-bold tracking-[0.32em] text-ink-2">NAILS</span>
      </span>
    </Link>
  );
}
