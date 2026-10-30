/**
 * Can the Stripe key do everything the site asks of it? Checked live — at most every ten minutes, cached in
 * poller_state — instead of inferred from old errors: an error group from before a permission was granted
 * kept the status board yellow long after the key was fixed. Writes aim at ids that do not exist, so nothing
 * changes: a permitted key gets "no such object", a key without the permission gets 403. Once the key
 * passes, error groups left over from a missing permission are resolved.
 */
import type Stripe from "stripe";
import { and, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { stripe } from "../stripe";
import { env } from "../env";
import { isPermissionError } from "../billing";
import { readState, writeState } from "../stock/sweep";

const KEY = "stripe:permissions";
const EVERY_MS = 10 * 60_000;

/** What the site calls, by the name Stripe's restricted-key settings use. */
const PROBES: { permission: string; run: (s: Stripe) => Promise<unknown> }[] = [
  { permission: "Checkout Sessions Write", run: (s) => s.checkout.sessions.expire("cs_pc_probe_missing") },
  { permission: "Subscriptions Read", run: (s) => s.subscriptions.list({ limit: 1 }) },
  { permission: "Subscriptions Write", run: (s) => s.subscriptions.update("sub_pc_probe_missing", { metadata: { probe: "1" } }) },
  { permission: "Customer portal Write", run: (s) => s.billingPortal.sessions.create({ customer: "cus_pc_probe_missing" }) },
];

export interface StripePermissions { checkedAt: string; missing: string[] }

/**
 * One probe's outcome: "ok" when the call went through or Stripe looked for the (made-up) object, "missing"
 * when the key lacks the permission, "unknown" for anything else (a bad key, Stripe down) — no verdict.
 */
export function probeOutcome(e: unknown): "ok" | "missing" | "unknown" {
  if (!e) return "ok";
  // By code first: the message of a "No such …" error quotes the id, and isPermissionError also matches text.
  if ((e as { code?: string }).code === "resource_missing") return "ok";
  return isPermissionError(e) ? "missing" : "unknown";
}

/** Probes the key (or returns the last result while it is fresh); null when Stripe is not configured or unreachable. */
export async function stripePermissions(now = Date.now()): Promise<StripePermissions | null> {
  if (!env.stripeKey()) return null;
  const cached = await readState<StripePermissions>(KEY).catch(() => null);
  if (cached && now - new Date(cached.value.checkedAt).getTime() < EVERY_MS) return cached.value;
  const s = stripe();
  const missing: string[] = [];
  for (const p of PROBES) {
    const outcome = probeOutcome(await p.run(s).then(() => null, (e: unknown) => e ?? new Error("rejected")));
    if (outcome === "unknown") return cached?.value ?? null;
    if (outcome === "missing") missing.push(p.permission);
  }
  const result: StripePermissions = { checkedAt: new Date(now).toISOString(), missing };
  await writeState(KEY, { ...result });
  if (missing.length === 0) {
    const g = schema.errorGroups;
    await db().update(g).set({ resolvedAt: new Date() }).where(and(isNull(g.resolvedAt), sql`${g.message} like '%does not have the required permissions%'`));
  }
  return result;
}
