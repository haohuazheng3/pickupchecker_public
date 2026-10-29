import { NextResponse } from "next/server";
import { sessionUser, isAdminEmail, hasAdminSession } from "@/lib/auth";
import { resolveError } from "@/lib/admin/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: RouteContext<"/api/admin/errors/[fp]/resolve">) {
  if (!(await hasAdminSession())) {
    const u = await sessionUser();
    if (!u || !isAdminEmail(u.email)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { fp } = await ctx.params;
  await resolveError(fp);
  return NextResponse.redirect(new URL("/admin/errors", _req.url), { status: 303 });
}
