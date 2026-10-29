import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchPickup, MAX_PARTS_PER_CALL } from "@/lib/apple/client";
import { env, bearerOk } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({ parts: z.array(z.string()).min(1).max(MAX_PARTS_PER_CALL), location: z.string().min(3).max(40) });

/**
 * Egress identity "vercel": the poller calls this to fetch Apple from this region's fixed IP.
 * Budget is enforced by the caller (one identity ≈ 25 calls / 35 min).
 */
export async function POST(req: Request) {
  if (!bearerOk(req, env.pollerToken())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const res = await fetchPickup(parsed.data.parts, parsed.data.location).catch((e) => ({
    ok: false, httpStatus: 0, location: parsed.data.location, stores: [], bytes: 0, error: e instanceof Error ? e.message : String(e),
  }));
  return NextResponse.json(res, { headers: { "cache-control": "no-store" } });
}
