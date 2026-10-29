import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db, hasDatabase, schema } from "@/lib/db";
import { modelByKey, partNumbersFor, type ModelKey } from "@/lib/apple/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public, read-only snapshot: GET /api/stock?model=18-pro[&storage=256GB&color=Black] */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const model = modelByKey(url.searchParams.get("model") ?? "");
  if (!model) return NextResponse.json({ error: "model required" }, { status: 400 });
  const storage = url.searchParams.get("storage") ?? undefined;
  const color = url.searchParams.get("color") ?? undefined;
  const parts = partNumbersFor(model.key as ModelKey, storage ? [storage] : [], color ? [color] : []);
  if (!hasDatabase()) return NextResponse.json({ model: model.key, rows: [] });
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
    .where(inArray(schema.storeSkuStatus.partNumber, parts));
  return NextResponse.json({ model: model.key, rows }, { headers: { "cache-control": "public, max-age=15, s-maxage=15" } });
}
