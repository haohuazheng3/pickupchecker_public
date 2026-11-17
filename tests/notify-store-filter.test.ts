import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PgDialect } from "drizzle-orm/pg-core";
import { storeFilter } from "@/lib/stock/notify";

/**
 * 2026-11-17: the alert path loaded every active rule of the model (28,093 Duo rows) per restocked response; mass
 * listing flips put hundreds of those calls in flight and the intl poller ran out of heap five times. The candidate
 * query now asks only for rules at the restocked stores.
 */
describe("alert candidates are limited to the restocked stores", () => {
  it("renders a jsonb ?| text[] filter with one parameter per store", () => {
    const q = new PgDialect().sqlToQuery(storeFilter(["R489", "R120"]));
    expect(q.sql).toBe(`"watches"."store_numbers" ?| array[$1, $2]::text[]`);
    expect(q.params).toEqual(["R489", "R120"]);
  });
  it("is part of the candidate query", () => {
    const src = readFileSync("src/lib/stock/notify.ts", "utf8");
    expect(src).toMatch(/inArray\(schema\.watches\.model, models\), storeFilter\(/);
  });
});
