import { stockByStore } from "@/lib/stock/queries";
import { PART_INDEX, catalogFor, storeByNumber, storePath, storesOf } from "@/lib/apple/catalog";
import { allowed, countryOf, error, json, meta, modelOf, normColor, normStorage, options, tooMany, SITE } from "@/lib/api/v1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/{country}/stock?model=duo[&storage=512GB][&color=night-sky]
 * Every Apple Store of the country, with the configurations of the model it lists for in-store pickup right now.
 */
export async function GET(req: Request, { params }: { params: Promise<{ cc: string }> }) {
  const { cc: seg } = await params;
  const cc = countryOf(seg);
  if (!cc) return error(404, `Unknown country "${seg}".`, "Use one of the two-letter codes GET /api/v1 lists (us, ca, uk, au, de, fr, it, es, jp, kr, hk, sg, ae, ch, nl, se, tw, at, be).");
  const q = new URL(req.url).searchParams;
  const model = modelOf(q.get("model"));
  if (!model) return error(400, `Unknown model "${q.get("model")}".`, "model = duo | 18-pro | 18-pro-max.");
  if (!(await allowed(req))) return tooMany();
  const storage = normStorage(q.get("storage")), color = normColor(q.get("color"));
  const items = catalogFor(model, cc).filter((i) => (!storage || i.storage === storage) && (!color || i.color === color));
  if (items.length === 0) return error(400, "No such configuration in this country.", `Storage: ${[...new Set(catalogFor(model, cc).map((i) => i.storage))].join(", ")}; colour: ${[...new Set(catalogFor(model, cc).map((i) => i.color))].join(", ")}.`);
  const rows = await stockByStore(model, { storage, color }, cc);
  const byStore = new Map(rows.map((r) => [r.storeNumber, r]));
  const stores = storesOf(cc).map((s) => {
    const r = byStore.get(s.storeNumber);
    const available = (r?.availableParts ?? []).filter((p) => items.some((i) => i.partNumber === p)).map((p) => { const i = PART_INDEX.get(p)!; return { part_number: p, storage: i.storage, color: i.color }; });
    return {
      store_number: s.storeNumber, name: s.name, city: s.city, region: s.state, country: cc, lat: s.lat, lng: s.lng,
      url: `${SITE}${storePath(s)}`,
      in_stock: available.length > 0, available,
      last_checked_at: r?.lastCheckedAt ? new Date(r.lastCheckedAt).toISOString() : null,
      last_in_stock_at: r?.lastAvailableAt ? new Date(r.lastAvailableAt).toISOString() : null,
    };
  });
  return json({
    ...meta(cc, { model, configurations: items.map((i) => ({ part_number: i.partNumber, storage: i.storage, color: i.color })) }),
    summary: { stores: stores.length, stores_in_stock: stores.filter((s) => s.in_stock).length, pairs_in_stock: stores.reduce((a, s) => a + s.available.length, 0) },
    stores,
  });
}
export const OPTIONS = options;
// Keeps the import used when a country has no stores in the static table (never, but the type checker does not know).
void storeByNumber;
