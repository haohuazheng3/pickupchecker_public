/**
 * The devices that get an account's alerts as notifications, summarised for a sentence: after saving
 * alerts, on the checkout page and in the account area the site says where alerts go instead of offering
 * a setup the user already did (on another device, or in the Home Screen app while reading in Safari).
 */
import { eq } from "drizzle-orm";
import { db, schema } from "./db";

export interface DeviceSummary {
  /** Devices with notifications on (not stopped by the push service). */
  active: number;
  /** "iPhone app", "2 devices" … null when none. */
  label: string | null;
}

export function deviceLabel(d: { platform: string; standalone: boolean; userAgent?: string | null }): string {
  if (d.platform === "ios") return `${/iPhone/i.test(d.userAgent ?? "iPhone") ? "iPhone" : "iPad"}${d.standalone ? " app" : ""}`;
  return d.platform === "android" ? "Android phone" : d.platform === "desktop" ? "computer" : "device";
}

export function summarizeDevices(rows: { platform: string; standalone: boolean; userAgent?: string | null; disabledAt: Date | string | null }[]): DeviceSummary {
  const on = rows.filter((r) => !r.disabledAt);
  if (on.length === 0) return { active: 0, label: null };
  const labels = [...new Set(on.map(deviceLabel))];
  return { active: on.length, label: on.length === 1 ? labels[0] : `${on.length} devices` };
}

export async function deviceSummary(userId: string): Promise<DeviceSummary> {
  const p = schema.pushSubscriptions;
  const rows = await db().select({ platform: p.platform, standalone: p.standalone, userAgent: p.userAgent, disabledAt: p.disabledAt }).from(p).where(eq(p.userId, userId));
  return summarizeDevices(rows);
}
