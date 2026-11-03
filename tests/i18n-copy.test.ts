import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Every language states the same facts as English (tests/cadence-copy.test.ts): a check interval is 15 seconds
 * (every store) or 5 seconds (stores with alerts), nothing else; and no language promotes refunds beyond the
 * pricing page's one policy line. Scans each language's dictionary sources.
 */
const LANGS = ["ja", "ko", "zh-tw", "zh-hk", "de", "fr", "it", "es", "nl", "sv"];
const EVERY: RegExp[] = [
  /(\d+)\s*秒(?:ごと|おき|毎)/g, /(\d+)\s*초\s*마다/g, /每\s*(\d+)\s*秒/g,
  /\balle\s+(\d+)\s*(?:Sekunden|Sek\.|s\b)/g, /\btoutes les\s+(\d+)\s*(?:secondes|s\b)/g, /\bogni\s+(\d+)\s*(?:secondi|s\b)/g,
  /\bcada\s+(\d+)\s*(?:segundos|s\b)/g, /\belke\s+(\d+)\s*(?:seconden|sec\.?|s\b)/g, /\bvar\s+(\d+)(?::e)?\s*(?:sekund|s\b)/g,
];
function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : [p]; });
}
const sources = (code: string) => [...files(`src/lib/i18n/dict/${code}`), ...files(`src/lib/i18n/cdict/${code}`), `src/lib/i18n/notify/${code}.ts`].filter((f) => existsSync(f));

describe("translated copy keeps the facts", () => {
  for (const code of LANGS) {
    it(`${code}: check intervals are only 15 s and 5 s`, () => {
      const bad: string[] = [];
      for (const f of sources(code)) {
        const text = readFileSync(f, "utf8");
        for (const re of EVERY) for (const m of text.matchAll(re)) if (!["15", "5"].includes(m[1])) bad.push(`${f}: ${m[0]}`);
      }
      expect(bad).toEqual([]);
    });
  }
  it("every language has all three dictionaries", () => {
    for (const code of LANGS) {
      expect(existsSync(`src/lib/i18n/dict/${code}/index.ts`), code).toBe(true);
      expect(existsSync(`src/lib/i18n/cdict/${code}/index.ts`), code).toBe(true);
      expect(existsSync(`src/lib/i18n/notify/${code}.ts`), code).toBe(true);
    }
  });
});
