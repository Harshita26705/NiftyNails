"use client";

import { ArrowUp, Camera, Palette, Sparkles, Type, Wand2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MatchGrid, UnavailableNotices } from "@/components/ai/MatchResults";
import { PhotoSourcePicker } from "@/components/ai/PhotoSourcePicker";
import { ProductCardSkeleton } from "@/components/store/ProductCard";
import { EXAMPLE_PROMPTS } from "@/components/store/StylistPrompt";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/bits";
import { Textarea } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/format";
import { downscaleImage } from "@/lib/image";
import type { ColorAnalysisResult, SearchResult, StylistResult } from "@/lib/types";

function Chips({ chips }: { chips: string[] }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span key={c} className="rounded-full bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-pink-deep ring-1 ring-blush-200">{c}</span>
      ))}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

function DescribeTab() {
  const params = useSearchParams();
  const router = useRouter();
  const [initialQuery] = useState(() => (params.get("q") ?? "").trim());
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(initialQuery.length >= 2);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  /** Performs the search; only touches state once the response arrives. */
  const fetchMatches = useCallback((t: string) => api<SearchResult>("/ai/search", { method: "POST", body: { query: t, limit: 12 } })
    .then((r) => {
      setResult(r);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    })
    .catch((e) => setError(e instanceof ApiError ? e.message : "Something went wrong."))
    .finally(() => setLoading(false)), []);

  const run = (text: string) => {
    const t = text.trim();
    if (t.length < 2) return;
    setLoading(true);
    setError(null);
    router.replace(`/stylist?q=${encodeURIComponent(t)}`, { scroll: false });
    void fetchMatches(t);
  };

  // Deep link (/stylist?q=...): search once on arrival.
  useEffect(() => {
    if (initialQuery.length >= 2) void fetchMatches(initialQuery);
  }, [initialQuery, fetchMatches]);

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); run(query); }}
        className="rounded-[0.75rem] bg-surface p-3 shadow-soft ring-1 ring-line focus-within:ring-2 focus-within:ring-pink">
        <Textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={3} maxLength={600}
          placeholder="e.g. baby pink almond nails with chrome, little bows and pearls — cute but not too flashy"
          aria-label="Describe your dream nails"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(query); } }}
          className="[&_textarea]:min-h-20 [&_textarea]:resize-none [&_textarea]:bg-transparent [&_textarea]:ring-0 [&_textarea]:focus:ring-0" />
        <div className="flex items-center justify-between gap-3 px-2 pt-1">
          <p className="text-[12px] text-ink-3">Colours, shape, finish, charms, occasion, budget…</p>
          <Button type="submit" loading={loading} disabled={query.trim().length < 2} icon={<ArrowUp className="size-4" />}>Find matches</Button>
        </div>
      </form>
      {!result && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((p) => (
            <button key={p} onClick={() => { setQuery(p); run(p); }}
              className="rounded-full bg-blush-100 px-3.5 py-2 text-left text-[12.5px] font-medium text-pink-deep hover:bg-blush-200">{p}</button>
          ))}
        </div>
      )}
      {error && <p className="mt-4 text-sm font-medium text-danger" role="alert">{error}</p>}

      <div ref={resultsRef} className="scroll-mt-24">
        {loading && <div className="mt-10"><LoadingGrid /></div>}
        {result && !loading && (
          <div className="mt-10 space-y-6 animate-fade-up">
            <div className="space-y-3">
              <p className="text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">We understood</p>
              <Chips chips={result.attributes.chips} />
              <UnavailableNotices items={result.unavailable} />
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl">{result.message}</h2>
              <p className="mt-1 text-sm text-ink-2">Only real designs from our catalogue — ranked by how closely they match.</p>
            </div>
            <MatchGrid matches={result.matches} customPrompt={query} requestId={result.request_id} />
          </div>
        )}
      </div>
    </div>
  );
}

function OutfitTab() {
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<StylistResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    setResult(null);
    try {
      const img = await downscaleImage(file, 1200);
      setPreview(img.url);
      setBlob(img.blob);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const analyse = async () => {
    if (!blob) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.append("image", blob, "outfit.jpg");
    form.append("note", note);
    try {
      setResult(await api<StylistResult>("/ai/stylist", { method: "POST", body: form }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-start">
        <PhotoSourcePicker preview={preview} onFile={onFile} title="Upload your outfit or inspiration"
          hint="A dress, saree, lehenga, makeup look or colour palette. Good light, outfit filling most of the frame."
          liveHint="Frame your outfit, good even light" />
        <div className="space-y-4">
          <div className="rounded-[0.625rem] bg-surface p-5 ring-1 ring-line">
            <p className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-4 text-pink" /> What we look at</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-[13px] text-ink-2">
              {["Dominant colours", "Secondary colours", "Metallic accents", "Prints & embellishment", "Overall style", "Likely occasion"].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-pink" />{t}</li>
              ))}
            </ul>
          </div>
          <Textarea label="Anything we should know? (optional)" value={note} onChange={(e) => setNote(e.target.value)}
            maxLength={300} rows={2} placeholder="e.g. for my sister's sangeet, I prefer short nails" />
          <Button full size="lg" onClick={analyse} loading={loading} disabled={!blob} icon={<Sparkles className="size-4" />}>
            {loading ? "Analysing colours…" : "Match my nails"}
          </Button>
          {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
          <p className="text-[12px] leading-relaxed text-ink-3">Your photo is analysed on our server to extract colours and is never stored.</p>
        </div>
      </div>

      {loading && <div className="mt-10"><LoadingGrid /></div>}
      {result && !loading && (
        <div className="mt-10 space-y-6 animate-fade-up">
          <div className="rounded-[0.625rem] bg-surface p-5 ring-1 ring-line md:p-6">
            <p className="font-display text-2xl leading-snug md:text-3xl">{result.summary}</p>
            <div className="mt-5 flex h-14 overflow-hidden rounded-2xl ring-1 ring-line">
              {result.palette.map((c) => (
                <div key={c.hex} style={{ background: c.hex, flex: Math.max(c.weight, 0.06) }} title={`${c.name} ${Math.round(c.weight * 100)}%`} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12.5px] text-ink-2">
              {result.palette.map((c) => (
                <span key={c.hex} className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded-full ring-1 ring-ink/10" style={{ background: c.hex }} />
                  <span className="capitalize">{c.name}</span>
                  {c.closest_catalogue_colour && <span className="text-ink-3">→ {c.closest_catalogue_colour.name}</span>}
                </span>
              ))}
            </div>
            <div className="mt-4"><Chips chips={result.attributes.chips} /></div>
          </div>
          <h2 className="font-display text-2xl md:text-3xl">Designs that go with it</h2>
          <MatchGrid matches={result.matches} customPrompt={`${result.summary} ${note}`.trim()} requestId={result.request_id} />
        </div>
      )}
    </div>
  );
}

function ToneTab() {
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<ColorAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    setResult(null);
    try {
      const img = await downscaleImage(file, 1200);
      setPreview(img.url);
      setBlob(img.blob);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const analyse = async () => {
    if (!blob) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.append("image", blob, "selfie.jpg");
    try {
      setResult(await api<ColorAnalysisResult>("/ai/color-analysis", { method: "POST", body: form }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-start">
        <PhotoSourcePicker preview={preview} onFile={onFile} title="Upload a selfie"
          hint="Your face or hand, good even light, no heavy filters — the closer to natural light, the better the read."
          liveHint="Face the camera in good, even light" />
        <div className="space-y-4">
          <div className="rounded-[0.625rem] bg-surface p-5 ring-1 ring-line">
            <p className="flex items-center gap-2 text-sm font-semibold"><Wand2 className="size-4 text-pink" /> What we look at</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-[13px] text-ink-2">
              {["Skin undertone", "Skin depth", "Flattering colour family", "Matching designs"].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-pink" />{t}</li>
              ))}
            </ul>
          </div>
          <Button full size="lg" onClick={analyse} loading={loading} disabled={!blob} icon={<Sparkles className="size-4" />}>
            {loading ? "Reading your tone…" : "Find my colours"}
          </Button>
          {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
          <p className="text-[12px] leading-relaxed text-ink-3">Your photo is analysed on our server to extract skin tone and is never stored.</p>
        </div>
      </div>

      {loading && <div className="mt-10"><LoadingGrid /></div>}
      {result && !loading && (
        <div className="mt-10 space-y-6 animate-fade-up">
          <div className="rounded-[0.625rem] bg-surface p-5 ring-1 ring-line md:p-6">
            <div className="flex items-center gap-3">
              <span className="size-10 shrink-0 rounded-full ring-1 ring-line" style={{ background: result.tone.hex }} />
              <p className="font-display text-2xl leading-snug md:text-3xl">{result.summary}</p>
            </div>
            <p className="mt-4 text-[11px] font-bold tracking-[0.14em] text-ink-3 uppercase">Colours we'd recommend</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {result.recommended_colours.map((c) => (
                <div key={c.slug} className="flex items-center gap-2 rounded-full bg-paper py-1.5 pr-3.5 pl-1.5 ring-1 ring-line" title={c.reason}>
                  <span className="size-6 rounded-full ring-1 ring-ink/10" style={{ background: c.hex }} />
                  <span className="text-[12.5px] font-semibold">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
          <h2 className="font-display text-2xl md:text-3xl">Designs in your colours</h2>
          <MatchGrid matches={result.matches} customPrompt={result.recommended_colours.map((c) => c.name).join(" ")} requestId={result.request_id} />
        </div>
      )}
    </div>
  );
}

export function StylistClient() {
  const params = useSearchParams();
  const [tab, setTab] = useState<"describe" | "outfit" | "tone">(
    params.get("tab") === "outfit" ? "outfit" : params.get("tab") === "tone" ? "tone" : "describe",
  );
  return (
    <main className="mx-auto max-w-6xl px-5 pt-6 md:px-6 md:pt-12">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 eyebrow">
          <Sparkles className="size-4" /> The Nifty Stylist
        </p>
        <h1 className="mt-2 font-display text-[38px] leading-[1.02] tracking-[-0.025em] md:text-[56px]">
          A personal nail consultation, <em className="font-normal text-pink italic normal-case">curated for you.</em>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Describe the vibe, show us your outfit, or find the colours that suit you and we&apos;ll recommend designs,
          colour combinations and finishing touches — always from what we actually make. An optional second opinion;
          the Design Studio is yours either way.
        </p>
      </div>
      <Segmented className={cn("mt-7")} value={tab} onChange={setTab} options={[
        { value: "describe", label: <><Type className="size-4" /> Describe it</> },
        { value: "outfit", label: <><Camera className="size-4" /> Outfit photo</> },
        { value: "tone", label: <><Wand2 className="size-4" /> Colour analysis</> },
      ]} />
      <div className="mt-6">{tab === "describe" ? <DescribeTab /> : tab === "outfit" ? <OutfitTab /> : <ToneTab />}</div>
    </main>
  );
}
