import { NextResponse } from "next/server";
import { env, bearerOk } from "@/lib/env";
import { pullSearchAnalytics, submitSitemaps } from "@/lib/gsc";
import { recordError, errorMessage } from "@/lib/errors";
import { logOps } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron, daily: Search Console search analytics (query × page × device × country) into gsc_daily, then the
 * sitemaps re-submitted (lib/gsc.ts SITEMAPS). Either step failing does not stop the other.
 */
export async function GET(req: Request) {
  if (!bearerOk(req, env.cronSecret())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let sitemaps: Record<string, number> | { error: string };
  try {
    sitemaps = await submitSitemaps();
    await logOps("cron", "info", "gsc sitemaps", sitemaps);
  } catch (e) {
    sitemaps = { error: errorMessage(e) };
    await recordError("web", `gsc sitemaps: ${errorMessage(e)}`);
  }
  try {
    const r = await pullSearchAnalytics();
    await logOps("cron", "info", "gsc pull", r);
    return NextResponse.json({ ok: true, ...r, sitemaps });
  } catch (e) {
    await recordError("web", `gsc pull: ${errorMessage(e)}`);
    return NextResponse.json({ ok: false, error: errorMessage(e), sitemaps }, { status: 500 });
  }
}
