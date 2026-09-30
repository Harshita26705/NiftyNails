import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

/** Toggleable pill used for filters, quick replies and option pickers. */
export function Chip({ selected, swatch, icon, className, children, ...rest }:
  { selected?: boolean; swatch?: string; icon?: ReactNode } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-all duration-150 active:scale-[0.97]",
        selected
          ? "bg-ink text-white shadow-sm"
          : "bg-surface text-ink ring-1 ring-inset ring-line hover:ring-line-strong hover:bg-blush-50",
        className,
      )}
      {...rest}
    >
      {swatch && (
        <span
          className={cn("size-4 rounded-full ring-1 ring-inset", selected ? "ring-white/40" : "ring-ink/10")}
          style={{ background: swatch }}
        />
      )}
      {icon}
      {children}
    </button>
  );
}

export function Tag({ children, tone = "blush", className }: {
  children: ReactNode; tone?: "blush" | "ink" | "mint" | "cream" | "warning" | "danger" | "white"; className?: string;
}) {
  const tones = {
    blush: "bg-blush-100 text-pink-deep",
    ink: "bg-ink text-white",
    mint: "bg-mint text-success",
    cream: "bg-champagne text-ink-2",
    warning: "bg-[#fff1d6] text-warning",
    danger: "bg-danger/10 text-danger",
    white: "bg-white/90 text-ink backdrop-blur",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide", tones[tone], className)}>
      {children}
    </span>
  );
}
