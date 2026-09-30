"use client";

import {
  BarChart3, Bot, Boxes, ExternalLink, Gem, Gift, LayoutDashboard, LogOut, Menu, MessageSquareHeart, Package, Palette,
  Ruler, Settings, Shapes, ShoppingBag, Sparkles, Store, Tags, Users, Wand2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/store/Logo";
import { Sheet } from "@/components/ui/Sheet";
import { api } from "@/lib/api";
import { cn } from "@/lib/format";
import type { User } from "@/lib/types";

const NAV = [
  { group: "Overview", items: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  ] },
  { group: "Sales", items: [
    { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    { href: "/admin/designs", label: "Custom designs", icon: Wand2 },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/ai-requests", label: "AI requests", icon: Bot },
    { href: "/admin/reviews", label: "Reviews", icon: MessageSquareHeart },
  ] },
  { group: "Catalogue", items: [
    { href: "/admin/products", label: "Products", icon: Store },
    { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    { href: "/admin/catalogue/charms", label: "Charms", icon: Gem },
    { href: "/admin/catalogue/colours", label: "Colours", icon: Palette },
    { href: "/admin/catalogue/finishes", label: "Finishes", icon: Sparkles },
    { href: "/admin/catalogue/shapes", label: "Nail shapes", icon: Shapes },
    { href: "/admin/catalogue/patterns", label: "Patterns", icon: Package },
    { href: "/admin/catalogue/categories", label: "Categories & tags", icon: Tags },
  ] },
  { group: "Setup", items: [
    { href: "/admin/gifting", label: "Gifting", icon: Gift },
    { href: "/admin/sizes", label: "Nail sizes", icon: Ruler },
    { href: "/admin/settings", label: "Settings & pricing", icon: Settings },
  ] },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin"
      : href === "/admin/catalogue/categories" ? /\/admin\/catalogue\/(categories|styles|occasions|tags)/.test(pathname)
        : pathname.startsWith(href);
  return (
    <nav className="space-y-6" aria-label="Admin">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-[10.5px] font-bold tracking-[0.16em] text-ink-3 uppercase">{g.group}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={onNavigate}
                  className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition",
                    isActive(item.href) ? "bg-ink text-white" : "text-ink-2 hover:bg-blush-50 hover:text-ink")}>
                  <item.icon className="size-4" /> {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ user, children }: { user: User; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [openPath, setOpenPath] = useState(pathname);
  if (openPath !== pathname) {
    setOpenPath(pathname);
    setOpen(false);
  }
  const signOut = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-dvh bg-[#fbf7f9]">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
        <div className="flex items-center justify-between px-3"><Logo href="/admin" /><span className="rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold tracking-widest text-white">ADMIN</span></div>
        <div className="mt-7 flex-1 overflow-y-auto"><Nav /></div>
        <div className="mt-4 space-y-1 border-t border-line pt-4">
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-ink-2 hover:bg-blush-50"><ExternalLink className="size-4" /> View store</Link>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-ink-2 hover:bg-blush-50"><LogOut className="size-4" /> Sign out</button>
          <p className="truncate px-3 pt-2 text-[11.5px] text-ink-3">{user.email} · {user.role_name}</p>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-3 backdrop-blur lg:hidden">
        <button aria-label="Open admin menu" onClick={() => setOpen(true)} className="flex size-10 items-center justify-center rounded-full hover:bg-blush-50"><Menu className="size-5" /></button>
        <Logo href="/admin" />
        <span className="w-10" />
      </header>
      <Sheet open={open} onClose={() => setOpen(false)} title="Admin">
        <Nav onNavigate={() => setOpen(false)} />
        <button onClick={signOut} className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink-2"><LogOut className="size-4" /> Sign out</button>
      </Sheet>

      <main className="px-4 py-6 lg:ml-60 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
