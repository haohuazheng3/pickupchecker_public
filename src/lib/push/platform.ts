/**
 * Pure platform detection shared by the client (install guide, push setup) and the server
 * (subscription rows, tests). No DOM access here: callers pass what they know.
 */
export type Platform = "ios" | "android" | "desktop" | "unknown";
export type Browser = "safari" | "chrome" | "edge" | "firefox" | "samsung" | "other";

export function platformFromUA(ua: string, opts: { maxTouchPoints?: number } = {}): Platform {
  const u = ua ?? "";
  if (/iPhone|iPad|iPod/i.test(u)) return "ios";
  // iPadOS 13+ pretends to be a Mac; the touch points give it away.
  if (/Macintosh/i.test(u) && (opts.maxTouchPoints ?? 0) > 1) return "ios";
  if (/Android/i.test(u)) return "android";
  if (!u) return "unknown";
  return "desktop";
}

export function browserFromUA(ua: string): Browser {
  const u = ua ?? "";
  if (/Edg\//i.test(u)) return "edge";
  if (/SamsungBrowser/i.test(u)) return "samsung";
  if (/Firefox|FxiOS/i.test(u)) return "firefox";
  if (/CriOS|Chrome\//i.test(u)) return "chrome";
  if (/Safari\//i.test(u) && /Version\//i.test(u)) return "safari";
  if (/Safari\//i.test(u) && /iPhone|iPad|iPod/i.test(u)) return "safari";
  return "other";
}

/** Facebook, Instagram, TikTok, WeChat … web views cannot install or receive push. */
export function isInAppBrowser(ua: string): boolean {
  return /FBAN|FBAV|Instagram|TikTok|musical_ly|MicroMessenger|Line\/|Snapchat|Twitter|GSA\//i.test(ua ?? "");
}

/**
 * A phone or tablet (iOS, Android) shows a push even while locked; a computer only while it is awake, so a member
 * whose only devices are computers also gets every alert by email (owner, 2026-11-18, after a Mac member read the
 * quiet inbox as a broken account). `unknown` counts as a computer: an extra email beats a missed restock.
 */
export function hasMobileDevice(devices: { platform: string }[]): boolean {
  return devices.some((d) => d.platform === "ios" || d.platform === "android");
}

export function platformLabel(p: Platform): string {
  return p === "ios" ? "iPhone / iPad" : p === "android" ? "Android" : p === "desktop" ? "Computer" : "Device";
}
