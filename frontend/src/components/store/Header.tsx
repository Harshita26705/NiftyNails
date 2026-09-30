"use client";

import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/format";
import { Sheet } from "../ui/Sheet";
import { useFocusMode } from "./FocusAware";
import { Logo } from "./Logo";

export const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/create", label: "Create your own" },
  { href: "/stylist", label: "AI Stylist" },
  { href: "/size", label: "Find my size" },
  { href: "/gift", label: "Gift Nifty" },
];

export function BagButton({ className }: { className?: string }) {
  const { count } = useCart();
  return (
    <Link href="/bag" aria-label={`Bag, ${count} items`} className={cn("relative inline-flex size-11 items-center justify-center rounded-full hover:bg-blush-100", className)}>
      <ShoppingBag className="size-[21px]" strokeWidth={1.8} />
      {count > 0 && (
        <span className="absolute top-1 right-0.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-white ring-2 ring-paper">
          {count}
        </span>
      )}
    </Link>
  );
}

export function Header({ announcement }: { announcement?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const focus = useFocusMode();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Close the menu when the route changes (adjusting state during render, not in an effect).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenu(false);
  }

  return (
    <>
      {announcement && !focus && (
        <div className="truncate bg-ink px-4 py-2 text-center text-[11.5px] font-medium tracking-wide text-blush-100">
          {announcement}
        </div>
      )}
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled ? "bg-paper/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl" : "bg-paper",
        )}
      >
        <div className="mx-auto flex h-15 max-w-7xl items-center justify-between gap-2 px-3 md:h-18 md:px-6">
          <div className="flex items-center md:hidden">
            <button aria-label="Open menu" onClick={() => setMenu(true)} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-blush-100">
              <Menu className="size-[22px]" strokeWidth={1.8} />
            </button>
          </div>

          <Logo className="md:mr-6" />

          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors",
                    active ? "text-ink" : "text-ink-2 hover:text-ink",
                  )}>
                  {item.label}
                  {active && <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-pink" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center">
            <Link href="/stylist" aria-label="Search designs" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-blush-100">
              <Search className="size-[20px]" strokeWidth={1.8} />
            </Link>
            <Link href={user ? "/account/favourites" : "/account"} aria-label="Favourites" className="hidden size-11 items-center justify-center rounded-full hover:bg-blush-100 md:inline-flex">
              <Heart className="size-[20px]" strokeWidth={1.8} />
            </Link>
            <Link href="/account" aria-label="Account" className="hidden size-11 items-center justify-center rounded-full hover:bg-blush-100 md:inline-flex">
              {user ? (
                <span className="flex size-8 items-center justify-center rounded-full bg-blush-200 text-[13px] font-bold text-pink-deep">
                  {user.full_name.slice(0, 1).toUpperCase()}
                </span>
              ) : (
                <User className="size-[20px]" strokeWidth={1.8} />
              )}
            </Link>
            <BagButton />
          </div>
        </div>
      </header>

      <Sheet open={menu} onClose={() => setMenu(false)} title={<Logo />}>
        <nav className="flex flex-col gap-1 pt-2" aria-label="Mobile">
          {[{ href: "/", label: "Home" }, ...NAV, { href: "/track", label: "Track an order" }].map((item) => (
            <Link key={item.href} href={item.href}
              className={cn("rounded-2xl px-4 py-3.5 font-display text-2xl", pathname === item.href ? "bg-blush-100 text-pink-deep" : "hover:bg-blush-50")}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link href="/account" className="rounded-2xl bg-surface p-4 text-sm font-semibold ring-1 ring-line">
            <User className="mb-2 size-5 text-pink" />
            {user ? `Hi, ${user.full_name.split(" ")[0]}` : "Sign in"}
          </Link>
          <Link href={user ? "/account/favourites" : "/account"} className="rounded-2xl bg-surface p-4 text-sm font-semibold ring-1 ring-line">
            <Heart className="mb-2 size-5 text-pink" />
            Favourites
          </Link>
        </div>
      </Sheet>
    </>
  );
}
