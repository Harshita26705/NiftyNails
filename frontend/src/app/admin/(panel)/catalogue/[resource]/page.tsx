"use client";

import { Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PageHeader, SearchBox, Table, Toggle, useApi } from "@/components/admin/ui";
import { CHARM_KEYS, CharmIcon } from "@/components/nails/charms";
import { SingleNail } from "@/components/nails/NailSetArt";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { cn, money } from "@/lib/format";

type Row = Record<string, unknown> & { id: number; name: string; slug: string; synonyms: string[]; is_active: boolean; sort_order: number; description: string };
type Field = { key: string; label: string; type: "text" | "money" | "int" | "select" | "colour" | "bool" | "image"; options?: string[]; hint?: string };

const SHAPE_KEYS = ["almond", "coffin", "square", "oval", "stiletto", "squoval"];
const CONFIG: Record<string, { title: string; singular: string; blurb: string; fields: Field[] }> = {
  charms: {
    title: "Charms", singular: "charm", blurb: "Decorations customers can place on nails. Stock is used by custom orders.",
    fields: [
      { key: "category", label: "Category", type: "text", hint: "bow, pearl, gem, flower, heart, celestial, butterfly, fruit, character…" },
      { key: "asset_key", label: "Artwork", type: "select", options: [...CHARM_KEYS] },
      { key: "image_url", label: "Photo (optional)", type: "image" },
      { key: "price_paise", label: "Price per charm (₹)", type: "money" },
      { key: "stock", label: "Stock", type: "int" },
      { key: "flashiness", label: "Sparkle level (0–3)", type: "int" },
      { key: "is_3d", label: "3D charm", type: "bool" },
    ],
  },
  colours: {
    title: "Colours", singular: "colour", blurb: "The polish colours you can make. Only these can be chosen or recommended.",
    fields: [{ key: "hex", label: "Colour", type: "colour" }, { key: "family", label: "Family", type: "text", hint: "pink, nude, red, metallic… (used when customers say just “pink”)" }],
  },
  finishes: {
    title: "Finishes", singular: "finish", blurb: "Top-coat effects and their surcharge.",
    fields: [{ key: "surcharge_paise", label: "Surcharge (₹)", type: "money" }, { key: "flashiness", label: "Sparkle level (0–3)", type: "int" }],
  },
  shapes: {
    title: "Nail shapes", singular: "shape", blurb: "Shapes you can sculpt.",
    fields: [{ key: "svg_key", label: "Outline", type: "select", options: SHAPE_KEYS }, { key: "surcharge_paise", label: "Surcharge (₹)", type: "money" }],
  },
  patterns: { title: "Patterns", singular: "pattern", blurb: "Hand-painted art styles.", fields: [{ key: "surcharge_paise", label: "Surcharge (₹)", type: "money" }] },
  categories: { title: "Categories", singular: "category", blurb: "Shop-by-style groups on the storefront.", fields: [{ key: "image_url", label: "Image (optional)", type: "image" }] },
  styles: { title: "Styles", singular: "style", blurb: "Aesthetic vibes used by search and gifting.", fields: [] },
  occasions: { title: "Occasions", singular: "occasion", blurb: "When people wear a design.", fields: [] },
  tags: { title: "Tags", singular: "tag", blurb: "Merchandising labels like Bestseller or New.", fields: [] },
};
const GROUP = ["categories", "styles", "occasions", "tags"];

const blank = (fields: Field[]): Row => ({
  id: 0, name: "", slug: "", description: "", synonyms: [], is_active: true, sort_order: 0,
  ...Object.fromEntries(fields.map((f) => [f.key, f.type === "bool" ? false : f.type === "money" || f.type === "int" ? 0 : f.type === "colour" ? "#F8C8D8" : f.options?.[0] ?? null])),
});
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Preview({ resource, row }: { resource: string; row: Row }) {
  if (resource === "colours") return <span className="block size-8 rounded-full ring-1 ring-ink/10" style={{ background: String(row.hex) }} />;
  if (resource === "charms") return row.image_url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={String(row.image_url)} alt="" className="size-9 rounded-lg object-cover" />
    : <CharmIcon kind={String(row.asset_key)} size={34} />;
  if (resource === "shapes") return <SingleNail spec={{ shape: String(row.svg_key), length: "short", base: "#F8C8D8" }} className="h-10 w-auto" />;
  if (resource === "finishes") return <SingleNail spec={{ shape: "almond", length: "short", base: "#F4A6C0", finish: row.slug }} className="h-10 w-auto" />;
  if (resource === "patterns") return <SingleNail spec={{ shape: "almond", length: "short", base: "#F8C8D8", pattern: row.slug, patternColour: "#FFFFFF" }} className="h-10 w-auto" />;
  return null;
}

export default function CatalogueResource() {
  const { resource } = useParams<{ resource: string }>();
  const cfg = CONFIG[resource];
  const { data, reload } = useApi<Row[]>(cfg ? `/admin/${resource}` : null);
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [synonymText, setSynonymText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cfg) return <p>Unknown section.</p>;
  const rows = (data ?? []).filter((r) => !q || `${r.name} ${r.slug} ${r.synonyms.join(" ")}`.toLowerCase().includes(q.toLowerCase()));

  const open = (row: Row | null) => {
    const r = row ?? blank(cfg.fields);
    setEditing(r);
    setSynonymText(r.synonyms.join(", "));
    setError(null);
  };
  const upd = (k: string, v: unknown) => setEditing((e) => (e ? { ...e, [k]: v } : e));

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const { id, ...rest } = editing;
    const body = { ...rest, synonyms: synonymText.split(",").map((s) => s.trim()).filter(Boolean) };
    try {
      await api(`/admin/${resource}${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body });
      toast(`${cfg.singular[0].toUpperCase()}${cfg.singular.slice(1)} saved`);
      setEditing(null);
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing?.id) return;
    try {
      await api(`/admin/${resource}/${editing.id}`, { method: "DELETE" });
      toast("Deleted");
      setEditing(null);
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete.");
    }
  };

  const uploadImage = async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    try {
      const r = await api<{ url: string }>(`/admin/uploads/${resource === "charms" ? "charms" : "categories"}`, { method: "POST", body });
      upd("image_url", r.url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed.");
    }
  };

  return (
    <div>
      <PageHeader title={cfg.title} subtitle={cfg.blurb}
        actions={<><SearchBox value={q} onChange={setQ} /><Button icon={<Plus className="size-4" />} onClick={() => open(null)}>Add {cfg.singular}</Button></>} />
      {GROUP.includes(resource) && (
        <div className="mb-4 flex gap-2">{GROUP.map((g) => <Link key={g} href={`/admin/catalogue/${g}`}><Chip selected={g === resource}>{CONFIG[g].title}</Chip></Link>)}</div>
      )}
      <Table head={["", "Name", "AI understands", ...cfg.fields.filter((f) => ["money", "int", "text"].includes(f.type)).map((f) => f.label), "Status"]} empty={data?.length === 0}>
        {rows.map((r) => (
          <tr key={r.id} onClick={() => open(r)} className="cursor-pointer hover:bg-blush-50/60">
            <td className="w-14 px-4 py-2"><Preview resource={resource} row={r} /></td>
            <td className="px-4 py-2"><p className="font-semibold">{r.name}</p><p className="text-[12px] text-ink-3">{r.slug}</p></td>
            <td className="max-w-xs px-4 py-2 text-[12.5px] text-ink-2"><span className="line-clamp-2">{[r.name.toLowerCase(), ...r.synonyms].join(", ")}</span></td>
            {cfg.fields.filter((f) => ["money", "int", "text"].includes(f.type)).map((f) => (
              <td key={f.key} className={cn("px-4 py-2 tabular-nums", f.key === "stock" && Number(r.stock) <= 10 && "font-bold text-danger")}>
                {f.type === "money" ? money(Number(r[f.key])) : String(r[f.key] ?? "—")}
              </td>
            ))}
            <td className="px-4 py-2"><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", r.is_active ? "bg-mint text-success" : "bg-line text-ink-2")}>{r.is_active ? "Active" : "Hidden"}</span></td>
          </tr>
        ))}
      </Table>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${cfg.singular}` : `New ${cfg.singular}`}
        footer={<div className="flex gap-2">
          {editing?.id ? <Button variant="danger" onClick={remove}>Delete</Button> : null}
          <Button className="flex-1" loading={busy} disabled={!editing?.name || !editing?.slug} onClick={save}>Save</Button>
        </div>}>
        {editing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-blush-50 p-3"><Preview resource={resource} row={editing} /><span className="text-[13px] text-ink-2">Preview</span></div>
            <Input label="Name" value={editing.name} onChange={(e) => { const name = e.target.value; setEditing({ ...editing, name, slug: editing.id ? editing.slug : slugify(name) }); }} />
            <Input label="Slug" value={editing.slug} onChange={(e) => upd("slug", slugify(e.target.value))} hint="Used in URLs and designs. Avoid changing once in use." />
            <Input label="Synonyms" value={synonymText} onChange={(e) => setSynonymText(e.target.value)}
              hint="Comma-separated words customers might use — the AI search & designer understand these." />
            {cfg.fields.map((f) => {
              const v = editing[f.key];
              if (f.type === "bool") return <Toggle key={f.key} checked={!!v} onChange={(x) => upd(f.key, x)} label={f.label} />;
              if (f.type === "select") return <Select key={f.key} label={f.label} value={String(v ?? "")} onChange={(e) => upd(f.key, e.target.value)}>{f.options!.map((o) => <option key={o}>{o}</option>)}</Select>;
              if (f.type === "colour") return (
                <div key={f.key} className="flex items-end gap-3">
                  <input type="color" aria-label="Pick colour" value={String(v)} onChange={(e) => upd(f.key, e.target.value.toUpperCase())} className="h-12 w-14 cursor-pointer rounded-xl border-0 bg-transparent" />
                  <Input className="flex-1" label={f.label} value={String(v)} onChange={(e) => upd(f.key, e.target.value)} />
                </div>
              );
              if (f.type === "image") return (
                <div key={f.key}>
                  <p className="mb-1.5 text-[13px] font-semibold">{f.label}</p>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {v ? <img src={String(v)} alt="" className="size-14 rounded-xl object-cover ring-1 ring-line" /> : null}
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-[13px] font-semibold ring-1 ring-line">
                      <Upload className="size-4" /> Upload
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file); }} />
                    </label>
                    {v ? <button type="button" onClick={() => upd(f.key, null)} className="text-[12.5px] font-semibold text-danger">Remove</button> : null}
                  </div>
                </div>
              );
              return (
                <Input key={f.key} label={f.label} hint={f.hint} type={f.type === "text" ? "text" : "number"} min={0}
                  value={f.type === "money" ? Number(v ?? 0) / 100 : String(v ?? "")}
                  onChange={(e) => upd(f.key, f.type === "money" ? Math.round(Number(e.target.value) * 100) : f.type === "int" ? Number(e.target.value) : e.target.value)} />
              );
            })}
            <Textarea label="Description (optional)" rows={2} value={editing.description} onChange={(e) => upd("description", e.target.value)} />
            <Toggle checked={editing.is_active} onChange={(x) => upd("is_active", x)} label="Active (available to customers & AI)" />
            {error && <p className="text-[13px] font-medium text-danger" role="alert">{error}</p>}
          </div>
        )}
      </Sheet>
    </div>
  );
}
