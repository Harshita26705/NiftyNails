import {
  ArrowRight, Camera, Gift, Heart, MessageCircle, Paintbrush, Palette, Ruler, ScanLine, Sparkles, Star, Truck, Wand2,
} from "lucide-react";
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

const wrap = "mx-auto max-w-7xl px-5 md:px-6";

export function Trending({ products }: { products: Product[] }) {
  return (
    <section className="py-10 md:py-20">
      <div className={wrap}>
        <SectionHeading eyebrow="Trending sets" title="Loved right" accent="now"
          action={<Link href="/shop?sort=popular" className="inline-flex items-center gap-1.5 text-sm font-semibold text-pink hover:gap-2.5 transition-all">Shop all designs <ArrowRight className="size-4" /></Link>} />
      </div>
      <div className="scrollbar-none mt-8 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 md:mx-auto md:grid md:max-w-7xl md:grid-cols-4 md:gap-6 md:overflow-visible md:px-6">
        {products.slice(0, 8).map((p, i) => (
          <div key={p.id} className="w-[62%] shrink-0 snap-start sm:w-[40%] md:w-auto">
            <ProductCard product={p} priority={i < 2} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ShopByStyle({ categories, samples }: { categories: Lookup[]; samples: Record<string, Product | undefined> }) {
  return (
    <section className="py-10 md:py-20">
      <div className={wrap}>
        <SectionHeading eyebrow="Shop by style" title="Find your" accent="nail personality" />
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-6">
          {categories.map((cat, i) => {
            const p = samples[cat.slug];
            return (
              <Reveal key={cat.slug} delay={i * 50}>
                <Link href={`/shop?category=${cat.slug}`} className="group block">
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[0.625rem] p-[4%] ring-1 ring-black/[0.03] transition group-hover:shadow-lift"
                    style={{ background: p ? backdropFor(p.art.base) : "var(--color-blush-50)" }}>
                    {p && <NailSetArt art={p.art} className="w-full scale-110 transition-transform duration-500 group-hover:scale-[1.16] group-hover:-rotate-2" />}
                  </div>
                  <p className="mt-2.5 flex items-center justify-between px-1 text-[14px] font-semibold">
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
    <section className="py-10 md:py-20">
      <div className={wrap}>
        <div className="grid grid-cols-1 items-center gap-10 overflow-hidden rounded-[0.75rem] bg-surface p-5 shadow-soft ring-1 ring-line md:grid-cols-2 md:p-12 [&>*]:min-w-0">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-pink uppercase">
              <Sparkles className="size-4" /> The Nifty Stylist
            </p>
            <h2 className="mt-3 font-display text-[32px] leading-[1.04] tracking-[-0.02em] md:text-[46px]">
              A personal nail consultation, <em className="text-pink italic">curated for you.</em>
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-2">
              Tell us the vibe in your own words — or upload your outfit, saree or makeup look — and we&apos;ll recommend
              designs, colours and finishes we actually make. Optional, and never a replacement for the Design Studio.
            </p>
            <StylistPrompt className="mt-6" />
            <Link href="/stylist?tab=outfit" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-pink">
              <Camera className="size-4 text-pink" /> Or match nails to an outfit photo
            </Link>
          </div>

          <div className="relative rounded-[0.625rem] bg-blush-50 p-5 md:p-7">
            <p className="text-[10.5px] font-bold tracking-[0.16em] text-ink-3 uppercase">Consultation note</p>
            <p className="mt-2 rounded-2xl bg-white px-4 py-3 text-[14px] leading-relaxed text-ink ring-1 ring-line">
              &ldquo;Baby pink almond nails with chrome, little bows and pearls — cute but not too flashy.&rdquo;
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Baby Pink", "Almond", "Chrome", "Bows", "Pearls", "Subtle"].map((c) => (
                <span key={c} className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-pink-deep ring-1 ring-blush-200">{c}</span>
              ))}
            </div>
            {sample && (
              <Link href={`/shop/${sample.slug}`} className="mt-4 flex items-center gap-4 rounded-3xl bg-white p-3 shadow-soft ring-1 ring-line">
                <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl p-2" style={{ background: backdropFor(sample.art.base) }}>
                  <NailSetArt art={sample.art} className="w-full" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-wide text-success uppercase">Closest match · 91%</p>
                  <p className="mt-0.5 font-semibold">{sample.name}</p>
                  <p className="text-sm text-ink-2">{money(sample.price_paise)}</p>
                </div>
              </Link>
            )}
          </div>
        </div>
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
    <section className="py-10 md:py-20">
      <div className={wrap}>
        <div className="relative overflow-hidden rounded-[0.75rem] bg-ink px-6 py-10 text-white md:px-14 md:py-16">
          <div aria-hidden className="absolute -top-24 -right-24 size-80 rounded-full bg-pink/30 blur-3xl" />
          <div className="relative grid grid-cols-1 gap-10 md:grid-cols-[1fr_1.1fr] md:items-center [&>*]:min-w-0">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-blush-300 uppercase">Create your own</p>
              <h2 className="mt-3 font-display text-[34px] leading-[1.02] tracking-[-0.02em] md:text-[52px]">
                Your idea, <em className="text-blush-300 italic">hand-made.</em>
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
                Chat your way to a design or paint every nail yourself. We only suggest colours, finishes and charms we
                really stock — so what you design is exactly what we make.
              </p>
              <ButtonLink href="/create" size="lg" className="mt-7" icon={<Wand2 className="size-4" />}>Start designing</ButtonLink>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Link href="/create/chat" className="group rounded-[0.625rem] bg-white/[0.07] p-4 ring-1 ring-white/10 transition hover:bg-white/[0.11] md:p-5">
                <div className="flex h-32 items-end justify-center gap-1 md:h-40">
                  <MiniNail base="#F8C8D8" finish="chrome" charms={[{ kind: "bow", x: 0.5, y: 0.45, scale: 2.1 }]} />
                  <MiniNail base="#F8C8D8" finish="chrome" charms={[{ kind: "pearl", x: 0.5, y: 0.7, scale: 1.5 }, { kind: "pearl", x: 0.28, y: 0.62, scale: 1.4 }, { kind: "pearl", x: 0.72, y: 0.62, scale: 1.4 }]} />
                </div>
                <p className="mt-4 flex items-center gap-2 font-semibold"><MessageCircle className="size-4 text-blush-300" /> Chat design</p>
                <p className="mt-1 text-[12.5px] leading-snug text-white/60">“pink chrome, tiny bows & pearls”</p>
              </Link>
              <Link href="/create/draw" className="group rounded-[0.625rem] bg-white/[0.07] p-4 ring-1 ring-white/10 transition hover:bg-white/[0.11] md:p-5">
                <div className="flex h-32 items-end justify-center gap-1 md:h-40">
                  <MiniNail base="#CDB8E8" pattern="swirls" colour="#FFFFFF" />
                  <MiniNail base="#FFFFFF" pattern="hearts" colour="#7A2E3A" />
                </div>
                <p className="mt-4 flex items-center gap-2 font-semibold"><Paintbrush className="size-4 text-blush-300" /> Draw your own</p>
                <p className="mt-1 text-[12.5px] leading-snug text-white/60">Paint, add charms, nail by nail</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SizeSection() {
  const sizes = [["Thumb", 2], ["Index", 5], ["Middle", 4], ["Ring", 5], ["Pinky", 8]] as const;
  return (
    <section className="py-10 md:py-20">
      <div className={`${wrap} grid items-center gap-10 md:grid-cols-2`}>
        <div className="order-2 md:order-1">
          <div className="mx-auto max-w-sm rounded-[0.75rem] bg-surface p-5 shadow-lift ring-1 ring-line">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Your Nifty sizes</p>
              <span className="rounded-full bg-mint px-2.5 py-1 text-[11px] font-bold text-success">High confidence</span>
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {sizes.map(([finger, size]) => (
                <div key={finger} className="flex flex-col items-center rounded-2xl bg-blush-50 py-3">
                  <span className="font-display text-3xl leading-none">{size}</span>
                  <span className="mt-1.5 text-[10.5px] font-semibold text-ink-2">{finger}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-champagne/60 px-3 py-2.5 text-[12.5px] text-ink-2">
              <ScanLine className="size-4 shrink-0 text-pink" /> Measured against a ₹10 coin · closest kit: M
            </div>
          </div>
        </div>
        <div className="order-1 md:order-2">
          <SectionHeading eyebrow="Find my nail size" title="Perfect fit," accent="from one photo"
            subtitle="Place a coin next to your hand and snap a photo. Computer vision measures each nail and maps it to our sizes 0–9. If we're not confident, we'll tell you — and suggest measuring by hand." />
          <ol className="mt-6 space-y-3">
            {[["Coin next to your hand", Ruler], ["Snap a clear photo", Camera], ["Get sizes for every finger", ScanLine]].map(([t, Icon], i) => {
              const I = Icon as typeof Ruler;
              return (
                <li key={t as string} className="flex items-center gap-3 text-[15px] font-medium">
                  <span className="flex size-9 items-center justify-center rounded-full bg-blush-100 text-pink"><I className="size-4" /></span>
                  <span className="text-ink-3 tabular-nums">0{i + 1}</span> {t as string}
                </li>
              );
            })}
          </ol>
          <ButtonLink href="/size" size="lg" variant="ink" className="mt-8" icon={<Ruler className="size-4" />}>Find my size</ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function GiftSection({ sample }: { sample?: Product }) {
  return (
    <section className="py-10 md:py-20">
      <div className={wrap}>
        <div className="grid items-center gap-8 overflow-hidden rounded-[0.75rem] bg-champagne px-6 py-10 md:grid-cols-2 md:px-14 md:py-14">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-pink uppercase"><Gift className="size-4" /> Gift Nifty</p>
            <h2 className="mt-3 font-display text-[32px] leading-[1.04] tracking-[-0.02em] md:text-[46px]">
              The gift they&apos;ll <em className="text-pink italic">actually</em> wear.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-2">
              Tell us who it&apos;s for, what they love and your budget. We&apos;ll build a gift box — nails, card, care kit — that
              never goes over.
            </p>
            <ButtonLink href="/gift" size="lg" className="mt-7" icon={<Gift className="size-4" />}>Build a gift</ButtonLink>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-[0.625rem] bg-white p-5 shadow-lift">
              <p className="text-[12px] font-semibold text-ink-2">For: best friend · 22 · loves Barbie</p>
              <div className="mt-4 space-y-2.5 text-[14px]">
                {[[sample?.name ?? "Nail set", sample?.price_paise ?? 89900], ["Signature gift box", 29900], ["Personalised card", 9900], ["Satin bow scrunchie", 14900]].map(([n, p]) => (
                  <div key={n as string} className="flex justify-between"><span>{n as string}</span><span className="tabular-nums text-ink-2">{money(p as number)}</span></div>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t border-dashed border-line-strong pt-3 font-semibold">
                <span>Total</span><span className="tabular-nums">{money((sample?.price_paise ?? 89900) + 29900 + 9900 + 14900)}</span>
              </div>
              <p className="mt-1 text-right text-[11.5px] font-semibold text-success">Within ₹1,500 budget ✓</p>
            </div>
            <div className="absolute -top-5 -right-3 flex size-16 rotate-12 items-center justify-center rounded-2xl bg-pink text-white shadow-lift">
              <Heart className="size-7 fill-white" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BrandStory() {
  return (
    <section className="py-14 md:py-28">
      <div className={`${wrap} grid grid-cols-1 items-center gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16`}>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[0.75rem] bg-blush-50 md:mx-0">
          <div className="absolute inset-0 flex items-center justify-center p-10">
            <MiniNail base="#EFE1C8" finish="matte" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.28em] text-pink uppercase">The house</p>
          <h2 className="mt-4 font-display text-[32px] leading-[1.08] tracking-[-0.02em] text-balance md:text-[48px]">
            A nail house, <em className="text-pink italic">not a factory.</em>
          </h2>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-pretty text-ink-2 md:text-[17px]">
            Every set that leaves our studio is sculpted, painted and finished by hand — one artist, one set, start
            to finish. We built the technology so you could design without limits; we kept the craft so what arrives
            still feels made, not manufactured.
          </p>
          <dl className="mt-10 grid max-w-md grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-7">
            {[["100%", "hand-painted"], ["7 days", "average lead time"], ["0–9", "sizes fitted to you"], ["1:1", "artist review on every custom set"]].map(([k, v]) => (
              <div key={v}>
                <dt className="font-display text-2xl leading-none">{k}</dt>
                <dd className="mt-1.5 text-[12px] leading-snug text-ink-2">{v}</dd>
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
    { icon: Palette, title: "Pick or design", body: "Shop a set, or create your own with our AI stylist or drawing studio." },
    { icon: Ruler, title: "Get your fit", body: "Photo sizing, a standard kit, or enter your own sizes 0–9." },
    { icon: Sparkles, title: "Handmade for you", body: "Every set is sculpted and painted by hand in our studio." },
    { icon: Truck, title: "Wear & re-wear", body: "Apply in minutes. With care, sets last for many wears." },
  ];
  return (
    <section className="py-10 md:py-20">
      <div className={wrap}>
        <SectionHeading eyebrow="How it works" title="Salon nails," accent="minus the salon" align="center" />
        <div className="mt-8 grid grid-cols-2 gap-3 md:mt-10 md:gap-4 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 80} className="h-full">
              <div className="h-full rounded-[0.5rem] bg-surface p-4 ring-1 ring-line md:rounded-[0.625rem] md:p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-blush-100 text-pink md:size-12"><s.icon className="size-5" /></span>
                  <span className="font-display text-3xl text-blush-200 md:text-4xl">{i + 1}</span>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold md:mt-5 md:text-lg">{s.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2 md:mt-1.5 md:text-sm">{s.body}</p>
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
    <section className="py-10 md:py-20">
      <div className={wrap}>
        <SectionHeading eyebrow="Reviews" title="Nifty" accent="girlies say" />
      </div>
      <div className="scrollbar-none mt-8 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 md:mx-auto md:grid md:max-w-7xl md:grid-cols-3 md:gap-6 md:px-6">
        {reviews.map((r) => (
          <figure key={r.id} className="flex w-[82%] shrink-0 snap-start flex-col rounded-[0.625rem] bg-surface p-6 ring-1 ring-line sm:w-[48%] md:w-auto">
            <Stars rating={r.rating} />
            {r.title && <p className="mt-4 font-display text-xl leading-snug">“{r.title}”</p>}
            <blockquote className="mt-2 flex-1 text-[14.5px] leading-relaxed text-ink-2">{r.body}</blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-blush-200 text-sm font-bold text-pink-deep">{r.author_name[0]}</span>
              <span className="text-sm">
                <span className="font-semibold">{r.author_name}</span>
                {r.product_name && (
                  <Link href={`/shop/${r.product_slug}`} className="block text-[12px] text-ink-2 hover:text-pink">on {r.product_name}</Link>
                )}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function Social({ products, handle }: { products: Product[]; handle?: string }) {
  return (
    <section className="py-10 md:py-20">
      <div className={wrap}>
        <SectionHeading eyebrow="From the studio" title="Made for the" accent="’gram"
          subtitle={handle ? <>Follow <a className="font-semibold text-pink" href={`https://instagram.com/${handle}`} target="_blank" rel="noreferrer">@{handle}</a> for drops, behind-the-scenes and nail-art reels. Tag us to be featured.</> : undefined} />
        <div className="mt-8 grid grid-cols-3 gap-1.5 md:grid-cols-6 md:gap-3">
          {products.slice(0, 6).map((p) => (
            <Link key={p.id} href={`/shop/${p.slug}`} className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl p-[8%] md:rounded-2xl"
              style={{ background: backdropFor(p.art.base) }}>
              <NailSetArt art={p.art} layout="row" className="w-full transition-transform duration-500 group-hover:scale-110" />
              <span className="absolute inset-0 flex items-center justify-center bg-ink/0 text-white opacity-0 transition group-hover:bg-ink/35 group-hover:opacity-100">
                <Star className="size-5 fill-white" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
