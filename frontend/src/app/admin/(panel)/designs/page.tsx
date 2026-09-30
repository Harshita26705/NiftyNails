"use client";

import { Check, Factory, PackageCheck, X, XCircle } from "lucide-react";
import { useState } from "react";
import { PageHeader, Pager, useApi } from "@/components/admin/ui";
import { CharmIcon } from "@/components/nails/charms";
import { DesignHands } from "@/components/nails/DesignHands";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { useCatalog } from "@/lib/catalog";
import { dateTime, LENGTH_LABEL, money } from "@/lib/format";
import type { Design, DesignStatus, Page } from "@/lib/types";

const FILTERS = [
  ["submitted", "Awaiting review"], ["in_review", "In review"], ["approved", "Approved"], ["production", "In production"],
  ["completed", "Completed"], ["rejected", "Needs changes"], ["cancelled", "Cancelled"], ["draft", "Drafts"], ["all", "All"],
];
const OBJECT_LABEL: Record<string, string> = {
  stroke: "brush stroke", shape: "shape", text: "text", gradient: "gradient", french_tip: "French tip", image: "image",
};
const STATUS_TOAST: Partial<Record<DesignStatus, string>> = {
  approved: "Design approved", rejected: "Sent back with notes", in_review: "Marked in review",
  production: "Moved to production", completed: "Marked completed", cancelled: "Design cancelled",
};

export default function DesignReview() {
  const [status, setStatus] = useState("submitted");
  const [page, setPage] = useState(1);
  const { data, reload } = useApi<Page<Design>>("/admin/custom-designs", { status, page, page_size: 12 });
  const catalog = useCatalog();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const review = async (d: Design, next: DesignStatus) => {
    await api(`/admin/custom-designs/${d.public_id}/review`, { method: "POST", body: { status: next, review_notes: notes[d.public_id] ?? d.review_notes } });
    toast(STATUS_TOAST[next] ?? "Status updated");
    await reload();
  };

  return (
    <div>
      <PageHeader title="Custom designs" subtitle="Check every custom design is makeable before production. Customers see your notes." />
      <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto">{FILTERS.map(([v, l]) => <Chip key={v} selected={status === v} onClick={() => { setStatus(v); setPage(1); }}>{l}</Chip>)}</div>
      {data?.items.length === 0 && <p className="rounded-2xl bg-surface p-10 text-center text-sm text-ink-3 ring-1 ring-line">Nothing in this queue. 🎉</p>}
      <div className="grid gap-5 xl:grid-cols-2">
        {data?.items.map((d) => {
          const cfg = d.config;
          const colour = catalog?.colours.find((c) => c.slug === cfg.base_colour);
          const objectCounts: Record<string, number> = {};
          for (const nail of Object.values(cfg.nails)) {
            for (const o of nail?.objects ?? []) objectCounts[o.type] = (objectCounts[o.type] ?? 0) + 1;
          }
          return (
            <article key={d.public_id} className="rounded-2xl bg-surface p-5 ring-1 ring-line">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-[12px] text-ink-3">{d.public_id} · {d.source} · {dateTime(d.updated_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl tabular-nums">{money(d.price_paise)}</p>
                  <p className="text-[11px] font-semibold text-ink-3">{d.tier} · complexity {d.complexity}</p>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-blush-50 p-2"><DesignHands config={cfg} /></div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
                <div><dt className="text-ink-3">Shape</dt><dd className="font-semibold capitalize">{cfg.shape}</dd></div>
                <div><dt className="text-ink-3">Length</dt><dd className="font-semibold">{LENGTH_LABEL[cfg.length]}</dd></div>
                <div><dt className="text-ink-3">Finish</dt><dd className="font-semibold capitalize">{cfg.finish}</dd></div>
                <div><dt className="text-ink-3">Base</dt><dd className="flex items-center gap-1.5 font-semibold">{colour && <span className="size-3 rounded-full" style={{ background: colour.hex }} />}{colour?.name ?? cfg.base_colour}</dd></div>
              </dl>
              {Object.keys(objectCounts).length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(objectCounts).map(([type, n]) => (
                    <li key={type} className="rounded-full bg-champagne/60 px-2.5 py-1 text-[11.5px] font-semibold text-ink-2">
                      {n} × {OBJECT_LABEL[type] ?? type}
                    </li>
                  ))}
                </ul>
              )}
              {d.bill_of_materials.some((b) => b.element_type === "charm") && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {d.bill_of_materials.filter((b) => b.element_type === "charm").map((b) => (
                    <li key={b.slug} className="inline-flex items-center gap-1 rounded-full bg-blush-50 py-0.5 pr-2.5 pl-1 text-[12px] ring-1 ring-line">
                      <CharmIcon kind={catalog?.charms.find((c) => c.slug === b.slug)?.asset_key ?? b.slug} size={20} />{b.name} × {b.quantity}
                    </li>
                  ))}
                </ul>
              )}
              {d.brief && <p className="mt-3 rounded-xl bg-champagne/60 px-3 py-2 text-[12.5px]"><b>Brief:</b> {d.brief}</p>}
              <Textarea className="mt-3" rows={2} placeholder="Notes for the customer (e.g. suggest a tweak)…" value={notes[d.public_id] ?? d.review_notes}
                onChange={(e) => setNotes({ ...notes, [d.public_id]: e.target.value })} aria-label="Review notes" />
              <div className="mt-3 flex flex-wrap gap-2">
                {d.status !== "approved" && d.status !== "production" && d.status !== "completed" && (
                  <Button size="sm" icon={<Check className="size-4" />} onClick={() => review(d, "approved")}>Approve</Button>
                )}
                {d.status === "approved" && (
                  <Button size="sm" icon={<Factory className="size-4" />} onClick={() => review(d, "production")}>Start production</Button>
                )}
                {d.status === "production" && (
                  <Button size="sm" icon={<PackageCheck className="size-4" />} onClick={() => review(d, "completed")}>Mark completed</Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => review(d, "in_review")}>Mark in review</Button>
                <Button size="sm" variant="danger" icon={<X className="size-4" />} onClick={() => review(d, "rejected")}>Needs changes</Button>
                {d.status !== "cancelled" && d.status !== "completed" && (
                  <Button size="sm" variant="danger" icon={<XCircle className="size-4" />} onClick={() => review(d, "cancelled")}>Cancel</Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {data && <Pager page={page} pageSize={12} total={data.total} onPage={setPage} />}
    </div>
  );
}
