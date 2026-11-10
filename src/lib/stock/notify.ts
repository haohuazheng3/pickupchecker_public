/**
 * Turn restock transitions into alerts: a push notification to every device the user turned on,
 * or an email when no device has (email is the fallback, not the default).
 *
 *  match: active, unpaused rules of the same store × exact configuration (model, storage, colour)
 *  dedupe: one notification per (watch, event) — unique index, and checked before sending
 *  one batch, one alert (2026-11-09): alerts fire only on a committed unavailable → available transition, never
 *          per check, so a listing that stays up for ten minutes is one alert. A listing that drops off for less
 *          than SAME_BATCH_GAP_MS and comes back is the same batch (Apple's page flickering, an abandoned checkout
 *          putting the unit back): members already alerted for that batch are not alerted again. Off-shelf gaps
 *          before a re-listing peak at 30–90 s and flatten out after 2 minutes (14 days, 35,713 re-listings).
 *  new batches: a return after 2+ minutes off the shelf alerts again, even within 30 minutes of the last alert (the
 *          old 30-minute cool-down held back 3,386 alerts in 14 days). Backstop: at most MAX_ALERTS_PER_HOUR alerts
 *          per (watch, store, part) in any 60 minutes.
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

/** Flood guard: alerts per (watch, store, part) in any rolling hour. Pairs that restock 7+ times in one hour are 0.7 % of restocks. */
export const MAX_ALERTS_PER_HOUR = 6;
const REPEAT_WINDOW_MS = 60 * 60 * 1000;

/** Pure: may one more alert go out for this (watch, store, part), given the times its alerts were sent? */
export function underHourlyCap(sentAt: (Date | string | number)[], now: Date, max = MAX_ALERTS_PER_HOUR): boolean {
  const from = now.getTime() - REPEAT_WINDOW_MS;
  return sentAt.filter((t) => new Date(t).getTime() > from).length < max;
}

/** Off the shelf for less than this and back again: still the same batch (no new alert for members already told). */
export const SAME_BATCH_GAP_MS = 2 * 60 * 1000;
/** How far back a batch is followed (events and sent alerts read for it). */
const BATCH_LOOKBACK_MS = 6 * 60 * 60 * 1000;

export interface PairEvent { kind: string; at: Date | string; seenUntil: Date | string | null }

/**
 * Pure: when the batch that a restock at `restockAt` belongs to started. Walks back over one store × part's events:
 * while the sell-out just before the current listing was off the shelf for less than `gapMs` (from its last check
 * that still saw the unit to the first check that saw it again), the listing before it is the same batch.
 */
export function batchStart(events: PairEvent[], restockAt: Date, gapMs = SAME_BATCH_GAP_MS): Date {
  const ms = (v: Date | string) => new Date(v).getTime();
  const before = events.filter((e) => ms(e.at) < restockAt.getTime()).sort((a, b) => ms(b.at) - ms(a.at));
  let start = restockAt.getTime();
  for (let i = 0; i + 1 < before.length; i += 2) {
    const out = before[i], prev = before[i + 1];
    if (out.kind !== "soldout" || prev.kind !== "restock") break;
    if (start - ms(out.seenUntil ?? out.at) >= gapMs) break;
    start = ms(prev.at);
  }
  return new Date(start);
}

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

/**
 * Alerts being sent right now. The poller's SIGTERM handler drains this before it exits: an autoupdate restart
 * 3.5 s after a restock was confirmed (11-10 19:35:08 UTC, R768 Japan) killed the send, so three paying members got
 * nothing and the event kept notified_at null. systemd waits up to 90 s for a stop, so a few seconds of drain is free.
 */
const inFlight = new Set<Promise<unknown>>();

/** Track a send until it settles (exported for the test). */
export function trackInFlight<T>(p: Promise<T>): Promise<T> {
  inFlight.add(p);
  p.finally(() => inFlight.delete(p)).catch(() => undefined);
  return p;
}

/**
 * Wait until no alert is being sent (seen empty after at least `settleMs`, so a restock confirmed a moment before the
 * stop still gets its send started), or `timeoutMs` passes. Returns how many sends were still running.
 */
export async function drainNotifications(timeoutMs = 15_000, settleMs = 1_000): Promise<number> {
  const started = Date.now();
  for (;;) {
    const elapsed = Date.now() - started;
    if (inFlight.size === 0 && elapsed >= settleMs) return 0;
    if (elapsed >= timeoutMs) return inFlight.size;
    await Promise.race([Promise.allSettled([...inFlight]), new Promise((r) => setTimeout(r, 200))]);
  }
}

export function notifyRestocks(transitions: Transition[], eventIds: number[], now = new Date()): Promise<NotifyStats> {
  return trackInFlight(sendRestockAlerts(transitions, eventIds, now));
}

async function sendRestockAlerts(transitions: Transition[], eventIds: number[], now: Date): Promise<NotifyStats> {
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

  // Alerts these rules sent in the last hours: the flood guard counts the last hour; an event already alerted is never
  // re-sent; a batch already alerted is not alerted again.
  const watchIds = active.map((c) => c.watch.id);
  const recent =
    watchIds.length === 0
      ? []
      : await d
          .select({ watchId: schema.notifications.watchId, storeNumber: schema.notifications.storeNumber, partNumber: schema.notifications.partNumber, eventId: schema.notifications.eventId, createdAt: schema.notifications.createdAt })
          .from(schema.notifications)
          .where(
            and(
              inArray(schema.notifications.watchId, watchIds),
              eq(schema.notifications.status, "sent"),
              sql`${schema.notifications.createdAt} > ${new Date(now.getTime() - BATCH_LOOKBACK_MS)}`,
            ),
          );
  const sentAt = new Map<string, Date[]>();
  const alerted = new Set<string>();
  for (const r of recent) {
    const k = `${r.watchId}|${r.storeNumber}|${r.partNumber}`;
    sentAt.set(k, [...(sentAt.get(k) ?? []), r.createdAt]);
    if (r.eventId != null) alerted.add(`${r.watchId}|${r.eventId}`);
  }
  const capped: { watchId: string; store: string; part: string }[] = [];
  // Each restocked pair's recent events: where its batch started (a short dip and back is the same batch).
  const pairKeys = [...new Set(restocks.map((x) => `${x.t.storeNumber}|${x.t.partNumber}`))];
  const pairEvents = new Map<string, PairEvent[]>();
  if (watchIds.length && pairKeys.length) {
    const rows = await d
      .select({ store: schema.availabilityEvents.storeNumber, part: schema.availabilityEvents.partNumber, kind: schema.availabilityEvents.kind, at: schema.availabilityEvents.at, seenUntil: schema.availabilityEvents.seenUntil })
      .from(schema.availabilityEvents)
      .where(and(
        inArray(schema.availabilityEvents.storeNumber, [...new Set(restocks.map((x) => x.t.storeNumber))]),
        inArray(schema.availabilityEvents.partNumber, [...new Set(restocks.map((x) => x.t.partNumber))]),
        eq(schema.availabilityEvents.firstSeen, false),
        sql`${schema.availabilityEvents.at} > ${new Date(now.getTime() - BATCH_LOOKBACK_MS)}`,
      ));
    for (const r of rows) {
      const k = `${r.store}|${r.part}`;
      if (pairKeys.includes(k)) pairEvents.set(k, [...(pairEvents.get(k) ?? []), r]);
    }
  }
  const startOf = new Map<string, Date>();
  for (const x of restocks) {
    const k = `${x.t.storeNumber}|${x.t.partNumber}`;
    startOf.set(`${k}|${x.eventId}`, batchStart(pairEvents.get(k) ?? [], new Date(x.t.at)));
  }
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
      if (alerted.has(`${w.id}|${x.eventId}`)) {
        stats.skipped++;
        continue;
      }
      // Same batch as one this rule was already alerted for (it dipped off the shelf for under 2 minutes): no new alert.
      const start = startOf.get(`${store.storeNumber}|${item.partNumber}|${x.eventId}`);
      if (start && start.getTime() < new Date(x.t.at).getTime() && (sentAt.get(`${w.id}|${store.storeNumber}|${item.partNumber}`) ?? []).some((t) => t.getTime() >= start.getTime())) {
        stats.skipped++;
        continue;
      }
      if (!underHourlyCap(sentAt.get(`${w.id}|${store.storeNumber}|${item.partNumber}`) ?? [], now)) {
        stats.skipped++;
        capped.push({ watchId: w.id, store: store.storeNumber, part: item.partNumber });
        continue;
      }
      const g = perUser.get(w.userId) ?? { c, hits: [] };
      g.hits.push({ watch: w, t: x.t, eventId: x.eventId });
      perUser.set(w.userId, g);
    }
  }

  if (capped.length) await logOps("poller", "info", `alert flood guard: ${capped.length} alert(s) held (${MAX_ALERTS_PER_HOUR} per rule × store × configuration per hour already sent)`, { capped: capped.slice(0, 10) }).catch(() => undefined);

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
          const r = await sendPushToRows(devices, restockPayload(hits.map(lineOf), hits[0].watch.id, now, lang), { source: "poller", events: [...new Set(hits.map((h) => h.eventId).filter((n): n is number => n != null))] });
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
