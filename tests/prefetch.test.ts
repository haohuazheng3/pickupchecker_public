import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * 2026-11-06: next/link's viewport prefetch, re-run after every router.refresh(), made one page view cost ~50
 * Vercel function invocations (1.3 M a day, ~$16/day). Public links go through PendingLink, which prefetches on
 * intent only (hover, touch, focus). These guards keep it that way.
 */
const SRC = join(process.cwd(), "src");
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

describe("link prefetching is on intent only", () => {
  it("PendingLink turns next/link's viewport prefetch off unless a link asks for it", () => {
    const s = readFileSync(join(SRC, "components/ui/PendingLink.tsx"), "utf8");
    expect(s).toContain("prefetch={prefetch === true ? true : false}");
    expect(s).toContain("router.prefetch(to)");
    for (const ev of ["onMouseEnter", "onTouchStart", "onFocus"]) expect(s).toContain(`${ev}={(e) => {`);
  });

  it("no public component or page imports next/link directly (admin and checkout may)", () => {
    const offenders = walk(SRC)
      .filter((f) => readFileSync(f, "utf8").includes('from "next/link"'))
      .map((f) => relative(SRC, f))
      .filter((f) => f !== "components/ui/PendingLink.tsx" && !f.startsWith("app/admin/") && !f.startsWith("components/admin/") && !f.startsWith("app/checkout/"));
    expect(offenders).toEqual([]);
  });

  it("no public link opts back into viewport prefetch", () => {
    const offenders = walk(SRC)
      .filter((f) => !f.includes("/admin/") && !f.endsWith("PendingLink.tsx"))
      .filter((f) => /prefetch(=\{true\}|\s*=\s*true)/.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
