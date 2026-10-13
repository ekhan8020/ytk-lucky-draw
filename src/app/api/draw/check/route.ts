import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Lets the kiosk tell the customer an order number was already used BEFORE the
// box animation starts. Only says used / not used. The draw itself re-checks.
const hits = new Map<string, number[]>();

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (recent.length > 40) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const digits = request.nextUrl.searchParams.get("orderNo") ?? "";
  if (!/^[0-9]{6}$/.test(digits)) return NextResponse.json({ error: "Invalid order number" }, { status: 400 });

  const { data, error } = await createAdminClient().from("draw_results").select("id").eq("order_no", `CX-${digits}`).is("voided_at", null).limit(1);
  if (error) return NextResponse.json({ error: "Check failed" }, { status: 500 });
  return NextResponse.json({ used: (data ?? []).length > 0 });
}
