"use client";

import { Check, Gift, PenLine, ShoppingBag, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { NailSetArt } from "@/components/nails/NailSetArt";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/bits";
import { Chip } from "@/components/ui/Chip";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/catalog";
import { backdropFor } from "@/lib/colour";
import { cn, money } from "@/lib/format";
import type { GiftOption, SizeSelection } from "@/lib/types";

const WHO = ["Best friend", "Sister", "Mom", "Partner", "Colleague", "Bride-to-be", "Myself"];
const AGES = ["Under 18", "18–24", "25–34", "35–44", "45+"];
const OCCASIONS = ["Birthday", "Wedding", "Anniversary", "Festive", "Graduation", "Just because", "Thank you"];
const STYLES = ["Cute", "Minimal", "Glam", "Bold", "Classic", "Coquette"];
const INTERESTS = ["Barbie", "Makeup", "Self-care", "Fashion", "Pearls & bows", "Florals", "Travel", "Coffee", "Parties"];
const LENGTHS = ["Short", "Medium", "Long"];
const ITEM_LABEL: Record<string, string> = { nail_set: "Nail set", box: "Gift box", card: "Card", care: "Nail care", accessory: "Accessory", packaging: "Wrapping" };

function Question({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-5 first:pt-0 last:border-0 last:pb-0">
      <p className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-blush-100 text-[11px] font-bold text-pink-deep">{n}</span>
        {title}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function useMulti(initial: string[] = []) {
  const [v, setV] = useState(initial);
  return [v, (x: string) => setV((cur) => (cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x]))] as const;
}

export function GiftClient() {
  const catalog = useCatalog();
  const { add } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const [who, setWho] = useState("Best friend");
  const [age, setAge] = useState("18–24");
  const [occasion, setOccasion] = useState("Birthday");
  const [colours, toggleColour] = useMulti();
  const [styles, toggleStyle] = useMulti(["Cute"]);
  const [interests, toggleInterest] = useMulti();
  const [length, setLength] = useState("Medium");
  const [budget, setBudget] = useState(1500);
  const [about, setAbout] = useState("");
  const [options, setOptions] = useState<GiftOption[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardText, setCardText] = useState<Record<number, string>>({});
  const results = useRef<HTMLDivElement>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ request_id: number; options: GiftOption[]; message: string | null }>("/ai/gift", {
        method: "POST",
        body: {
          description: about, recipient: who, relationship: who, age_range: age, occasion,
          favourite_colours: colours, style: styles.join(" "), interests, nail_preferences: length, budget_rupees: budget,
        },
      });
      setOptions(res.options);
      setMessage(res.message);
      setRequestId(res.request_id);
      setTimeout(() => results.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const addOption = (o: GiftOption, index: number) => {
    const size: SizeSelection = { label: "M" };
    if (o.bundle_id) {
      add({ kind: "gift_bundle", gift_bundle_id: o.bundle_id, quantity: 1, size, name: o.title.replace("Curated: ", ""),
        art: o.product?.art, price_paise: o.total_paise, ai_request_id: requestId });
    } else {
      for (const line of o.lines) {
        if (line.kind === "product" && o.product) {
          add({ kind: "product", product_id: line.id, quantity: 1, size, name: line.name, art: o.product.art,
            price_paise: line.price_paise, slug: o.product.slug, ai_request_id: requestId });
        } else if (line.kind === "gift_item") {
          add({ kind: "gift_item", gift_item_id: line.id, quantity: 1, name: line.name, price_paise: line.price_paise,
            gift_message: line.personalisable ? cardText[index] || null : null });
        }
      }
    }
    toast("Gift added to your bag — you can change the nail size there", { action: { label: "View bag", onClick: () => router.push("/bag") } });
  };

  return (
    <main className="mx-auto max-w-6xl px-5 pt-6 md:px-6 md:pt-12">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-pink uppercase"><Gift className="size-4" /> Gift Nifty</p>
        <h1 className="mt-2 font-display text-[38px] leading-[1.02] tracking-[-0.025em] md:text-[56px]">
          Tell us about them. <em className="text-pink italic">We&apos;ll wrap it up.</em>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">A few taps and we&apos;ll build a gift from things we actually make — always within your budget.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <Card>
          <Question n={1} title="Who's it for?">{WHO.map((w) => <Chip key={w} selected={who === w} onClick={() => setWho(w)}>{w}</Chip>)}</Question>
          <Question n={2} title="Age range">{AGES.map((a) => <Chip key={a} selected={age === a} onClick={() => setAge(a)}>{a}</Chip>)}</Question>
          <Question n={3} title="Occasion">{OCCASIONS.map((o) => <Chip key={o} selected={occasion === o} onClick={() => setOccasion(o)}>{o}</Chip>)}</Question>
          <Question n={4} title="Favourite colours">
            {(catalog?.colours ?? []).slice(0, 18).map((c) => (
              <Chip key={c.slug} swatch={c.hex} selected={colours.includes(c.name)} onClick={() => toggleColour(c.name)}>{c.name}</Chip>
            ))}
          </Question>
          <Question n={5} title="Their style">{STYLES.map((s) => <Chip key={s} selected={styles.includes(s)} onClick={() => toggleStyle(s)}>{s}</Chip>)}</Question>
          <Question n={6} title="They love…">{INTERESTS.map((s) => <Chip key={s} selected={interests.includes(s)} onClick={() => toggleInterest(s)}>{s}</Chip>)}</Question>
          <Question n={7} title="Nail length they wear">{LENGTHS.map((s) => <Chip key={s} selected={length === s} onClick={() => setLength(s)}>{s}</Chip>)}</Question>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-24">
          <Card>
            <div className="flex items-baseline justify-between">
              <p className="text-[14px] font-semibold">Budget</p>
              <p className="font-display text-3xl tabular-nums">{money(budget * 100)}</p>
            </div>
            <input type="range" min={500} max={5000} step={100} value={budget} onChange={(e) => setBudget(Number(e.target.value))}
              aria-label="Budget in rupees" className="mt-3 w-full accent-[#7a2e3a]" />
            <div className="flex justify-between text-[11.5px] text-ink-3"><span>₹500</span><span>₹5,000</span></div>
            <Textarea className="mt-5" label="Anything else? (optional)" rows={3} maxLength={800} value={about} onChange={(e) => setAbout(e.target.value)}
              placeholder="e.g. My best friend is 22, loves pink, Barbie, makeup and cute things." />
            <Button full size="lg" className="mt-5" loading={busy} onClick={submit} icon={<Sparkles className="size-4" />}>Find the perfect gift</Button>
            {error && <p className="mt-3 text-sm font-medium text-danger" role="alert">{error}</p>}
          </Card>
        </div>
      </div>

      <div ref={results} className="scroll-mt-24">
        {options && (
          <section className="mt-12 animate-fade-up">
            <h2 className="font-display text-3xl md:text-4xl">{options.length ? <>Gift ideas <em className="text-pink italic">for {who.toLowerCase()}</em></> : "Hmm…"}</h2>
            {message && <p className="mt-2 text-sm text-ink-2">{message}</p>}
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {options.map((o, i) => (
                <article key={i} className={cn("flex flex-col overflow-hidden rounded-[0.75rem] bg-surface shadow-soft ring-1 ring-line", i === 0 && "ring-2 ring-pink")}>
                  {o.product && (
                    <div className="relative flex aspect-[16/10] items-center justify-center p-[6%]" style={{ background: backdropFor(o.product.art.base) }}>
                      <NailSetArt art={o.product.art} className="w-full" />
                      <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold backdrop-blur">{o.title}</span>
                      {o.match_percent !== null && <span className="absolute top-3 right-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white">{o.match_percent}% match</span>}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <ul className="space-y-2 text-[13.5px]">
                      {o.lines.map((l) => (
                        <li key={`${l.kind}-${l.id}`} className="flex items-baseline gap-2">
                          <span className="w-20 shrink-0 text-[10.5px] font-bold tracking-wide text-ink-3 uppercase">{ITEM_LABEL[l.item_type] ?? l.item_type}</span>
                          <span className="flex-1">{l.name}</span>
                          <span className="tabular-nums text-ink-2">{money(l.price_paise)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-line-strong pt-3">
                      <span className="font-semibold">Total</span>
                      <span className="font-display text-2xl tabular-nums">{money(o.total_paise)}</span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-success">
                      <Check className="size-4" /> Within budget{o.budget_left_paise > 0 ? ` · ${money(o.budget_left_paise)} to spare` : ""}
                      {o.bundle_saving_paise > 0 && ` · saves ${money(o.bundle_saving_paise)}`}
                    </p>
                    {o.reasons.length > 0 && <p className="mt-2 text-[12.5px] text-ink-2">Why: {o.reasons.join(" · ")}</p>}
                    {o.lines.some((l) => l.personalisable) && (
                      <label className="mt-4 block">
                        <span className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold"><PenLine className="size-3.5 text-pink" /> Card message</span>
                        <textarea value={cardText[i] ?? ""} onChange={(e) => setCardText({ ...cardText, [i]: e.target.value })} maxLength={300} rows={2}
                          placeholder="Happy birthday, gorgeous! 💗" className="w-full rounded-2xl bg-blush-50 px-3.5 py-2.5 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-pink" />
                      </label>
                    )}
                    <Button className="mt-5" full variant={i === 0 ? "primary" : "secondary"} onClick={() => addOption(o, i)} icon={<ShoppingBag className="size-4" />}>
                      Add gift to bag
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
