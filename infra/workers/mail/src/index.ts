/**
 * PickupChecker mail worker (pickupchecker-mail).
 *
 *  email()     Cloudflare Email Routing hands over mail for test@pickupchecker.com (+tags). It is
 *              parsed and POSTed to APP_URL/api/inbox/ingest (bearer INBOX_INGEST_SECRET) with the
 *              receiving server's SPF/DKIM/DMARC verdicts. Never rejects mail.
 *  fetch()     POST /notify (bearer NOTIFY_TOKEN) emails the owner through the send_email binding.
 *              GET /health → 200.
 *  scheduled() GET APP_URL/api/health?shallow=1; on failure email the owner (at most every 2 hours
 *              while down) and once on recovery. Also reachable as POST /probe (bearer NOTIFY_TOKEN)
 *              because the account has no free cron trigger left — the Hetzner host calls it.
 */
import PostalMime from "postal-mime";
import { EmailMessage } from "cloudflare:email";

export interface Env {
  APP_URL: string;
  OWNER_EMAIL: string;
  INBOX_INGEST_SECRET: string;
  NOTIFY_TOKEN: string;
  OWNER_MAIL: { send(message: EmailMessage): Promise<void> };
}

const FROM = "alerts@pickupchecker.com";
const FROM_DISPLAY = "PickupChecker Ops";
const MAX_BODY = 200_000;
const REMIND_MS = 2 * 60 * 60 * 1000;
const STATE_URL = "https://pickupchecker-mail.internal/health-state";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function bearerOk(req: Request, secret: string | undefined) {
  if (!secret) return false;
  const h = req.headers.get("authorization") ?? "";
  const t = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (t.length !== secret.length) return false;
  let d = 0;
  for (let i = 0; i < t.length; i++) d |= t.charCodeAt(i) ^ secret.charCodeAt(i);
  return d === 0;
}
function b64(s: string) { const b = new TextEncoder().encode(s); let x = ""; for (const c of b) x += String.fromCharCode(c); return btoa(x); }
function wrap76(s: string) { const o: string[] = []; for (let i = 0; i < s.length; i += 76) o.push(s.slice(i, i + 76)); return o.join("\r\n"); }
function hw(s: string) { return /^[\x20-\x7e]*$/.test(s) ? s : `=?utf-8?B?${b64(s)}?=`; }
function mime(to: string, subject: string, text: string, replyTo?: string) {
  const h = [
    `From: ${FROM_DISPLAY} <${FROM}>`, `To: <${to}>`,
    ...(replyTo && /^[^\s<>@]+@[^\s<>@]+$/.test(replyTo) ? [`Reply-To: <${replyTo}>`] : []),
    `Subject: ${hw(subject.replace(/[\r\n]+/g, " ").slice(0, 900))}`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@pickupchecker.com>`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64", "Auto-Submitted: auto-generated",
  ];
  return `${h.join("\r\n")}\r\n\r\n${wrap76(b64(text))}\r\n`;
}
async function sendOwner(env: Env, subject: string, text: string, replyTo?: string) {
  await env.OWNER_MAIL.send(new EmailMessage(FROM, env.OWNER_EMAIL, mime(env.OWNER_EMAIL, subject, text, replyTo)));
}
function verdict(auth: string, m: "spf" | "dkim" | "dmarc") { const r = new RegExp(`\\b${m}=([a-z]+)`, "i").exec(auth); return r ? r[1].toLowerCase() : undefined; }

interface IncomingEmail { readonly from: string; readonly to: string; readonly headers: Headers; readonly raw: ReadableStream<Uint8Array>; readonly rawSize: number }

async function ingest(message: IncomingEmail, env: Env) {
  const parsed = await PostalMime.parse(message.raw);
  const auth = message.headers.get("authentication-results") ?? "";
  const headers: Record<string, string> = {};
  for (const k of ["from", "to", "subject", "date", "message-id", "in-reply-to", "references", "authentication-results", "received-spf", "dkim-signature"]) {
    const v = message.headers.get(k); if (v) headers[k] = v.slice(0, 4000);
  }
  const body = {
    to: message.to, from: message.from, subject: parsed.subject ?? "", text: (parsed.text ?? "").slice(0, MAX_BODY), html: (parsed.html ?? "").slice(0, MAX_BODY), headers,
    auth: { spf: verdict(auth, "spf"), dkim: verdict(auth, "dkim"), dmarc: verdict(auth, "dmarc") },
  };
  const res = await fetch(`${env.APP_URL}/api/inbox/ingest`, { method: "POST", headers: { authorization: `Bearer ${env.INBOX_INGEST_SECRET}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) console.error("ingest failed", res.status, await res.text().catch(() => ""));
}

const worker = {
  async email(message: IncomingEmail, env: Env) {
    try {
      const local = message.to.split("@")[0].toLowerCase();
      if (local === "test" || local.startsWith("test+")) await ingest(message, env);
      else console.log("dropped unrouted address", message.to);
    } catch (e) { console.error("email handler failed", e); }
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "pickupchecker-mail" });
    if (req.method === "POST" && url.pathname === "/notify") {
      if (!bearerOk(req, env.NOTIFY_TOKEN)) return json({ error: "unauthorized" }, 401);
      const b = (await req.json().catch(() => null)) as { subject?: string; text?: string; replyTo?: string } | null;
      if (!b?.subject || !b?.text) return json({ error: "subject and text required" }, 400);
      await sendOwner(env, b.subject, b.text.slice(0, 20000), b.replyTo);
      return json({ ok: true });
    }
    if (req.method === "POST" && url.pathname === "/probe") {
      if (!bearerOk(req, env.NOTIFY_TOKEN)) return json({ error: "unauthorized" }, 401);
      return json(await probe(env));
    }
    return json({ error: "not found" }, 404);
  },

  async scheduled(_c: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(probe(env));
  },
};

export default worker;

async function probe(env: Env) {
  const cache = await caches.open("health");
  const prev = (await (await cache.match(STATE_URL))?.json().catch(() => null)) as { down: boolean; since?: string; lastMail?: string } | null ?? { down: false };
  let status = 0; let body = "";
  try {
    const r = await fetch(`${env.APP_URL}/api/health?shallow=1&cf=1`, { signal: AbortSignal.timeout(25000) });
    status = r.status; body = (await r.text()).slice(0, 4000);
  } catch (e) { body = String(e); }
  const ok = status === 200;
  const now = new Date();
  let next = prev;
  if (!ok) {
    const last = prev.lastMail ? new Date(prev.lastMail).getTime() : 0;
    if (!prev.down || now.getTime() - last > REMIND_MS) {
      await sendOwner(env, `[PickupChecker] /api/health returned ${status || "no response"}`, `GET ${env.APP_URL}/api/health failed from the Cloudflare probe.\n\n${body}`).catch((e) => console.error("mail failed", e));
      next = { down: true, since: prev.since ?? now.toISOString(), lastMail: now.toISOString() };
    }
  } else if (prev.down) {
    await sendOwner(env, "[PickupChecker] Recovered: /api/health is OK again", `Down since ${prev.since ?? "?"}; OK at ${now.toISOString()}.`).catch(() => undefined);
    next = { down: false };
  }
  await cache.put(STATE_URL, new Response(JSON.stringify(next), { headers: { "content-type": "application/json", "cache-control": "max-age=604800" } }));
  return { ok, status };
}
