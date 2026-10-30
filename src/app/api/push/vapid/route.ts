import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The VAPID public key, for code that has no page props: the service worker re-subscribing after
 * `pushsubscriptionchange`, and PwaBoot repairing a lost subscription on any page. Public by design
 * (it is embedded in every subscription anyway); cached for an hour.
 */
export async function GET() {
  const publicKey = env.vapidPublicKey();
  if (!publicKey) return NextResponse.json({ error: "push is not configured on the server" }, { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ publicKey }, { headers: { "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" } });
}
