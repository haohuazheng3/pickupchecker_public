import { NextResponse } from "next/server";
import { env, bearerOk } from "@/lib/env";
import { degradedTick } from "@/lib/stock/degraded";
import { recordError, errorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Manual/degraded poll step. Bearer CRON_SECRET or POLLER_TOKEN. */
export async function POST(req: Request) {
  if (!bearerOk(req, env.cronSecret()) && !bearerOk(req, env.pollerToken())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const r = await degradedTick(Number(new URL(req.url).searchParams.get("n") ?? 3));
    return NextResponse.json(r);
  } catch (e) {
    await recordError("web", `poll tick failed: ${errorMessage(e)}`);
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}
