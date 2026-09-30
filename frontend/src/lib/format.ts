const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function money(paise: number | null | undefined): string {
  return inr.format(Math.round((paise ?? 0) / 100));
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "Order placed",
  DESIGN_REVIEW: "Design review",
  APPROVED: "Approved",
  IN_PRODUCTION: "Being handmade",
  READY: "Ready to ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const LENGTH_LABEL: Record<string, string> = { short: "Short", medium: "Medium", long: "Long", xlong: "Extra long" };
