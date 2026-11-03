/**
 * The devices that get an account's alerts as notifications, summarised for a sentence: after saving
 * alerts, on the checkout page and in the account area the site says where alerts go instead of offering
 * a setup the user already did (on another device, or in the Home Screen app while reading in Safari).
 */
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { CDICTS } from "./i18n/cdict/all";
import { fill, plural } from "./i18n/format";
import type { Lang } from "./i18n/locales";

export interface DeviceSummary {
  /** Devices with notifications on (not stopped by the push service). */
  active: number;
  /** "iPhone app", "2 devices" … null when none. */
  label: string | null;
}

/** In the person's language (`lang`): the label goes into their sentences ("Alerts go to your iPhone app"). */
export function deviceLabel(d: { platform: string; standalone: boolean; userAgent?: string | null }, lang: Lang = "en"): string {
  const w = CDICTS[lang].account.devices;
  if (d.platform === "ios") {
    const device = /iPhone/i.test(d.userAgent ?? "iPhone") ? w.iphone : w.ipad;
    return d.standalone ? fill(w.app, { device }) : device;
  }
  return d.platform === "android" ? w.android : d.platform === "desktop" ? w.computer : w.device;
}

export function summarizeDevices(rows: { platform: string; standalone: boolean; userAgent?: string | null; disabledAt: Date | string | null }[], lang: Lang = "en"): DeviceSummary {
  const on = rows.filter((r) => !r.disabledAt);
  if (on.length === 0) return { active: 0, label: null };
  const labels = [...new Set(on.map((r) => deviceLabel(r, lang)))];
  return { active: on.length, label: on.length === 1 ? labels[0] : fill(plural(lang, on.length, CDICTS[lang].account.devices.many), { n: on.length }) };
}

export async function deviceSummary(userId: string, lang: Lang = "en"): Promise<DeviceSummary> {
  const p = schema.pushSubscriptions;
  const rows = await db().select({ platform: p.platform, standalone: p.standalone, userAgent: p.userAgent, disabledAt: p.disabledAt }).from(p).where(eq(p.userId, userId));
  return summarizeDevices(rows, lang);
}
