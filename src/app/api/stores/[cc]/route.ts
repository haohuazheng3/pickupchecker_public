import { NextResponse } from "next/server";
import { ALL_CODES, isCountryCode } from "@/lib/apple/countries";
import { pickerStores } from "@/components/alerts/catalog";

/** One country's stores for the dashboard's store picker (static, slim: number, name, place, coordinates). */
export const dynamic = "force-static";

export function generateStaticParams() {
  return ALL_CODES.map((cc) => ({ cc }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ cc: string }> }) {
  const { cc } = await params;
  if (!isCountryCode(cc)) return NextResponse.json({ error: "unknown country" }, { status: 404 });
  return NextResponse.json({ country: cc, stores: pickerStores(cc) }, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
