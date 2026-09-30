"use client";

import { Copy, Palette, ShoppingBag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DesignHands } from "@/components/nails/DesignHands";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/bits";
import { Tag } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { dateShort, money } from "@/lib/format";
import type { Design } from "@/lib/types";

const STATUS: Record<string, { label: string; tone: "cream" | "blush" | "mint" | "danger" | "warning" }> = {
  draft: { label: "Draft", tone: "cream" },
  submitted: { label: "Awaiting review", tone: "warning" },
  in_review: { label: "In review", tone: "warning" },
  approved: { label: "Approved", tone: "mint" },
  rejected: { label: "Needs changes", tone: "danger" },
};

export default function MyDesigns() {
  const [designs, setDesigns] = useState<Design[] | null>(null);
  const { add } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const load = () => api<Design[]>("/me/designs").then(setDesigns).catch(() => setDesigns([]));
  useEffect(() => { void load(); }, []);

  if (!designs) return <div className="skeleton h-48 rounded-3xl" />;
  if (!designs.length) {
    return <EmptyState icon={<Palette className="size-7" />} title="No saved designs yet" body="Designs you create in the studio or chat will appear here."
      action={<ButtonLink href="/create">Create a design</ButtonLink>} />;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {designs.map((d) => (
        <article key={d.public_id} className="rounded-3xl bg-surface p-4 ring-1 ring-line">
          <div className="rounded-2xl bg-blush-50 p-2"><DesignHands config={d.config} /></div>
          <div className="mt-3 flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{d.name}</p>
              <p className="text-[12.5px] text-ink-2">{d.source === "draw" ? "Drawn" : d.source === "chat" ? "Chat design" : "Stylist"} · {dateShort(d.updated_at)} · {money(d.price_paise)}</p>
            </div>
            <Tag tone={STATUS[d.status]?.tone ?? "cream"}>{STATUS[d.status]?.label ?? d.status}</Tag>
          </div>
          {d.review_notes && <p className="mt-2 rounded-2xl bg-champagne/60 px-3 py-2 text-[12.5px] text-ink-2">Artist note: {d.review_notes}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" icon={<ShoppingBag className="size-4" />} disabled={d.status === "rejected"}
              onClick={() => { add({ kind: "custom", design_public_id: d.public_id, quantity: 1, size: { label: "M" }, name: d.name, design_config: d.config, price_paise: d.price_paise }); toast("Added to your bag", { action: { label: "View bag", onClick: () => router.push("/bag") } }); }}>
              Add to bag
            </Button>
            <Button size="sm" variant="secondary" icon={<Copy className="size-4" />}
              onClick={async () => { await api(`/designs/${d.public_id}/duplicate`, { method: "POST" }); toast("Design duplicated"); void load(); }}>
              Duplicate
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto text-danger" icon={<Trash2 className="size-4" />}
              onClick={async () => {
                try { await api(`/designs/${d.public_id}`, { method: "DELETE" }); setDesigns(designs.filter((x) => x.public_id !== d.public_id)); }
                catch (e) { toast(e instanceof ApiError ? e.message : "Couldn't delete", { tone: "error" }); }
              }}>
              Delete
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
