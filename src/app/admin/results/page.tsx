"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ResultRow {
  id: string;
  prize_name: string;
  tier_label: string;
  kiosk_id: string | null;
  created_at: string;
  voided_at: string | null;
}

const PAGE = 50;
const KL = "Asia/Kuala_Lumpur";
const fmt = (iso: string) => new Date(iso).toLocaleString("en-MY", { timeZone: KL, hour12: false });
const inputCls = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";

export default function ResultsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [prizeName, setPrizeName] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [today, setToday] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Day boundaries are Malaysia time (UTC+8), whatever the browser's timezone.
  const query = useCallback(
    (supabase: ReturnType<typeof createClient>, head = false) => {
      let q = supabase.from("draw_results").select("id, prize_name, tier_label, kiosk_id, created_at, voided_at", head ? { count: "exact", head: true } : { count: "exact" });
      if (from) q = q.gte("created_at", `${from}T00:00:00+08:00`);
      if (to) q = q.lt("created_at", new Date(new Date(`${to}T00:00:00+08:00`).getTime() + 86400000).toISOString());
      if (prizeName) q = q.eq("prize_name", prizeName);
      return q.order("created_at", { ascending: false });
    },
    [from, to, prizeName]
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.from("draw_prizes").select("name").order("sort_order").then(({ data }) => setNames(Array.from(new Set((data ?? []).map((r) => r.name as string)))));
    const start = new Date(new Date().toLocaleDateString("en-CA", { timeZone: KL }) + "T00:00:00+08:00").toISOString();
    supabase.from("draw_results").select("id", { count: "exact", head: true }).gte("created_at", start).then(({ count }) => setToday(count ?? 0));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusy(true);
    query(createClient())
      .range(page * PAGE, page * PAGE + PAGE - 1)
      .then(({ data, count: c, error: err }) => {
        if (err) setError(err.message);
        else setError("");
        setRows((data ?? []) as ResultRow[]);
        setCount(c ?? 0);
        setBusy(false);
      });
  }, [query, page]);

  async function exportCsv() {
    setBusy(true);
    const supabase = createClient();
    const all: ResultRow[] = [];
    for (let i = 0; i < 200; i++) {
      const { data, error: err } = await query(supabase).range(i * 1000, i * 1000 + 999);
      if (err) {
        setError(err.message);
        break;
      }
      all.push(...((data ?? []) as ResultRow[]));
      if (!data || data.length < 1000) break;
    }
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ["Time (Malaysia),Prize,Tier,Kiosk,Voided", ...all.map((r) => [esc(fmt(r.created_at)), esc(r.prize_name), esc(r.tier_label), esc(r.kiosk_id ?? ""), esc(r.voided_at ? "voided" : "")].join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lucky-draw-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
  }

  const pages = Math.max(1, Math.ceil(count / PAGE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Draw results</h1>
          <p className="text-sm text-slate-500">
            Today: <b className="text-slate-900">{today}</b> draws · Matching filter: <b className="text-slate-900">{count}</b>
          </p>
        </div>
        <button onClick={exportCsv} disabled={busy || count === 0} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-600">
          From
          <input
            type="date"
            className={`${inputCls} block`}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="text-xs text-slate-600">
          To
          <input
            type="date"
            className={`${inputCls} block`}
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="text-xs text-slate-600">
          Prize
          <select
            className={`${inputCls} block`}
            value={prizeName}
            onChange={(e) => {
              setPrizeName(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All prizes</option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {(from || to || prizeName) && (
          <button
            className="pb-2 text-sm text-slate-500 underline"
            onClick={() => {
              setFrom("");
              setTo("");
              setPrizeName("");
              setPage(0);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Time (Malaysia)</th>
              <th className="px-3 py-2">Prize</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Kiosk</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                  {busy ? "Loading…" : "No draws match."}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={`border-t border-slate-100 ${r.voided_at ? "text-slate-400 line-through" : ""}`}>
                <td className="whitespace-nowrap px-3 py-2">{fmt(r.created_at)}</td>
                <td className="px-3 py-2 font-medium text-slate-900">
                  {r.prize_name}
                  {r.voided_at && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500 no-underline">voided</span>}
                </td>
                <td className="px-3 py-2">{r.tier_label}</td>
                <td className="px-3 py-2 text-slate-500">{r.kiosk_id ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">
          ← Newer
        </button>
        <span>
          Page {page + 1} of {pages}
        </span>
        <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">
          Older →
        </button>
      </div>
    </div>
  );
}
