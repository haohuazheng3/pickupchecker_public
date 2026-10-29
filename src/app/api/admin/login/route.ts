import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ADMIN_COOKIE, ADMIN_TTL_SEC, safeEqualStr, signAdminToken } from "@/lib/admin/session";
import { logOps } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nextPath(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/admin") && !s.startsWith("//") && !s.startsWith("/admin/login") ? s : "/admin";
}

/** Password form → signed session cookie. 10 attempts per IP per 15 minutes. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const next = nextPath(form?.get("next") ?? null);
  const fail = (code: string) => NextResponse.redirect(new URL(`/admin/login?error=${code}&next=${encodeURIComponent(next)}`, req.url), { status: 303 });
  const ip = clientIp(req);
  if (!(await rateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000))) return fail("rate");
  const password = typeof form?.get("password") === "string" ? String(form!.get("password")) : "";
  const expected = env.adminPassword();
  if (!expected || !env.adminSessionSecret()) return fail("unconfigured");
  if (!safeEqualStr(password, expected)) {
    await logOps("web", "warn", "admin login failed", { ip });
    return fail("bad");
  }
  const token = await signAdminToken(env.adminSessionSecret());
  await logOps("web", "info", "admin login", { ip });
  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: env.isProd() || req.url.startsWith("https://"), path: "/", maxAge: ADMIN_TTL_SEC });
  return res;
}
