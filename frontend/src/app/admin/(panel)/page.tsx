"use client";

import { AlertTriangle, ArrowRight, Bot, Boxes, Gem, Wand2 } from "lucide-react";
import Link from "next/link";
import { BarList, SalesChart } from "@/components/admin/charts";
import { PageHeader, Panel, StatTile, useApi } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";
import { money, ORDER_STATUS_LABEL } from "@/lib/format";

export type Dashboard = {
  period_days: number;
  total_sales_paise: number;
  orders: number;
  period_sales_paise: number;
  period_orders: number;
  average_order_value_paise: number;
  pending_orders: number;
  design_review_orders: number;
  custom_orders: number;
  customers: number;
  designs_awaiting_review: number;
  ai_requests: number;
  ai_conversions: number;
  ai_conversion_rate: number;
  ai_needs_review: number;
  low_stock_variants: number;
  low_stock_charms: number;
  popular_designs: { id: number; name: string; slug: string; units: number; revenue_paise: number }[];
  popular_charms: { slug: string; name: string; uses: number }[];
  popular_colours: { slug: string; name: string; hex: string; uses: number }[];
  sales_by_day: { date: string; sales_paise: number; orders: number }[];
  status_breakdown: Record<string, number>;
};

export default function AdminDashboard() {
  const { data, error } = useApi<Dashboard>("/admin/dashboard", { days: 30 });
  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>;

  const attention = [
    data.design_review_orders > 0 && { href: "/admin/orders?status=DESIGN_REVIEW", icon: Wand2, text: `${data.design_review_orders} order${data.design_review_orders > 1 ? "s" : ""} waiting for design review` },
    data.designs_awaiting_review > 0 && { href: "/admin/designs", icon: Wand2, text: `${data.designs_awaiting_review} submitted custom design${data.designs_awaiting_review > 1 ? "s" : ""}` },
    data.ai_needs_review > 0 && { href: "/admin/ai-requests?needs_review=true", icon: Bot, text: `${data.ai_needs_review} AI request${data.ai_needs_review > 1 ? "s" : ""} flagged (unavailable items / low confidence)` },
    data.low_stock_variants > 0 && { href: "/admin/inventory", icon: Boxes, text: `${data.low_stock_variants} size kit${data.low_stock_variants > 1 ? "s" : ""} low on stock` },
    data.low_stock_charms > 0 && { href: "/admin/inventory", icon: Gem, text: `${data.low_stock_charms} charm${data.low_stock_charms > 1 ? "s" : ""} running low` },
  ].filter(Boolean) as { href: string; icon: typeof Wand2; text: string }[];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="How Nifty Nails is doing right now." actions={<ButtonLink href="/admin/products/new" size="sm">Add product</ButtonLink>} />

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatTile label="Total sales" value={money(data.total_sales_paise)} hint={`${money(data.period_sales_paise)} in the last ${data.period_days} days`} />
        <StatTile label="Orders" value={data.orders} hint={`${data.period_orders} in the last ${data.period_days} days`} />
        <StatTile label="Average order value" value={money(data.average_order_value_paise)} />
        <StatTile label="Pending orders" value={data.pending_orders} tone={data.pending_orders ? "pink" : undefined} hint="Not yet shipped" />
        <StatTile label="Custom orders" value={data.custom_orders} />
        <StatTile label="Customers" value={data.customers} />
        <StatTile label="AI → purchase" value={`${(data.ai_conversion_rate * 100).toFixed(1)}%`} hint={`${data.ai_conversions} of ${data.ai_requests} AI sessions ordered`} />
        <StatTile label="Designs to review" value={data.designs_awaiting_review} tone={data.designs_awaiting_review ? "warn" : undefined} />
      </div>

      {attention.length > 0 && (
        <Panel className="mt-5" title={<span className="flex items-center gap-2"><AlertTriangle className="size-4 text-warning" /> Needs attention</span>}>
          <ul className="divide-y divide-line">
            {attention.map((a) => (
              <li key={a.text}>
                <Link href={a.href} className="flex items-center gap-3 py-2.5 text-[13.5px] hover:text-pink">
                  <a.icon className="size-4 text-ink-3" /> {a.text} <ArrowRight className="ml-auto size-4 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Sales"><SalesChart data={data.sales_by_day} /></Panel>
        <Panel title="Orders by status">
          <BarList rows={Object.entries(data.status_breakdown).map(([s, n]) => ({ label: ORDER_STATUS_LABEL[s] ?? s, value: n }))} />
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Popular designs" action={<Link href="/admin/analytics" className="text-[12.5px] font-semibold text-pink">Analytics →</Link>}>
          <BarList rows={data.popular_designs.map((d) => ({ label: d.name, value: d.units, sub: money(d.revenue_paise) }))} format={(v) => `${v} sold`} empty="No sales yet." />
        </Panel>
        <Panel title="Popular charms">
          <BarList rows={data.popular_charms.map((c) => ({ label: c.name, value: c.uses }))} format={(v) => `${v} used`} empty="No charms used yet." />
        </Panel>
        <Panel title="Popular colours">
          <BarList rows={data.popular_colours.map((c) => ({ label: c.name, value: c.uses, swatch: c.hex }))} format={(v) => `${v}`} empty="No data yet." />
        </Panel>
      </div>
    </div>
  );
}
