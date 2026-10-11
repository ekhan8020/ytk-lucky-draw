"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ColorField } from "@/components/ColorField";
import { isHex } from "@/lib/color";
import { DEFAULT_SETTINGS, DrawSettings, DrawSettingsRow, settingsFromRow, settingsToRow } from "@/lib/settings";
import { Prize, PrizeRow, prizeFromRow } from "@/lib/prizes";

const DEVICES = [
  { id: "phone", label: "Phone", w: 390, h: 780 },
  { id: "ipad-p", label: "iPad portrait", w: 768, h: 1024 },
  { id: "ipad-l", label: "iPad landscape", w: 1024, h: 768 },
] as const;

const inputCls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
    <div className="flex flex-col gap-3">{children}</div>
  </section>
);

export default function SettingsPage() {
  const [form, setForm] = useState<DrawSettings | null>(null);
  const [saved, setSaved] = useState<DrawSettings | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [previewPrize, setPreviewPrize] = useState<string>("sample");
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("ipad-p");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("draw_settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) {
        const s = settingsFromRow(data as DrawSettingsRow);
        setForm(s);
        setSaved(s);
      }
    });
    supabase.from("draw_prizes").select("*").order("sort_order").then(({ data }) => setPrizes(((data ?? []) as PrizeRow[]).map(prizeFromRow)));
  }, []);

  function post() {
    if (!form || !frameRef.current?.contentWindow) return;
    const p = prizes.find((x) => x.id === previewPrize);
    frameRef.current.contentWindow.postMessage(
      {
        type: "ld-preview",
        settings: form,
        soldOut: previewPrize === "soldout",
        prize: p ? { name: p.name, tier: p.tierLabel, color: p.tierColor } : null,
      },
      window.location.origin
    );
  }

  useEffect(() => {
    post();
  });

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "ld-preview-ready") post();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  });

  if (!form) return <p className="text-sm text-slate-500">Loading…</p>;
  const set = <K extends keyof DrawSettings>(k: K, v: DrawSettings[K]) => setForm({ ...form, [k]: v });

  const colorsOk = [form.titleLine1Color, form.titleLine2Color, form.descriptionColor, form.buttonColor, form.buttonTextColor, form.bgColor1, form.bgColor2, form.boxColor, form.ribbonColor, ...(form.bgColor3 ? [form.bgColor3] : [])].every(isHex);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  async function save() {
    if (!form || !colorsOk || busy) return;
    setBusy(true);
    setMsg("");
    const { error } = await createClient()
      .from("draw_settings")
      .update({ ...settingsToRow(form), choir_audio_url: form.choirAudioUrl?.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setBusy(false);
    if (error) {
      setMsg("Could not save: " + error.message);
      return;
    }
    setSaved(form);
    setMsg("Saved. The iPad picks it up within 5 minutes, or right after the next draw.");
  }

  const dev = DEVICES.find((d) => d.id === device)!;
  const scale = Math.min(1, 440 / dev.w);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_480px]">
      <div className="flex flex-col gap-4">
        <Card title="Text">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Title line 1 (big)
              <input className={inputCls} value={form.titleLine1} onChange={(e) => set("titleLine1", e.target.value)} />
            </label>
            <label className="text-sm text-slate-700">
              Title line 2
              <input className={inputCls} value={form.titleLine2} onChange={(e) => set("titleLine2", e.target.value)} />
            </label>
          </div>
          <label className="text-sm text-slate-700">
            Description
            <input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Button text
              <input className={inputCls} value={form.buttonText} onChange={(e) => set("buttonText", e.target.value)} />
            </label>
            <label className="text-sm text-slate-700">
              Prize pop-up message
              <input className={inputCls} value={form.popupHint} onChange={(e) => set("popupHint", e.target.value)} />
            </label>
          </div>
          <label className="text-sm text-slate-700">
            Message when all prizes are gone
            <input className={inputCls} value={form.soldOutMessage} onChange={(e) => set("soldOutMessage", e.target.value)} />
          </label>
          <ColorField label="Title line 1 colour" value={form.titleLine1Color} onChange={(v) => set("titleLine1Color", v)} />
          <ColorField label="Title line 2 colour" value={form.titleLine2Color} onChange={(v) => set("titleLine2Color", v)} />
          <ColorField label="Description colour" value={form.descriptionColor} onChange={(v) => set("descriptionColor", v)} />
        </Card>

        <Card title="Colours">
          <ColorField label="Background colour 1" value={form.bgColor1} onChange={(v) => set("bgColor1", v)} />
          <ColorField label="Background colour 2" value={form.bgColor2} onChange={(v) => set("bgColor2", v)} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.bgColor3 !== null} onChange={(e) => set("bgColor3", e.target.checked ? "#2A2230" : null)} />
            Use a third background colour
          </label>
          {form.bgColor3 !== null && <ColorField label="Background colour 3" value={form.bgColor3} onChange={(v) => set("bgColor3", v)} />}
          <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
            <span>Gradient angle ({form.bgAngle}°)</span>
            <input type="range" min={0} max={360} value={form.bgAngle} onChange={(e) => set("bgAngle", Number(e.target.value))} className="w-48" />
          </label>
          <ColorField label="Gift box colour" value={form.boxColor} onChange={(v) => set("boxColor", v)} />
          <ColorField label="Ribbon / bow colour" value={form.ribbonColor} onChange={(v) => set("ribbonColor", v)} />
          <ColorField label="Button colour" value={form.buttonColor} onChange={(v) => set("buttonColor", v)} />
          <ColorField label="Button text colour" value={form.buttonTextColor} onChange={(v) => set("buttonTextColor", v)} />
          <p className="text-xs text-slate-500">Highlights, shadows and the glow of the gift box are worked out from the box and ribbon colours automatically. The button has its own colours.</p>
          <button
            type="button"
            className="self-start rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              if (confirm("Reset all colours and texts to the defaults? (Not saved until you press Save.)")) setForm({ ...DEFAULT_SETTINGS, soundEnabled: form.soundEnabled, choirEnabled: form.choirEnabled, choirAudioUrl: form.choirAudioUrl, lowStockThreshold: form.lowStockThreshold });
            }}
          >
            Restore default look
          </button>
        </Card>

        <Card title="Sound">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.soundEnabled} onChange={(e) => set("soundEnabled", e.target.checked)} /> Sound effects
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.choirEnabled} onChange={(e) => set("choirEnabled", e.target.checked)} /> Choir &ldquo;Y~T~K~&rdquo;
          </label>
          <label className="text-sm text-slate-700">
            Choir audio file URL (optional — replaces the built-in choir)
            <input className={inputCls} value={form.choirAudioUrl ?? ""} onChange={(e) => set("choirAudioUrl", e.target.value || null)} placeholder="https://…/choir.mp3" />
          </label>
        </Card>

        <Card title="Stock warning">
          <label className="text-sm text-slate-700">
            Highlight a prize when its stock is at or below
            <input type="number" min={0} className={inputCls} value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Math.max(0, Number(e.target.value) || 0))} />
          </label>
        </Card>

        <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-slate-200 bg-[var(--bg)] px-1 py-3">
          <button disabled={!dirty || !colorsOk || busy} onClick={save} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            {busy ? "Saving…" : "Save"}
          </button>
          {!colorsOk && <span className="text-sm text-red-600">A colour code is not valid (use e.g. #F5C242).</span>}
          {msg && <span className="text-sm text-slate-600">{msg}</span>}
        </div>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview &amp; test mode</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${device === d.id ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <label className="mb-3 block text-sm text-slate-700">
            Pop-up to preview
            <select className={inputCls} value={previewPrize} onChange={(e) => setPreviewPrize(e.target.value)}>
              <option value="sample">Sample prize</option>
              {prizes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.tierLabel ? `${p.tierLabel} · ` : ""}
                  {p.name}
                </option>
              ))}
              <option value="soldout">Sold-out screen</option>
            </select>
          </label>
          <div style={{ width: dev.w * scale, height: dev.h * scale }} className="mx-auto overflow-hidden rounded-xl border border-slate-300">
            <iframe
              ref={frameRef}
              src="/preview"
              title="Kiosk preview"
              onLoad={post}
              style={{ width: dev.w, height: dev.h, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">Tap the button in the preview to watch the animation. Test mode never changes stock and never writes a draw record.</p>
        </div>
      </aside>
    </div>
  );
}
