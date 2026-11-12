/**
 * 2026-11-12: the 30-day lead() window queries (sell-out times, median listing time) were recomputed every 60 s and
 * took about a third of linode-1's single core. They are cached 15 minutes; the recent-restock list uses index
 * probes instead of a window. Guard both so a refactor does not quietly put the heavy query back on a 60 s cache.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const cacheBlock = (s: string, name: string) => s.slice(s.indexOf(`const ${name} = unstable_cache(`)).split("\n);\n")[0];

describe("heavy 30-day statistics stay on a long cache", () => {
  it("sell-out lives: 15 minutes; recent list: no window function", () => {
    const s = src("src/lib/stock/sellouts.ts");
    expect(cacheBlock(s, "cachedLives")).toMatch(/revalidate: 900/);
    const recent = cacheBlock(s, "cachedRecent");
    expect(recent).toMatch(/left join lateral/);
    expect(recent).not.toMatch(/over w|lead\(/);
  });
  it("place median: 15 minutes, and not computed inside the 60 s place stats", () => {
    const s = src("src/lib/stock/queries.ts");
    expect(cacheBlock(s, "cachedPlaceMedian")).toMatch(/revalidate: 900/);
    expect(cacheBlock(s, "cachedPlaceStats")).not.toMatch(/percentile_cont/);
  });
});
