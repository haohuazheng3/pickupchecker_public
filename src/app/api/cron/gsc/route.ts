import { NextResponse } from "next/server";
import { env, bearerOk } from "@/lib/env";
import { pullSearchAnalytics } from "@/lib/gsc";
import { recordError, errorMessage } from "@/lib/errors";
import { logOps } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron, daily: Search Console search analytics (query × page × device × country) into gsc_daily. */
export async function GET(req: Request) {
  if (!bearerOk(req, env.cronSecret())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const r = await pullSearchAnalytics();
    await logOps("cron", "info", "gsc pull", r);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    await recordError("web", `gsc pull: ${errorMessage(e)}`);
    return NextResponse.json({ ok: false, error: errorMessage(e) }, { status: 500 });
  }
}
