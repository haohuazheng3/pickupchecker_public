import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/auth";
import { LogoMark } from "@/components/site/Logo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops sign-in", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  bad: "That password is not right.",
  rate: "Too many attempts from this address — wait 15 minutes.",
  unconfigured: "ADMIN_PASSWORD or ADMIN_SESSION_SECRET is not set on this deployment.",
};

export default async function AdminLogin({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/admin") && !sp.next.startsWith("/admin/login") ? sp.next : "/admin";
  if (await hasAdminSession()) redirect(next);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] ?? "Could not sign in." : null;
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4">
      <form method="post" action="/api/admin/login" className="pane w-full p-6 sm:p-8">
        <div className="flex items-center gap-3"><LogoMark size={36} /><div><div className="eyebrow">Ops</div><h1 className="text-xl font-semibold">Maintainer sign-in</h1></div></div>
        <p className="mt-3 text-sm text-ink-2">The password set as <code className="text-xs">ADMIN_PASSWORD</code> on the deployment. The session lasts 30 days on this browser.</p>
        <input type="hidden" name="next" value={next} />
        <label className="mt-5 block text-sm text-ink-2">Password
          <input className="input mt-1" type="password" name="password" autoComplete="current-password" autoFocus required />
        </label>
        {error && <p role="alert" className="mt-3 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
        <button type="submit" className="btn btn-primary mt-5 w-full">Open the console</button>
      </form>
    </div>
  );
}
