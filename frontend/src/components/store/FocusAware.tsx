"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Full-screen flows where store chrome (footer, tab bar, announcement) gets out of the way. */
export const FOCUS_PATHS = ["/create/chat", "/create/draw", "/checkout"];

export function useFocusMode() {
  const pathname = usePathname();
  return FOCUS_PATHS.some((p) => pathname.startsWith(p));
}

export function HideInFocus({ children }: { children: ReactNode }) {
  return useFocusMode() ? null : <>{children}</>;
}
