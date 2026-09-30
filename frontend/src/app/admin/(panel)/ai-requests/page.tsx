"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader, Pager, useApi } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { api } from "@/lib/api";
import { cn, dateTime } from "@/lib/format";
import type { Page } from "@/lib/types";

type Req = { id: number; kind: string; user_id: number | null; input: Record<string, unknown>; output: Record<string, unknown>; result_product_ids: number[]; converted: boolean; converted_order_id: number | null; needs_review: boolean; created_at: string };
const KINDS = [["", "All"], ["search", "Smart search"], ["stylist", "Outfit stylist"], ["chat", "Chat designs"], ["gift", "Gifting"], ["sizing", "Sizing"]];

function summary(r: Req): string {
  const i = r.input as Record<string, string>;
  const o = r.output as Record<string, unknown>;
  if (r.kind === "search") return `“${i.query}”`;
  if (r.kind === "stylist") return String(o.summary ?? "");
  if (r.kind === "chat") return `“${i.message}”`;
  if (r.kind === "gift") return `${i.recipient ?? "Gift"} · ${i.occasion ?? ""} · ₹${i.budget_rupees}`;
  if (r.kind === "sizing") return `Confidence ${Math.round(Number(o.confidence ?? 0) * 100)}% · sizes ${JSON.stringify(o.sizes ?? {}).replace(/[{}"]/g, "").replace(/,/g, ", ")}`;
  return "";
}

function flagged(r: Req): string[] {
  const o = r.output as { unavailable?: { message: string }[]; notices?: { text: string }[]; warnings?: string[] };
  return [...(o.unavailable?.map((u) => u.message) ?? []), ...(o.notices?.map((n) => n.text) ?? []), ...(r.kind === "sizing" ? o.warnings ?? [] : [])];
}

function Requests() {
  const params = useSearchParams();
  const [kind, setKind] = useState("");
  const [review, setReview] = useState(params.get("needs_review") === "true");
  const [page, setPage] = useState(1);
  const { data, reload } = useApi<Page<Req>>("/admin/ai-requests", { kind: kind || undefined, needs_review: review || undefined, page, page_size: 25 });
  return (
    <div>
      <PageHeader title="AI requests" subtitle="What customers ask the AI — flagged ones mention things you don't offer yet (ideas for new charms and colours)." />
      <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto">
        {KINDS.map(([v, l]) => <Chip key={v} selected={kind === v} onClick={() => { setKind(v); setPage(1); }}>{l}</Chip>)}
        <Chip selected={review} onClick={() => { setReview((x) => !x); setPage(1); }}>Flagged only</Chip>
      </div>
      <ul className="space-y-2">
        {data?.items.map((r) => (
          <li key={r.id} className={cn("rounded-2xl bg-surface p-4 ring-1 ring-line", r.needs_review && "ring-[#f3dcb5]")}>
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <span className="rounded-full bg-blush-100 px-2 py-0.5 font-bold text-pink-deep uppercase">{r.kind}</span>
              <span className="text-ink-3">{dateTime(r.created_at)} · {r.user_id ? `customer #${r.user_id}` : "guest"}</span>
              {r.converted && <span className="rounded-full bg-mint px-2 py-0.5 font-bold text-success">Converted → order #{r.converted_order_id}</span>}
              {r.result_product_ids.length > 0 && <span className="text-ink-3">{r.result_product_ids.length} designs shown</span>}
            </div>
            <p className="mt-2 text-[14px]">{summary(r)}</p>
            {flagged(r).map((f) => <p key={f} className="mt-1 text-[12.5px] text-[#7a4a00]">⚑ {f}</p>)}
            {r.needs_review && (
              <Button size="sm" variant="secondary" className="mt-3" onClick={async () => { await api(`/admin/ai-requests/${r.id}/resolve`, { method: "POST" }); await reload(); }}>Mark reviewed</Button>
            )}
          </li>
        ))}
      </ul>
      {data?.items.length === 0 && <p className="rounded-2xl bg-surface p-10 text-center text-sm text-ink-3 ring-1 ring-line">No requests yet.</p>}
      {data && <Pager page={page} pageSize={25} total={data.total} onPage={setPage} />}
    </div>
  );
}

export default function AIRequestsPage() {
  return <Suspense><Requests /></Suspense>;
}
