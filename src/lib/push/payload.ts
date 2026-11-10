/**
 * What a push notification carries. The service worker (public/sw.js) reads exactly these fields,
 * so keep them small: push services cap payloads at 4 KB and iOS shows ~2 lines of body.
 */
import type { AlertLine } from "../mail/resend";
import { appleBuyUrl, storePath, storeLocality, appleName } from "../apple/catalog-us";
import { COUNTRIES_WITH_PAGES, type CountryCode } from "../apple/countries";
import { baseLang, localizePath, type Lang } from "../i18n/locales";
import { appleStoreLabel, cityLabel, colorLabel, countryLabel } from "../i18n/places";
import { notifyText } from "../i18n/notify";

/**
 * Apple's pickup quote, only where it is English: the US answers "Available Today", other countries answer in
 * their own language ("本日", "Heute verfügbar"), which would sit oddly in an English alert. Elsewhere the alert
 * says what it always means — in stock for pickup — and leaves the quote out.
 */
export function alertQuote(line: Pick<AlertLine, "store" | "quote">, lang: Lang = "en"): string | null {
  const cc = line.store.country ?? "us";
  if (lang === "en") return cc === "us" ? line.quote : null;
  // Another language: the quote when the store's country answers in it (a Tokyo store for a Japanese reader).
  return QUOTE_LANG[cc] && QUOTE_LANG[cc] === baseLang(lang) ? line.quote : null;
}
/** The language each country's pickup API answers in (its shop path). */
const QUOTE_LANG: Partial<Record<CountryCode, string>> = { jp: "ja", kr: "ko", tw: "zh", de: "de", at: "de", ch: "de", fr: "fr", be: "fr", it: "it", es: "es", nl: "nl", se: "sv" };

/** "iPhone Duo 256GB Night Sky" as a reader of `lang` writes it (Apple's colour names). */
export function configText(item: { model: string; storage: string; color: string }, lang: Lang = "en"): string {
  return `${item.model} ${item.storage} ${colorLabel(item.color, lang)}`;
}
/** "Apple SoHo · New York, NY" / "Apple 銀座 · 東京, 日本". */
export function whereText(store: AlertLine["store"], lang: Lang = "en", long = false): string {
  if (lang === "en") return `${appleName(store)} · ${storeLocality(store, long)}`;
  const cc = store.country ?? "us";
  return `${appleStoreLabel(store, lang)} · ${cc === "us" ? storeLocality(store, long) : `${cityLabel(cc, store.city, lang)}, ${countryLabel(cc, lang)}`}`;
}

export type PushKind = "restock" | "test";

export interface PushPayload {
  /** Payload schema version; bump when sw.js needs to tell old and new apart. */
  v: 1;
  kind: PushKind;
  title: string;
  body: string;
  /** Same-origin path the notification opens. */
  url: string;
  /**
   * Notifications with the same tag replace each other. A restock banner's tag names the rule, the store, the
   * configurations and the batch, so a second batch minutes later is a new banner that alerts again (Safari ignores
   * `renotify`, so a same-tag swap may stay silent on iPhone), never a quiet replacement of the first.
   */
  tag: string;
  /**
   * The push service's queue key (Topic header): an alert still waiting for an offline phone is replaced by a newer
   * one for the same rule × store × configurations. Absent: the tag is used.
   */
  collapse?: string;
  /** ISO time the restock was seen (or the test was sent). */
  at: string;
  /** Delivery receipt token, added per device by sendPushToRows (lib/push/receipt.ts); sw.js posts it back. */
  r?: string;
  data?: {
    /** apple.com buy page for exactly this storage/colour ("Buy" action on Android/desktop). */
    buyUrl?: string;
    storeNumber?: string;
    partNumber?: string;
    /** Test pushes: where this one should land, so a user with several devices can tell them apart. */
    device?: string;
  };
}

/** `MJQ34LL/A` → `MJQ34LL-A`: tags must be safe for the push service and the Topic header. */
export function sanitizePartNumber(partNumber: string): string {
  return partNumber.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * The rule, the store and every configuration in the banner: two banners for the same store that list different
 * configurations never collapse into each other. Restock banners add the batch time to it (see `tag`).
 */
export function restockTag(watchId: string, storeNumber: string, partNumber: string | string[]): string {
  const parts = [...new Set(Array.isArray(partNumber) ? partNumber : [partNumber])].sort();
  return `restock-${watchId}-${storeNumber}-${parts.map(sanitizePartNumber).join("-")}`;
}

/**
 * The banner's first line. One configuration: "iPhone Duo 512GB Night Sky". Several of the same model and storage
 * that came back together: "iPhone Duo 512GB Night Sky & Star White" (11-05: a member watching both colours at
 * Apple Somerset got two banners a second apart and read only the second). Mixed: each configuration, joined.
 */
export function restockTitle(lines: AlertLine[], lang: Lang = "en"): string {
  const seen = new Set<string>();
  const items = lines.map((l) => l.item).filter((i) => { const k = i.partNumber; if (seen.has(k)) return false; seen.add(k); return true; });
  if (items.length <= 1) return configText(items[0] ?? lines[0].item, lang);
  const sameLine = items.every((i) => i.model === items[0].model && i.storage === items[0].storage);
  if (sameLine) return `${items[0].model} ${items[0].storage} ${items.map((i) => colorLabel(i.color, lang)).join(" & ")}`;
  return items.map((i) => configText(i, lang)).join(" + ");
}

export function restockPayload(lines: AlertLine | AlertLine[], watchId: string, now = new Date(), lang: Lang = "en"): PushPayload {
  const list = Array.isArray(lines) ? lines : [lines];
  const first = list[0];
  const T = notifyText(lang);
  const title = T.pushTitle(restockTitle(list, lang));
  // "Apple SoHo · New York, NY"; elsewhere "Apple Regent Street · London, UK"; in Japanese "Apple 銀座 · 東京, 日本".
  const where = whereText(first.store, lang);
  const quote = alertQuote(first, lang);
  const body = T.pushBody(where, quote);
  return {
    v: 1,
    kind: "restock",
    title: title.slice(0, 120),
    body: body.slice(0, 200),
    // The store's page where its country's pages are live; elsewhere the account page (never a 404).
    // In the reader's language where the store's country has that version (a Tokyo store for a Japanese reader: /ja-jp/…).
    url: COUNTRIES_WITH_PAGES.has(first.store.country ?? "us") ? localizePath(`${storePath(first.store)}?from=push`, lang) : "/account?from=push",
    tag: `${restockTag(watchId, first.store.storeNumber, list.map((l) => l.item.partNumber))}-${now.getTime().toString(36)}`,
    collapse: restockTag(watchId, first.store.storeNumber, list.map((l) => l.item.partNumber)),
    at: now.toISOString(),
    data: { buyUrl: appleBuyUrl(first.item, first.store.country), storeNumber: first.store.storeNumber, partNumber: first.item.partNumber },
  };
}

/** "iPhone (Home Screen app)", "Android phone", "computer (Chrome)". */
export function deviceLabel(d: { platform: string; standalone: boolean; userAgent?: string | null }, lang: Lang = "en"): string {
  const D = notifyText(lang).device;
  const ua = d.userAgent ?? "";
  const browser = /Edg\//i.test(ua) ? "Edge" : /Firefox|FxiOS/i.test(ua) ? "Firefox" : /CriOS|Chrome\//i.test(ua) ? "Chrome" : /Safari\//i.test(ua) ? "Safari" : "";
  if (d.platform === "ios") return d.standalone ? D.iphoneApp : D.iphoneSafari;
  if (d.platform === "android") return d.standalone ? D.androidApp : D.android(browser);
  if (d.platform === "desktop") return D.computer(browser);
  return D.other;
}

/** Clock time the user can compare with the moment they pressed the button. */
export function formatSentAt(now: Date): string {
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC`;
}

export function testPayload(opts: { device?: string; now?: Date; lang?: Lang } = {}): PushPayload {
  const now = opts.now ?? new Date();
  const T = notifyText(opts.lang ?? "en");
  const device = opts.device ?? T.device.other;
  return {
    v: 1,
    kind: "test",
    title: T.testTitle,
    body: T.testBody(formatSentAt(now), device).slice(0, 200),
    url: "/account?from=push",
    tag: "test",
    at: now.toISOString(),
    data: { device },
  };
}

/** VAPID public keys travel as base64url; PushManager wants the raw 65-byte P-256 point. */
export function urlBase64ToBytes(s: string): Uint8Array {
  const padded = (s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bin = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
