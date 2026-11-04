import { NextResponse } from "next/server";
import { env, bearerOk } from "@/lib/env";
import { readState, writeState } from "@/lib/stock/sweep";
import { degradedTick } from "@/lib/stock/degraded";
import { notifyOwner } from "@/lib/mail/owner";
import { recordError, errorMessage } from "@/lib/errors";
import { logOps } from "@/lib/ops";
import { PARTIAL_SEC, freshness, intlVerdict, intlWatchStep, pollerVerdict, type IntlVerdict, type IntlWatchState, type PollerState } from "@/lib/stock/fallback";
import type { CountryCode } from "@/lib/apple/countries";
import { CAPACITY_IDLE, CLEAR_RUNS, FAST_STORES_WARN, ROUND_WINDOW_MIN, capacityReasons, capacityStep, recentRounds, watchedLagP90, type CapacityState } from "@/lib/stock/capacity";
import { SPEED } from "@/lib/plans";
import { intlRunner, readAlive, standbyVerdict, workerVerdict } from "@/lib/stock/cluster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REMIND_MS = 3 * 60 * 60 * 1000;
/** Minutes a "partial" picture must persist before it is worth a mail (restarts and blips clear sooner). */
const PARTIAL_RUNS = 3;

interface WatchdogState { down: boolean; kind?: PollerState; since?: string; lastMail?: string; partialRuns?: number; partialMailed?: boolean }
type HeartbeatIntl = { cadenceSec?: number; countries?: CountryCode[]; paused?: boolean } | null;
interface Heartbeat { at?: string; host?: string; mode?: string; cadenceSec?: number; intl?: HeartbeatIntl; fast?: { stores?: number; pairs?: number } | null; sys?: { load5?: number; cpus?: number; cpuWaitPct?: number | null } }

/**
 * Vercel Cron, every minute. Judges polling by the data (fallback.ts), not only by the heartbeat:
 *  • silent  (no heartbeat 75 s) → serverless fill-in (degraded mode) + mail, reminders every 3 h
 *  • blind   (heartbeat, but under half the pairs checked in a minute) → mail; the poller switches to its
 *            spare egress on its own, so Vercel stays out of the way (they would share one IP budget)
 *  • partial (stores unchecked for 90 s, three runs in a row) → one mail naming them
 *  • a mail when it is over
 * All of that is the US. The other countries (polled store by store every ~30 s) are judged on their own:
 * a country with under half its pairs fresh for three runs in a row → one mail naming it, one when it clears.
 * Never the fill-in (it serves the US only). Judged only while the US itself is fine (ok or partial): when the
 * poller is silent, blind or degraded, or has them paused, their staleness says nothing about them.
 * Capacity (stock/capacity.ts) is judged under the same condition: slow rounds from a host near its limit, mailed
 * before anything fails.
 */
export async function GET(req: Request) {
  if (!bearerOk(req, env.cronSecret())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const hb = await readState<Heartbeat>("heartbeat");
    const age = hb ? Date.now() - new Date(hb.value.at ?? hb.updatedAt).getTime() : Infinity;
    // The other countries run on the standby host when there is one: their stats are then in its alive record.
    const runner = hb?.value.intl ? null : await intlRunner().catch(() => null);
    const intlInfo = (hb?.value.intl ?? runner?.intl ?? null) as HeartbeatIntl;
    const fresh = await freshness({ intlCadenceSec: intlInfo?.cadenceSec }).catch(() => null);
    const v = pollerVerdict(age, fresh);
    const wd = (await readState<WatchdogState>("watchdog"))?.value ?? { down: false };
    const now = new Date();
    // On the US host, a blind US (the shared IPv6 egress failing) starves every country: only the US mail goes out
    // then. On their own host they are judged on their own.
    const intlOn = Boolean(intlInfo && !intlInfo.paused && (runner || (hb!.value.mode !== "degraded" && (v.state === "ok" || v.state === "partial"))));
    const iv = intlOn ? intlVerdict(fresh, intlInfo!.countries) : null;
    // One debug row per run: the admin health strip proves the cron itself is alive.
    await logOps("cron", "debug", "watchdog tick", {
      ageMs: Number.isFinite(age) ? Math.round(age) : null, state: v.state, degraded: v.fill,
      freshPairs: fresh?.freshPairs ?? null, pairs: fresh?.pairs ?? null, staleStores: fresh?.staleStores.length ?? null,
      ...(iv ? { intl: iv.state, intlFresh: Object.fromEntries(iv.countries.map((c) => [c.cc, Math.round(c.share * 100)])) } : {}),
    });
    await watchIntl(iv, intlOn, now, v.state).catch((e) => recordError("web", `watchdog (other countries) failed: ${errorMessage(e)}`));
    if (hb && hb.value.mode !== "degraded" && (v.state === "ok" || v.state === "partial")) {
      await watchCapacity(hb.value, now).catch((e) => recordError("web", `watchdog (capacity) failed: ${errorMessage(e)}`));
    }
    await watchStandby(now).catch((e) => recordError("web", `watchdog (standby) failed: ${errorMessage(e)}`));
    await watchWorker(now).catch((e) => recordError("web", `watchdog (US worker) failed: ${errorMessage(e)}`));

    if (v.state === "silent" || v.state === "blind") {
      const firstTime = !wd.down || wd.kind !== v.state;
      if (firstTime) await logOps("cron", "error", `polling ${v.state}: ${v.summary}${v.fill ? " — degraded mode on" : ""}`, { ageMs: Number.isFinite(age) ? Math.round(age) : null, host: hb?.value.host ?? null });
      const lastMail = wd.lastMail ? new Date(wd.lastMail).getTime() : 0;
      let lastMailAt = wd.lastMail;
      if (firstTime || now.getTime() - lastMail > REMIND_MS) {
        await notifyOwner(
          v.state === "silent"
            ? `[PickupChecker] Poller silent for ${Number.isFinite(age) ? Math.round(age / 60000) : "?"} min — degraded mode on`
            : `[PickupChecker] Poller running but stock checks are failing`,
          v.state === "silent"
            ? `The VPS poller has not written a heartbeat since ${hb ? new Date(hb.value.at ?? hb.updatedAt).toISOString() : "(never)"}.\n` +
              `Vercel is polling in degraded mode (≈1 request/min), watched stores first. Check the host, then /admin.`
            : `${v.summary}.\nThe poller switches to its spare egress (host IPv4, then Vercel) after two bad rounds; if Apple is blocking the IPv6 range or the route is gone, check the host and /admin/poller.`,
        ).catch((e) => recordError("web", `watchdog mail failed: ${errorMessage(e)}`));
        lastMailAt = now.toISOString();
      }
      await writeState("watchdog", { down: true, kind: v.state, since: firstTime ? now.toISOString() : wd.since ?? now.toISOString(), lastMail: lastMailAt ?? null });
      if (v.fill) {
        const tick = await degradedTick(3);
        return NextResponse.json({ state: v.state, degraded: true, ageMs: age, tick });
      }
      return NextResponse.json({ state: v.state, degraded: false, ageMs: age, summary: v.summary });
    }

    if (wd.down) {
      await logOps("cron", "info", `polling back to normal (was ${wd.kind ?? "silent"})`, { host: hb?.value.host ?? null, downSince: wd.since ?? null });
      await notifyOwner(`[PickupChecker] Poller recovered`, `Polling is back to normal (${hb?.value.host ?? "?"}, mode ${hb?.value.mode ?? "?"}). It was ${wd.kind ?? "silent"} since ${wd.since ?? "?"}.`).catch(() => undefined);
    }
    // partial: a mail only once it has lasted PARTIAL_RUNS minutes, and one when it clears.
    const runs = v.state === "partial" ? (wd.partialRuns ?? 0) + 1 : 0;
    let partialMailed = v.state === "partial" ? Boolean(wd.partialMailed) : false;
    if (v.state === "partial" && runs >= PARTIAL_RUNS && !partialMailed) {
      await logOps("cron", "warn", `polling partial: ${v.summary}`, { staleStores: fresh?.staleStores ?? [] });
      await notifyOwner(`[PickupChecker] Some stores are not being checked`, `${v.summary}.\nThe rest of the country is fine. Usually one coverage anchor's requests keep failing — see /admin/poller.`).catch(() => undefined);
      partialMailed = true;
    } else if (v.state !== "partial" && wd.partialMailed) {
      await logOps("cron", "info", "polling partial cleared — every store checked again", {});
      await notifyOwner(`[PickupChecker] Every store is being checked again`, `All ${fresh?.stores ?? "?"} stores were checked in the last ${PARTIAL_SEC} s.`).catch(() => undefined);
    }
    if (wd.down || runs !== (wd.partialRuns ?? 0) || partialMailed !== Boolean(wd.partialMailed)) {
      await writeState("watchdog", { down: false, partialRuns: runs, partialMailed });
    }
    return NextResponse.json({ state: v.state, degraded: false, ageMs: age });
  } catch (e) {
    await recordError("web", `watchdog failed: ${errorMessage(e)}`).catch(() => undefined);
    await probeFromWorker();
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}

/** The other countries' mail state machine (state key "watchdog:intl"; the rules are intlWatchStep's). */
async function watchIntl(iv: IntlVerdict | null, judged: boolean, now: Date, usState: PollerState): Promise<void> {
  const st = (await readState<IntlWatchState>("watchdog:intl"))?.value ?? { runs: 0, mailed: false };
  const blind = iv?.countries.filter((c) => c.state === "blind").map((c) => c.cc) ?? [];
  const step = intlWatchStep(st, judged, blind, now);
  if (step.mail === "blind") {
    await logOps("cron", "warn", `other countries blind: ${iv!.summary}`, { countries: blind });
    // "The US is fine" only when it is: a partial US shares the cause often enough not to promise it.
    const us = usState === "ok" ? "The US is not affected (its own sweep and checks are fresh)." : `The US is ${usState} at the same time — check both.`;
    await notifyOwner(`[PickupChecker] Stock checks failing in ${blind.join(", ").toUpperCase()}`, `${iv!.summary}.\n${us} The other countries are asked store by store; usually one country's endpoint is failing or Apple changed its answer there — see /admin/poller and poll_log rows with country set.`).catch(() => undefined);
  } else if (step.mail === "recovered") {
    await logOps("cron", "info", "other countries checked again", { were: st.countries ?? [] });
    await notifyOwner(`[PickupChecker] Other countries are being checked again`, `Stock checks recovered in ${(st.countries ?? []).join(", ").toUpperCase() || "every country"} (failing since ${st.since ?? "?"}).`).catch(() => undefined);
  }
  if (step.write) await writeState("watchdog:intl", { ...step.next });
}

/**
 * The standby host (state key "watchdog:standby"): its alive record stale, or its replica not streaming / behind,
 * for STANDBY_RUNS runs in a row → one mail; one when it is back. Nothing breaks for users meanwhile (the primary
 * takes the other countries back by itself), but without a healthy standby there is no takeover.
 */
const STANDBY_RUNS = 3;
async function watchStandby(now: Date): Promise<void> {
  // A day's window, so a standby that died long ago still counts as part of the setup until it is removed.
  const v = standbyVerdict(await readAlive(24 * 60), now);
  if (v.state === "none") return;
  const st = (await readState<{ runs: number; mailed: boolean; since?: string | null }>("watchdog:standby"))?.value ?? { runs: 0, mailed: false };
  const bad = v.state !== "ok";
  const runs = bad ? st.runs + 1 : 0;
  let mailed = st.mailed, since = st.since ?? null;
  if (bad && runs >= STANDBY_RUNS && !st.mailed) {
    mailed = true; since = now.toISOString();
    await logOps("cron", "warn", `standby ${v.state}: ${v.summary}`, { host: v.host });
    await notifyOwner(`[PickupChecker] Standby ${v.host ?? ""} is ${v.state === "down" ? "down" : "not keeping up"}`, `${v.summary}.\nUsers are not affected: the primary polls the other countries again by itself. But until the standby is back there is no automatic takeover if the primary fails. Check the host (systemctl status pickupchecker-poller postgresql) and /admin.`).catch(() => undefined);
  } else if (!bad && st.mailed) {
    mailed = false;
    await logOps("cron", "info", `standby back: ${v.summary}`, { host: v.host });
    await notifyOwner(`[PickupChecker] Standby ${v.host ?? ""} is back`, `${v.summary} (it was out since ${st.since ?? "?"}).`).catch(() => undefined);
    since = null;
  }
  if (runs !== st.runs || mailed !== st.mailed) await writeState("watchdog:standby", { runs, mailed, since });
}

/**
 * The US worker (state key "watchdog:worker"): its alive record stale for WORKER_RUNS runs in a row → one mail; one
 * when it is back. Users keep their checks meanwhile (the primary takes the US back by itself), but on the shared
 * CPU the fast lane slows down again.
 */
const WORKER_RUNS = 3;
async function watchWorker(now: Date): Promise<void> {
  const v = workerVerdict(await readAlive(24 * 60), now);
  if (v.state === "none") return;
  const st = (await readState<{ runs: number; mailed: boolean; since?: string | null }>("watchdog:worker"))?.value ?? { runs: 0, mailed: false };
  const bad = v.state !== "ok";
  const runs = bad ? st.runs + 1 : 0;
  let mailed = st.mailed, since = st.since ?? null;
  if (bad && runs >= WORKER_RUNS && !st.mailed) {
    mailed = true; since = now.toISOString();
    await logOps("cron", "warn", `US worker down: ${v.summary}`, { host: v.host });
    await notifyOwner(`[PickupChecker] US worker ${v.host ?? ""} is down`, `${v.summary}.\nUsers keep their checks: the primary polls the US (sweep and fast lane) again by itself, but on its shared CPU the fast lane is slower. Check the host (systemctl status pickupchecker-poller) and /admin.`).catch(() => undefined);
  } else if (!bad && st.mailed) {
    mailed = false;
    await logOps("cron", "info", `US worker back: ${v.summary}`, { host: v.host });
    await notifyOwner(`[PickupChecker] US worker ${v.host ?? ""} is back`, `${v.summary} (it was out since ${st.since ?? "?"}).`).catch(() => undefined);
    since = null;
  }
  if (runs !== st.runs || mailed !== st.mailed) await writeState("watchdog:worker", { runs, mailed, since });
}

/** Capacity early warning (state key "watchdog:capacity"; the rules are capacity.ts's). */
async function watchCapacity(hb: Heartbeat, now: Date): Promise<void> {
  const st = (await readState<CapacityState>("watchdog:capacity"))?.value ?? CAPACITY_IDLE;
  const [rounds, lag] = await Promise.all([recentRounds(), watchedLagP90()]);
  const fastStores = hb.fast?.stores ?? null;
  const cadence = { full: hb.cadenceSec ?? 15, intl: hb.intl?.cadenceSec ?? 15 };
  const { reasons, lagHigh } = capacityReasons({ fastStores, rounds, cadence, watchedLagP90Sec: lag, fastCadenceSec: SPEED.fastSec });
  const step = capacityStep(st, now, reasons, lagHigh, lag, SPEED.fastSec);
  if (step.mail) {
    const roundLine = rounds.filter((r) => cadence[r.mode as keyof typeof cadence]).map((r) => `${r.mode === "intl" ? "other countries" : "US"} on ${r.host} ${r.p50Sec.toFixed(1)} s`).join(", ") || "no rounds";
    const sys = hb.sys ?? {};
    const figures = [
      `Fast lane: ${fastStores ?? "?"} stores, ${hb.fast?.pairs ?? "?"} store × phone pairs (warning line ${FAST_STORES_WARN} stores).`,
      `Round medians, last ${ROUND_WINDOW_MIN} min: ${roundLine} (cadence ${cadence.full} s / ${cadence.intl} s).`,
      `Stores with paid alerts, 90th percentile time since their last check: ${lag == null ? "none watched" : `${lag.toFixed(1)} s`} (fast lane every ${SPEED.fastSec} s).`,
      `Host ${hb.host ?? "?"}: 5-min load ${sys.load5 ?? "?"} on ${sys.cpus ?? "?"} vCPU, a task waiting for CPU ${sys.cpuWaitPct ?? "?"}% of the time.`,
    ].join("\n");
    const advice = "Nothing is failing yet: this is the time to add capacity before checks slow down. In order: split the poller into processes (free; it is one Node thread), move the other countries to the second host, then resize. Numbers and measurements: docs/architecture.md (capacity warning).";
    const subject = step.mail === "warn" ? "[PickupChecker] Polling is nearing its host's capacity"
      : step.mail === "remind" ? "[PickupChecker] Polling is still near its host's capacity"
      : "[PickupChecker] Polling is back within capacity";
    const text = step.mail === "clear"
      ? `Every check has stayed within its limits for ${CLEAR_RUNS} minutes (the warning started ${st.since ?? "?"}).\n\n${figures}`
      : `${step.active.map((r) => `• ${r.text}`).join("\n")}\n\nNow:\n${figures}\n\n${advice}`;
    await logOps("cron", step.mail === "clear" ? "info" : "warn", `capacity ${step.mail}: ${step.active.map((r) => r.key).join(", ") || "clear"}`, { fastStores, lag, rounds });
    await notifyOwner(subject, text).catch((e) => recordError("web", `capacity mail failed: ${errorMessage(e)}`));
  }
  if (JSON.stringify(step.next) !== JSON.stringify(st)) await writeState("watchdog:capacity", { ...step.next });
}

/**
 * The database lives on the poller host, so when it is unreachable this route can neither keep state nor
 * mail on schedule — and the host that normally triggers the outside probe may be the thing that is down.
 * The mail worker's probe checks /api/health and keeps its own down/recovery state, so it mails once.
 */
async function probeFromWorker(): Promise<void> {
  const url = env.mailWorkerUrl(), token = env.mailWorkerToken();
  if (!url || !token) return;
  await fetch(`${url.replace(/\/$/, "")}/probe`, { method: "POST", headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) }).catch(() => undefined);
}
