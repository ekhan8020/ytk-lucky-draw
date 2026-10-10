"use client";

import { isHex } from "@/lib/color";

// Colour picker + editable hex code.
export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const valid = isHex(value);
  const swatch = valid ? (value.length === 4 ? "#" + value.slice(1).split("").map((c) => c + c).join("") : value) : "#000000";
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input type="color" value={swatch} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className={`w-24 rounded-lg border px-2 py-1.5 font-mono text-xs ${valid ? "border-slate-300" : "border-red-500"}`}
        />
      </span>
    </label>
  );
}
