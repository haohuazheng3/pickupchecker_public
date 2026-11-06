import { restockFeed } from "@/lib/stock/queries";
import { storePath } from "@/lib/apple/catalog";
import { allowed, countryOf, error, json, meta, modelOf, options, tooMany, SITE } from "@/lib/api/v1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/{country}/restocks?model=duo&hours=24&limit=100
 * Confirmed restocks (a configuration going from sold out to available at a store), newest first.
 */
export async function GET(req: Request, { params }: { params: Promise<{ cc: string }> }) {
  const { cc: seg } = await params;
  const cc = countryOf(seg);
  if (!cc) return error(404, `Unknown country "${seg}".`, "Use one of the two-letter codes GET /api/v1 lists.");
  const q = new URL(req.url).searchParams;
  const model = modelOf(q.get("model"));
  if (!model) return error(400, `Unknown model "${q.get("model")}".`, "model = duo | 18-pro | 18-pro-max.");
  if (!(await allowed(req))) return tooMany();
  const hours = Math.min(168, Math.max(1, Number(q.get("hours") ?? 24) || 24));
  const limit = Math.min(200, Math.max(1, Number(q.get("limit") ?? 100) || 100));
  const since = Date.now() - hours * 3600_000;
  const rows = (await restockFeed({ model, country: cc, limit, kind: "restock" })).filter((r) => r.at.getTime() >= since);
  return json({
    ...meta(cc, { model, hours, limit }),
    count: rows.length,
    restocks: rows.map((r) => ({
      at: r.at.toISOString(), store_number: r.storeNumber, store: r.store.name, city: r.store.city, region: r.store.state,
      url: `${SITE}${storePath(r.store)}`, part_number: r.partNumber, storage: r.item.storage, color: r.item.color, still_listed: r.nowAvailable,
    })),
  });
}
export const OPTIONS = options;
