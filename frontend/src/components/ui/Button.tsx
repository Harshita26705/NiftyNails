import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "ink";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-pink active:scale-[0.99] disabled:bg-ink-3",
  ink: "bg-pink text-white hover:bg-pink-deep active:scale-[0.99] disabled:bg-ink-3",
  secondary:
    "bg-transparent text-ink ring-1 ring-inset ring-ink hover:bg-ink hover:text-paper active:scale-[0.99] disabled:text-ink-3 disabled:ring-line-strong",
  soft: "bg-blush-100 text-ink hover:bg-blush-200 active:scale-[0.99] disabled:opacity-60",
  ghost: "text-ink-2 hover:text-ink hover:bg-blush-50",
  danger: "bg-transparent text-danger ring-1 ring-inset ring-danger/40 hover:bg-danger/5",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-[11px] gap-1.5",
  md: "h-11 px-6 text-[12px] gap-2",
  lg: "h-[54px] px-8 text-[12.5px] gap-3",
};

type Common = { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode; full?: boolean };

function classes({ variant = "primary", size = "md", full }: Common, className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-[2px] font-medium tracking-[0.18em] uppercase",
    "transition-all duration-200 disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    full && "w-full",
    className,
  );
}

export function Button({ variant, size, loading, icon, full, className, children, disabled, ...rest }:
  Common & ComponentProps<"button">) {
  return (
    <button className={classes({ variant, size, full }, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, icon, full, className, children, ...rest }:
  Common & ComponentProps<typeof Link>) {
  return (
    <Link className={classes({ variant, size, full }, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({ label, className, children, ...rest }: { label: string } & ComponentProps<"button">) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full text-ink transition hover:bg-blush-100 active:scale-95",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
