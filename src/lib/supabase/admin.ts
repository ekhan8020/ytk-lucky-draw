import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client — bypasses Row Level Security entirely.
// NEVER import this from a client component or anything that reaches the
// browser bundle; the `server-only` import above makes that a build error.
// Used for admin-only operations: creating accounts, resetting passwords,
// looking up a username's internal email before the caller is authenticated.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
