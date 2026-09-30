"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { CartLine } from "./types";

/**
 * Bag state lives in localStorage so it survives reloads for guests. Prices shown here are a display
 * cache only — the server re-prices every line (/cart/quote) and at checkout.
 */
const KEY = "nifty.bag.v1";
const EMPTY: CartLine[] = [];
let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage full or blocked — keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Lines that represent the same thing (same product + size etc.) merge quantities. */
function identity(l: Omit<CartLine, "key" | "quantity">) {
  return JSON.stringify([l.kind, l.product_id, l.design_public_id, l.gift_bundle_id, l.gift_item_id, l.size, l.gift_message]);
}

type CartCtx = {
  lines: CartLine[];
  count: number;
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  replace: (lines: CartLine[]) => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);

  const add = useCallback((line: Omit<CartLine, "key">) => {
    const current = read();
    const id = identity(line);
    const existing = current.find((l) => identity(l) === id);
    if (existing) {
      write(current.map((l) => (l === existing ? { ...l, quantity: Math.min(10, l.quantity + line.quantity) } : l)));
    } else {
      write([...current, { ...line, key: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}` }]);
    }
  }, []);
  const setQuantity = useCallback((key: string, quantity: number) => {
    write(read().map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(10, quantity)) } : l)));
  }, []);
  const remove = useCallback((key: string) => write(read().filter((l) => l.key !== key)), []);
  const clear = useCallback(() => write([]), []);
  const replace = useCallback((next: CartLine[]) => write(next), []);

  const value = useMemo(
    () => ({ lines, count: lines.reduce((n, l) => n + l.quantity, 0), add, setQuantity, remove, clear, replace }),
    [lines, add, setQuantity, remove, clear, replace],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

/** Payload for /cart/quote and /orders (strips display-only fields). */
export function toApiLines(lines: CartLine[]) {
  return lines.map((l) => ({
    kind: l.kind,
    product_id: l.product_id,
    design_public_id: l.design_public_id,
    gift_bundle_id: l.gift_bundle_id,
    gift_item_id: l.gift_item_id,
    quantity: l.quantity,
    size: l.size ?? undefined,
    gift_message: l.gift_message ?? undefined,
    ai_request_id: l.ai_request_id ?? undefined,
  }));
}
