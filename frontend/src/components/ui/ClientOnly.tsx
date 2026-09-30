"use client";

import { type ReactNode, useSyncExternalStore } from "react";

const noop = () => () => {};

/** True only in the browser after hydration — without a setState-in-effect round trip. */
export function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/**
 * Renders children only in the browser. Use for app-like tools that restore state from
 * sessionStorage/localStorage (so lazy state initialisers can read storage without hydration mismatches).
 */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return useIsClient() ? <>{children}</> : <>{fallback}</>;
}
