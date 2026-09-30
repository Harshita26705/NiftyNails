"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/format";

/**
 * Bottom sheet on phones, right-hand drawer (or centred dialog) on larger screens.
 * Traps nothing fancy — Esc closes, backdrop closes, body scroll locks while open.
 */
export function Sheet({ open, onClose, title, children, footer, side = "right", size = "md" }: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "center";
  size?: "sm" | "md" | "lg";
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const widths = { sm: "md:max-w-sm", md: "md:max-w-md", lg: "md:max-w-2xl" };

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
      <button aria-label="Close" className="absolute inset-0 animate-[fade-up_0.2s_ease-out_both] bg-ink/35 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[1.75rem] bg-paper shadow-2xl outline-none",
          "animate-[fade-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)_both]",
          side === "right"
            ? cn("md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-full md:rounded-none md:rounded-l-[1.75rem]", widths[size])
            : cn("md:inset-auto md:top-1/2 md:left-1/2 md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.75rem]", widths[size]),
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong md:hidden" />
        <div className="flex items-center justify-between gap-4 px-5 pt-3 pb-2 md:px-6 md:pt-5">
          <div className="font-display text-xl">{title}</div>
          <button onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-blush-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 md:px-6">{children}</div>
        {footer && <div className="safe-bottom border-t border-line bg-surface/80 px-5 py-4 backdrop-blur md:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
