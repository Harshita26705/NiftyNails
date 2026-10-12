import { ChevronDown } from "lucide-react";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "@/lib/format";

const control =
  "w-full rounded-[2px] bg-surface px-4 text-[15px] text-ink ring-1 ring-inset ring-line-strong placeholder:text-ink-3 " +
  "transition focus:outline-none focus:ring-2 focus:ring-gold disabled:bg-blush-50 disabled:text-ink-3";

export function Field({ label, hint, error, children, className, htmlFor }: {
  label?: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string; htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[11.5px] font-medium tracking-[0.16em] text-ink uppercase">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[12.5px] font-medium text-danger" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-2">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ label, hint, error, className, id, ...rest }:
  { label?: ReactNode; hint?: ReactNode; error?: string | null } & ComponentProps<"input">) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
      <input id={inputId} className={cn(control, "h-12", error && "ring-danger/60")} aria-invalid={!!error} {...rest} />
    </Field>
  );
}

export function Textarea({ label, hint, error, className, id, ...rest }:
  { label?: ReactNode; hint?: ReactNode; error?: string | null } & ComponentProps<"textarea">) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
      <textarea id={inputId} className={cn(control, "min-h-24 resize-y py-3 leading-relaxed")} aria-invalid={!!error} {...rest} />
    </Field>
  );
}

export function Select({ label, hint, error, className, id, children, ...rest }:
  { label?: ReactNode; hint?: ReactNode; error?: string | null } & ComponentProps<"select">) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
      <div className="relative">
        <select id={inputId} className={cn(control, "h-12 appearance-none pr-10")} {...rest}>
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-2" />
      </div>
    </Field>
  );
}
