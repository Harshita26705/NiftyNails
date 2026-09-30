"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader, Panel, useApi } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { money } from "@/lib/format";

type Tier = { name: string; min: number; max: number; price_paise: number };

type Pricing = {
  custom_base_paise: number; painted_nail_paise: number; length_surcharge_paise: Record<string, number>;
  custom_fit_surcharge_paise: number; shipping_flat_paise: number; free_shipping_over_paise: number;
  cod_fee_paise: number; custom_lead_days: number; ready_lead_days: number;
  complexity_weights: Record<string, number>; tiers: Tier[]; premium_finishes: Record<string, number>;
  min_price_paise: number; max_price_paise: number;
};

const rupees = (p: number) => p / 100;
const paise = (r: string) => Math.round(Number(r) * 100);

const WEIGHT_LABEL: Record<string, string> = {
  gradient: "Gradient / ombre", french_tip: "French tip", shape: "Shape", line_art: "Simple line art",
  freehand: "Freehand illustration", text: "Text", image: "Uploaded image", chrome_finish: "Chrome finish",
  decoration_3d: "3D decoration (charm)",
};

export default function PricingPage() {
  const { data, setData } = useApi<{ pricing: Pricing }>("/admin/settings");
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = data?.pricing;

  if (!p) return <div className="skeleton h-96 rounded-2xl" />;

  const setP = (patch: Partial<Pricing>) => setData({ pricing: { ...p, ...patch } });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api("/admin/settings/pricing", { method: "PUT", body: p });
      toast("Pricing updated — new designs will be priced with these settings");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save pricing.");
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    const last = p.tiers[p.tiers.length - 1];
    setP({ tiers: [...p.tiers, { name: "New tier", min: last ? last.max + 1 : 0, max: (last?.max ?? 0) + 5, price_paise: last?.price_paise ?? p.custom_base_paise }] });
  };
  const updateTier = (i: number, patch: Partial<Tier>) => setP({ tiers: p.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });
  const removeTier = (i: number) => setP({ tiers: p.tiers.filter((_, idx) => idx !== i) });

  return (
    <div>
      <PageHeader title="Pricing" subtitle="Custom-design prices are calculated on the server from a complexity score. Only owners can change these — changes apply to every quote immediately."
        actions={<Button loading={saving} onClick={save}>Save all</Button>} />
      {error && <p className="mb-4 rounded-2xl bg-danger/5 px-4 py-3 text-sm font-medium text-danger" role="alert">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Complexity weights" className="xl:col-span-2">
          <p className="mb-4 text-[12.5px] text-ink-2">
            Each element a customer adds in the Design Studio adds weight. The total across all ten nails resolves to
            a pricing tier below.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(p.complexity_weights).map(([key, v]) => (
              <Input key={key} label={WEIGHT_LABEL[key] ?? key} type="number" min={0} step={1} value={v}
                onChange={(e) => setP({ complexity_weights: { ...p.complexity_weights, [key]: Math.max(0, Number(e.target.value)) } })} />
            ))}
          </div>
        </Panel>

        <Panel title="Pricing tiers" className="xl:col-span-2" action={<Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={addTier}>Add tier</Button>}>
          <p className="mb-4 text-[12.5px] text-ink-2">
            Tiers must be contiguous, starting at complexity 0 (e.g. 0–3, 4–7, 8–12 …). A design&rsquo;s total complexity
            picks the matching tier&rsquo;s price for the base custom set.
          </p>
          <div className="space-y-2.5">
            {p.tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-2 items-end gap-2.5 rounded-2xl bg-blush-50 p-3 sm:grid-cols-5">
                <Input label="Name" value={t.name} onChange={(e) => updateTier(i, { name: e.target.value })} />
                <Input label="Min complexity" type="number" min={0} value={t.min} onChange={(e) => updateTier(i, { min: Number(e.target.value) })} />
                <Input label="Max complexity" type="number" min={0} value={t.max} onChange={(e) => updateTier(i, { max: Number(e.target.value) })} />
                <Input label="Price (₹)" type="number" min={0} value={rupees(t.price_paise)} onChange={(e) => updateTier(i, { price_paise: paise(e.target.value) })} />
                <Button variant="danger" size="sm" icon={<Trash2 className="size-4" />} onClick={() => removeTier(i)} disabled={p.tiers.length <= 1}>Remove</Button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Premium finishes">
          <p className="mb-4 text-[12.5px] text-ink-2">Extra surcharge on top of the tier price, by finish slug.</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(p.premium_finishes).map(([slug, v]) => (
              <Input key={slug} label={slug} type="number" min={0} value={rupees(v)}
                onChange={(e) => setP({ premium_finishes: { ...p.premium_finishes, [slug]: paise(e.target.value) } })} />
            ))}
          </div>
        </Panel>

        <Panel title="Price guardrails">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Minimum price (₹)" type="number" min={0} value={rupees(p.min_price_paise)} onChange={(e) => setP({ min_price_paise: paise(e.target.value) })} />
            <Input label="Maximum price (₹)" type="number" min={0} value={rupees(p.max_price_paise)} onChange={(e) => setP({ max_price_paise: paise(e.target.value) })} />
          </div>
          <p className="mt-3 text-[12.5px] text-ink-2">
            Every custom-design total is clamped between these two values, however the tiers and weights above add up.
          </p>
        </Panel>
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-5 ring-1 ring-line">
        <p className="text-[13px] font-semibold">Example</p>
        <p className="mt-1 text-[12.5px] text-ink-2">
          A design with two gradients, one French tip and a chrome finish scores
          {" "}{p.complexity_weights.gradient * 2 + p.complexity_weights.french_tip + p.complexity_weights.chrome_finish} complexity points
          — currently the <b>{p.tiers.find((t) => p.complexity_weights.gradient * 2 + p.complexity_weights.french_tip + p.complexity_weights.chrome_finish <= t.max)?.name ?? p.tiers[p.tiers.length - 1]?.name}</b> tier,
          {" "}{money(p.tiers.find((t) => p.complexity_weights.gradient * 2 + p.complexity_weights.french_tip + p.complexity_weights.chrome_finish <= t.max)?.price_paise ?? p.tiers[p.tiers.length - 1]?.price_paise ?? 0)}.
        </p>
      </div>
    </div>
  );
}
