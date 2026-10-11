"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseDelimited } from "@/lib/csv";
import { ColorField } from "@/components/ColorField";
import { isHex } from "@/lib/color";

interface ImportRow {
  name: string;
  stock: number | null;
  weight: number | null; // null = use the weight rule below
  tier: string | null;
  tierColor: string | null;
}

const NAME_HEADERS = ["description", "name", "prize", "item", "prize name", "item name"];
const STOCK_HEADERS = ["total bal. qty", "total bal qty", "stock", "qty", "quantity", "balance"];
const WEIGHT_HEADERS = ["weight"];
const TIER_HEADERS = ["tier", "tier label", "tier tag", "level"];
const COLOR_HEADERS = ["tier color", "tier colour", "color", "colour"];

const find = (header: string[], names: string[]) => header.findIndex((h) => names.includes(h.trim().toLowerCase()));
const inputCls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";

export default function ImportPrizesPage() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [weightRule, setWeightRule] = useState<"equal" | "stock" | "fixed">("equal");
  const [fixedWeight, setFixedWeight] = useState("1");
  const [stockCap, setStockCap] = useState("");
  const [defaultTier, setDefaultTier] = useState("LUCKY GIFT");
  const [defaultColor, setDefaultColor] = useState("#E4E6EC");
  const [onExisting, setOnExisting] = useState<"update" | "skip">("update");
  const [existing, setExisting] = useState<Map<string, string>>(new Map());
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    createClient()
      .from("draw_prizes")
      .select("id, name")
      .then(({ data }) => setExisting(new Map((data ?? []).map((r) => [(r.name as string).trim().toUpperCase(), r.id as string]))));
  }, []);

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    const table = parseDelimited(text);
    if (table.length < 2) return { error: "Need a header row and at least one data row.", rows: [] as ImportRow[], dupes: 0, skippedEmpty: 0 };
    const header = table[0];
    const ni = find(header, NAME_HEADERS);
    if (ni < 0) return { error: `Could not find a name column. Use a header called one of: ${NAME_HEADERS.join(", ")}.`, rows: [] as ImportRow[], dupes: 0, skippedEmpty: 0 };
    const si = find(header, STOCK_HEADERS);
    const wi = find(header, WEIGHT_HEADERS);
    const ti = find(header, TIER_HEADERS);
    const ci = find(header, COLOR_HEADERS);
    const seen = new Set<string>();
    const rows: ImportRow[] = [];
    let dupes = 0;
    let skippedEmpty = 0;
    for (const r of table.slice(1)) {
      const name = (r[ni] ?? "").trim().replace(/\s+/g, " ");
      if (!name) {
        skippedEmpty++;
        continue;
      }
      const key = name.toUpperCase();
      if (seen.has(key)) {
        dupes++;
        continue;
      }
      seen.add(key);
      const stockText = si >= 0 ? (r[si] ?? "").trim() : "";
      const stockNum = stockText === "" ? null : Number(stockText.replace(/,/g, ""));
      const weightText = wi >= 0 ? (r[wi] ?? "").trim() : "";
      rows.push({
        name,
        stock: stockNum === null || Number.isNaN(stockNum) ? null : Math.max(0, Math.floor(stockNum)),
        weight: weightText === "" || Number.isNaN(Number(weightText)) ? null : Math.max(0, Math.floor(Number(weightText))),
        tier: ti >= 0 && (r[ti] ?? "").trim() ? r[ti].trim().toUpperCase() : null,
        tierColor: ci >= 0 && isHex((r[ci] ?? "").trim()) ? r[ci].trim().toUpperCase() : null,
      });
    }
    return { error: "", rows, dupes, skippedEmpty, hasStockCol: si >= 0 };
  }, [text]);

  const cap = stockCap.trim() === "" ? null : Math.max(0, Math.floor(Number(stockCap)) || 0);
  const resolved = useMemo(() => {
    if (!parsed || parsed.error) return [];
    return parsed.rows.map((r, i) => {
      const stock = r.stock === null ? null : cap !== null ? Math.min(r.stock, cap) : r.stock;
      const weight = r.weight ?? (weightRule === "equal" ? 1 : weightRule === "fixed" ? Math.max(0, Math.floor(Number(fixedWeight)) || 0) : Math.max(1, stock ?? 1));
      return { ...r, stock, weight, tier: r.tier ?? defaultTier.trim().toUpperCase(), tierColor: r.tierColor ?? defaultColor, sort: i + 1, exists: existing.has(r.name.toUpperCase()) };
    });
  }, [parsed, cap, weightRule, fixedWeight, defaultTier, defaultColor, existing]);

  const newCount = resolved.filter((r) => !r.exists).length;
  const existCount = resolved.length - newCount;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setResult("");
    setText(await file.text());
  }

  async function run() {
    if (!resolved.length || busy) return;
    if (!isHex(defaultColor)) return setError("The default tag colour is not valid.");
    setBusy(true);
    setError("");
    setResult("");
    const supabase = createClient();
    try {
      const toInsert = resolved.filter((r) => !r.exists).map((r) => ({ name: r.name, tier_label: r.tier, tier_color: r.tierColor, stock: r.stock, weight: r.weight, active: true, sort_order: r.sort }));
      for (let i = 0; i < toInsert.length; i += 100) {
        setProgress(`Adding ${Math.min(i + 100, toInsert.length)} / ${toInsert.length}…`);
        const { error: err } = await supabase.from("draw_prizes").insert(toInsert.slice(i, i + 100));
        if (err) throw err;
      }
      let updated = 0;
      if (onExisting === "update") {
        const upd = resolved.filter((r) => r.exists);
        for (const r of upd) {
          setProgress(`Updating ${++updated} / ${upd.length}…`);
          const { error: err } = await supabase
            .from("draw_prizes")
            .update({ tier_label: r.tier, tier_color: r.tierColor, stock: r.stock, weight: r.weight })
            .eq("id", existing.get(r.name.toUpperCase())!);
          if (err) throw err;
        }
      }
      setResult(`Done: ${toInsert.length} added, ${onExisting === "update" ? updated : 0} updated, ${onExisting === "skip" ? existCount : 0} skipped.`);
      setText("");
      setFileName("");
      const { data } = await supabase.from("draw_prizes").select("id, name");
      setExisting(new Map((data ?? []).map((r) => [(r.name as string).trim().toUpperCase(), r.id as string])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed — part of the list may already have been added; run it again to finish (existing names are matched).");
    }
    setProgress("");
    setBusy(false);
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Import prizes</h1>
        <Link href="/admin/prizes" className="text-sm text-slate-600 underline">
          ← Back to prizes
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">1. Your list</h2>
        <p className="mb-3 text-sm text-slate-600">
          In Excel: <b>File → Save As → CSV (UTF-8)</b>, then choose the file here. Or copy the rows <i>including the header row</i> from Excel and paste them below. Columns it understands:{" "}
          <b>Description</b> (name), <b>Total Bal. Qty</b> (stock), and optionally <b>Weight</b>, <b>Tier</b>, <b>Tier Color</b>. Other columns are ignored.
        </p>
        <div className="mb-3 flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
            Choose file…
          </button>
          <span className="text-sm text-slate-500">{fileName || "No file chosen"}</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult("");
          }}
          rows={6}
          placeholder="…or paste rows here"
          className={`${inputCls} font-mono text-xs`}
        />
        {parsed?.error && <p className="mt-2 text-sm text-red-600">{parsed.error}</p>}
      </section>

      {parsed && !parsed.error && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">2. Options</h2>
            <p className="mb-3 text-xs text-slate-500">Weight, tier tag and colour below are only used for rows where your file does not provide them. A stock cap, if set, applies to every row.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium text-slate-800">Weight (when the file has no Weight column)</p>
                {(
                  [
                    ["equal", "Equal — every prize has weight 1"],
                    ["stock", "Same as its stock (bigger stock = more likely)"],
                    ["fixed", "A fixed number for all"],
                  ] as const
                ).map(([v, label]) => (
                  <label key={v} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="radio" checked={weightRule === v} onChange={() => setWeightRule(v)} /> {label}
                  </label>
                ))}
                {weightRule === "fixed" && <input type="number" min={0} value={fixedWeight} onChange={(e) => setFixedWeight(e.target.value)} className={`${inputCls} mt-2 w-28`} />}
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-sm text-slate-700">
                  Cap each prize&rsquo;s stock at (optional)
                  <input type="number" min={0} value={stockCap} onChange={(e) => setStockCap(e.target.value)} placeholder="e.g. 5" className={inputCls} />
                </label>
                <label className="text-sm text-slate-700">
                  Tier tag for rows without one
                  <input value={defaultTier} onChange={(e) => setDefaultTier(e.target.value)} className={inputCls} />
                </label>
                <ColorField label="Tag colour" value={defaultColor} onChange={setDefaultColor} />
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-1 text-sm font-medium text-slate-800">If a prize with the same name already exists</p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" checked={onExisting === "update"} onChange={() => setOnExisting("update")} /> Update it (stock, weight, tier)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" checked={onExisting === "skip"} onChange={() => setOnExisting("skip")} /> Leave it as it is
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">3. Check and import</h2>
            <p className="mb-3 text-sm text-slate-700">
              <b>{resolved.length}</b> prizes read · <b>{newCount}</b> new · <b>{existCount}</b> already exist
              {parsed.dupes > 0 && <> · {parsed.dupes} duplicate name(s) in the file ignored</>}
              {parsed.skippedEmpty > 0 && <> · {parsed.skippedEmpty} blank row(s) ignored</>}
            </p>
            {!parsed.hasStockCol && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">No stock column found — these prizes will have unlimited stock.</p>}
            <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-left uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">Name</th>
                    <th className="px-2 py-1.5">Tier</th>
                    <th className="px-2 py-1.5">Stock</th>
                    <th className="px-2 py-1.5">Weight</th>
                    <th className="px-2 py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resolved.map((r) => (
                    <tr key={r.name} className="border-t border-slate-100">
                      <td className="px-2 py-1">{r.name}</td>
                      <td className="px-2 py-1">{r.tier}</td>
                      <td className="px-2 py-1">{r.stock === null ? "∞" : r.stock}</td>
                      <td className="px-2 py-1">{r.weight}</td>
                      <td className="px-2 py-1 text-slate-500">{r.exists ? (onExisting === "update" ? "update" : "skip") : "new"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={run} disabled={busy || resolved.length === 0} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                {busy ? progress || "Importing…" : `Import ${resolved.length} prizes`}
              </button>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </section>
        </>
      )}
      {result && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{result}</p>}
    </div>
  );
}
