"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader, Panel, Toggle, useApi } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/bits";
import { Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { dateShort } from "@/lib/format";
import type { Review } from "@/lib/types";

type AdminReview = Review & { is_published: boolean; is_featured: boolean };

export default function Reviews() {
  const { data, reload } = useApi<AdminReview[]>("/admin/reviews");
  const { toast } = useToast();
  const [draft, setDraft] = useState({ author_name: "", rating: 5, title: "", body: "" });
  const moderate = async (r: AdminReview, patch: Partial<AdminReview>) => {
    await api(`/admin/reviews/${r.id}`, { method: "PATCH", body: { is_published: patch.is_published ?? r.is_published, is_featured: patch.is_featured ?? r.is_featured } });
    await reload();
  };
  return (
    <div>
      <PageHeader title="Reviews" subtitle="Customer reviews are hidden until you publish them. Featured ones appear on the homepage." />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {data?.map((r) => (
            <li key={r.id} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
              <div className="flex items-center justify-between gap-2"><Stars rating={r.rating} /><span className="text-[12px] text-ink-3">{dateShort(r.created_at)}</span></div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              <p className="mt-1 text-[13.5px] text-ink-2">{r.body}</p>
              <p className="mt-2 text-[12.5px]">— {r.author_name}{r.product_name && <span className="text-ink-3"> on {r.product_name}</span>}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Toggle checked={r.is_published} onChange={(v) => moderate(r, { is_published: v, is_featured: v ? r.is_featured : false })} label="Published" />
                <Toggle checked={r.is_featured} onChange={(v) => moderate(r, { is_featured: v, is_published: v || r.is_published })} label="Featured" />
                <button aria-label="Delete review" onClick={async () => { if (confirm("Delete this review?")) { await api(`/admin/reviews/${r.id}`, { method: "DELETE" }); await reload(); } }} className="ml-auto text-ink-3 hover:text-danger"><Trash2 className="size-4" /></button>
              </div>
            </li>
          ))}
        </ul>
        <Panel title="Add a review" className="self-start">
          <p className="mb-3 text-[12.5px] text-ink-2">For reviews customers send you on WhatsApp or Instagram (with their permission).</p>
          <div className="space-y-3">
            <Input label="Name" value={draft.author_name} onChange={(e) => setDraft({ ...draft, author_name: e.target.value })} />
            <Input label="Rating (1–5)" type="number" min={1} max={5} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })} />
            <Input label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <Textarea label="Review" rows={3} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <Button full disabled={!draft.author_name || draft.body.length < 3} onClick={async () => {
              await api("/admin/reviews", { method: "POST", body: { ...draft, is_published: true } });
              setDraft({ author_name: "", rating: 5, title: "", body: "" });
              toast("Review added");
              await reload();
            }}>Add review</Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
