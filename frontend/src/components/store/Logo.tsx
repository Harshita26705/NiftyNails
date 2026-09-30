import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/format";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2", className)} aria-label="Nifty Nails home">
      <Image src="/logo.png" alt="" width={64} height={64} priority
        className="size-9 shrink-0 rounded-full object-cover transition-transform duration-300 group-hover:-rotate-6 md:size-10" />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="font-display text-[25px] font-medium tracking-[-0.03em] italic">Nifty</span>
        <span className="text-[10.5px] font-bold tracking-[0.32em] text-ink-2">NAILS</span>
      </span>
    </Link>
  );
}
