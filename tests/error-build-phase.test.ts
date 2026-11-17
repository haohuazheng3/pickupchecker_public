import { afterEach, describe, expect, it, vi } from "vitest";

const { insert } = vi.hoisted(() => ({
  insert: vi.fn(() => ({ values: () => ({ onConflictDoUpdate: async () => undefined }) })),
}));
vi.mock("../src/lib/db", () => ({
  db: () => ({ insert }),
  hasDatabase: () => true,
  schema: { errorGroups: { fingerprint: "fingerprint", count: "count" } },
}));

import { recordError } from "../src/lib/errors";

const failure = "sellouts: Failed query: timeout exceeded when trying to connect";

describe("recordError and next build", () => {
  afterEach(() => {
    delete process.env.NEXT_PHASE;
    insert.mockClear();
    vi.restoreAllMocks();
  });

  it("keeps a prerender failure in the build log, out of the live site's error inbox", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXT_PHASE = "phase-production-build";
    await recordError("web", failure);
    expect(insert).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(`[web] ${failure}`, "");
  });

  it("still records the same failure at run time", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await recordError("web", failure);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
