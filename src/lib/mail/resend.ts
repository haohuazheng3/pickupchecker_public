import { appleName, appleBuyIphoneUrl, storeLocality } from "@/lib/apple/catalog";
import { alertQuote, configText } from "../push/payload";
import { notifyText } from "../i18n/notify";
import type { Lang } from "../i18n/locales";
import { appleStoreLabel, cityLabel, countryLabel } from "../i18n/places";
import { Resend } from "resend";
import { env } from "../env";
import type { CatalogItem, Store } from "../apple/catalog";

let _client: Resend | null = null;
function client(): Resend {
  if (_client) return _client;
  const key = env.resendKey();
  if (!key) throw new Error("RESEND_API_KEY is not set");
  _client = new Resend(key);
  return _client;
}

export interface AlertLine {
  item: CatalogItem;
  store: Store;
  quote: string | null;
}

/** The store as a reader of `lang` names it, and where it is ("Apple 銀座", "東京, 日本"). */
function storeName(l: AlertLine, lang: Lang): string {
  return lang === "en" ? appleName(l.store) : appleStoreLabel(l.store, lang);
}
function locality(l: AlertLine, lang: Lang): string {
  const cc = l.store.country ?? "us";
  return lang === "en" || cc === "us" ? storeLocality(l.store, true) : `${cityLabel(cc, l.store.city, lang)}, ${countryLabel(cc, lang)}`;
}

export function alertSubject(lines: AlertLine[], lang: Lang = "en"): string {
  const first = lines[0];
  return notifyText(lang).email.subject(configText(first.item, lang), storeName(first, lang), lines.length - 1);
}

/** "Cancel anytime" under every alert: a path, since signing in on the way keeps the path but not a query. */
const cancelUrlOf = (manageUrl: string) => new URL("/account/cancel", manageUrl).toString();

export function alertText(lines: AlertLine[], manageUrl: string, lang: Lang = "en"): string {
  const E = notifyText(lang).email;
  const body = lines
    .map(
      (l) =>
        `• ${configText(l.item, lang)} — ${storeName(l, lang)}, ${locality(l, lang)}` +
        `${alertQuote(l, lang) ? ` (${alertQuote(l, lang)})` : ""}\n  ${E.reserve}: ${appleBuyIphoneUrl(l.store.country)}\n  ${E.store}: ${l.store.url ?? ""}`,
    )
    .join("\n\n");
  return `${E.intro}\n\n${body}\n\n${E.tip}\n\n${E.manage(manageUrl)}\n${E.cancel(cancelUrlOf(manageUrl))}\n\n— PickupChecker`;
}

export function alertHtml(lines: AlertLine[], manageUrl: string, lang: Lang = "en"): string {
  const E = notifyText(lang).email;
  const rows = lines
    .map(
      (l) => `<tr><td style="padding:14px 16px;border-top:1px solid #e9e9ee">
  <div style="font:600 16px/1.3 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0b0b0f">${esc(configText(l.item, lang))}</div>
  <div style="font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#4a4a55;margin-top:2px">${lang === "en" ? `Apple ${esc(l.store.name)}` : esc(storeName(l, lang))} · ${esc(locality(l, lang))}${alertQuote(l, lang) ? ` · <span style="color:#0a7f3f">${esc(alertQuote(l, lang)!)}</span>` : ""}</div>
  <div style="margin-top:10px"><a href="${esc(appleBuyIphoneUrl(l.store.country))}" style="display:inline-block;background:#0b0b0f;color:#fff;text-decoration:none;font:600 13px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:10px 14px;border-radius:999px">${E.htmlReserve}</a>
  ${l.store.url ? `<a href="${esc(l.store.url)}" style="display:inline-block;margin-left:8px;color:#0b0b0f;font:500 13px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:10px 6px">${E.htmlStorePage}</a>` : ""}</div>
</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;padding:24px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="560" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.06)">
<tr><td style="padding:22px 16px 10px;font:700 20px/1.2 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0b0b0f">${E.htmlTitle}</td></tr>
${rows}
<tr><td style="padding:16px;border-top:1px solid #e9e9ee;font:13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#6b6b76">${E.htmlTip}<br><br><a href="${esc(manageUrl)}" style="color:#0b0b0f">${E.htmlManage}</a> · PickupChecker<br>${E.htmlGotIt} <a href="${esc(cancelUrlOf(manageUrl))}" style="color:#0b0b0f">${E.htmlCancel}</a></td></tr>
</table></td></tr></table></body></html>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Sends one alert email; returns the provider id. Throws on failure (caller records it). */
export async function sendAlertEmail(to: string, lines: AlertLine[], watchId: string, lang: Lang = "en"): Promise<string> {
  const manageUrl = `${env.siteUrl()}/account?watch=${encodeURIComponent(watchId)}`;
  const ref = `${watchId}-${Date.now()}`;
  return withRateLimitRetry(() =>
    client().emails.send({
      from: env.alertsFrom(),
      to,
      subject: alertSubject(lines, lang),
      text: alertText(lines, manageUrl, lang),
      html: alertHtml(lines, manageUrl, lang),
      headers: { "X-Entity-Ref-ID": ref },
      tags: [{ name: "kind", value: "restock" }],
    }),
  );
}

export async function sendPlainEmail(to: string, subject: string, text: string): Promise<string> {
  return withRateLimitRetry(() => client().emails.send({ from: env.alertsFrom(), to, subject, text }));
}

type SendResult = { data: { id?: string } | null; error: { name: string; message: string } | null };

/**
 * Resend allows 10 requests per second for the whole account, and one restock can alert dozens
 * of email-only members at once from three hosts — on 11-05 14:00 UTC a paying member's alert
 * was lost to `rate_limit_exceeded`. A rate-limited send was not delivered, so it is safe to
 * retry: wait (with jitter, so parallel senders spread out) and try again, up to ~4 s in all.
 * Any other error still throws at once (the caller records it).
 */
export async function withRateLimitRetry(
  send: () => Promise<SendResult>,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  waits: readonly number[] = [400, 900, 1300, 1600],
): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const { data, error } = await send();
    if (!error) return data?.id ?? "";
    if (error.name !== "rate_limit_exceeded" || attempt >= waits.length) throw new Error(`${error.name}: ${error.message}`);
    await sleep(waits[attempt] + Math.floor(Math.random() * 300));
  }
}
