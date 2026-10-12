import { ArrowRight, Camera, MessageCircle, Paintbrush, Ruler, ScanLine, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NailGroup } from "@/components/nails/Nail";
import { NailSetArt } from "@/components/nails/NailSetArt";
import { ProductCard } from "@/components/store/ProductCard";
import { StylistPrompt } from "@/components/store/StylistPrompt";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading, Stars } from "@/components/ui/bits";
import { Reveal } from "@/components/ui/Reveal";
import { backdropFor } from "@/lib/colour";
import { money } from "@/lib/format";
import type { Lookup, Product, Review } from "@/lib/types";

const wrap = "mx-auto max-w-7xl px-5 md:px-10";

function RuleLink({ href, children, light }: { href: string; children: React.ReactNode; light?: boolean }) {
  return (
    <Link href={href} className={`link-rule ${light ? "text-paper" : "text-ink"}`}>
      {children} <ArrowRight className="size-4" />
    </Link>
  );
}

export function Trending({ products }: { products: Product[] }) {
  return (
    <section className="py-16 md:py-28">
      <div className={wrap}>
        <SectionHeading className="reveal" eyebrow="01 — The collection" title="Signature sets"
          subtitle="Pearl glazes, quiet neutrals and evening chromes, each one sculpted and painted by hand."
          action={<RuleLink href="/shop?sort=popular">View all designs</RuleLink>} />
      </div>
      <div className="scrollbar-none mt-10 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pb-2 md:mx-auto md:mt-14 md:grid md:max-w-7xl md:grid-cols-4 md:gap-8 md:overflow-visible md:px-10">
        {products.slice(0, 4).map((p, i) => (
          <div key={p.id} className="reveal w-[64%] shrink-0 snap-start sm:w-[40%] md:w-auto">
            <ProductCard product={p} priority={i < 2} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** A thin, tracked-caps index of the catalogue's styles. Each links to a filtered shop. */
export function ShopByStyle({ categories, samples }: { categories: Lookup[]; samples: Record<string, Product | undefined> }) {
  return (
    <section className="bg-blush-100 py-16 md:py-28">
      <div className={wrap}>
        <SectionHeading className="reveal" eyebrow="Shop by style" title="Find your" accent="nail personality" />
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:mt-14 md:grid-cols-3 md:gap-x-8 lg:grid-cols-6">
          {categories.map((cat, i) => {
            const p = samples[cat.slug];
            return (
              <Reveal key={cat.slug} delay={i * 60}>
                <Link href={`/shop?category=${cat.slug}`} className="group block">
                  <div className="relative flex aspect-[4/5] items-end justify-center overflow-hidden rounded-t-[999px] rounded-b-[2px] p-[6%] pb-[16%] transition-transform duration-500 group-hover:-translate-y-1.5"
                    style={{ background: p ? backdropFor(p.art.base) : "var(--color-blush-50)" }}>
                    {p && <NailSetArt art={p.art} className="w-full" />}
                  </div>
                  <p className="mt-4 flex items-center justify-between text-[12px] font-medium tracking-[0.2em] uppercase">
                    {cat.name}
                    <ArrowRight className="size-4 -translate-x-1 text-pink opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                  </p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function StylistSection({ sample }: { sample?: Product }) {
  return (
    <section className="py-16 md:py-28">
      <div className={`${wrap} grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-24 [&>*]:min-w-0`}>
        <div className="reveal-l">
          <p className="eyebrow">02 — AI Nail Stylist</p>
          <h2 className="mt-5 font-display text-[40px] leading-[1.02] text-balance uppercase md:text-[64px]">
            Describe the mood. <em className="font-normal text-pink italic normal-case">We&apos;ll find the set.</em>
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-[1.75] text-ink-2">
            Tell the stylist the occasion, the outfit or the feeling you want. Every suggestion is a real design, made from
            finishes and charms we actually stock. Optional, and never a replacement for the Design Studio.
          </p>
          <StylistPrompt className="mt-8" />
          <Link href="/stylist?tab=outfit" className="mt-6 inline-flex items-center gap-2 text-[13px] font-medium tracking-[0.06em] text-ink hover:text-pink">
            <Camera className="size-4 text-pink" /> Or match nails to an outfit photo
          </Link>
        </div>

        {sample && (
          <Link href={`/shop/${sample.slug}`} className="group reveal-s mx-auto block w-full max-w-md">
            <div className="flex aspect-[4/5] items-end overflow-hidden rounded-t-[999px] rounded-b-[2px] p-[7%] pb-[16%]" style={{ background: backdropFor(sample.art.base) }}>
              <NailSetArt art={sample.art} className="w-full transition-transform duration-700 group-hover:scale-[1.05]" />
            </div>
            <div className="mt-5 flex items-baseline justify-between gap-4 border-b border-ink pb-4">
              <p className="font-display text-[24px] text-ink-2 italic md:text-[28px]">&ldquo;Soft neutrals for a garden wedding&rdquo;</p>
            </div>
            <p className="mt-4 flex items-baseline justify-between text-[13px]">
              <span className="eyebrow text-[10.5px]">Closest match</span>
              <span><span className="font-display text-[20px]">{sample.name}</span> <span className="ml-2 text-ink-2">{money(sample.price_paise)}</span></span>
            </p>
          </Link>
        )}
      </div>
    </section>
  );
}

function MiniNail({ base, finish, pattern, charms, colour }: {
  base: string; finish?: string; pattern?: string; colour?: string; charms?: { kind: string; x: number; y: number; scale?: number }[];
}) {
  return (
    <svg viewBox="-14 -14 128 178" className="h-full w-auto">
      <NailGroup spec={{ shape: "almond", length: "medium", base, finish, pattern, patternColour: colour, charms }} />
    </svg>
  );
}

export function CreateSection() {
  return (
    <section className="bg-ink py-16 text-paper md:py-28">
      <div className={`${wrap} grid grid-cols-1 gap-12 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-24 [&>*]:min-w-0`}>
        <div className="reveal-l">
          <p className="eyebrow text-blush-300">04 — Design Studio</p>
          <h2 className="mt-5 font-display text-[40px] leading-[1.02] text-balance uppercase md:text-[64px]">
            You create. <em className="font-normal text-blush-300 italic normal-case">Nifty Nails makes it real.</em>
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-[1.75] text-blush-200">
            Draw freehand, blend your own ombre, add shapes, text and artwork, or chat your way to a design. See the price as
            you design, and we will handcraft it.
          </p>
          <ButtonLink href="/create" size="lg" variant="secondary" className="mt-9 text-paper ring-paper hover:bg-paper hover:text-ink">Open the studio</ButtonLink>
        </div>
        <div className="reveal-r grid grid-cols-2 gap-px bg-white/15">
          <Link href="/create/chat" className="group bg-ink p-5 transition hover:bg-[#3a2418] md:p-8">
            <div className="flex h-36 items-end justify-center gap-1 md:h-48">
              <MiniNail base="#EFD3C1" finish="glossy" charms={[{ kind: "pearl", x: 0.5, y: 0.7, scale: 1.5 }]} />
              <MiniNail base="#EFD3C1" finish="glossy" charms={[{ kind: "pearl", x: 0.5, y: 0.5, scale: 1.5 }, { kind: "pearl", x: 0.3, y: 0.62, scale: 1.2 }]} />
            </div>
            <p className="mt-6 flex items-center gap-2 text-[12px] font-medium tracking-[0.2em] uppercase"><MessageCircle className="size-4 text-blush-300" /> Chat design</p>
            <p className="mt-2 text-[13px] leading-snug text-blush-200">&ldquo;champagne glaze, tiny pearls&rdquo;</p>
          </Link>
          <Link href="/create/draw" className="group bg-ink p-5 transition hover:bg-[#3a2418] md:p-8">
            <div className="flex h-36 items-end justify-center gap-1 md:h-48">
              <MiniNail base="#3A3330" finish="glossy" />
              <MiniNail base="#C98A76" pattern="swirls" colour="#FCF5EB" />
            </div>
            <p className="mt-6 flex items-center gap-2 text-[12px] font-medium tracking-[0.2em] uppercase"><Paintbrush className="size-4 text-blush-300" /> Draw your own</p>
            <p className="mt-2 text-[13px] leading-snug text-blush-200">Paint, blend and place charms, nail by nail</p>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SizeSection() {
  const sizes = [["Thumb", 2], ["Index", 5], ["Middle", 4], ["Ring", 5], ["Pinky", 8]] as const;
  return (
    <section className="bg-blush-100 py-16 md:py-28">
      <div className={`${wrap} grid items-center gap-12 md:grid-cols-2 md:gap-24 [&>*]:min-w-0`}>
        <div className="reveal-s order-2 md:order-1">
          <div className="mx-auto max-w-md bg-surface p-6 ring-1 ring-line md:p-8">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-[10.5px]">Your Nifty sizes</p>
              <span className="text-[11px] font-medium tracking-[0.14em] text-success uppercase">High confidence</span>
            </div>
            <div className="mt-6 grid grid-cols-5 gap-2">
              {sizes.map(([finger, size]) => (
                <div key={finger} className="flex flex-col items-center border-t border-ink pt-3">
                  <span className="font-display text-[44px] leading-none">{size}</span>
                  <span className="mt-2 text-[10px] font-medium tracking-[0.14em] text-ink-2 uppercase">{finger}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-2 bg-blush-50 px-3 py-2.5 text-[12.5px] text-ink-2">
              <ScanLine className="size-4 shrink-0 text-pink" /> Measured against a ₹10 coin · closest kit: M
            </div>
          </div>
        </div>
        <div className="reveal-r order-1 md:order-2">
          <SectionHeading eyebrow="03 — Find my size" title="Measured once." accent="Fitted perfectly."
            subtitle="Place a coin beside your hand and take a photo. We measure every nail and match it to our sizes 0–9, and if we are unsure, we will tell you." />
          <ol className="mt-8 space-y-4">
            {[["Coin next to your hand", Ruler], ["Take a clear photo", Camera], ["Get sizes for every finger", ScanLine]].map(([t, Icon], i) => {
              const I = Icon as typeof Ruler;
              return (
                <li key={t as string} className="flex items-center gap-4 border-b border-line-strong pb-4 text-[15px]">
                  <span className="font-display text-[26px] text-pink italic tabular-nums">0{i + 1}</span> {t as string}
                  <I className="ml-auto size-4 text-ink-3" />
                </li>
              );
            })}
          </ol>
          <ButtonLink href="/size" size="lg" className="mt-9">Find my size</ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function GiftSection({ sample }: { sample?: Product }) {
  const base = sample?.price_paise ?? 89900;
  return (
    <section className="bg-blush-100 py-16 md:py-28">
      <div className={wrap}>
        <div className="grid items-center gap-10 bg-surface ring-1 ring-line px-6 py-12 md:grid-cols-2 md:gap-20 md:px-16 md:py-16 [&>*]:min-w-0">
          <div>
            <p className="eyebrow">Gifting</p>
            <h2 className="mt-5 font-display text-[38px] leading-[1.02] text-balance uppercase md:text-[56px]">
              The gift they&apos;ll <em className="font-normal text-pink italic normal-case">actually wear.</em>
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-[1.75] text-ink-2">
              Tell us who it is for, what they love and your budget. We will build a gift box with nails, a card and a
              care kit that never goes over.
            </p>
            <ButtonLink href="/gift" size="lg" className="mt-9">Build a gift</ButtonLink>
          </div>
          <div className="mx-auto w-full max-w-sm bg-blush-100 p-6">
            <p className="eyebrow text-[10.5px]">For a best friend · budget ₹1,500</p>
            <div className="mt-5 space-y-3 text-[14.5px]">
              {[[sample?.name ?? "Nail set", base], ["Signature gift box", 29900], ["Personalised card", 9900], ["Satin bow scrunchie", 14900]].map(([n, p]) => (
                <div key={n as string} className="flex justify-between"><span>{n as string}</span><span className="tabular-nums text-ink-2">{money(p as number)}</span></div>
              ))}
            </div>
            <div className="mt-5 flex justify-between border-t border-ink pt-4 font-medium">
              <span>Total</span><span className="tabular-nums">{money(base + 29900 + 9900 + 14900)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BrandStory() {
  return (
    <section className="bg-blush-100 py-16 md:py-28">
      <div className={`${wrap} grid grid-cols-1 items-center gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-24`}>
        <div className="reveal-s relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-full md:mx-0">
          <Image src="/logo.png" alt="Nifty Nails emblem: a woman with hibiscus flowers over her face, hand raised, black floral nails" fill sizes="(min-width: 768px) 440px, 90vw" className="object-cover" />
        </div>
        <div className="reveal-r">
          <p className="eyebrow">05 — The house</p>
          <h2 className="mt-5 font-display text-[38px] leading-[1.02] text-balance uppercase md:text-[60px]">
            Crafted by hand. <em className="font-normal text-pink italic normal-case">Worn with intention.</em>
          </h2>
          <p className="mt-6 max-w-lg text-[16px] leading-[1.75] text-pretty text-ink-2 md:text-[17px]">
            Every set that leaves our studio is sculpted, painted and finished by hand: one artist, one set, start
            to finish. We built the technology so you could design without limits, and we kept the craft so what arrives
            still feels made, not manufactured.
          </p>
          <dl className="mt-10 grid max-w-md grid-cols-2 gap-x-8 gap-y-7 border-t border-line-strong pt-8">
            {[["100%", "hand-painted"], ["7 days", "average lead time"], ["0–9", "sizes fitted to you"], ["1:1", "artist review on every custom set"]].map(([k, v]) => (
              <div key={v}>
                <dt className="font-display text-[34px] leading-none">{k}</dt>
                <dd className="mt-2 text-[12px] leading-snug tracking-[0.06em] text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { title: "Pick or design", body: "Shop a set, or create your own with our AI stylist or drawing studio." },
    { title: "Get your fit", body: "Photo sizing, a standard kit, or enter your own sizes 0–9." },
    { title: "Handmade for you", body: "Every set is sculpted and painted by hand in our studio." },
    { title: "Wear and re-wear", body: "Apply in minutes. With care, sets last for many wears." },
  ];
  return (
    <section className="py-16 md:py-28">
      <div className={wrap}>
        <SectionHeading eyebrow="How it works" title="Salon nails," accent="minus the salon" align="center" />
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 md:mt-16 lg:grid-cols-4 lg:gap-10">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 80} className="h-full">
              <div className="h-full border-t border-ink pt-6">
                <span className="font-display text-[48px] leading-none text-pink italic">0{i + 1}</span>
                <h3 className="mt-5 text-[13px] font-medium tracking-[0.2em] uppercase">{s.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Reviews({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  return (
    <section className="py-16 md:py-28">
      <div className={wrap}>
        <SectionHeading eyebrow="Reviews" title="Nifty" accent="girlies say" />
      </div>
      <div className="scrollbar-none mt-10 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pb-2 md:mx-auto md:mt-14 md:grid md:max-w-7xl md:grid-cols-3 md:gap-8 md:px-10">
        {reviews.map((r) => (
          <figure key={r.id} className="flex w-[84%] shrink-0 snap-start flex-col border-t border-ink pt-6 sm:w-[48%] md:w-auto">
            <Stars rating={r.rating} />
            {r.title && <p className="mt-5 font-display text-[28px] leading-tight">&ldquo;{r.title}&rdquo;</p>}
            <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-2">{r.body}</blockquote>
            <figcaption className="mt-6 text-[12px] tracking-[0.16em] text-ink-2 uppercase">
              <span className="font-medium text-ink">{r.author_name}</span>
              {r.product_name && (
                <Link href={`/shop/${r.product_slug}`} className="mt-1 block normal-case tracking-normal hover:text-pink">on {r.product_name}</Link>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function Social({ products, handle }: { products: Product[]; handle?: string }) {
  return (
    <section className="bg-blush-100 py-16 md:py-28">
      <div className={wrap}>
        <SectionHeading eyebrow="From the studio" title="Made for the" accent="’gram"
          subtitle={handle ? <>Follow <a className="font-medium text-pink underline decoration-gold underline-offset-4" href={`https://instagram.com/${handle}`} target="_blank" rel="noreferrer">@{handle}</a> for drops, behind-the-scenes and nail-art reels. Tag us to be featured.</> : undefined} />
        <div className="mt-10 grid grid-cols-3 gap-1.5 md:mt-14 md:grid-cols-6 md:gap-3">
          {products.slice(0, 6).map((p) => (
            <Link key={p.id} href={`/shop/${p.slug}`} className="group relative flex aspect-square items-center justify-center overflow-hidden p-[8%]"
              style={{ background: backdropFor(p.art.base) }}>
              <NailSetArt art={p.art} layout="row" className="w-full transition-transform duration-500 group-hover:scale-110" />
              <span className="absolute inset-0 flex items-center justify-center bg-ink/0 text-paper opacity-0 transition group-hover:bg-ink/40 group-hover:opacity-100">
                <Star className="size-5 fill-paper" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
