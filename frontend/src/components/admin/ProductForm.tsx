"use client";

import { ImagePlus, Minus, Plus, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { CharmIcon } from "@/components/nails/charms";
import { NailSetArt } from "@/components/nails/NailSetArt";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { useCatalog } from "@/lib/catalog";
import { backdropFor } from "@/lib/colour";
import { cn } from "@/lib/format";
import type { NailArt, ProductDetail, ShapeKey } from "@/lib/types";
import { Panel, Toggle } from "./ui";

type AdminProduct = ProductDetail & { inventory: { size_label: string; quantity: number; low_stock_threshold: number }[] };

type FormState = {
  name: string; slug: string; sku: string; tagline: string; description: string;
  price: string; compare_at: string;
  category_id: string; style_id: string; shape_id: string; finish_id: string;
  length: string; difficulty: string; available_sizes: string[];
  colours: { colour_id: number; role: "base" | "accent" }[];
  charms: { charm_id: number; quantity: number }[];
  tag_ids: number[]; pattern_ids: number[]; occasion_ids: number[];
  inventory: Record<string, { quantity: number; low_stock_threshold: number }>;
  is_active: boolean; is_featured: boolean;
};

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SIZES = ["XS", "S", "M", "L", "CUSTOM"];

function fromProduct(p: AdminProduct | null, ids: (kind: string, slug?: string | null) => number | undefined): FormState {
  const inv = Object.fromEntries(["XS", "S", "M", "L"].map((l) => {
    const r = p?.inventory.find((i) => i.size_label === l);
    return [l, { quantity: r?.quantity ?? 0, low_stock_threshold: r?.low_stock_threshold ?? 3 }];
  }));
  return {
    name: p?.name ?? "", slug: p?.slug ?? "", sku: p?.sku ?? "", tagline: p?.tagline ?? "", description: p?.description ?? "",
    price: p ? String(p.price_paise / 100) : "", compare_at: p?.compare_at_paise ? String(p.compare_at_paise / 100) : "",
    category_id: String(p?.category?.id ?? ""), style_id: String(p?.style?.id ?? ""), shape_id: String(p?.shape?.id ?? ""), finish_id: String(p?.finish?.id ?? ""),
    length: p?.length ?? "medium", difficulty: p?.difficulty ?? "simple", available_sizes: p?.available_sizes ?? SIZES,
    colours: (p?.colours ?? []).map((c) => ({ colour_id: ids("colour", c.slug)!, role: c.role })).filter((c) => c.colour_id),
    charms: (p?.charms ?? []).map((c) => ({ charm_id: ids("charm", c.slug)!, quantity: c.quantity })).filter((c) => c.charm_id),
    tag_ids: (p?.tags ?? []).map((t) => t.id), pattern_ids: (p?.patterns ?? []).map((t) => t.id), occasion_ids: (p?.occasions ?? []).map((t) => t.id),
    inventory: inv, is_active: p?.is_active ?? true, is_featured: p?.is_featured ?? false,
  };
}

export function ProductForm({ product }: { product: AdminProduct | null }) {
  const catalog = useCatalog();
  const router = useRouter();
  const { toast } = useToast();
  const ids = (kind: string, slug?: string | null) => {
    if (!catalog || !slug) return undefined;
    const list = kind === "colour" ? catalog.colours : catalog.charms;
    return list.find((x) => x.slug === slug)?.id;
  };
  const [f, setF] = useState<FormState | null>(null);
  const form = f ?? (catalog ? fromProduct(product, ids) : null);
  const [images, setImages] = useState(product?.images ?? []);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const slugTouched = useRef(!!product);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF({ ...(form as FormState), [k]: v });
  const toggleId = (k: "tag_ids" | "pattern_ids" | "occasion_ids", id: number) =>
    set(k, form![k].includes(id) ? form![k].filter((x) => x !== id) : [...form![k], id]);

  const art: NailArt | null = useMemo(() => {
    if (!form || !catalog) return null;
    const hex = (id: number) => catalog.colours.find((c) => c.id === id)?.hex ?? "#F8C8D8";
    const base = form.colours.find((c) => c.role === "base") ?? form.colours[0];
    const charms: string[] = [];
    form.charms.forEach((c) => { const a = catalog.charms.find((x) => x.id === c.charm_id)?.asset_key; if (a) for (let i = 0; i < Math.min(c.quantity, 3); i++) charms.push(a); });
    return {
      shape: (catalog.shapes.find((s) => String(s.id) === form.shape_id)?.svg_key ?? "almond") as ShapeKey,
      length: form.length as NailArt["length"],
      base: base ? hex(base.colour_id) : "#F8C8D8",
      accents: form.colours.filter((c) => c !== base).map((c) => hex(c.colour_id)).slice(0, 3),
      finish: catalog.finishes.find((x) => String(x.id) === form.finish_id)?.slug ?? "glossy",
      pattern: catalog.patterns.find((p) => form.pattern_ids.includes(p.id))?.slug ?? null,
      charms: charms.slice(0, 6),
    };
  }, [form, catalog]);

  if (!catalog || !form) return <div className="skeleton h-96 rounded-2xl" />;

  const save = async () => {
    setBusy(true);
    setErrors(null);
    const body = {
      sku: form.sku.trim(), slug: form.slug.trim(), name: form.name.trim(), tagline: form.tagline, description: form.description,
      price_paise: Math.round(Number(form.price) * 100), compare_at_paise: form.compare_at ? Math.round(Number(form.compare_at) * 100) : null,
      category_id: form.category_id ? Number(form.category_id) : null, style_id: form.style_id ? Number(form.style_id) : null,
      shape_id: form.shape_id ? Number(form.shape_id) : null, finish_id: form.finish_id ? Number(form.finish_id) : null,
      length: form.length, difficulty: form.difficulty, available_sizes: form.available_sizes,
      colours: form.colours, charms: form.charms, tag_ids: form.tag_ids, pattern_ids: form.pattern_ids, occasion_ids: form.occasion_ids,
      inventory: Object.entries(form.inventory).map(([size_label, v]) => ({ size_label, ...v })),
      is_active: form.is_active, is_featured: form.is_featured, art: {},
    };
    try {
      const saved = product
        ? await api<AdminProduct>(`/admin/products/${product.id}`, { method: "PUT", body })
        : await api<AdminProduct>("/admin/products", { method: "POST", body });
      toast(product ? "Product saved" : "Product created — add photos next");
      if (!product) router.replace(`/admin/products/${saved.id}`);
      else router.refresh();
    } catch (e) {
      setErrors(e instanceof ApiError ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!product || !files?.length) return;
    const body = new FormData();
    Array.from(files).forEach((file) => body.append("files", file));
    try {
      setImages(await api(`/admin/products/${product.id}/images`, { method: "POST", body }));
      toast("Photos uploaded");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Upload failed", { tone: "error" });
    }
  };

  const makeCover = async (id: number) => {
    if (!product) return;
    const order = [id, ...images.map((i) => i.id).filter((x) => x !== id)];
    setImages(await api(`/admin/products/${product.id}/images/order`, { method: "PUT", body: { image_ids: order } }));
  };

  const remove = async () => {
    if (!product || !confirm(`Delete “${product.name}”? Products with orders are archived instead.`)) return;
    const r = await api<{ message: string }>(`/admin/products/${product.id}`, { method: "DELETE" });
    toast(r.message);
    router.replace("/admin/products");
  };

  const priceOk = Number(form.price) > 0;
  const canSave = form.name && form.slug && form.sku && priceOk;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Panel title="Basics">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(e) => { const name = e.target.value; setF({ ...form, name, slug: slugTouched.current ? form.slug : slugify(name) }); }} />
            <Input label="SKU" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="NN-125" />
            <Input label="URL slug" value={form.slug} onChange={(e) => { slugTouched.current = true; set("slug", slugify(e.target.value)); }} hint={`/shop/${form.slug || "…"}`} />
            <Input label="Tagline" value={form.tagline} maxLength={160} onChange={(e) => set("tagline", e.target.value)} />
            <Textarea className="md:col-span-2" label="Description" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
            <Input label="Price (₹)" type="number" min={0} inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} error={form.price && !priceOk ? "Enter a price" : null} />
            <Input label="Compare-at price (₹, optional)" type="number" min={0} value={form.compare_at} onChange={(e) => set("compare_at", e.target.value)} />
          </div>
        </Panel>

        <Panel title="Design attributes">
          <div className="grid gap-4 md:grid-cols-3">
            <Select label="Category" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}><option value="">—</option>{catalog.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Select label="Style" value={form.style_id} onChange={(e) => set("style_id", e.target.value)}><option value="">—</option>{catalog.styles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Select label="Shape" value={form.shape_id} onChange={(e) => set("shape_id", e.target.value)}><option value="">—</option>{catalog.shapes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Select label="Finish" value={form.finish_id} onChange={(e) => set("finish_id", e.target.value)}><option value="">—</option>{catalog.finishes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Select label="Length" value={form.length} onChange={(e) => set("length", e.target.value)}>{["short", "medium", "long", "xlong"].map((l) => <option key={l} value={l}>{l === "xlong" ? "Extra long" : l[0].toUpperCase() + l.slice(1)}</option>)}</Select>
            <Select label="Difficulty" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>{["simple", "detailed", "intricate"].map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}</Select>
          </div>

          <p className="mt-5 mb-2 text-[13px] font-semibold">Colours <span className="font-normal text-ink-3">— tap to add, tap again for base / remove</span></p>
          <div className="flex flex-wrap gap-2">
            {catalog.colours.map((c) => {
              const sel = form.colours.find((x) => x.colour_id === c.id);
              return (
                <Chip key={c.id} swatch={c.hex} selected={!!sel} onClick={() => {
                  if (!sel) set("colours", [...form.colours, { colour_id: c.id, role: form.colours.some((x) => x.role === "base") ? "accent" : "base" }]);
                  else if (sel.role === "accent" && !form.colours.some((x) => x.role === "base")) set("colours", form.colours.map((x) => (x === sel ? { ...x, role: "base" } : x)));
                  else set("colours", form.colours.filter((x) => x !== sel));
                }}>
                  {c.name}{sel?.role === "base" && <Star className="size-3 fill-current" />}
                </Chip>
              );
            })}
          </div>

          <p className="mt-5 mb-2 text-[13px] font-semibold">Charms</p>
          <div className="flex flex-wrap gap-2">
            {catalog.charms.map((c) => {
              const sel = form.charms.find((x) => x.charm_id === c.id);
              return sel ? (
                <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-ink py-1 pr-1 pl-2 text-[13px] text-white">
                  <CharmIcon kind={c.asset_key} size={22} /> {c.name}
                  <button type="button" aria-label="Fewer" onClick={() => set("charms", sel.quantity <= 1 ? form.charms.filter((x) => x !== sel) : form.charms.map((x) => (x === sel ? { ...x, quantity: x.quantity - 1 } : x)))} className="ml-1 flex size-7 items-center justify-center rounded-full bg-white/15"><Minus className="size-3.5" /></button>
                  <span className="w-5 text-center tabular-nums">{sel.quantity}</span>
                  <button type="button" aria-label="More" onClick={() => set("charms", form.charms.map((x) => (x === sel ? { ...x, quantity: Math.min(50, x.quantity + 1) } : x)))} className="flex size-7 items-center justify-center rounded-full bg-white/15"><Plus className="size-3.5" /></button>
                </span>
              ) : (
                <Chip key={c.id} icon={<CharmIcon kind={c.asset_key} size={22} />} onClick={() => set("charms", [...form.charms, { charm_id: c.id, quantity: 1 }])}>{c.name}</Chip>
              );
            })}
          </div>

          {([["Patterns", "pattern_ids", catalog.patterns], ["Occasions", "occasion_ids", catalog.occasions], ["Tags", "tag_ids", catalog.tags]] as const).map(([label, key, list]) => (
            <div key={key}>
              <p className="mt-5 mb-2 text-[13px] font-semibold">{label}</p>
              <div className="flex flex-wrap gap-2">
                {list.map((x) => <Chip key={x.id} selected={form[key].includes(x.id)} onClick={() => toggleId(key, x.id)}>{x.name}</Chip>)}
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Sizes & inventory">
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <Chip key={s} selected={form.available_sizes.includes(s)} onClick={() => set("available_sizes", form.available_sizes.includes(s) ? form.available_sizes.filter((x) => x !== s) : [...form.available_sizes, s])}>
                {s === "CUSTOM" ? "Custom fit (made to order)" : `Kit ${s}`}
              </Chip>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {["XS", "S", "M", "L"].map((l) => (
              <div key={l} className={cn("rounded-2xl bg-blush-50/60 p-3 ring-1 ring-line", !form.available_sizes.includes(l) && "opacity-50")}>
                <p className="text-[12px] font-bold">Kit {l}</p>
                <Input aria-label={`Stock ${l}`} type="number" min={0} value={form.inventory[l].quantity}
                  onChange={(e) => set("inventory", { ...form.inventory, [l]: { ...form.inventory[l], quantity: Math.max(0, Number(e.target.value)) } })} className="mt-1.5" />
                <p className="mt-1 text-[11px] text-ink-3">Low-stock alert at {form.inventory[l].low_stock_threshold}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <Panel title="Preview">
          <div className="flex aspect-square items-center justify-center rounded-2xl" style={{ background: backdropFor(art?.base ?? "#F8C8D8") }}>
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0].url} alt="" className="size-full rounded-2xl object-cover" />
            ) : art && <NailSetArt art={art} className="w-[92%]" />}
          </div>
          <p className="mt-2 text-[12px] text-ink-3">Until you upload photos, the store shows this generated artwork.</p>
        </Panel>
        <Panel title="Photos">
          {!product ? <p className="text-[13px] text-ink-2">Save the product first, then add photos.</p> : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.alt} className="size-full object-cover" />
                    {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-ink px-1.5 text-[9px] font-bold text-white">COVER</span>}
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-ink/40 opacity-0 transition group-hover:opacity-100">
                      {i > 0 && <button type="button" aria-label="Make cover" onClick={() => makeCover(img.id)} className="flex size-8 items-center justify-center rounded-full bg-white"><Star className="size-4" /></button>}
                      <button type="button" aria-label="Delete photo" onClick={async () => { await api(`/admin/products/${product.id}/images/${img.id}`, { method: "DELETE" }); setImages(images.filter((x) => x.id !== img.id)); }}
                        className="flex size-8 items-center justify-center rounded-full bg-white text-danger"><X className="size-4" /></button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-[11px] font-semibold text-ink-2 hover:border-pink">
                  <ImagePlus className="size-5 text-pink" /> Add
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
              <p className="mt-2 text-[11.5px] text-ink-3">JPG, PNG or WebP up to 8 MB. Re-encoded to WebP, metadata stripped.</p>
            </>
          )}
        </Panel>
        <Panel>
          <div className="space-y-3">
            <Toggle checked={form.is_active} onChange={(v) => set("is_active", v)} label="Visible in the shop" />
            <Toggle checked={form.is_featured} onChange={(v) => set("is_featured", v)} label="Featured on the homepage" />
          </div>
          {errors && <p className="mt-4 text-[13px] font-medium text-danger" role="alert">{errors}</p>}
          <div className="mt-5 flex gap-2">
            <Button className="flex-1" loading={busy} disabled={!canSave} onClick={save}>{product ? "Save changes" : "Create product"}</Button>
            {product && <Button variant="danger" onClick={remove} aria-label="Delete product" icon={<Trash2 className="size-4" />} />}
          </div>
        </Panel>
      </div>
    </div>
  );
}
