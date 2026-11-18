import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { TOP_LEVEL, publicRouteCheck } from "@/lib/seo/routes";
import { QUESTION_PAGES } from "@/app/sitemap";

describe("/iphone-duo-restock-alert-app (owner 2026-11-18)", () => {
  it("is a known top-level route and in the sitemap", () => {
    expect(TOP_LEVEL.has("iphone-duo-restock-alert-app")).toBe(true);
    expect(publicRouteCheck("/iphone-duo-restock-alert-app", "")).toBeNull();
    expect(QUESTION_PAGES).toContain("/iphone-duo-restock-alert-app");
  });

  it("states the cadence only as 5 and 15 seconds, and never promises a refund", () => {
    const src = readFileSync("src/app/iphone-duo-restock-alert-app/page.tsx", "utf8");
    expect(src).not.toMatch(/every (?!\$\{SPEED\.(fastSec|checkSec)\})\d+ ?(s|sec|seconds)\b/);
    expect(src.toLowerCase()).not.toContain("refund");
  });
});
