"use client";

import { useState } from "react";
import { BarList, SalesChart } from "@/components/admin/charts";
import { PageHeader, Panel, StatTile, useApi } from "@/components/admin/ui";
import { Segmented } from "@/components/ui/bits";
import { money } from "@/lib/format";
import type { Dashboard } from "../page";

const RANGES = [{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "365", label: "1 year" }];

export default function Analytics() {
  const [days, setDays] = useState("30");
  const { data } = useApi<Dashboard>("/admin/dashboard", { days });
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Sales, what's popular, and how the AI features convert."
        actions={<Segmented value={days} onChange={setDays} options={RANGES} />} />
      {!data ? <div className="skeleton h-80 rounded-2xl" /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={`Revenue (${days}d)`} value={money(data.period_sales_paise)} />
            <StatTile label={`Orders (${days}d)`} value={data.period_orders} />
            <StatTile label="AI sessions" value={data.ai_requests} hint="Search, stylist, chat & gift" />
            <StatTile label="AI → purchase" value={`${(data.ai_conversion_rate * 100).toFixed(1)}%`} hint={`${data.ai_conversions} converted`} tone="pink" />
          </div>
          <Panel title="Revenue"><SalesChart data={data.sales_by_day} height={300} /></Panel>
          <div className="grid gap-5 lg:grid-cols-3">
            <Panel title="Best-selling designs">
              <BarList rows={data.popular_designs.map((d) => ({ label: d.name, value: d.revenue_paise, sub: `${d.units} sold` }))} format={money} empty="No sales yet." />
            </Panel>
            <Panel title="Most-used charms"><BarList rows={data.popular_charms.map((c) => ({ label: c.name, value: c.uses }))} /></Panel>
            <Panel title="Most-loved colours"><BarList rows={data.popular_colours.map((c) => ({ label: c.name, value: c.uses, swatch: c.hex }))} /></Panel>
          </div>
        </div>
      )}
    </div>
  );
}
