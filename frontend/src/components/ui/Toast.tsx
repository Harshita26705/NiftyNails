"use client";

import { CheckCircle2, CircleAlert, Info } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/format";

type Tone = "success" | "error" | "info";
type ToastItem = { id: number; tone: Tone; message: string; action?: { label: string; onClick: () => void } };
type Ctx = { toast: (message: string, opts?: { tone?: Tone; action?: ToastItem["action"] }) => void };

const ToastContext = createContext<Ctx>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback<Ctx["toast"]>((message, opts) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { id, message, tone: opts?.tone ?? "success", action: opts?.action }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  const icons = { success: CheckCircle2, error: CircleAlert, info: Info };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-8">
        {items.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div key={t.id} className="pointer-events-auto flex w-full max-w-sm animate-pop items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-xl">
              <Icon className={cn("size-5 shrink-0", t.tone === "error" ? "text-blush-300" : "text-blush-200")} />
              <span className="flex-1 leading-snug">{t.message}</span>
              {t.action && (
                <button onClick={t.action.onClick} className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25">
                  {t.action.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
