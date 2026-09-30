"use client";

import { AlertTriangle, Check, CheckCircle2, Coins, CreditCard, Hand, Lightbulb, Ruler, ScanLine, ShieldCheck, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PhotoDrop } from "@/components/ai/PhotoDrop";
import { FingerSizeInputs } from "@/components/store/SizePicker";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, ConfidenceMeter } from "@/components/ui/bits";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCatalog } from "@/lib/catalog";
import { cn } from "@/lib/format";
import { detectHand, type DetectedHand, preloadHandDetector } from "@/lib/handDetect";
import { downscaleImage } from "@/lib/image";
import { loadSizes, saveSizes } from "@/lib/sizes";
import { FINGERS, type Finger, type SizingResult } from "@/lib/types";

const REFERENCES = [
  { key: "coin_10", label: "₹10 coin", sub: "27 mm", icon: Coins },
  { key: "coin_5", label: "₹5 coin", sub: "25 mm (2019)", icon: Coins },
  { key: "coin_2", label: "₹2 coin", sub: "23 mm (2019)", icon: Coins },
  { key: "coin_1", label: "₹1 coin", sub: "20 mm (2019)", icon: Coins },
  { key: "card", label: "Bank / ID card", sub: "85.6 × 54 mm", icon: CreditCard },
];

type HandState = "idle" | "checking" | "found" | "missing";

export function SizeClient() {
  const catalog = useCatalog();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reference, setReference] = useState("coin_10");
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [hand, setHand] = useState<DetectedHand | null>(null);
  const [handState, setHandState] = useState<HandState>("idle");
  const [result, setResult] = useState<SizingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState<Record<Finger, number>>(() => loadSizes()?.fingers ?? { thumb: 2, index: 5, middle: 4, ring: 5, pinky: 8 });
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    preloadHandDetector();
  }, []);

  const onFile = async (file: File) => {
    setError(null);
    setResult(null);
    setHand(null);
    try {
      const img = await downscaleImage(file, 1600, 0.92);
      setPreview(img.url);
      setBlob(img.blob);
      setHandState("checking");
      const el = new Image();
      el.src = img.url;
      await el.decode();
      const found = await detectHand(el).catch(() => null);
      setHand(found);
      setHandState(found ? "found" : "missing");
    } catch (e) {
      setError((e as Error).message);
      setHandState("idle");
    }
  };

  const measure = async () => {
    if (!blob) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("image", blob, "hand.jpg");
    form.append("reference", reference);
    if (hand) form.append("landmarks", JSON.stringify(hand));
    try {
      const r = await api<SizingResult>("/ai/sizing", { method: "POST", body: form });
      setResult(r);
      if (r.ok) {
        const sizes = Object.fromEntries(r.fingers.map((f) => [f.finger, f.size ?? manual[f.finger]])) as Record<Finger, number>;
        setManual(sizes);
      }
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (source: "photo" | "manual") => {
    saveSizes(manual, source);
    if (user) {
      try {
        await api("/me/measurements", {
          method: "POST",
          body: {
            label: source === "photo" ? "Photo sizing" : "My sizes", method: source,
            confidence: source === "photo" ? result?.overall_confidence : null,
            fingers: Object.fromEntries(FINGERS.map((f) => [f, {
              size: manual[f], width_mm: result?.fingers.find((x) => x.finger === f)?.nail_width_mm ?? null,
            }])),
          },
        });
      } catch { /* local copy still saved */ }
    }
    toast(user ? "Sizes saved to your account" : "Sizes saved on this device — we'll pre-fill them for custom fits");
  };

  const banner = result && {
    confident: { tone: "bg-mint text-success", icon: CheckCircle2, title: "Looking good!", body: "We're confident in these sizes. Custom-fit orders will use them automatically." },
    verify: { tone: "bg-[#fff6e8] text-[#7a4a00]", icon: AlertTriangle, title: "Fairly confident", body: "Double-check with a tape measure (see the guide below) — or adjust a finger if it feels off." },
    manual: { tone: "bg-danger/5 text-danger", icon: AlertTriangle, title: "We're not confident in this photo", body: "Please measure by hand using the guide below, or retake the photo following the tips." },
  }[result.recommendation];

  return (
    <main className="mx-auto max-w-6xl px-5 pt-6 md:px-6 md:pt-12">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-pink uppercase"><Ruler className="size-4" /> Find my nail size</p>
        <h1 className="mt-2 font-display text-[38px] leading-[1.02] tracking-[-0.025em] md:text-[56px]">
          Your perfect fit, <em className="text-pink italic">from one photo.</em>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          We measure your nails against a coin or card using computer vision and map them to our sizes 0–9. It&apos;s an
          estimate — if the photo isn&apos;t clear enough, we&apos;ll say so rather than guess.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.1fr] md:gap-10">
        <div className="space-y-5">
          <Card>
            <p className="text-sm font-semibold">1 · What are you measuring against?</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REFERENCES.map((r) => (
                <button key={r.key} type="button" onClick={() => setReference(r.key)} aria-pressed={reference === r.key}
                  className={cn("flex items-center gap-2.5 rounded-2xl px-3 py-3 text-left ring-1 ring-inset transition",
                    reference === r.key ? "bg-ink text-white ring-ink" : "bg-surface ring-line hover:ring-line-strong")}>
                  <r.icon className={cn("size-5 shrink-0", reference === r.key ? "text-blush-300" : "text-pink")} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold">{r.label}</span>
                    <span className={cn("block text-[11px]", reference === r.key ? "text-white/70" : "text-ink-3")}>{r.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-sm font-semibold">2 · Photo tips</p>
            <ul className="mt-3 space-y-2.5 text-[13.5px] text-ink-2">
              {[
                [Hand, "Hand flat on a table, nails facing up, fingers slightly apart."],
                [Coins, "Coin or card flat on the table beside your hand — not touching it."],
                [ScanLine, "Camera straight above, about 25–30 cm away. Whole hand + coin in frame."],
                [Sun, "Bright, even light. A plain, contrasting surface (white paper is ideal)."],
              ].map(([Icon, t], i) => {
                const I = Icon as typeof Hand;
                return <li key={i} className="flex gap-3"><I className="mt-0.5 size-4 shrink-0 text-pink" />{t as string}</li>;
              })}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <PhotoDrop preview={preview} onFile={onFile} capture title="Take or upload your hand photo"
            hint="One hand at a time. We'll use it to estimate all five fingers (sizes are usually the same on both hands).">
            {handState !== "idle" && (
              <span className={cn("absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow backdrop-blur",
                handState === "found" ? "bg-mint/95 text-success" : handState === "checking" ? "bg-white/90 text-ink-2" : "bg-[#fff6e8]/95 text-[#7a4a00]")}>
                {handState === "found" ? <><Check className="size-4" /> Hand found</> : handState === "checking" ? "Checking photo…" : <><AlertTriangle className="size-4" /> Hand not clear — try the tips</>}
              </span>
            )}
          </PhotoDrop>
          <Button full size="lg" onClick={measure} loading={busy} disabled={!blob || handState === "checking"} icon={<ScanLine className="size-4" />}>
            {busy ? "Measuring…" : "Measure my nails"}
          </Button>
          {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            Hand detection runs in your browser. The photo is measured on our server in memory and never stored. This is a sizing
            estimate, not biometric identification.
          </p>
        </div>
      </div>

      {result && banner && (
        <section ref={resultRef} className="mt-12 scroll-mt-24 animate-fade-up">
          <div className={cn("flex gap-3 rounded-[0.625rem] px-5 py-4", banner.tone)}>
            <banner.icon className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">{banner.title}</p>
              <p className="mt-0.5 text-[13.5px] opacity-90">{banner.body}</p>
              {result.warnings.filter((w) => !w.startsWith("We're")).map((w) => <p key={w} className="mt-1 text-[13px] opacity-80">· {w}</p>)}
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_1fr]">
            <Card>
              <div className="flex items-center justify-between">
                <p className="font-semibold">Your Nifty sizes</p>
                {result.closest_kit && <span className="rounded-full bg-blush-100 px-3 py-1 text-[12px] font-bold text-pink-deep">Closest kit: {result.closest_kit}</span>}
              </div>
              {result.ok ? (
                <div className="mt-5 grid grid-cols-5 gap-2">
                  {result.fingers.map((f) => (
                    <div key={f.finger} className="flex flex-col items-center rounded-2xl bg-blush-50 px-1 py-3">
                      <span className="font-display text-[34px] leading-none">{f.size ?? "–"}</span>
                      <span className="mt-1.5 text-[11px] font-semibold capitalize">{f.finger}</span>
                      <span className="text-[10.5px] text-ink-3 tabular-nums">{f.nail_width_mm ? `${f.nail_width_mm} mm` : "—"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink-2">We couldn&apos;t measure this photo reliably. Try again following the tips, or measure by hand below.</p>
              )}
              <div className="mt-5">
                <p className="mb-1.5 text-[12px] font-semibold text-ink-2">Overall confidence</p>
                <ConfidenceMeter value={result.overall_confidence} />
              </div>
              {result.ok && result.recommendation !== "manual" && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => save("photo")} icon={<Check className="size-4" />}>Save these sizes</Button>
                  <ButtonLink href="/shop" variant="secondary">Shop with my sizes</ButtonLink>
                </div>
              )}
              {result.recommendation === "manual" && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <ButtonLink href="#guide" icon={<Ruler className="size-4" />}>Measure by hand</ButtonLink>
                  {result.ok && <Button variant="ghost" onClick={() => save("photo")}>Use these anyway</Button>}
                </div>
              )}
            </Card>
            {result.preview_image && (
              <Card className="p-3 md:p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.preview_image} alt="Measurement overlay: detected reference and finger widths" className="max-h-[480px] w-full rounded-2xl object-contain" />
                <p className="px-2 pt-2 pb-1 text-[12px] text-ink-2">Green: reference detected · Pink: where each finger was measured.</p>
              </Card>
            )}
          </div>
        </section>
      )}

      <section id="guide" className="mt-16 scroll-mt-24">
        <div className="grid gap-6 md:grid-cols-2 md:gap-10">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-pink uppercase">Sizing guide</p>
            <h2 className="mt-2 font-display text-[30px] leading-tight md:text-[40px]">Measure by hand</h2>
            <ol className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-ink-2">
              <li><b className="text-ink">1.</b> Lay a strip of paper or tape across the widest part of each nail, sidewall to sidewall.</li>
              <li><b className="text-ink">2.</b> Mark the edges and measure the width in millimetres.</li>
              <li><b className="text-ink">3.</b> Pick the size with that width. Between two sizes? Choose the wider one — it can be filed down.</li>
            </ol>
            <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-line">
              <table className="w-full text-center text-[13px]">
                <thead className="bg-blush-50 text-[11px] font-bold tracking-wide text-ink-2 uppercase">
                  <tr><th className="py-2.5">Size</th>{(catalog?.nail_sizes ?? []).map((s) => <th key={s.size} className="py-2.5">{s.size}</th>)}</tr>
                </thead>
                <tbody className="bg-surface">
                  <tr><td className="py-2.5 font-semibold">mm</td>{(catalog?.nail_sizes ?? []).map((s) => <td key={s.size} className="py-2.5 tabular-nums text-ink-2">{s.width_mm}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
          <Card>
            <p className="flex items-center gap-2 font-semibold"><Lightbulb className="size-4 text-pink" /> Enter your sizes</p>
            <p className="mt-1 text-[13px] text-ink-2">We&apos;ll pre-fill these whenever you choose a custom fit.</p>
            <div className="mt-4"><FingerSizeInputs value={manual} onChange={setManual} /></div>
            <Button className="mt-5" variant="ink" onClick={() => save("manual")} icon={<Check className="size-4" />}>Save my sizes</Button>
          </Card>
        </div>
      </section>
    </main>
  );
}
