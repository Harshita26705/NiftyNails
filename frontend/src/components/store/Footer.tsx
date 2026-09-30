import { AtSign, Mail } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All designs" },
      { href: "/shop?sort=newest", label: "New in" },
      { href: "/shop?category=bridal-and-festive", label: "Bridal & festive" },
      { href: "/gift", label: "Gift Nifty" },
    ],
  },
  {
    title: "Studio",
    links: [
      { href: "/create", label: "Create your own" },
      { href: "/stylist", label: "AI Nail Stylist" },
      { href: "/size", label: "Find my size" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/track", label: "Track an order" },
      { href: "/account", label: "My account" },
      { href: "/size#guide", label: "Sizing guide" },
    ],
  },
];

export function Footer({ instagram, email }: { instagram?: string; email?: string }) {
  return (
    <footer className="mt-24 border-t border-line bg-surface pb-28 md:pb-10">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-x-4 gap-y-10 px-5 pt-12 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-10 md:px-6 md:pt-14">
        <div className="col-span-3 max-w-xs md:col-span-1">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-ink-2">
            Handmade press-on nails, designed with you. Salon-quality gel sets you can reuse — made to order in India.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {instagram && (
              <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-blush-100 px-3.5 py-2 text-[13px] font-semibold text-pink-deep hover:bg-blush-200">
                <AtSign className="size-4" /> {instagram}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 rounded-full bg-blush-50 px-3.5 py-2 text-[13px] font-semibold text-ink-2 ring-1 ring-line hover:text-ink">
                <Mail className="size-4" /> Email us
              </a>
            )}
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-[11px] font-bold tracking-[0.18em] text-ink-3 uppercase">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ink-2 transition hover:text-pink">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-2 border-t border-line px-5 pt-6 text-xs text-ink-3 md:flex-row md:justify-between md:px-6">
        <p>© {new Date().getFullYear()} Nifty Nails. Handmade with love in India.</p>
        <p>Photo sizing is an estimate — our team double-checks every custom order.</p>
      </div>
    </footer>
  );
}
