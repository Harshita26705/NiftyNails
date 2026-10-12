import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Emblem } from "./Emblem";

function splitTitle(title: string): [string, string] {
  const words = title.trim().split(" ");
  if (words.length < 2) return [title, ""];
  return [words.slice(0, -1).join(" "), words[words.length - 1]];
}

export function Hero({ title, subtitle }: { title: string; subtitle: string }) {
  const [lead, accent] = splitTitle(title);
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-5 pt-10 pb-14 md:min-h-[760px] md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:px-10 md:pt-8 md:pb-20 [&>*]:min-w-0">
        <div className="stagger">
          <p className="eyebrow">Nifty Nails</p>
          <h1 className="mt-6 font-display text-[56px] leading-[0.92] font-normal text-balance uppercase md:text-[112px]">
            {lead} <em className="shimmer font-normal italic normal-case">{accent}</em>
          </h1>
          <p className="mt-7 max-w-md text-[16.5px] leading-[1.75] text-pretty text-ink-2 md:text-lg">{subtitle}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/shop" size="lg" icon={<ArrowRight className="order-last size-4" />}>Discover the collection</ButtonLink>
            <ButtonLink href="/create" size="lg" variant="secondary">Design your own</ButtonLink>
          </div>
        </div>

        <div className="animate-fade-up flex items-center justify-center [animation-delay:200ms] md:h-[640px]">
          <Emblem className="w-[282px] md:w-[581px]" />
        </div>
      </div>
    </section>
  );
}
