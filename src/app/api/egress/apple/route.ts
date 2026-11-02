import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchPickup, fetchPickupAtStore, MAX_PARTS_PER_CALL } from "@/lib/apple/client";
import { ALL_CODES, type CountryCode } from "@/lib/apple/countries";
import { env, bearerOk } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * `{parts, location}` is the US anchor request the poller has always sent. Optional `store` asks one store
 * (`store=R###`) instead of a location, and optional `country` picks that country's endpoint (default the US).
 */
const Body = z
  .object({
    parts: z.array(z.string()).min(1).max(MAX_PARTS_PER_CALL),
    location: z.string().min(3).max(40).optional(),
    store: z.string().regex(/^R\d{3,4}$/).optional(),
    country: z.enum(ALL_CODES as [CountryCode, ...CountryCode[]]).optional(),
  })
  .refine((b) => Boolean(b.location || b.store), { message: "location or store", path: ["location"] });

/**
 * Egress identity "vercel": the poller calls this to fetch Apple from this region's fixed IP — for any
 * country (in practice the US: the poller pauses the other countries while it runs on spare egress).
 * Budget is enforced by the caller (one identity ≈ 25 calls / 35 min).
 */
export async function POST(req: Request) {
  if (!bearerOk(req, env.pollerToken())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { parts, location, store, country = "us" } = parsed.data;
  const where = store ?? location!;
  const res = await (store ? fetchPickupAtStore(parts, store, undefined, 10_000, country) : fetchPickup(parts, location!, undefined, 15_000, country)).catch((e) => ({
    ok: false, httpStatus: 0, location: where, stores: [], bytes: 0, error: e instanceof Error ? e.message : String(e),
  }));
  return NextResponse.json(res, { headers: { "cache-control": "no-store" } });
}
