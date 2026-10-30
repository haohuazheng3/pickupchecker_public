/**
 * Google Search Console → gsc_daily. The service account (GOOGLE_SERVICE_ACCOUNT_B64, a Full user of
 * sc-domain:pickupchecker.com) signs a JWT with node:crypto, so no Google SDK is bundled.
 * Each run re-pulls the last few days: Search Console revises recent days for about three days.
 */
import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { db, schema } from "./db";

export const GSC_SITE = "sc-domain:pickupchecker.com";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

async function accessToken(): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_B64 is not set");
  const sa = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const b64u = (x: string) => Buffer.from(x).toString("base64url");
  const unsigned = `${b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64u(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }))}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }) });
  const j = (await r.json()) as { access_token?: string; error?: string };
  if (!j.access_token) throw new Error(`gsc token: ${j.error ?? r.status}`);
  return j.access_token;
}

interface Row { keys: [string, string, string, string, string]; clicks: number; impressions: number; ctr: number; position: number }

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Pull `days` days ending two days ago (Search Console's usual lag) and upsert them. Returns rows written. */
export async function pullSearchAnalytics(days = 5, now = new Date()): Promise<{ rows: number; from: string; to: string }> {
  const end = new Date(now.getTime() - 2 * 86400_000);
  const start = new Date(end.getTime() - (days - 1) * 86400_000);
  const from = ymd(start), to = ymd(end);
  const tok = await accessToken();
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`;
  let startRow = 0;
  let written = 0;
  for (;;) {
    const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: JSON.stringify({ startDate: from, endDate: to, dimensions: ["date", "query", "page", "device", "country"], rowLimit: 25000, startRow, dataState: "all" }) });
    if (!r.ok) throw new Error(`gsc query ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const rows = ((await r.json()) as { rows?: Row[] }).rows ?? [];
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500).map((x) => ({ date: x.keys[0], query: x.keys[1].slice(0, 500), page: x.keys[2], device: x.keys[3], country: x.keys[4], clicks: Math.round(x.clicks), impressions: Math.round(x.impressions), ctr: x.ctr, position: x.position }));
      await db().insert(schema.gscDaily).values(chunk).onConflictDoUpdate({
        target: [schema.gscDaily.date, schema.gscDaily.query, schema.gscDaily.page, schema.gscDaily.device, schema.gscDaily.country],
        set: { clicks: sql`excluded.clicks`, impressions: sql`excluded.impressions`, ctr: sql`excluded.ctr`, position: sql`excluded.position`, fetchedAt: sql`now()` },
      });
      written += chunk.length;
    }
    if (rows.length < 25000) break;
    startRow += rows.length;
  }
  return { rows: written, from, to };
}
