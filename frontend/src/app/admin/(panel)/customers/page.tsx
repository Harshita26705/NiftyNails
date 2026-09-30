"use client";

import { useState } from "react";
import { PageHeader, Pager, SearchBox, Table, useApi } from "@/components/admin/ui";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { cn, dateShort, money } from "@/lib/format";
import type { Page } from "@/lib/types";

type Customer = { id: number; email: string; full_name: string; phone: string | null; role: string; is_active: boolean; orders: number; lifetime_value_paise: number; created_at: string };

export default function Customers() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, reload } = useApi<Page<Customer>>("/admin/customers", { q: q || undefined, page, page_size: 25 });
  const { toast } = useToast();
  const update = async (c: Customer, body: Record<string, unknown>) => {
    try {
      await api(`/admin/customers/${c.id}`, { method: "PATCH", body });
      toast("Updated");
      await reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't update", { tone: "error" });
    }
  };
  return (
    <div>
      <PageHeader title="Customers" subtitle={data ? `${data.total} accounts` : " "} actions={<SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name or email" />} />
      <Table head={["Customer", "Joined", "Orders", "Lifetime value", "Role", "Access"]} empty={data?.items.length === 0}>
        {data?.items.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3"><p className="font-semibold">{c.full_name}</p><p className="text-[12px] text-ink-3">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p></td>
            <td className="px-4 py-3 text-ink-2">{dateShort(c.created_at)}</td>
            <td className="px-4 py-3 tabular-nums">{c.orders}</td>
            <td className="px-4 py-3 font-semibold tabular-nums">{money(c.lifetime_value_paise)}</td>
            <td className="px-4 py-3">
              <select aria-label={`Role for ${c.email}`} value={c.role} onChange={(e) => update(c, { role: e.target.value })}
                className="rounded-full bg-surface px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-line">
                <option value="customer">Customer</option><option value="staff">Staff</option><option value="admin">Admin</option>
              </select>
            </td>
            <td className="px-4 py-3">
              <button onClick={() => update(c, { is_active: !c.is_active })}
                className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", c.is_active ? "bg-mint text-success" : "bg-danger/10 text-danger")}>
                {c.is_active ? "Active" : "Blocked"}
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {data && <Pager page={page} pageSize={25} total={data.total} onPage={setPage} />}
      <p className="mt-3 text-[12px] text-ink-3">Only owners (admin role) can change roles or block accounts. Blocking signs the person out everywhere.</p>
    </div>
  );
}
