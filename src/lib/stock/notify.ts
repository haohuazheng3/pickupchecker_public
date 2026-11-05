/**
 * Turn restock transitions into alerts: a push notification to every device the user turned on,
 * or an email when no device has (email is the fallback, not the default).
 *
 *  match: active, unpaused rules of the same store × exact configuration (model, storage, colour)
 *  dedupe: one notification per (watch, event) — unique index; plus a per-(watch, store, part)
 *          cool-down so a flapping store does not mail every 15 s
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "../db";
import { PART_INDEX, STORE_INDEX, itemFor, modelKeyFor } from "../apple/catalog";
import { sendAlertEmail } from "../mail/resend";
import { recordError, errorMessage } from "../errors";
import { enabledSubscriptionsFor, notifyPushStopped, pushConfigured, sendPushNudge, sendPushToRows } from "../push/server";
import { logOps } from "../ops";
import { restockPayload } from "../push/payload";
import { coveredWatchIds, effectivePlan } from "../plans";
import type { Transition } from "./ingest";
import { langOfUser } from "../i18n/notify";

const COOLDOWN_MS = 30 * 60 * 1000; // same watch × store × part at most every 30 min

export interface NotifyStats {
  matched: number;
  sent: number;
  failed: number;
  skipped: number;
}

/** One rule = one store × one exact configuration; a legacy-shaped row (arrays not of length 1) never matches. */
export function ruleMatches(w: { model: string; storages: string[]; colors: string[]; storeNumbers: string[] }, modelKey: string, storage: string, color: string, storeNumber: string): boolean {
  if (w.model !== modelKey) return false;
  if (w.storages.length !== 1 || w.colors.length !== 1 || w.storeNumbers.length !== 1) return false;
  return w.storages[0] === storage && w.colors[0] === color && w.storeNumbers[0] === storeNumber;
}

export async function notifyRestocks(transitions: Transition[], eventIds: number[], now = new Date()): Promise<NotifyStats> {
  const stats: NotifyStats = { matched: 0, sent: 0, failed: 0, skipped: 0 };
  const restocks = transitions
    .map((t, i) => ({ t, eventId: eventIds[i] }))
    // First sightings (a store or part we had no status for: coverage grew, a SKU was added, rows expired
    // as stale while the poller was down) are not restocks — alerting on them would spam every watcher.
    .filter((x) => x.t.kind === "restock" && !x.t.firstSeen);
  if (restocks.length === 0) return stats;
  const d = db();

  const models = [...new Set(restocks.map((x) => modelKeyFor(PART_INDEX.get(x.t.partNumber)?.model ?? "")))];
  const candidates = await d
    .select({ watch: schema.watches, email: schema.users.email, locale: schema.users.locale })
    .from(schema.watches)
    .innerJoin(schema.users, eq(schema.users.id, schema.watches.userId))
    .where(and(eq(schema.watches.active, true), eq(schema.watches.paused, false), inArray(schema.watches.model, models)));

  // Plan coverage: the oldest `limit` active rules of each user send (no plan = 0, plus = 10, pro = 20).
  const userIds = [...new Set(candidates.map((c) => c.watch.userId))];
  const [allRules, subs] = userIds.length
    ? await Promise.all([
        d.select({ id: schema.watches.id, userId: schema.watches.userId, active: schema.watches.active, createdAt: schema.watches.createdAt }).from(schema.watches).where(inArray(schema.watches.userId, userIds)),
        d.select().from(schema.subscriptions).where(inArray(schema.subscriptions.userId, userIds)),
      ])
    : [[], []];
  const coveredByUser = new Map<string, Set<string>>();
  for (const uid of userIds) {
    const { plan } = effectivePlan(subs.filter((s) => s.userId === uid));
    coveredByUser.set(uid, coveredWatchIds(allRules.filter((r) => r.userId === uid), plan.limit));
  }
  const active = candidates.filter((c) => coveredByUser.get(c.watch.userId)?.has(c.watch.id));

  // Recent notifications for cool-down (last 30 min) for the involved watches.
  const watchIds = active.map((c) => c.watch.id);
  const recent =
    watchIds.length === 0
      ? []
      : await d
          .select({ watchId: schema.notifications.watchId, storeNumber: schema.notifications.storeNumber, partNumber: schema.notifications.partNumber })
          .from(schema.notifications)
          .where(
            and(
              inArray(schema.notifications.watchId, watchIds),
              eq(schema.notifications.status, "sent"),
              sql`${schema.notifications.createdAt} > ${new Date(now.getTime() - COOLDOWN_MS)}`,
            ),
          );
  const cooled = new Set(recent.map((r) => `${r.watchId}|${r.storeNumber}|${r.partNumber}`));
  const pushByUser = pushConfigured() ? await enabledSubscriptionsFor(active.map((c) => c.watch.userId)) : new Map<string, never[]>();

  // Group per member: every rule of theirs that a restock of this sweep matched. One e-mail carries all of it; pushes go
  // out one banner per store, naming every configuration that came back there (two banners a second apart for the
  // same store read as one, 11-05 Apple Somerset).
  type Hit = { watch: (typeof active)[number]["watch"]; t: Transition; eventId: number };
  const perUser = new Map<string, { c: (typeof active)[number]; hits: Hit[] }>();
  for (const x of restocks) {
    const item = PART_INDEX.get(x.t.partNumber);
    const store = STORE_INDEX.get(x.t.storeNumber);
    if (!item || !store) continue;
    const modelKey = modelKeyFor(item.model);
    for (const c of active) {
      const w = c.watch;
      if (!ruleMatches(w, modelKey, item.storage, item.color, store.storeNumber)) continue;
      stats.matched++;
      if (cooled.has(`${w.id}|${store.storeNumber}|${item.partNumber}`)) {
        stats.skipped++;
        continue;
      }
      const g = perUser.get(w.userId) ?? { c, hits: [] };
      g.hits.push({ watch: w, t: x.t, eventId: x.eventId });
      perUser.set(w.userId, g);
    }
  }

  const lineOf = (h: Hit) => {
    const store = STORE_INDEX.get(h.t.storeNumber)!;
    // The item as the store's country sells it (a ZD/A part at an Austrian store: the Austrian price).
    const item = itemFor(h.t.partNumber, store.country)!;
    return { item, store, quote: h.t.quote };
  };
  const record = (hits: Hit[], channel: "push" | "email", status: "sent" | "failed", extra: { providerId?: string | null; latencyMs?: number; error?: string }) =>
    d.insert(schema.notifications).values(hits.map((h) => ({
      watchId: h.watch.id, userId: h.watch.userId, eventId: h.eventId ?? null, storeNumber: h.t.storeNumber, partNumber: h.t.partNumber,
      channel, status, providerId: extra.providerId ?? null, latencyMs: extra.latencyMs ?? null, error: extra.error, createdAt: now,
    }))).onConflictDoNothing();

  // Every member is served concurrently: one slow push service never serialises the others.
  await Promise.all([...perUser.values()].map(async (g) => {
    const userId = g.c.watch.userId;
    const devices = pushByUser.get(userId) ?? [];
    // The person's language (their account's, set when they signed up in it or chose it): text, store names, the page the push opens.
    const lang = langOfUser(g.c.locale);
    const started = Date.now();
    let byEmail: Hit[] = devices.length ? [] : g.hits;
    if (devices.length) {
      // One banner per store, in parallel; a store whose push reached no device falls back to e-mail below.
      const byStore = new Map<string, Hit[]>();
      for (const h of g.hits) byStore.set(h.t.storeNumber, [...(byStore.get(h.t.storeNumber) ?? []), h]);
      await Promise.all([...byStore.values()].map(async (hits) => {
        try {
          const r = await sendPushToRows(devices, restockPayload(hits.map(lineOf), hits[0].watch.id, now, lang), { source: "poller" });
          // Only when nothing reached the user: a device the push service dropped (410) while another
          // device received the alert is a rotation, not an outage.
          if (r.sent === 0 && r.disabledRows.length) await notifyPushStopped(userId, g.c.email, r.disabledRows, now, lang).catch(() => undefined);
          if (r.sent > 0) {
            await record(hits, "push", "sent", { providerId: r.firstId, latencyMs: Date.now() - started });
            stats.sent += hits.length;
          } else {
            // Every device failed: the alert still goes out, by email, instead of being lost.
            await logOps("poller", "warn", `push to ${devices.length} device(s) failed, falling back to email`, { watchId: hits[0].watch.id, errors: r.errors.slice(0, 3) });
            byEmail = [...byEmail, ...hits];
          }
        } catch (e) {
          stats.failed += hits.length;
          await recordError("poller", `alert push failed: ${errorMessage(e)}`, { watchId: hits[0].watch.id });
          await record(hits, "push", "failed", { error: errorMessage(e).slice(0, 500) });
        }
      }));
    }
    if (byEmail.length === 0) return;
    try {
      const providerId = await sendAlertEmail(g.c.email, byEmail.map(lineOf), byEmail[0].watch.id, lang);
      await record(byEmail, "email", "sent", { providerId, latencyMs: Date.now() - started });
      stats.sent += byEmail.length;
      // No device at all: once in a while, the e-mail that says the phone banner exists (never blocks the alert).
      if (devices.length === 0) sendPushNudge(userId, g.c.email, now, lang).catch(() => undefined);
    } catch (e) {
      stats.failed += byEmail.length;
      await recordError("poller", `alert email failed: ${errorMessage(e)}`, { watchId: byEmail[0].watch.id });
      await record(byEmail, "email", "failed", { error: errorMessage(e).slice(0, 500) });
    }
  }));
  if (eventIds.length) {
    await d.update(schema.availabilityEvents).set({ notifiedAt: now }).where(inArray(schema.availabilityEvents.id, eventIds));
  }
  return stats;
}

export function newId(): string {
  return randomUUID();
}
