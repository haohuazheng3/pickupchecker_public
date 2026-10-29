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

export function alertSubject(lines: AlertLine[]): string {
  const first = lines[0];
  const more = lines.length > 1 ? ` +${lines.length - 1} more` : "";
  return `In stock: ${first.item.model} ${first.item.storage} ${first.item.color} at Apple ${first.store.name}${more}`;
}

export function alertText(lines: AlertLine[], manageUrl: string): string {
  const body = lines
    .map(
      (l) =>
        `• ${l.item.model} ${l.item.storage} ${l.item.color} — Apple ${l.store.name}, ${l.store.city}, ${l.store.state}` +
        `${l.quote ? ` (${l.quote})` : ""}\n  Reserve: https://www.apple.com/shop/buy-iphone\n  Store: ${l.store.url ?? ""}`,
    )
    .join("\n\n");
  return `Good news — available for in-store pickup right now:\n\n${body}\n\nPickup stock moves fast: open the Apple Store app or apple.com, choose "Pick up", and select the store.\n\nManage or pause this alert: ${manageUrl}\n\n— PickupChecker`;
}

export function alertHtml(lines: AlertLine[], manageUrl: string): string {
  const rows = lines
    .map(
      (l) => `<tr><td style="padding:14px 16px;border-top:1px solid #e9e9ee">
  <div style="font:600 16px/1.3 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0b0b0f">${esc(l.item.model)} ${esc(l.item.storage)} ${esc(l.item.color)}</div>
  <div style="font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#4a4a55;margin-top:2px">Apple ${esc(l.store.name)} · ${esc(l.store.city)}, ${esc(l.store.state)}${l.quote ? ` · <span style="color:#0a7f3f">${esc(l.quote)}</span>` : ""}</div>
  <div style="margin-top:10px"><a href="https://www.apple.com/shop/buy-iphone" style="display:inline-block;background:#0b0b0f;color:#fff;text-decoration:none;font:600 13px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:10px 14px;border-radius:999px">Reserve on apple.com</a>
  ${l.store.url ? `<a href="${esc(l.store.url)}" style="display:inline-block;margin-left:8px;color:#0b0b0f;font:500 13px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:10px 6px">Store page →</a>` : ""}</div>
</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;padding:24px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="560" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.06)">
<tr><td style="padding:22px 16px 10px;font:700 20px/1.2 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0b0b0f">In stock for pickup now</td></tr>
${rows}
<tr><td style="padding:16px;border-top:1px solid #e9e9ee;font:13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#6b6b76">Pickup stock moves fast — reserve in the Apple Store app or on apple.com, choose <b>Pick up</b> and select the store.<br><br><a href="${esc(manageUrl)}" style="color:#0b0b0f">Manage or pause this alert</a> · PickupChecker</td></tr>
</table></td></tr></table></body></html>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Sends one alert email; returns the provider id. Throws on failure (caller records it). */
export async function sendAlertEmail(to: string, lines: AlertLine[], watchId: string): Promise<string> {
  const manageUrl = `${env.siteUrl()}/account?watch=${encodeURIComponent(watchId)}`;
  const { data, error } = await client().emails.send({
    from: env.alertsFrom(),
    to,
    subject: alertSubject(lines),
    text: alertText(lines, manageUrl),
    html: alertHtml(lines, manageUrl),
    headers: { "X-Entity-Ref-ID": `${watchId}-${Date.now()}` },
    tags: [{ name: "kind", value: "restock" }],
  });
  if (error) throw new Error(`${error.name}: ${error.message}`);
  return data?.id ?? "";
}

export async function sendPlainEmail(to: string, subject: string, text: string): Promise<string> {
  const { data, error } = await client().emails.send({ from: env.alertsFrom(), to, subject, text });
  if (error) throw new Error(`${error.name}: ${error.message}`);
  return data?.id ?? "";
}
