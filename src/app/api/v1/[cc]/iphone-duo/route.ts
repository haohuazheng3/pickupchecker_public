import { NextResponse } from "next/server";
import { countryOf, error } from "@/lib/api/v1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/{country}/iphone-duo — the address people guess first: the Duo stock answer. */
export async function GET(req: Request, { params }: { params: Promise<{ cc: string }> }) {
  const { cc: seg } = await params;
  const cc = countryOf(seg);
  if (!cc) return error(404, `Unknown country "${seg}".`, "Use one of the two-letter codes GET /api/v1 lists.");
  const url = new URL(req.url);
  url.pathname = `/api/v1/${cc}/stock`;
  url.searchParams.set("model", "duo");
  return NextResponse.redirect(url, { status: 307, headers: { "cache-control": "public, s-maxage=3600" } });
}
