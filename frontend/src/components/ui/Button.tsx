import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "ink";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-pink text-white shadow-[0_8px_20px_-8px_rgb(122_46_58/0.55)] hover:bg-pink-deep active:scale-[0.98] disabled:bg-blush-300 disabled:shadow-none",
  ink: "bg-ink text-white hover:bg-ink/90 active:scale-[0.98] disabled:bg-ink-3",
  secondary:
    "bg-surface text-ink ring-1 ring-inset ring-line-strong hover:ring-ink/40 hover:bg-blush-50 active:scale-[0.98] disabled:text-ink-3",
  soft: "bg-blush-100 text-pink-deep hover:bg-blush-200 active:scale-[0.98] disabled:opacity-60",
  ghost: "text-ink-2 hover:text-ink hover:bg-blush-50",
  danger: "bg-surface text-danger ring-1 ring-inset ring-danger/30 hover:bg-danger/5",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-[15px] gap-2.5",
};

type Common = { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode; full?: boolean };

function classes({ variant = "primary", size = "md", full }: Common, className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold tracking-[-0.01em]",
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
