/**
 * Owner's rule (CLAUDE.md 「提醒只有消息弹窗」): restock alerts are push notifications only. There is no
 * alert email and no email fallback — a member without a device gets nothing (a `skipped` / `no_device`
 * row) and the site tells them to turn notifications on. These checks fail if email alerts creep back.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as resend from "@/lib/mail/resend";
import { notifyText } from "@/lib/i18n/notify";

const read = (p: string) => readFileSync(p, "utf8");
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe("no email restock alerts", () => {
  it("the alert sender never touches mail", () => {
    const src = read("src/lib/stock/notify.ts");
    expect(src).not.toMatch(/mail\//);
    expect(src).not.toMatch(/sendAlertEmail|sendPlainEmail/);
    expect(src).toContain('error: "no_device"');
  });
  it("there is no alert-email function or alert-email text", () => {
    expect(Object.keys(resend)).not.toContain("sendAlertEmail");
    for (const lang of ["en", "ja", "ko", "zh-TW", "zh-HK", "de", "de-CH", "fr", "fr-CA", "it", "es", "nl", "sv", "ar"] as const) {
      expect(Object.keys(notifyText(lang)), lang).not.toContain("email");
    }
  });
  it("no copy promises alerts by email", () => {
    const bad = /go(es)? to your email|by email when|by email until|email when no device|\(or email\)|alerts come by email|alert goes to your email|send alerts by email/i;
    const hits = files("src").filter((p) => bad.test(read(p)));
    expect(hits).toEqual([]);
  });
});
