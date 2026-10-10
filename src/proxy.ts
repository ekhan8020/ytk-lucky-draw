import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the admin's Supabase session alive: reads the session cookie and, if
// the access token has expired, refreshes it and writes it back onto the
// response. Only runs for /admin — the customer kiosk and /api never touch auth.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { error } = await supabase.auth.getUser();
  if (error) {
    // Refresh tokens are single-use; two racing requests can briefly fail. One retry absorbs that.
    await new Promise((resolve) => setTimeout(resolve, 400));
    await supabase.auth.getUser();
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
