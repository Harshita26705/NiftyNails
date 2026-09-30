import { ArrowRight, Ruler, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { NailSetArt } from "@/components/nails/NailSetArt";
import { ButtonLink } from "@/components/ui/Button";
import { backdropFor } from "@/lib/colour";
import type { Product } from "@/lib/types";

function splitTitle(title: string): [string, string] {
  const words = title.trim().split(" ");
  if (words.length < 2) return [title, ""];
  return [words.slice(0, -1).join(" "), words[words.length - 1]];
}

function Polaroid({ product, className, style }: { product: Product; className?: string; style?: React.CSSProperties }) {
  return (
    <Link href={`/shop/${product.slug}`} style={style}
      className={`group absolute block rounded-[1.6rem] bg-white p-2 shadow-[0_24px_50px_-24px_rgb(42_15_31/0.35)] ring-1 ring-black/[0.04] transition-transform duration-500 hover:-translate-y-1 ${className}`}>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[1.2rem] p-[4%]" style={{ background: backdropFor(product.art.base) }}>
        <NailSetArt art={product.art} className="w-full scale-110 transition-transform duration-500 group-hover:scale-[1.16]" title={product.name} />
      </div>
      <div className="flex items-center justify-between px-1.5 pt-2 pb-0.5">
        <span className="truncate text-[12px] font-semibold">{product.name}</span>
      </div>
    </Link>
  );
}

export function Hero({ title, subtitle, products }: { title: string; subtitle: string; products: Product[] }) {
  const [lead, accent] = splitTitle(title);
  const [a, b, c] = products;
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-blush-100 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-60 -left-40 size-[380px] rounded-full bg-champagne/70 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-5 [&>*]:min-w-0 pt-8 pb-14 md:grid-cols-[1.05fr_1fr] md:gap-8 md:px-6 md:pt-16 md:pb-24">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-[12px] font-semibold text-ink-2 shadow-soft ring-1 ring-line">
            <span className="size-1.5 rounded-full bg-pink" /> Handmade press-ons · made to order
          </p>
          <h1 className="mt-5 font-display text-[46px] leading-[0.98] tracking-[-0.035em] text-balance md:text-[82px]">
            {lead} <em className="text-pink italic">{accent}</em>
          </h1>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-pretty text-ink-2 md:text-lg">{subtitle}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/shop" size="lg" icon={<ArrowRight className="order-last size-4" />}>Shop designs</ButtonLink>
            <ButtonLink href="/create" size="lg" variant="secondary" icon={<Wand2 className="size-4 text-pink" />}>Create your own</ButtonLink>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
            {[
              ["24", "nails per set"],
              ["0–9", "sizes, fitted to you"],
              ["Reusable", "with care"],
            ].map(([k, v]) => (
              <div key={v}>
                <dt className="font-display text-2xl leading-none">{k}</dt>
                <dd className="mt-1.5 text-[12px] leading-snug text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {a && b && c && (
          <div className="relative mx-auto aspect-[1/1] w-full max-w-[520px] animate-fade-up [animation-delay:120ms]">
            <Polaroid product={b} className="top-[6%] left-[0%] w-[48%] -rotate-[7deg]" />
            <Polaroid product={c} className="top-[12%] right-[0%] w-[48%] rotate-[6deg]" />
            <Polaroid product={a} className="top-[30%] left-[22%] z-10 w-[56%]" />

            <div className="absolute top-[4%] right-[10%] z-20 flex animate-float items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 text-[12px] font-semibold shadow-soft ring-1 ring-line backdrop-blur [--r:3deg]">
              <Sparkles className="size-4 text-pink" /> AI matched · 94%
            </div>
            <div className="absolute bottom-[1%] left-[2%] z-20 flex animate-float items-center gap-2 rounded-2xl bg-ink px-3 py-2 text-[12px] font-semibold text-white shadow-lg [--r:-3deg] [animation-delay:1.2s]">
              <Ruler className="size-4 text-blush-300" /> Thumb 2 · Index 5 · Ring 5
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
