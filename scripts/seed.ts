/** Mirror the static catalog + store list into the database (idempotent). */
import "dotenv/config";
import { db, schema } from "../src/lib/db";
import { CATALOG, STORES, modelKeyFor, stateCodeOf } from "../src/lib/apple/catalog";

async function main() {
  const d = db();
  for (let i = 0; i < STORES.length; i += 100) {
    const chunk = STORES.slice(i, i + 100);
    await d
      .insert(schema.stores)
      .values(chunk.map((s) => ({
        storeNumber: s.storeNumber, slug: s.slug, name: s.name, city: s.city, state: s.state, stateCode: stateCodeOf(s),
        postalCode: s.postalCode ?? null, street: s.street?.trim() ?? null, phone: s.phone ?? null, lat: s.lat, lng: s.lng,
        hours: s.hours ?? null, image: s.image ?? null, url: s.url ?? null, active: true,
      })))
      .onConflictDoUpdate({ target: schema.stores.storeNumber, set: { name: (await import("drizzle-orm")).sql`excluded.name`, city: (await import("drizzle-orm")).sql`excluded.city`, lat: (await import("drizzle-orm")).sql`excluded.lat`, lng: (await import("drizzle-orm")).sql`excluded.lng`, active: true } });
  }
  await d
    .insert(schema.skus)
    .values(CATALOG.map((c) => ({ partNumber: c.partNumber, sku: c.sku, model: modelKeyFor(c.model), modelName: c.model, storage: c.storage, color: c.color, priceUsd: c.price, active: true })))
    .onConflictDoUpdate({ target: schema.skus.partNumber, set: { priceUsd: (await import("drizzle-orm")).sql`excluded.price_usd`, active: true } });
  console.log(`[seed] ${STORES.length} stores, ${CATALOG.length} skus`);
}
main().catch((e) => { console.error(e); process.exit(1); });
