import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn, money } from "@/lib/format";

export function SectionHeading({ eyebrow, title, accent, subtitle, action, align = "left", className }: {
  eyebrow?: ReactNode; title: ReactNode; accent?: ReactNode; subtitle?: ReactNode; action?: ReactNode;
  align?: "left" | "center"; className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-end md:justify-between", align === "center" && "items-center text-center md:flex-col md:items-center", className)}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-pink uppercase">{eyebrow}</p>}
        <h2 className="font-display text-[30px] leading-[1.05] tracking-[-0.02em] text-balance text-ink md:text-[44px]">
          {title} {accent && <em className="text-pink italic">{accent}</em>}
        </h2>
        {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-pretty text-ink-2 md:text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Price({ paise, compareAt, className, size = "md" }: {
  paise: number; compareAt?: number | null; className?: string; size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "text-sm", md: "text-[15px]", lg: "text-2xl" };
  return (
    <span className={cn("inline-flex items-baseline gap-2 font-semibold tabular-nums", sizes[size], className)}>
      {money(paise)}
      {compareAt && compareAt > paise && (
        <span className="text-[0.8em] font-medium text-ink-3 line-through">{money(compareAt)}</span>
      )}
    </span>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-3.5", i < Math.round(rating) ? "fill-pink text-pink" : "text-line-strong")} />
      ))}
    </span>
  );
}

export function EmptyState({ icon, title, body, action, className }: {
  icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-3xl bg-surface px-6 py-12 text-center ring-1 ring-line", className)}>
      {icon && <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blush-100 text-pink">{icon}</div>}
      <h3 className="font-display text-2xl">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-2">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-3xl bg-surface p-5 shadow-soft ring-1 ring-line md:p-6", className)}>{children}</div>;
}

export function Segmented<T extends string>({ value, onChange, options, className }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string;
}) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-full bg-blush-100 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-all",
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ConfidenceMeter({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 60 ? "bg-success" : pct >= 36 ? "bg-warning" : "bg-danger";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blush-100">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-semibold tabular-nums text-ink-2">{pct}%</span>
    </div>
  );
}
