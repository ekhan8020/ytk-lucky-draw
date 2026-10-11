import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settingsFromRow, DrawSettingsRow } from "@/lib/settings";

export const dynamic = "force-dynamic";

// What the iPad kiosk needs to render: look-and-feel settings and whether any
// prize can still be won. Never prizes, weights, stock or odds.
export async function GET() {
  const supabase = createAdminClient();
  const [{ data: row, error }, { data: available }] = await Promise.all([
    supabase.from("draw_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.rpc("draw_has_prize"),
  ]);
  if (error || !row) {
    return NextResponse.json({ error: "settings unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const s = { ...settingsFromRow(row as DrawSettingsRow), allowTestReset: false };
  return NextResponse.json({ settings: s, available: available === true }, { headers: { "Cache-Control": "no-store" } });
}
