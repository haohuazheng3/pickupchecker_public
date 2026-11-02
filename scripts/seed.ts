/**
 * Mirror the static catalogue + store list of every country into the database (idempotent).
 * US rows are written exactly as before (state, state code, price_usd); every store also gets its ISO country
 * and region, non-US stores their IANA zone. skus has one row per part number: a part sold in several countries
 * (ZD/A in DE/AT/NL/BE…) is one row; price_usd is set for US parts only (other prices stay in the catalogues).
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { ALL_STORES, PART_INDEX, modelKeyFor, stateCodeOf, priceFor } from "../src/lib/apple/catalog";

async function main() {
  const d = db();
  for (let i = 0; i < ALL_STORES.length; i += 100) {
    const chunk = ALL_STORES.slice(i, i + 100);
    await d
      .insert(schema.stores)
      .values(chunk.map((s) => ({
        storeNumber: s.storeNumber, slug: s.slug, name: s.name, city: s.city, state: s.state, stateCode: stateCodeOf(s),
        postalCode: s.postalCode ?? null, street: s.street?.trim() ?? null, phone: s.phone ?? null, lat: s.lat, lng: s.lng,
        hours: s.hours ?? null, image: s.image ?? null, url: s.url ?? null, active: true,
        country: s.iso, region: s.region, timezone: s.country === "us" ? null : (s.timeZone ?? null),
      })))
      .onConflictDoUpdate({
        target: schema.stores.storeNumber,
        set: { name: sql`excluded.name`, city: sql`excluded.city`, lat: sql`excluded.lat`, lng: sql`excluded.lng`, active: true, country: sql`excluded.country`, region: sql`excluded.region`, timezone: sql`coalesce(excluded.timezone, ${schema.stores.timezone})` },
      });
  }
  const parts = [...PART_INDEX.values()];
  await d
    .insert(schema.skus)
    .values(parts.map((c) => ({ partNumber: c.partNumber, sku: c.sku, model: modelKeyFor(c.model), modelName: c.model, storage: c.storage, color: c.color, priceUsd: priceFor(c.partNumber, "us") ?? null, active: true })))
    .onConflictDoUpdate({ target: schema.skus.partNumber, set: { priceUsd: sql`excluded.price_usd`, active: true } });
  console.log(`[seed] ${ALL_STORES.length} stores, ${parts.length} skus`);
}
main().catch((e) => { console.error(e); process.exit(1); });
