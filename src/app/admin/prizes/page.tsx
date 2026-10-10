"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ColorField } from "@/components/ColorField";
import { isHex, readableOn } from "@/lib/color";
import { isLive, Prize, PrizeRow, prizeFromRow, prizeToRow, probabilities } from "@/lib/prizes";

interface Stat {
  total: number;
  today: number;
}

interface Draft {
  id: string | null;
  name: string;
  tierLabel: string;
  tierColor: string;
  stock: string; // blank = unlimited
  weight: string;
  active: boolean;
  sortOrder: string;
}

const blank = (order: number): Draft => ({ id: null, name: "", tierLabel: "", tierColor: "#E4E6EC", stock: "", weight: "1", active: true, sortOrder: String(order) });
const inputCls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";

export default function PrizesPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [stats, setStats] = useState<Map<string, Stat>>(new Map());
  const [threshold, setThreshold] = useState(5);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [restock, setRestock] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [p, st, se] = await Promise.all([
      supabase.from("draw_prizes").select("*").order("sort_order").order("created_at"),
      supabase.rpc("draw_prize_stats"),
      supabase.from("draw_settings").select("low_stock_threshold").eq("id", 1).single(),
    ]);
    setPrizes(((p.data ?? []) as PrizeRow[]).map(prizeFromRow));
    setStats(new Map(((st.data ?? []) as { prize_id: string; total: number; today: number }[]).map((r) => [r.prize_id, { total: Number(r.total), today: Number(r.today) }])));
    if (se.data) setThreshold((se.data as { low_stock_threshold: number }).low_stock_threshold);
    if (p.error) setError(p.error.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const odds = probabilities(prizes);
  const anyLive = prizes.some(isLive);

  async function saveDraft() {
    if (!draft) return;
    const weight = Number(draft.weight);
    const stock = draft.stock.trim() === "" ? null : Number(draft.stock);
    if (!draft.name.trim()) return setError("Give the prize a name.");
    if (!Number.isInteger(weight) || weight < 0) return setError("Weight must be a whole number, 0 or more.");
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) return setError("Stock must be a whole number, 0 or more — or leave it blank for unlimited.");
    if (!isHex(draft.tierColor)) return setError("The tag colour is not a valid colour code.");
    setError("");
    const row = prizeToRow({
      name: draft.name.trim(),
      tierLabel: draft.tierLabel.trim(),
      tierColor: draft.tierColor,
      stock,
      weight,
      active: draft.active,
      sortOrder: Number(draft.sortOrder) || 0,
    });
    const supabase = createClient();
    const { error: err } = draft.id ? await supabase.from("draw_prizes").update(row).eq("id", draft.id) : await supabase.from("draw_prizes").insert(row);
    if (err) return setError(err.message);
    setDraft(null);
    load();
  }

  async function toggleActive(p: Prize) {
    const { error: err } = await createClient().from("draw_prizes").update({ active: !p.active }).eq("id", p.id);
    if (err) setError(err.message);
    load();
  }

  async function doRestock(p: Prize, amount: number) {
    if (!amount) return;
    const { error: err } = await createClient().rpc("draw_restock", { p_id: p.id, p_amount: amount });
    if (err) setError(err.message);
    else setError("");
    setRestock((r) => ({ ...r, [p.id]: "" }));
    load();
  }

  async function remove(p: Prize) {
    if (!confirm(`Delete "${p.name}"? Past draw records keep its name. (You can also just switch it off.)`)) return;
    const { error: err } = await createClient().from("draw_prizes").delete().eq("id", p.id);
    if (err) setError(err.message);
    load();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Prizes</h1>
        <button onClick={() => setDraft(blank((prizes.at(-1)?.sortOrder ?? 0) + 1))} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          + Add prize
        </button>
      </div>

      {!anyLive && prizes.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No prize can be won right now — customers will see the sold-out message.</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {draft && (
        <div className="rounded-2xl border border-slate-300 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">{draft.id ? "Edit prize" : "New prize"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Name
              <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="RM50 Purchase Voucher" />
            </label>
            <label className="text-sm text-slate-700">
              Tier tag (shown above the prize name)
              <input className={inputCls} value={draft.tierLabel} onChange={(e) => setDraft({ ...draft, tierLabel: e.target.value })} placeholder="1ST PRIZE" />
            </label>
            <label className="text-sm text-slate-700">
              Stock (leave blank = unlimited)
              <input type="number" min={0} className={inputCls} value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
            </label>
            <label className="text-sm text-slate-700">
              Weight (relative chance, not a percentage)
              <input type="number" min={0} className={inputCls} value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })} />
            </label>
            <label className="text-sm text-slate-700">
              Sort order (list only)
              <input type="number" className={inputCls} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} />
            </label>
            <div className="flex flex-col justify-end gap-3">
              <ColorField label="Tag colour" value={draft.tierColor} onChange={(v) => setDraft({ ...draft, tierColor: v })} />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Enabled
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={saveDraft} className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white">
              Save
            </button>
            <button
              onClick={() => {
                setDraft(null);
                setError("");
              }}
              className="rounded-xl border border-slate-300 px-5 py-2 text-sm text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">On</th>
              <th className="px-3 py-2">Prize</th>
              <th className="px-3 py-2">Stock left</th>
              <th className="px-3 py-2">Won (today / all)</th>
              <th className="px-3 py-2">Weight</th>
              <th className="px-3 py-2">Real chance now</th>
              <th className="px-3 py-2">Restock</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {prizes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  No prizes yet.
                </td>
              </tr>
            )}
            {prizes.map((p) => {
              const st = stats.get(p.id);
              const low = p.stock !== null && p.stock <= threshold;
              const chance = odds.get(p.id) ?? 0;
              return (
                <tr key={p.id} className={`border-t border-slate-100 ${p.active ? "" : "opacity-50"}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={p.active} onChange={() => toggleActive(p)} aria-label="Enabled" />
                  </td>
                  <td className="px-3 py-2">
                    {p.tierLabel && (
                      <span className="mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: p.tierColor, color: readableOn(p.tierColor) }}>
                        {p.tierLabel}
                      </span>
                    )}
                    <span className="font-medium text-slate-900">{p.name}</span>
                  </td>
                  <td className={`px-3 py-2 ${low ? "font-semibold text-red-600" : ""}`}>
                    {p.stock === null ? "∞ unlimited" : p.stock}
                    {low && p.stock !== null && <span className="ml-1 text-xs">{p.stock === 0 ? "(out)" : "(low)"}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {st?.today ?? 0} / {st?.total ?? 0}
                  </td>
                  <td className="px-3 py-2">{p.weight}</td>
                  <td className="px-3 py-2">{(chance * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">
                    {p.stock === null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <button onClick={() => doRestock(p, 10)} className="rounded border border-slate-300 px-2 py-0.5 text-xs">
                          +10
                        </button>
                        <input
                          type="number"
                          value={restock[p.id] ?? ""}
                          onChange={(e) => setRestock((r) => ({ ...r, [p.id]: e.target.value }))}
                          placeholder="+N"
                          className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                        />
                        <button onClick={() => doRestock(p, Number(restock[p.id]) || 0)} className="rounded bg-slate-900 px-2 py-0.5 text-xs text-white">
                          Add
                        </button>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button
                      className="mr-3 text-xs text-slate-600 underline"
                      onClick={() => setDraft({ id: p.id, name: p.name, tierLabel: p.tierLabel, tierColor: p.tierColor, stock: p.stock === null ? "" : String(p.stock), weight: String(p.weight), active: p.active, sortOrder: String(p.sortOrder) })}
                    >
                      Edit
                    </button>
                    <button className="text-xs text-red-600 underline" onClick={() => remove(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        &ldquo;Real chance now&rdquo; = this prize&rsquo;s weight ÷ the total weight of prizes that are enabled and still in stock. When a prize runs out its chance becomes 0 and the others share it. Stock changes the moment someone wins.
      </p>
    </div>
  );
}
