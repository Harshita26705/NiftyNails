"use client";

import { Heart, LogOut, Package, Palette, Ruler, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/store/AuthForm";
import { Card } from "@/components/ui/bits";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/format";

const LINKS = [
  { href: "/account", label: "Overview", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/designs", label: "My designs", icon: Palette },
  { href: "/account/favourites", label: "Favourites", icon: Heart },
  { href: "/account/sizes", label: "My sizes", icon: Ruler },
];

function Gate({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const next = useSearchParams().get("next");

  if (loading) return <div className="flex h-[50vh] items-center justify-center"><Spinner className="size-8 text-pink" /></div>;
  if (!user) {
    return (
      <main className="mx-auto grid max-w-5xl gap-10 px-5 pt-8 md:grid-cols-2 md:items-center md:px-6 md:pt-16">
        <div>
          <p className="eyebrow">Your Nifty account</p>
          <h1 className="mt-2 font-display text-[40px] leading-[1.02] tracking-[-0.025em] md:text-[56px]">Welcome <em className="font-normal text-pink italic normal-case">back.</em></h1>
          <ul className="mt-5 space-y-2 text-[14.5px] text-ink-2">
            {["Save your designs and favourites", "Keep your nail sizes on file", "Track orders and reorder in a tap"].map((t) => (
              <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-pink" />{t}</li>
            ))}
          </ul>
        </div>
        <Card><AuthForm onDone={() => { if (next?.startsWith("/")) router.push(next); }} /></Card>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-6xl px-5 pt-6 md:px-6 md:pt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-ink-2">Signed in as {user.email}</p>
          <h1 className="font-display text-[40px] leading-none uppercase md:text-[60px]">Hi, <em className="font-normal text-pink italic normal-case">{user.full_name.split(" ")[0]}</em></h1>
        </div>
        <button onClick={async () => { await logout(); router.push("/"); }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-2 hover:bg-blush-50">
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
      <nav className="scrollbar-none -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0" aria-label="Account">
        {LINKS.map((l) => {
          const active = l.href === "/account" ? pathname === "/account" : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={cn("inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition",
              active ? "bg-ink text-white" : "bg-surface text-ink-2 ring-1 ring-line hover:text-ink")}>
              <l.icon className="size-4" /> {l.label}
            </Link>
          );
        })}
        {user.role_name !== "customer" && (
          <Link href="/admin" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-pink px-4 py-2.5 text-[13px] font-semibold text-white">Admin →</Link>
        )}
      </nav>
      <div className="mt-8">{children}</div>
    </main>
  );
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <Suspense><Gate>{children}</Gate></Suspense>;
}
