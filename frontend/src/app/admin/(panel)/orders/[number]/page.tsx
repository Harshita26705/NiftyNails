"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PageHeader, Panel, StatusPill, useApi } from "@/components/admin/ui";
import { CharmIcon } from "@/components/nails/charms";
import { DesignHands } from "@/components/nails/DesignHands";
import { NailSetArt } from "@/components/nails/NailSetArt";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { useCatalog } from "@/lib/catalog";
import { dateTime, LENGTH_LABEL, money, ORDER_STATUS_LABEL } from "@/lib/format";
import { FINGERS, type Order } from "@/lib/types";

type Detail = { order: Order; allowed_transitions: string[]; customer: { id: number | null; is_guest: boolean } };

export default function AdminOrder() {
  const { number } = useParams<{ number: string }>();
  const { data, reload } = useApi<Detail>(`/admin/orders/${number}`);
  const catalog = useCatalog();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState("");
  const [courier, setCourier] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (!data) return <div className="skeleton h-96 rounded-2xl" />;
  const { order, allowed_transitions } = data;
  const kits = catalog?.size_kits ?? [];

  const move = async (status: string) => {
    setBusy(status);
    try {
      await api(`/admin/orders/${order.number}/status`, { method: "POST", body: { status, note, tracking_number: tracking || null, courier: courier || null } });
      toast(`Order moved to ${ORDER_STATUS_LABEL[status]}`);
      setNote("");
      await reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't update", { tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const setPayment = async (payment_status: string) => {
    await api(`/admin/orders/${order.number}/payment`, { method: "POST", body: { payment_status } });
    toast("Payment status updated");
    await reload();
  };

  return (
    <div>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink print:hidden"><ArrowLeft className="size-4" /> Orders</Link>
      <PageHeader title={<span className="flex flex-wrap items-center gap-3">{order.number} <StatusPill status={order.status} label={ORDER_STATUS_LABEL[order.status]} /></span>}
        subtitle={`${dateTime(order.created_at)} · ${order.email}${data.customer.is_guest ? " · guest checkout" : ""}`}
        actions={<Button variant="secondary" size="sm" onClick={() => window.print()} icon={<Printer className="size-4" />}>Print production sheet</Button>} />

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {order.items.map((it) => {
            const c = it.customization;
            const fingers = it.sizes?.label === "CUSTOM" ? it.sizes.fingers : kits.find((k) => k.label === it.sizes?.label)?.fingers;
            return (
              <Panel key={it.id} title={<span>{it.name} <span className="font-normal text-ink-2">× {it.quantity}</span></span>}
                action={<span className="text-[13px] font-semibold tabular-nums">{money(it.line_total_paise)}</span>}>
                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                  <div className="rounded-xl bg-blush-50 p-2">
                    {it.snapshot?.config ? <DesignHands config={it.snapshot.config} /> : it.snapshot?.art ? <NailSetArt art={it.snapshot.art} /> : <p className="py-8 text-center text-[12px] text-ink-3">{it.kind.replace("_", " ")}</p>}
                  </div>
                  <div className="space-y-3 text-[13px]">
                    {c && (
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                        {[["Shape", c.shape], ["Length", c.length ? LENGTH_LABEL[c.length] : null], ["Finish", c.finish], ["Base", c.base_colour]].map(([k, v]) => (
                          <div key={k}><dt className="text-[11px] font-bold tracking-wide text-ink-3 uppercase">{k}</dt><dd className="font-semibold">{v ?? "—"}</dd></div>
                        ))}
                      </dl>
                    )}
                    {c && c.charms.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-3 uppercase">Charms (per set)</p>
                        <ul className="flex flex-wrap gap-2">
                          {c.charms.map((ch) => {
                            const asset = catalog?.charms.find((x) => x.slug === ch.type)?.asset_key ?? ch.type;
                            return (
                              <li key={ch.type} className="inline-flex items-center gap-1.5 rounded-full bg-blush-50 py-1 pr-3 pl-1 ring-1 ring-line">
                                <CharmIcon kind={asset} size={22} /> {ch.type.replace(/-/g, " ")} × {ch.quantity}
                                {ch.nails && <span className="text-ink-3">({ch.nails.join(", ")})</span>}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {it.sizes && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-3 uppercase">Sizes · {it.sizes.label === "CUSTOM" ? "custom fit" : `kit ${it.sizes.label}`}</p>
                        {fingers ? (
                          <div className="grid max-w-sm grid-cols-5 gap-1.5 text-center">
                            {FINGERS.map((f) => <div key={f} className="rounded-lg bg-blush-50 py-1.5"><p className="font-display text-lg leading-none">{fingers[f]}</p><p className="text-[10px] text-ink-2 capitalize">{f}</p></div>)}
                          </div>
                        ) : <p className="text-ink-2">Full kit (sizes 0–9)</p>}
                      </div>
                    )}
                    {c?.notes && <p className="rounded-xl bg-champagne/60 px-3 py-2"><b>Customer brief:</b> {c.notes}</p>}
                    {it.gift_message && <p className="rounded-xl bg-blush-50 px-3 py-2"><b>Card message:</b> “{it.gift_message}”</p>}
                    {it.snapshot?.contents && <p className="text-ink-2">Contains: {it.snapshot.contents.map((x) => `${x.name} × ${x.quantity}`).join(", ")}</p>}
                  </div>
                </div>
              </Panel>
            );
          })}
          {order.notes && <Panel title="Order notes"><p className="text-[13.5px]">{order.notes}</p></Panel>}
        </div>

        <div className="space-y-5 print:hidden">
          <Panel title="Update status">
            {allowed_transitions.length ? (
              <div className="space-y-3">
                {allowed_transitions.includes("SHIPPED") && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Delhivery" />
                    <Input label="Tracking no." value={tracking} onChange={(e) => setTracking(e.target.value)} />
                  </div>
                )}
                <Textarea label="Note to customer (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  {allowed_transitions.map((s) => (
                    <Button key={s} size="sm" variant={s === "CANCELLED" ? "danger" : "primary"} loading={busy === s} onClick={() => move(s)}>
                      {s === "CANCELLED" ? "Cancel & restock" : `Mark ${ORDER_STATUS_LABEL[s].toLowerCase()}`}
                    </Button>
                  ))}
                </div>
              </div>
            ) : <p className="text-[13px] text-ink-2">This order is {ORDER_STATUS_LABEL[order.status].toLowerCase()} — no further steps.</p>}
          </Panel>
          <Panel title="Payment">
            <p className="mb-3 text-[13px] text-ink-2">{order.payment_method === "cod" ? "Cash on delivery" : "UPI (manual)"} · {money(order.total_paise)}</p>
            <Select aria-label="Payment status" value={order.payment_status} onChange={(e) => setPayment(e.target.value)}>
              {["PENDING", "PAID", "FAILED", "REFUNDED"].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Panel>
          <Panel title="Ship to">
            <p className="text-[13.5px] leading-relaxed">{order.shipping.full_name} · {order.shipping.phone}<br />{order.shipping.line1}{order.shipping.line2 ? `, ${order.shipping.line2}` : ""}<br />{order.shipping.city}, {order.shipping.state} {order.shipping.pincode}</p>
          </Panel>
          <Panel title="History">
            <ol className="space-y-3">
              {order.events.map((e, i) => (
                <li key={i} className="text-[13px]"><StatusPill status={e.status} label={ORDER_STATUS_LABEL[e.status]} /> <span className="ml-1 text-ink-3">{dateTime(e.created_at)}</span><p className="mt-1 text-ink-2">{e.note}</p></li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
