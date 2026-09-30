"use client";

import { useRef, useState } from "react";
import { NailSetArt, SingleNail, nailSpecsFromArt } from "@/components/nails/NailSetArt";
import { backdropFor } from "@/lib/colour";
import { cn } from "@/lib/format";
import type { Product } from "@/lib/types";

type Slide = { key: string; label: string; render: () => React.ReactNode };

export function ProductGallery({ product }: { product: Product }) {
  const specs = nailSpecsFromArt(product.art);
  const accentIndex = [3, 1, 2, 0, 4].find((i) => specs[i]?.charms?.length || specs[i]?.pattern) ?? 2;
  const bg = backdropFor(product.art.base);

  const slides: Slide[] = [
    ...product.images.map((img) => ({
      key: `img-${img.id}`,
      label: "Photo",
      // eslint-disable-next-line @next/next/no-img-element
      render: () => <img src={img.url} alt={img.alt || product.name} className="size-full object-cover" />,
    })),
    { key: "set", label: "Full set", render: () => <NailSetArt art={product.art} className="w-[92%]" title={`${product.name} full set`} /> },
    {
      key: "close", label: "Close-up",
      render: () => <SingleNail spec={specs[accentIndex]} className="h-[82%] w-auto" title={`${product.name} accent nail close-up`} />,
    },
    { key: "row", label: "Flat lay", render: () => <NailSetArt art={product.art} layout="row" className="w-[92%]" /> },
  ];

  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const go = (i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="md:sticky md:top-24">
      <div className="relative -mx-5 md:mx-0">
        <div ref={scroller} onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto md:rounded-[0.75rem]" aria-label="Product images">
          {slides.map((s) => (
            <div key={s.key} className="flex aspect-square w-full shrink-0 snap-center items-center justify-center overflow-hidden" style={{ background: bg }}>
              {s.render()}
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 md:hidden">
          {slides.map((s, i) => (
            <button key={s.key} aria-label={`Show ${s.label}`} onClick={() => go(i)}
              className={cn("h-1.5 rounded-full transition-all", i === active ? "w-6 bg-ink" : "w-1.5 bg-ink/25")} />
          ))}
        </div>
      </div>
      <div className="mt-3 hidden grid-cols-4 gap-3 md:grid">
        {slides.map((s, i) => (
          <button key={s.key} onClick={() => go(i)} aria-label={`Show ${s.label}`}
            className={cn("flex aspect-square items-center justify-center overflow-hidden rounded-2xl p-1.5 ring-2 transition [&_svg]:max-h-full [&_img]:rounded-xl",
              i === active ? "ring-ink" : "ring-transparent hover:ring-line-strong")}
            style={{ background: bg }}>
            {s.render()}
          </button>
        ))}
      </div>
    </div>
  );
}
