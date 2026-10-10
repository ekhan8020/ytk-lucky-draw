"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — used by client components. Session tokens
// live in cookies (set by the server client / proxy.ts), not localStorage,
// so the same session works across tabs and survives a PWA relaunch.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
