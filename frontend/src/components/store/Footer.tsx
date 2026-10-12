import { AtSign, Mail } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Collection",
    links: [
      { href: "/shop", label: "All designs" },
      { href: "/shop?sort=newest", label: "New in" },
      { href: "/shop?category=bridal-and-festive", label: "Bridal & festive" },
      { href: "/gift", label: "Gifting" },
    ],
  },
  {
    title: "Studio",
    links: [
      { href: "/create", label: "Design your own" },
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
    <footer className="mt-24 bg-ink pb-28 text-paper md:pb-10">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-x-4 gap-y-10 px-5 pt-12 md:grid-cols-[1.6fr_repeat(3,1fr)] md:gap-10 md:px-10 md:pt-20">
        <div className="col-span-3 max-w-xs md:col-span-1">
          <Logo tone="light" size="lg" />
          <p className="mt-6 text-[15px] leading-relaxed text-blush-200">
            Handmade press-on nails, designed with you. Salon-quality gel sets you can reuse — made to order in India.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {instagram && (
              <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/25 px-3.5 py-2 text-[12px] font-medium tracking-[0.12em] text-paper uppercase hover:border-blush-300">
                <AtSign className="size-4" /> {instagram}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/25 px-3.5 py-2 text-[12px] font-medium tracking-[0.12em] text-paper uppercase hover:border-blush-300">
                <Mail className="size-4" /> Email us
              </a>
            )}
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-[11px] font-medium tracking-[0.3em] text-blush-300 uppercase">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-block text-[15px] text-blush-100 transition hover:translate-x-1 hover:text-blush-300">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-7xl flex-col gap-2 border-t border-white/15 px-5 pt-6 text-xs text-blush-300 md:flex-row md:justify-between md:px-10">
        <p>© {new Date().getFullYear()} Nifty Nails. Handmade with love in India.</p>
        <p>Photo sizing is an estimate — our team double-checks every custom order.</p>
      </div>
    </footer>
  );
}
