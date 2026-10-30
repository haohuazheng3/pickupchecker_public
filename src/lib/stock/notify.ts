/**
 * Turn restock transitions into alerts: a push notification to every device the user turned on,
 * or an email when no device has (email is the fallback, not the default).
 *
 *  match: active, unpaused rules of the same store × exact configuration (model, storage, colour)
 *  dedupe: one notification per (watch, event) — unique index; plus a per-(watch, store, part)
 *          cool-down so a flapping store does not mail every 20 s
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "../db";
import { PART_INDEX, STORE_INDEX, modelKeyFor } from "../apple/catalog";
import { sendAlertEmail } from "../mail/resend";
import { recordError, errorMessage } from "../errors";
import { enabledSubscriptionsFor, notifyPushStopped, pushConfigured, sendPushToRows } from "../push/server";
import { logOps } from "../ops";
import { restockPayload } from "../push/payload";
import { coveredWatchIds, effectivePlan } from "../plans";
import type { Transition } from "./ingest";

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
    .select({ watch: schema.watches, email: schema.users.email })
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

  // Group per watch so one email can carry several stores/SKUs that restocked in the same sweep.
  const perWatch = new Map<string, { c: (typeof active)[number]; items: { t: Transition; eventId: number }[] }>();
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
      const g = perWatch.get(w.id) ?? { c, items: [] };
      g.items.push(x);
      perWatch.set(w.id, g);
    }
  }

  // Every matched rule is sent concurrently: one slow push service never serialises the others.
  await Promise.all([...perWatch.values()].map(async (g) => {
    const w = g.c.watch;
    const started = Date.now();
    const lines = g.items.map((x) => {
      const item = PART_INDEX.get(x.t.partNumber)!;
      const store = STORE_INDEX.get(x.t.storeNumber)!;
      return { item, store, quote: x.t.quote };
    });
    const devices = pushByUser.get(w.userId) ?? [];
    let channel: "push" | "email" = devices.length ? "push" : "email";
    try {
      let providerId: string | null = null;
      if (channel === "push") {
        const r = await sendPushToRows(devices, restockPayload(lines, w.id, now), { source: "poller" });
        // Only when nothing reached the user: a device the push service dropped (410) while another
        // device received the alert is a rotation, not an outage.
        if (r.sent === 0 && r.disabledRows.length) await notifyPushStopped(w.userId, g.c.email, r.disabledRows, now).catch(() => undefined);
        if (r.sent > 0) providerId = r.firstId;
        else {
          // Every device failed: the alert still goes out, by email, instead of being lost.
          channel = "email";
          await logOps("poller", "warn", `push to ${devices.length} device(s) failed, falling back to email`, { watchId: w.id, errors: r.errors.slice(0, 3) });
        }
      }
      if (channel === "email") {
        providerId = await sendAlertEmail(g.c.email, lines, w.id);
      }
      const latency = Date.now() - started;
      await d
        .insert(schema.notifications)
        .values(
          g.items.map((x) => ({
            watchId: w.id,
            userId: w.userId,
            eventId: x.eventId ?? null,
            storeNumber: x.t.storeNumber,
            partNumber: x.t.partNumber,
            channel,
            status: "sent",
            providerId,
            latencyMs: latency,
            createdAt: now,
          })),
        )
        .onConflictDoNothing();
      stats.sent += g.items.length;
    } catch (e) {
      stats.failed += g.items.length;
      await recordError("poller", `alert ${channel} failed: ${errorMessage(e)}`, { watchId: w.id });
      await d
        .insert(schema.notifications)
        .values(
          g.items.map((x) => ({
            watchId: w.id,
            userId: w.userId,
            eventId: x.eventId ?? null,
            storeNumber: x.t.storeNumber,
            partNumber: x.t.partNumber,
            channel,
            status: "failed",
            error: errorMessage(e).slice(0, 500),
            createdAt: now,
          })),
        )
        .onConflictDoNothing();
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
