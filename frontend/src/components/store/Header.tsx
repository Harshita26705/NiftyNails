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
  { href: "/shop", label: "Collection" },
  { href: "/create", label: "Design studio" },
  { href: "/stylist", label: "AI Stylist" },
  { href: "/size", label: "Find my size" },
  { href: "/gift", label: "Gifting" },
];

export function BagButton({ className }: { className?: string }) {
  const { count } = useCart();
  return (
    <Link href="/bag" aria-label={`Bag, ${count} items`} className={cn("relative inline-flex size-11 items-center justify-center rounded-full hover:bg-blush-100", className)}>
      <ShoppingBag className="size-[21px]" strokeWidth={1.8} />
      {count > 0 && (
        <span className="absolute top-1 right-0.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full animate-pulse-ring bg-gold px-1 text-[10px] font-medium text-white ring-2 ring-paper">
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
        <div className="truncate bg-ink px-4 py-2.5 text-center text-[11px] font-normal tracking-[0.22em] text-blush-200 uppercase">
          {announcement}
        </div>
      )}
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          "shadow-[0_1px_0_var(--color-line)]", scrolled ? "bg-paper/90 backdrop-blur-xl" : "bg-paper",
        )}
      >
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-2 px-3 md:h-[88px] md:px-10">
          <div className="flex items-center md:hidden">
            <button aria-label="Open menu" onClick={() => setMenu(true)} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-blush-100">
              <Menu className="size-[22px]" strokeWidth={1.8} />
            </button>
          </div>

          <Logo />

          <nav className="hidden flex-1 items-center justify-center gap-4 md:flex" aria-label="Main">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "relative px-4 py-2 text-[12.5px] font-medium tracking-[0.18em] uppercase transition-colors after:absolute after:inset-x-4 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-300 hover:after:scale-x-100",
                    active ? "text-ink" : "text-ink hover:text-pink",
                  )}>
                  {item.label}
                  {active && <span className="absolute inset-x-4 -bottom-0.5 h-px bg-gold" />}
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
                <span className="flex size-8 items-center justify-center rounded-full bg-blush-200 text-[13px] font-medium text-pink-deep">
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
              className={cn("border-b border-line px-2 py-4 font-display text-[30px] uppercase", pathname === item.href ? "text-pink" : "hover:text-pink")}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link href="/account" className="rounded-[2px] bg-surface p-4 text-sm font-medium ring-1 ring-line">
            <User className="mb-2 size-5 text-pink" />
            {user ? `Hi, ${user.full_name.split(" ")[0]}` : "Sign in"}
          </Link>
          <Link href={user ? "/account/favourites" : "/account"} className="rounded-[2px] bg-surface p-4 text-sm font-medium ring-1 ring-line">
            <Heart className="mb-2 size-5 text-pink" />
            Favourites
          </Link>
        </div>
      </Sheet>
    </>
  );
}
