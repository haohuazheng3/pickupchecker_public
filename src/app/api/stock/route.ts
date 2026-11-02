import { NextResponse } from "next/server";
import { and, inArray } from "drizzle-orm";
import { db, hasDatabase, schema } from "@/lib/db";
import { modelByKey, partNumbersFor, type ModelKey } from "@/lib/apple/catalog";
import { isCountryCode } from "@/lib/apple/countries";
import { countryScope } from "@/lib/stock/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public, read-only snapshot: GET /api/stock?model=18-pro[&storage=256GB&color=Black][&country=uk] (default the US). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const model = modelByKey(url.searchParams.get("model") ?? "");
  if (!model) return NextResponse.json({ error: "model required" }, { status: 400 });
  // Absent or empty = the US (as before the parameter existed); anything else must be a country code.
  const cc = url.searchParams.get("country")?.trim().toLowerCase() || "us";
  if (!isCountryCode(cc)) return NextResponse.json({ error: "unknown country" }, { status: 400 });
  const storage = url.searchParams.get("storage") ?? undefined;
  const color = url.searchParams.get("color") ?? undefined;
  const parts = partNumbersFor(model.key as ModelKey, storage ? [storage] : [], color ? [color] : [], cc);
  const extra = cc === "us" ? {} : { country: cc };
  if (!hasDatabase()) return NextResponse.json({ model: model.key, ...extra, rows: [] });
  // A country whose part numbers others share (DE/AT/NL/BE…) is narrowed to its own stores as well.
  const scope = countryScope(cc, null, parts);
  const rows = await db()
    .select({
      storeNumber: schema.storeSkuStatus.storeNumber,
      partNumber: schema.storeSkuStatus.partNumber,
      status: schema.storeSkuStatus.status,
      quote: schema.storeSkuStatus.quote,
      since: schema.storeSkuStatus.since,
      lastCheckedAt: schema.storeSkuStatus.lastCheckedAt,
      lastAvailableAt: schema.storeSkuStatus.lastAvailableAt,
    })
    .from(schema.storeSkuStatus)
    .where(scope.stores ? and(inArray(schema.storeSkuStatus.partNumber, parts), inArray(schema.storeSkuStatus.storeNumber, scope.stores)) : inArray(schema.storeSkuStatus.partNumber, parts));
  return NextResponse.json({ model: model.key, ...extra, rows }, { headers: { "cache-control": "public, max-age=15, s-maxage=15" } });
}
