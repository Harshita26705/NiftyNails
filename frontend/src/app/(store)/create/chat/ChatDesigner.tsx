"use client";

import { AlertCircle, ArrowUp, ChevronDown, Info, RotateCcw, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DesignActions, QuoteBreakdown } from "@/components/create/DesignActions";
import { CharmIcon } from "@/components/nails/charms";
import { DesignHands } from "@/components/nails/DesignHands";
import { api, ApiError } from "@/lib/api";
import { useCatalog } from "@/lib/catalog";
import { cn, money } from "@/lib/format";
import type { ChatState, ChatTurn, DesignConfig, DesignQuote } from "@/lib/types";

type Msg = { role: "assistant" | "user"; text: string; notices?: ChatTurn["notices"] };

const STORE_KEY = "nifty.chat.v1";
const GREETING: Msg = {
  role: "assistant",
  text: "Hi! I'm your Nifty designer ✨\nDescribe the nails you're dreaming of — colours, shape, finish, charms. I'll only use things we can actually make.",
};
const STARTERS = [
  "Pink chrome nails with tiny white bows, pearls and 3D strawberries",
  "Milky white almond nails with gold stars",
  "Lavender jelly with butterflies",
  "Short red nails with a little heart",
];

type Saved = { messages: Msg[]; state: ChatState; design: DesignConfig | null; quote: DesignQuote | null; replies: string[] };

function restore(prompt: string | null): Saved & { pendingPrompt: string | null } {
  if (prompt) {
    return { messages: [GREETING, { role: "user", text: prompt }], state: {}, design: null, quote: null, replies: [], pendingPrompt: prompt };
  }
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) return { ...(JSON.parse(raw) as Saved), pendingPrompt: null };
  } catch { /* ignore */ }
  return { messages: [GREETING], state: {}, design: null, quote: null, replies: STARTERS, pendingPrompt: null };
}

/** Rendered client-only (see page.tsx), so initial state can come straight from sessionStorage. */
export function ChatDesigner() {
  const params = useSearchParams();
  const catalog = useCatalog();
  const [initial] = useState(() => restore(params.get("prompt")));
  const [messages, setMessages] = useState<Msg[]>(initial.messages);
  const [state, setState] = useState<ChatState>(initial.state);
  const [design, setDesign] = useState<DesignConfig | null>(initial.design);
  const [quote, setQuote] = useState<DesignQuote | null>(initial.quote);
  const [replies, setReplies] = useState<string[]>(initial.replies);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(!!initial.pendingPrompt);
  const [previewOpen, setPreviewOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  /** Asks the designer for its next turn; state changes only once the reply arrives. */
  const request = useCallback((text: string, currentState: ChatState, history: Msg[]) =>
    api<ChatTurn>("/ai/design-chat", { method: "POST", body: { message: text, state: currentState } })
      .then((turn) => {
        const withReply = [...history, { role: "assistant" as const, text: turn.reply, notices: turn.notices }];
        setMessages(withReply);
        setState(turn.state);
        setDesign(turn.design);
        setQuote(turn.quote);
        setReplies(turn.quick_replies);
        try {
          sessionStorage.setItem(STORE_KEY, JSON.stringify({ messages: withReply, state: turn.state, design: turn.design, quote: turn.quote, replies: turn.quick_replies }));
        } catch { /* ignore */ }
      })
      .catch((e) => setMessages([...history, { role: "assistant", text: e instanceof ApiError ? e.message : "Sorry - I lost my train of thought. Try again?" }]))
      .finally(() => setBusy(false)), []);

  const send = (text: string, currentState: ChatState, history: Msg[]) => {
    const t = text.trim();
    if (!t) return;
    const nextHistory = [...history, { role: "user" as const, text: t }];
    setMessages(nextHistory);
    setInput("");
    setBusy(true);
    void request(t, currentState, nextHistory);
  };

  // A ?prompt= deep link (e.g. from the stylist) starts the conversation automatically.
  useEffect(() => {
    if (initial.pendingPrompt) void request(initial.pendingPrompt, {}, initial.messages);
  }, [initial, request]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const reset = () => {
    try { sessionStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    setMessages([GREETING]); setState({}); setDesign(null); setQuote(null); setReplies(STARTERS);
  };

  const brief = messages.filter((m) => m.role === "user").map((m) => m.text).join(" / ");
  const charms = quote?.bill_of_materials.filter((b) => b.element_type === "charm") ?? [];

  return (
    <div className="mx-auto flex h-[calc(100dvh-60px)] max-w-7xl flex-col md:h-[calc(100dvh-72px)] md:flex-row md:gap-8 md:px-6 md:py-6">
      {/* Conversation */}
      <section className="flex min-h-0 flex-1 flex-col md:rounded-[2rem] md:bg-surface md:shadow-soft md:ring-1 md:ring-line">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-pink text-white"><Sparkles className="size-5" /></span>
            <div>
              <p className="text-[15px] leading-tight font-semibold">Nifty Designer</p>
              <p className="text-[12px] text-ink-2">Only uses what we can make</p>
            </div>
          </div>
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-2 hover:bg-blush-50">
            <RotateCcw className="size-4" /> Start over
          </button>
        </div>

        {/* Mobile live preview */}
        {design && (
          <div className="border-b border-line bg-blush-50 md:hidden">
            <button onClick={() => setPreviewOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-2 text-[13px] font-semibold">
              <span>Live preview {quote && <span className="ml-1 text-pink">{money(quote.price_paise)}</span>}</span>
              <ChevronDown className={cn("size-4 transition", previewOpen && "rotate-180")} />
            </button>
            {previewOpen && <div className="px-3 pb-3"><DesignHands config={design} className="max-h-36" /></div>}
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex animate-fade-up", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className="max-w-[86%] space-y-2 md:max-w-[75%]">
                <div className={cn(
                  "px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-line",
                  m.role === "user" ? "rounded-3xl rounded-br-lg bg-ink text-white" : "rounded-3xl rounded-bl-lg bg-blush-100 text-ink",
                )}>
                  {m.text}
                </div>
                {m.notices?.map((n, j) => (
                  <div key={j} className={cn("flex gap-2 rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug",
                    n.kind === "unavailable" ? "bg-[#fff6e8] text-[#7a4a00] ring-1 ring-[#f3dcb5]" : "bg-surface text-ink-2 ring-1 ring-line")}>
                    {n.kind === "unavailable" ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
                    {n.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex">
              <div className="flex gap-1 rounded-3xl rounded-bl-lg bg-blush-100 px-4 py-4" aria-label="Designer is typing">
                {[0, 1, 2].map((d) => <span key={d} className="size-2 animate-bounce rounded-full bg-pink/60" style={{ animationDelay: `${d * 120}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="safe-bottom border-t border-line bg-paper/90 px-3 pt-3 pb-3 backdrop-blur md:rounded-b-[2rem] md:bg-transparent md:px-5">
          {replies.length > 0 && !busy && (
            <div className="scrollbar-none -mx-3 mb-2.5 flex gap-2 overflow-x-auto px-3 md:mx-0 md:flex-wrap md:px-0">
              {replies.map((r) => (
                <button key={r} onClick={() => send(r, state, messages)}
                  className="shrink-0 rounded-full bg-surface px-3.5 py-2 text-[13px] font-medium text-ink ring-1 ring-line-strong transition hover:bg-blush-50 active:scale-[0.97]">
                  {r}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(input, state, messages); }}
            className="flex items-center gap-2 rounded-full bg-surface p-1.5 pl-5 ring-1 ring-line focus-within:ring-2 focus-within:ring-pink">
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={600} disabled={busy}
              placeholder="Describe your nails…" aria-label="Message the designer"
              className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3" />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink text-white transition disabled:bg-blush-300">
              <ArrowUp className="size-5" />
            </button>
          </form>
          {design && (
            <div className="mt-3 md:hidden">
              <DesignActions config={design} quote={quote} source="chat" brief={brief} />
            </div>
          )}
        </div>
      </section>

      {/* Desktop design panel */}
      <aside className="hidden w-[400px] shrink-0 flex-col gap-4 overflow-y-auto md:flex">
        <div className="rounded-[2rem] bg-surface p-5 shadow-soft ring-1 ring-line">
          <p className="text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">Live preview</p>
          <div className="mt-3 flex min-h-40 items-center justify-center rounded-3xl bg-blush-50 p-3">
            {design ? <DesignHands config={design} /> : <p className="px-6 text-center text-sm text-ink-3">Your design appears here as you chat.</p>}
          </div>
        </div>
        {quote && (
          <div className="rounded-[2rem] bg-surface p-5 shadow-soft ring-1 ring-line">
            <p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">Price</p>
            <QuoteBreakdown quote={quote} />
            {charms.length > 0 && (
              <>
                <p className="mt-5 mb-2 text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">Charms used</p>
                <ul className="space-y-1.5">
                  {charms.map((c) => {
                    const asset = catalog?.charms.find((x) => x.slug === c.slug)?.asset_key ?? c.slug;
                    return (
                      <li key={c.slug} className="flex items-center gap-2 text-[13px]">
                        <CharmIcon kind={asset} size={24} /> {c.name}
                        <span className="ml-auto text-ink-2 tabular-nums">× {c.quantity}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {!quote.manufacturable && <p className="mt-3 text-[13px] font-medium text-danger">{quote.warnings.join(" ")}</p>}
            <div className="mt-5"><DesignActions config={design} quote={quote} source="chat" brief={brief} /></div>
          </div>
        )}
      </aside>
    </div>
  );
}
