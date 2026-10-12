import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/format";

/** Emblem + wordmark. `tone="light"` is for dark (espresso) backgrounds. */
export function Logo({ className, href = "/", tone = "dark", size = "md" }: {
  className?: string; href?: string; tone?: "dark" | "light"; size?: "md" | "lg";
}) {
  const light = tone === "light";
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-3", light ? "text-paper" : "text-ink", className)} aria-label="Nifty Nails home">
      <Image src="/logo.png" alt="" width={96} height={96} priority
        className={cn("shrink-0 rounded-full object-cover transition-transform duration-500 group-hover:rotate-[-6deg]", size === "lg" ? "size-14" : "size-10 md:size-11")} />
      <span className="flex flex-col gap-[5px] leading-none">
        <span className={cn("font-display font-medium tracking-[0.14em]", size === "lg" ? "text-[32px]" : "text-[25px] md:text-[27px]")}>NIFTY</span>
        <span className={cn("text-[9.5px] font-medium tracking-[0.5em]", light ? "text-blush-300" : "text-pink")}>NAILS</span>
      </span>
    </Link>
  );
}
