import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { pollerDeps } from "../scripts/poller-deps.mjs";
import { pollerCodeHash } from "../poller/codeHash.mjs";

describe("poller code fingerprint", () => {
  it("poller/deps.json lists exactly what poller/main.ts imports (run node scripts/poller-deps.mjs when this fails)", async () => {
    const listed = JSON.parse(readFileSync("poller/deps.json", "utf8"));
    expect(await pollerDeps(process.cwd())).toEqual(listed);
  });
  it("is a stable 12-character hash", () => {
    const h = pollerCodeHash(process.cwd());
    expect(h).toMatch(/^[0-9a-f]{12}$/);
    expect(pollerCodeHash(process.cwd())).toBe(h);
  });
});
