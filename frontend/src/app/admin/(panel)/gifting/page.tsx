"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader, Panel, Table, Toggle, useApi } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { useCatalog } from "@/lib/catalog";
import { cn, money } from "@/lib/format";

type Item = { id: number; slug: string; name: string; item_type: string; description: string; price_paise: number; stock: number; image_url: string | null; tags: string[]; is_personalisable: boolean; is_active: boolean };
type Bundle = { id: number; slug: string; name: string; description: string; bundle_price_paise: number | null; price_paise: number; parts_total_paise: number; product_id: number | null; tags: string[]; is_active: boolean; items: { item_id: number; name: string; quantity: number }[] };

const TYPES = ["box", "card", "care", "accessory", "packaging"];
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function Gifting() {
  const items = useApi<Item[]>("/admin/gift-items");
  const bundles = useApi<Bundle[]>("/admin/gift-bundles");
  const catalog = useCatalog();
  const { toast } = useToast();
  const [item, setItem] = useState<(Item & { tagText: string }) | null>(null);
  const [bundle, setBundle] = useState<(Bundle & { tagText: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<{ id: number; name: string; price_paise: number }[] | null>(null);

  const loadProducts = async () => {
    if (allProducts) return;
    const page = await api<{ items: { id: number; name: string; price_paise: number }[] }>("/products", { query: { page_size: 48 } });
    setAllProducts(page.items);
  };

  const saveItem = async () => {
    if (!item) return;
    setError(null);
    const { id, tagText, ...rest } = item;
    try {
      await api(`/admin/gift-items${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: { ...rest, tags: tagText.split(",").map((t) => t.trim()).filter(Boolean) } });
      toast("Saved");
      setItem(null);
      await items.reload();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't save"); }
  };
  const saveBundle = async () => {
    if (!bundle) return;
    setError(null);
    const { id, tagText, items: parts, ...rest } = bundle;
    try {
      await api(`/admin/gift-bundles${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: {
        slug: rest.slug, name: rest.name, description: rest.description, bundle_price_paise: rest.bundle_price_paise, product_id: rest.product_id,
        is_active: rest.is_active, tags: tagText.split(",").map((t) => t.trim()).filter(Boolean), items: parts.map((p) => ({ item_id: p.item_id, quantity: p.quantity })),
      } });
      toast("Bundle saved");
      setBundle(null);
      await bundles.reload();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't save"); }
  };

  const parts = (b: Bundle) => {
    const product = allProducts?.find((p) => p.id === b.product_id)?.price_paise ?? 0;
    return product + b.items.reduce((s, x) => s + (items.data?.find((i) => i.id === x.item_id)?.price_paise ?? 0) * x.quantity, 0);
  };

  return (
    <div>
      <PageHeader title="Gifting" subtitle="Add-ons the gift finder can recommend, and curated bundles with bundle pricing." />
      <Panel title="Gift add-ons" action={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => { setError(null); setItem({ id: 0, slug: "", name: "", item_type: "box", description: "", price_paise: 0, stock: 0, image_url: null, tags: [], is_personalisable: false, is_active: true, tagText: "" }); }}>Add item</Button>}>
        <Table head={["Item", "Type", "Price", "Stock", "Matches interests", "Status"]} empty={items.data?.length === 0}>
          {items.data?.map((g) => (
            <tr key={g.id} className="cursor-pointer hover:bg-blush-50/60" onClick={() => { setError(null); setItem({ ...g, tagText: g.tags.join(", ") }); }}>
              <td className="px-4 py-2.5 font-semibold">{g.name}{g.is_personalisable && <span className="ml-2 text-[11px] font-bold text-pink">PERSONALISABLE</span>}</td>
              <td className="px-4 py-2.5 capitalize">{g.item_type}</td>
              <td className="px-4 py-2.5 tabular-nums">{money(g.price_paise)}</td>
              <td className={cn("px-4 py-2.5 tabular-nums", g.stock <= 5 && "font-bold text-danger")}>{g.stock}</td>
              <td className="max-w-xs px-4 py-2.5 text-[12.5px] text-ink-2"><span className="line-clamp-1">{g.tags.join(", ")}</span></td>
              <td className="px-4 py-2.5"><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", g.is_active ? "bg-mint text-success" : "bg-line text-ink-2")}>{g.is_active ? "Active" : "Archived"}</span></td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel className="mt-5" title="Curated bundles" action={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => { setError(null); void loadProducts(); setBundle({ id: 0, slug: "", name: "", description: "", bundle_price_paise: null, price_paise: 0, parts_total_paise: 0, product_id: null, tags: [], is_active: true, items: [], tagText: "" }); }}>Add bundle</Button>}>
        <div className="grid gap-3 md:grid-cols-2">
          {bundles.data?.map((b) => (
            <button key={b.id} onClick={() => { setError(null); void loadProducts(); setBundle({ ...b, tagText: b.tags.join(", ") }); }} className="rounded-2xl bg-blush-50/60 p-4 text-left ring-1 ring-line hover:ring-pink">
              <div className="flex items-baseline justify-between"><p className="font-semibold">{b.name}</p><p className="font-display text-xl">{money(b.price_paise)}</p></div>
              <p className="mt-1 text-[12.5px] text-ink-2">{b.items.map((x) => x.name).join(" · ")}</p>
              {b.parts_total_paise > b.price_paise && <p className="mt-1 text-[12px] font-semibold text-success">Saves {money(b.parts_total_paise - b.price_paise)}</p>}
            </button>
          ))}
        </div>
      </Panel>

      <Sheet open={!!item} onClose={() => setItem(null)} title={item?.id ? "Edit gift item" : "New gift item"} footer={<Button full onClick={saveItem} disabled={!item?.name || !item?.slug}>Save</Button>}>
        {item && (
          <div className="space-y-4">
            <Input label="Name" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value, slug: item.id ? item.slug : slugify(e.target.value) })} />
            <Input label="Slug" value={item.slug} onChange={(e) => setItem({ ...item, slug: slugify(e.target.value) })} />
            <Select label="Type" value={item.item_type} onChange={(e) => setItem({ ...item, item_type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Price (₹)" type="number" min={0} value={item.price_paise / 100} onChange={(e) => setItem({ ...item, price_paise: Math.round(Number(e.target.value) * 100) })} />
              <Input label="Stock" type="number" min={0} value={item.stock} onChange={(e) => setItem({ ...item, stock: Number(e.target.value) })} />
            </div>
            <Textarea label="Description" rows={2} value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
            <Input label="Interest keywords" value={item.tagText} onChange={(e) => setItem({ ...item, tagText: e.target.value })} hint="Comma-separated — e.g. barbie, makeup, self care. The gift finder matches these." />
            <Toggle checked={item.is_personalisable} onChange={(v) => setItem({ ...item, is_personalisable: v })} label="Customer can add a message" />
            <Toggle checked={item.is_active} onChange={(v) => setItem({ ...item, is_active: v })} label="Active" />
            {error && <p className="text-[13px] text-danger">{error}</p>}
          </div>
        )}
      </Sheet>

      <Sheet open={!!bundle} onClose={() => setBundle(null)} title={bundle?.id ? "Edit bundle" : "New bundle"} size="lg" footer={<Button full onClick={saveBundle} disabled={!bundle?.name || !bundle?.slug}>Save bundle</Button>}>
        {bundle && (
          <div className="space-y-4">
            <Input label="Name" value={bundle.name} onChange={(e) => setBundle({ ...bundle, name: e.target.value, slug: bundle.id ? bundle.slug : slugify(e.target.value) })} />
            <Input label="Slug" value={bundle.slug} onChange={(e) => setBundle({ ...bundle, slug: slugify(e.target.value) })} />
            <Select label="Nail set" value={bundle.product_id ?? ""} onChange={(e) => setBundle({ ...bundle, product_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">No nail set</option>
              {(allProducts ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price_paise)}</option>)}
            </Select>
            <div>
              <p className="mb-2 text-[13px] font-semibold">Add-ons</p>
              <div className="flex flex-wrap gap-2">
                {items.data?.map((g) => {
                  const sel = bundle.items.some((x) => x.item_id === g.id);
                  return <Chip key={g.id} selected={sel} onClick={() => setBundle({ ...bundle, items: sel ? bundle.items.filter((x) => x.item_id !== g.id) : [...bundle.items, { item_id: g.id, name: g.name, quantity: 1 }] })}>{g.name} · {money(g.price_paise)}</Chip>;
                })}
              </div>
            </div>
            <div className="rounded-2xl bg-blush-50 p-3 text-[13px]">Parts total: <b>{money(parts(bundle))}</b></div>
            <Input label="Bundle price (₹, leave empty to use parts total)" type="number" min={0} value={bundle.bundle_price_paise === null ? "" : bundle.bundle_price_paise / 100}
              onChange={(e) => setBundle({ ...bundle, bundle_price_paise: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) })} />
            <Textarea label="Description" rows={2} value={bundle.description} onChange={(e) => setBundle({ ...bundle, description: e.target.value })} />
            <Input label="Interest keywords" value={bundle.tagText} onChange={(e) => setBundle({ ...bundle, tagText: e.target.value })} />
            <Toggle checked={bundle.is_active} onChange={(v) => setBundle({ ...bundle, is_active: v })} label="Active" />
            {error && <p className="text-[13px] text-danger">{error}</p>}
            {catalog === null && null}
          </div>
        )}
      </Sheet>
    </div>
  );
}
