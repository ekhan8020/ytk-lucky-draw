"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/prizes", label: "Prizes" },
  { href: "/admin/results", label: "Results" },
];

// Everything under /admin needs a signed-in user who is listed in draw_admins.
// (The real protection is RLS — this just sends people to the login page.)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (isLogin) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/admin/login");
        return;
      }
      const { data: row } = await supabase.from("draw_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (!row) {
        await supabase.auth.signOut();
        router.replace("/admin/login?denied=1");
        return;
      }
      setReady(true);
    });
  }, [isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!ready) return <p className="p-6 text-sm text-slate-500">Loading…</p>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold tracking-wide text-slate-900">YTK LUCKY DRAW</span>
            <nav className="flex gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    pathname.startsWith(n.href) ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            className="text-sm text-slate-500 hover:text-slate-900"
            onClick={async () => {
              await createClient().auth.signOut();
              router.replace("/admin/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
