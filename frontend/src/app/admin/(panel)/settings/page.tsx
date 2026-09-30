"use client";

import { useState } from "react";
import { PageHeader, Panel, Toggle, useApi } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";

type Settings = {
  pricing: {
    custom_base_paise: number; painted_nail_paise: number; length_surcharge_paise: Record<string, number>;
    custom_fit_surcharge_paise: number; shipping_flat_paise: number; free_shipping_over_paise: number;
    cod_fee_paise: number; custom_lead_days: number; ready_lead_days: number;
    complexity_weights: Record<string, number>; tiers: { name: string; min: number; max: number; price_paise: number }[];
    premium_finishes: Record<string, number>; min_price_paise: number; max_price_paise: number;
  };
  site: { announcement: string; hero_title: string; hero_subtitle: string; instagram_handle: string; support_email: string; whatsapp: string; upi_id: string };
  sizing: { nail_to_finger_ratio: Record<string, number>; min_confidence: number; prefer_larger_between_sizes: boolean };
};

const rupees = (p: number) => p / 100;
const paise = (r: string) => Math.round(Number(r) * 100);

export default function SettingsPage() {
  const { data } = useApi<Settings>("/admin/settings");
  const { toast } = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [loaded, setLoaded] = useState<Settings | null>(null);
  if (data && data !== loaded) {
    setLoaded(data);
    setS(data);
  }
  if (!s) return <div className="skeleton h-96 rounded-2xl" />;

  const save = async (key: keyof Settings) => {
    try {
      await api(`/admin/settings/${key}`, { method: "PUT", body: s[key] });
      toast("Settings saved");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't save", { tone: "error" });
    }
  };
  const p = s.pricing;
  const setP = (patch: Partial<Settings["pricing"]>) => setS({ ...s, pricing: { ...p, ...patch } });

  return (
    <div>
      <PageHeader title="Settings & pricing" subtitle="Only owners can change these. Custom-design prices are always calculated from these values on the server." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Custom design pricing" action={<Button size="sm" onClick={() => save("pricing")}>Save</Button>}>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Base price (₹)" type="number" value={rupees(p.custom_base_paise)} onChange={(e) => setP({ custom_base_paise: paise(e.target.value) })} />
            <Input label="Per hand-painted nail (₹)" type="number" value={rupees(p.painted_nail_paise)} onChange={(e) => setP({ painted_nail_paise: paise(e.target.value) })} />
            {Object.entries(p.length_surcharge_paise).map(([len, v]) => (
              <Input key={len} label={`${len === "xlong" ? "Extra long" : len[0].toUpperCase() + len.slice(1)} length (₹)`} type="number" value={rupees(v)}
                onChange={(e) => setP({ length_surcharge_paise: { ...p.length_surcharge_paise, [len]: paise(e.target.value) } })} />
            ))}
            <Input label="Custom-fit surcharge (₹)" type="number" value={rupees(p.custom_fit_surcharge_paise)} onChange={(e) => setP({ custom_fit_surcharge_paise: paise(e.target.value) })} />
            <Input label="Custom lead time (days)" type="number" value={p.custom_lead_days} onChange={(e) => setP({ custom_lead_days: Number(e.target.value) })} />
          </div>
        </Panel>
        <Panel title="Shipping & payment" action={<Button size="sm" onClick={() => save("pricing")}>Save</Button>}>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Flat shipping (₹)" type="number" value={rupees(p.shipping_flat_paise)} onChange={(e) => setP({ shipping_flat_paise: paise(e.target.value) })} />
            <Input label="Free shipping over (₹)" type="number" value={rupees(p.free_shipping_over_paise)} onChange={(e) => setP({ free_shipping_over_paise: paise(e.target.value) })} />
            <Input label="COD fee (₹)" type="number" value={rupees(p.cod_fee_paise)} onChange={(e) => setP({ cod_fee_paise: paise(e.target.value) })} />
            <Input label="Ready-kit dispatch (days)" type="number" value={p.ready_lead_days} onChange={(e) => setP({ ready_lead_days: Number(e.target.value) })} />
          </div>
        </Panel>
        <Panel title="Storefront content" action={<Button size="sm" onClick={() => save("site")}>Save</Button>}>
          <div className="space-y-3">
            {([["announcement", "Announcement bar"], ["hero_title", "Hero headline (last word is highlighted)"], ["hero_subtitle", "Hero subtitle"], ["instagram_handle", "Instagram handle"], ["support_email", "Support email"], ["whatsapp", "WhatsApp number"], ["upi_id", "UPI ID (shown after UPI orders)"]] as const).map(([k, label]) => (
              <Input key={k} label={label} value={s.site[k]} maxLength={500} onChange={(e) => setS({ ...s, site: { ...s.site, [k]: e.target.value } })} />
            ))}
          </div>
        </Panel>
        <Panel title="Photo sizing calibration" action={<Button size="sm" onClick={() => save("sizing")}>Save</Button>}>
          <p className="mb-3 text-[12.5px] text-ink-2">Nail width ≈ finger width × ratio. Tune these using real measurements from your customers.</p>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(s.sizing.nail_to_finger_ratio).map(([f, v]) => (
              <Input key={f} label={f} type="number" step="0.01" value={v} onChange={(e) => setS({ ...s, sizing: { ...s.sizing, nail_to_finger_ratio: { ...s.sizing.nail_to_finger_ratio, [f]: Number(e.target.value) } } })} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 items-end gap-3">
            <Input label="Minimum confidence (0–1)" type="number" step="0.05" min={0} max={1} value={s.sizing.min_confidence} onChange={(e) => setS({ ...s, sizing: { ...s.sizing, min_confidence: Number(e.target.value) } })} />
            <Toggle checked={s.sizing.prefer_larger_between_sizes} onChange={(v) => setS({ ...s, sizing: { ...s.sizing, prefer_larger_between_sizes: v } })} label="Round up between sizes" />
          </div>
        </Panel>
      </div>
    </div>
  );
}
