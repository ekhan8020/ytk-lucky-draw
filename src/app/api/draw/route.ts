import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Simple per-IP limit (this process only — one pm2 instance): at most 20 draw
// requests a minute, so a script can't hammer the endpoint. A busy kiosk draws
// far less often than that.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return recent.length > MAX_PER_WINDOW;
}

// The prize is decided here, in one database transaction (draw_pick_prize),
// never in the browser. The same draw_token always returns the same result
// and takes stock only once.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (limited(ip)) return NextResponse.json({ status: "error", error: "Too many requests" }, { status: 429 });

  let body: { token?: unknown; kiosk?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // fall through to validation
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!UUID.test(token)) return NextResponse.json({ status: "error", error: "Invalid token" }, { status: 400 });
  const kiosk = typeof body.kiosk === "string" ? body.kiosk.slice(0, 40) : null;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("draw_pick_prize", { p_token: token, p_kiosk: kiosk });
  if (error || !data) {
    console.error("draw_pick_prize failed", error?.message);
    return NextResponse.json({ status: "error", error: "Draw failed" }, { status: 500 });
  }
  const r = data as { status: string; name?: string; tier?: string; color?: string };
  if (r.status === "ok") {
    return NextResponse.json({ status: "ok", prize: { name: r.name, tier: r.tier, color: r.color } });
  }
  if (r.status === "sold_out") return NextResponse.json({ status: "sold_out" });
  return NextResponse.json({ status: "error", error: "Busy, try again" }, { status: 503 });
}
