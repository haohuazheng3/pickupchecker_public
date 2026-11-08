import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 2026-11-08: owner alerts went through the Cloudflare mail worker first, and its Workers Free account ran out of
 * requests every evening (another project's collector used 122k of the 100k a day), so watchdog, capacity and
 * archive mails were lost from ~22:00 to 00:00 UTC. Resend now goes first, the worker is the fallback.
 */
const send = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mail/resend", () => ({ sendPlainEmail: send }));
import { notifyOwner } from "@/lib/mail/owner";

const fetchMock = vi.fn();
beforeEach(() => {
  send.mockReset(); fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("OWNER_EMAIL", "owner@example.com");
  vi.stubEnv("MAIL_WORKER_URL", "https://worker.example.com");
  vi.stubEnv("MAIL_WORKER_TOKEN", "t");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("notifyOwner", () => {
  it("sends through Resend and leaves the mail worker alone", async () => {
    send.mockResolvedValue("id");
    await notifyOwner("Subject", "Body", "reader@example.com");
    expect(send).toHaveBeenCalledWith("owner@example.com", "Subject", "Body", "reader@example.com");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("falls back to the mail worker when Resend fails", async () => {
    send.mockRejectedValue(new Error("rate_limit_exceeded"));
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await notifyOwner("Subject", "Body");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://worker.example.com/notify");
  });
});

describe("host scripts mail through owner-mail.sh (Resend first)", () => {
  const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  it("owner-mail.sh tries Resend before the worker", () => {
    const s = src("infra/linode/owner-mail.sh");
    expect(s.indexOf("api.resend.com")).toBeGreaterThan(0);
    expect(s.indexOf("api.resend.com")).toBeLessThan(s.indexOf("${url%/}/notify"));
  });
  it("no host script posts to the worker's /notify by itself any more", () => {
    for (const f of ["db-maintenance.sh", "core-archive.sh", "poll-rollup.sh", "probe.sh"]) {
      expect(src(`infra/linode/${f}`), f).not.toContain("/notify");
    }
  });
});
