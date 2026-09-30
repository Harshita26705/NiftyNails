"use client";

import { useState } from "react";
import { PageHeader, Panel, useApi } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { FINGERS, type Finger, type NailSize, type SizeKit } from "@/lib/types";

export default function Sizes() {
  const sizes = useApi<NailSize[]>("/admin/nail-sizes");
  const kits = useApi<SizeKit[]>("/admin/size-kits");
  const { toast } = useToast();
  const [rows, setRows] = useState<NailSize[]>([]);
  const [kitRows, setKitRows] = useState<SizeKit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ sizes: NailSize[] | null; kits: SizeKit[] | null }>({ sizes: null, kits: null });
  if (sizes.data && sizes.data !== loaded.sizes) {
    setLoaded((l) => ({ ...l, sizes: sizes.data }));
    setRows(sizes.data);
  }
  if (kits.data && kits.data !== loaded.kits) {
    setLoaded((l) => ({ ...l, kits: kits.data }));
    setKitRows(kits.data);
  }

  const saveSizes = async () => {
    setError(null);
    try {
      await api("/admin/nail-sizes", { method: "PUT", body: rows });
      toast("Nail sizes saved — photo sizing uses these immediately");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't save"); }
  };
  const saveKits = async () => {
    try {
      await api("/admin/size-kits", { method: "PUT", body: kitRows });
      toast("Size kits saved");
    } catch (e) { toast(e instanceof ApiError ? e.message : "Couldn't save", { tone: "error" }); }
  };
  const cell = "h-10 w-full min-w-16 rounded-xl bg-surface px-2 text-center tabular-nums ring-1 ring-line outline-none focus:ring-2 focus:ring-pink";

  return (
    <div>
      <PageHeader title="Nail sizes" subtitle="The real dimensions of your press-ons. Photo sizing maps each measured nail to the closest size here." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Sizes 0–9 (0 = widest)" action={<Button size="sm" onClick={saveSizes}>Save</Button>}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11px] font-bold tracking-wide text-ink-2 uppercase"><th className="py-2">Size</th><th className="py-2">Width (mm)</th><th className="py-2">Length (mm)</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.size}>
                    <td className="py-1.5 font-display text-xl">{r.size}</td>
                    <td className="py-1.5 pr-3"><input aria-label={`Size ${r.size} width`} type="number" step="0.1" className={cell} value={r.width_mm} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, width_mm: Number(e.target.value) } : x)))} /></td>
                    <td className="py-1.5"><input aria-label={`Size ${r.size} length`} type="number" step="0.1" className={cell} value={r.length_mm ?? ""} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, length_mm: e.target.value ? Number(e.target.value) : null } : x)))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
          <p className="mt-3 text-[12px] text-ink-3">Widths must shrink from size 0 to size 9. Measure the widest point of each nail tip in your kit.</p>
        </Panel>
        <Panel title="Standard kits (XS–L)" action={<Button size="sm" onClick={saveKits}>Save</Button>}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11px] font-bold tracking-wide text-ink-2 uppercase"><th className="py-2">Kit</th>{FINGERS.map((f) => <th key={f} className="py-2 capitalize">{f}</th>)}</tr></thead>
              <tbody>
                {kitRows.map((k, i) => (
                  <tr key={k.label}>
                    <td className="py-1.5 font-display text-xl">{k.label}</td>
                    {FINGERS.map((f: Finger) => (
                      <td key={f} className="py-1.5 pr-2">
                        <select aria-label={`${k.label} ${f}`} className={cell} value={k.fingers[f]} onChange={(e) => setKitRows(kitRows.map((x, j) => (j === i ? { ...x, fingers: { ...x.fingers, [f]: Number(e.target.value) } } : x)))}>
                          {Array.from({ length: 10 }, (_, n) => <option key={n}>{n}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-ink-3">Which size each finger gets in a standard kit. The sizing tool also suggests the closest kit.</p>
        </Panel>
      </div>
    </div>
  );
}
