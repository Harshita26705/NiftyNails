import { ArrowRight, MessageCircle, Paintbrush, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NailGroup } from "@/components/nails/Nail";

export const metadata: Metadata = { title: "Create your own nails" };

function Nails({ specs }: { specs: Parameters<typeof NailGroup>[0]["spec"][] }) {
  return (
    <div className="flex h-40 items-end justify-center gap-2 md:h-48">
      {specs.map((s, i) => (
        <svg key={i} viewBox="-14 -14 128 178" className="h-full w-auto" style={{ transform: `rotate(${(i - (specs.length - 1) / 2) * 6}deg)` }}>
          <NailGroup spec={s} />
        </svg>
      ))}
    </div>
  );
}

export default function CreatePage() {
  return (
    <main className="mx-auto max-w-5xl px-5 pt-8 md:px-6 md:pt-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Create your own</p>
        <h1 className="mt-2 font-display text-[40px] leading-[1.02] tracking-[-0.025em] md:text-[60px]">
          How do you want to <em className="font-normal text-pink italic normal-case">design?</em>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Either way, you&apos;ll only see colours, finishes and charms we actually stock — so what you design is exactly what we make.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-6">
        <Link href="/create/chat" className="group rounded-[0.75rem] bg-surface p-6 shadow-soft ring-1 ring-line transition hover:-translate-y-1 hover:shadow-lift md:p-8">
          <div className="rounded-[0.625rem] bg-blush-50 py-6">
            <Nails specs={[
              { shape: "almond", length: "medium", base: "#F8C8D8", finish: "chrome", charms: [{ kind: "bow", x: 0.5, y: 0.45, scale: 2 }] },
              { shape: "almond", length: "medium", base: "#F8C8D8", finish: "chrome" },
              { shape: "almond", length: "medium", base: "#F8C8D8", finish: "chrome", charms: [{ kind: "strawberry-3d", x: 0.5, y: 0.5, scale: 1.9 }] },
            ]} />
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-blush-100 text-pink"><MessageCircle className="size-5" /></span>
            <h2 className="font-display text-[28px] leading-none">Chat design</h2>
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
            Describe your idea in your own words. Our designer turns it into a real, priced design and asks the right
            questions — like which nails get the charms.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-pink transition-all group-hover:gap-3">Start chatting <ArrowRight className="size-4" /></span>
        </Link>

        <Link href="/create/draw" className="group rounded-[0.75rem] bg-ink p-6 text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift md:p-8">
          <div className="rounded-[0.625rem] bg-white/[0.06] py-6">
            <Nails specs={[
              { shape: "coffin", length: "long", base: "#CDB8E8", pattern: "swirls", patternColour: "#FFFFFF" },
              { shape: "coffin", length: "long", base: "#FFFFFF", pattern: "hearts", patternColour: "#7A2E3A" },
              { shape: "coffin", length: "long", base: "#BCD9F2", finish: "glazed", charms: [{ kind: "butterfly", x: 0.5, y: 0.45, scale: 2 }] },
            ]} />
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-blush-300"><Paintbrush className="size-5" /></span>
            <h2 className="font-display text-[28px] leading-none">Draw your own</h2>
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/70">
            Paint each of your ten nails, add patterns and finishes, and drag, resize and rotate real charms onto them.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blush-300 transition-all group-hover:gap-3">Open the studio <ArrowRight className="size-4" /></span>
        </Link>
      </div>

      <p className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-2 text-center text-[13px] text-ink-2">
        <ShieldCheck className="size-4 shrink-0 text-success" /> A nail artist reviews every custom design before it&apos;s made.
      </p>
    </main>
  );
}
