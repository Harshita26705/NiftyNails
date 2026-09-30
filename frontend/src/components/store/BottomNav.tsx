"use client";

import { Home, Sparkles, Store, Wand2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import { useFocusMode } from "./FocusAware";
import { BagButton } from "./Header";

/** App-style tab bar for phones. */
export function BottomNav() {
  const pathname = usePathname();
  const focus = useFocusMode();
  // Product pages show their own sticky purchase bar instead.
  const isProductPage = /^\/shop\/[^/]+$/.test(pathname);
  if (isProductPage || focus) return null;

  const tab = (href: string, label: string, Icon: typeof Home) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link href={href} className={cn("flex flex-1 flex-col items-center gap-1 py-1.5 text-[10.5px] font-semibold", active ? "text-pink" : "text-ink-2")}>
        <Icon className="size-[21px]" strokeWidth={active ? 2.2 : 1.8} />
        {label}
      </Link>
    );
  };

  return (
    <nav aria-label="Quick navigation" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/90 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center px-2">
        {tab("/", "Home", Home)}
        {tab("/shop", "Shop", Store)}
        <Link href="/create" className="-mt-7 flex flex-1 flex-col items-center gap-1 text-[10.5px] font-semibold text-ink">
          <span className={cn(
            "flex size-14 items-center justify-center rounded-full bg-pink text-white shadow-lift ring-4 ring-paper transition active:scale-95",
            pathname.startsWith("/create") && "bg-pink-deep",
          )}>
            <Wand2 className="size-6" />
          </span>
          Create
        </Link>
        {tab("/stylist", "Stylist", Sparkles)}
        <div className="flex flex-1 flex-col items-center text-[10.5px] font-semibold text-ink-2">
          <BagButton className="size-auto -my-0.5 p-0.5 hover:bg-transparent" />
          Bag
        </div>
      </div>
    </nav>
  );
}
