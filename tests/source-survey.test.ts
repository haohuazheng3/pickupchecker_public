import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SOURCES, SKIPPED, ASKED_META, cleanDetail, deviceOf, isSourceAnswer } from "@/lib/survey/sources";
import { SOURCE_LOGOS } from "@/components/account/sourceLogos";
import { DICTS } from "@/lib/i18n/dict/all";

// The one-time "where did you hear about us" lightbox on the dashboard (owner 2026-11-17).

const state = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  stored: [] as Record<string, unknown>[],
  neonFails: false,
  already: false,
  clerk: [] as [string, unknown][],
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: state.userId }),
  clerkClient: async () => ({ users: { updateUserMetadata: async (id: string, m: unknown) => { state.clerk.push([id, m]); } } }),
}));
vi.mock("@/lib/ops", () => ({ logOps: async () => undefined }));
vi.mock("@/lib/billing", () => ({ userPlan: async () => ({ plan: { key: "plus" }, sub: null }) }));
vi.mock("@/lib/survey/store", () => ({
  recordSource: async (row: Record<string, unknown>) => {
    if (state.neonFails) throw new Error("neon down");
    state.stored.push(row);
    return state.already ? "already" : "saved";
  },
}));

const post = async (body: unknown, headers: Record<string, string> = {}) => {
  process.env.SURVEY_DATABASE_URL = "postgres://survey_app:x@example.neon.tech/referral_survey";
  const { POST } = await import("@/app/api/survey/source/route");
  const res = await POST(new Request("https://pickupchecker.com/api/survey/source", { method: "POST", body: JSON.stringify(body), headers }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};

describe("source list and logos", () => {
  it("names the owner's three first, ends with Other, and stays a dozen or so (owner: 38 was too many)", () => {
    expect(SOURCES.slice(0, 3).map((s) => s.id)).toEqual(["google", "chatgpt", "grok"]);
    expect(SOURCES[SOURCES.length - 1].id).toBe("other");
    expect(new Set(SOURCES.map((s) => s.id)).size).toBe(SOURCES.length);
    expect(SOURCES.length).toBe(15); // fills 3 columns on a phone, 5 on a larger screen
  });

  it("keeps what they type after Other to one clean short line", () => {
    expect(cleanDetail("  MacRumors\n forum ")).toBe("MacRumors forum");
    expect(cleanDetail("   ")).toBeNull();
    expect(cleanDetail(42)).toBeNull();
    expect(cleanDetail("x".repeat(200))?.length).toBe(60);
  });

  it("has a plain inline SVG mark for every source, with nothing that runs or loads", () => {
    for (const s of SOURCES) {
      const svg = SOURCE_LOGOS[s.id];
      expect(svg, s.id).toMatch(/^<svg aria-hidden="true" focusable="false" [^>]*viewBox="/);
      expect(svg.endsWith("</svg>"), s.id).toBe(true);
      expect(svg, s.id).not.toMatch(/<script|\son[a-z]+=|href=|<image|<foreignObject/i);
    }
  });

  it("accepts only listed ids and 'skipped'", () => {
    expect(isSourceAnswer("chatgpt")).toBe(true);
    expect(isSourceAnswer(SKIPPED)).toBe(true);
    expect(isSourceAnswer("myspace")).toBe(false);
    expect(isSourceAnswer(3)).toBe(false);
  });

  it("tells the home-screen app from the browser", () => {
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
    expect(deviceOf(iphone, true)).toBe("ios-app");
    expect(deviceOf(iphone, false)).toBe("ios");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 15; Pixel 9)", false)).toBe("android");
    expect(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", false)).toBe("desktop");
  });

  it("is written in every dashboard language", () => {
    for (const [lang, d] of Object.entries(DICTS)) {
      const s = d.account.source;
      for (const k of ["title", "lead", "friend", "other", "otherAsk", "send", "close"] as const) expect(s[k], `${lang} ${k}`).toBeTruthy();
      expect(s.title, lang).toContain("PickupChecker");
    }
  });
});

describe("dashboard wiring", () => {
  const page = readFileSync("src/app/account/page.tsx", "utf8");
  const box = readFileSync("src/components/account/SourceSurvey.tsx", "utf8");
  it("renders it only while the account has no answer and the Neon store is configured", () => {
    expect(page).toMatch(/env\.surveyDatabaseUrl\(\) && !u\.meta\[ASKED_META\] && <SourceSurvey/);
  });
  it("stays away from restock pushes and other dialogs, and loads the marks lazily", () => {
    expect(box).toContain('get("from") === "push"');
    expect(box).toContain('document.querySelector("dialog[open]")');
    expect(box).toContain('import("./sourceLogos")');
  });
});

describe("POST /api/survey/source", () => {
  beforeEach(() => { state.userId = "user_1"; state.stored = []; state.neonFails = false; state.already = false; state.clerk = []; });

  it("stores the answer in Neon, then marks the account asked", async () => {
    const r = await post({ source: "grok", lang: "ja", standalone: true }, { "x-vercel-ip-country": "JP", "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)" });
    expect(r.status).toBe(200);
    expect(state.stored).toEqual([{ userId: "user_1", source: "grok", detail: null, plan: "plus", lang: "ja", country: "JP", device: "ios-app" }]);
    expect(state.clerk).toEqual([["user_1", { publicMetadata: { [ASKED_META]: "answered" } }]]);
  });

  it("keeps the typed brand only with Other", async () => {
    await post({ source: "other", detail: " MacRumors " });
    await post({ source: "google", detail: "ignored" });
    expect(state.stored.map((r) => r.detail)).toEqual(["MacRumors", null]);
  });

  it("records a close as skipped, so it is not asked again either", async () => {
    await post({ source: SKIPPED });
    expect(state.stored[0].source).toBe("skipped");
    expect(state.clerk[0][1]).toEqual({ publicMetadata: { [ASKED_META]: "skipped" } });
  });

  it("does not mark the account when Neon did not take it", async () => {
    state.neonFails = true;
    const r = await post({ source: "google" });
    expect(r.status).toBe(503);
    expect(state.clerk).toEqual([]);
  });

  it("refuses signed-out callers and unknown sources", async () => {
    expect((await post({ source: "nope" })).status).toBe(400);
    state.userId = null;
    expect((await post({ source: "google" })).status).toBe(401);
    expect(state.stored).toEqual([]);
  });
});
