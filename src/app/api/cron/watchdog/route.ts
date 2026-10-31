import { NextResponse } from "next/server";
import { env, bearerOk } from "@/lib/env";
import { readState, writeState } from "@/lib/stock/sweep";
import { degradedTick } from "@/lib/stock/degraded";
import { notifyOwner } from "@/lib/mail/owner";
import { recordError, errorMessage } from "@/lib/errors";
import { logOps } from "@/lib/ops";
import { PARTIAL_SEC, freshness, pollerVerdict, type PollerState } from "@/lib/stock/fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REMIND_MS = 3 * 60 * 60 * 1000;
/** Minutes a "partial" picture must persist before it is worth a mail (restarts and blips clear sooner). */
const PARTIAL_RUNS = 3;

interface WatchdogState { down: boolean; kind?: PollerState; since?: string; lastMail?: string; partialRuns?: number; partialMailed?: boolean }

/**
 * Vercel Cron, every minute. Judges polling by the data (fallback.ts), not only by the heartbeat:
 *  • silent  (no heartbeat 75 s) → serverless fill-in (degraded mode) + mail, reminders every 3 h
 *  • blind   (heartbeat, but under half the pairs checked in a minute) → mail; the poller switches to its
 *            spare egress on its own, so Vercel stays out of the way (they would share one IP budget)
 *  • partial (stores unchecked for 90 s, three runs in a row) → one mail naming them
 *  • a mail when it is over
 */
export async function GET(req: Request) {
  if (!bearerOk(req, env.cronSecret())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const hb = await readState<{ at?: string; host?: string; mode?: string }>("heartbeat");
    const age = hb ? Date.now() - new Date(hb.value.at ?? hb.updatedAt).getTime() : Infinity;
    const fresh = await freshness().catch(() => null);
    const v = pollerVerdict(age, fresh);
    const wd = (await readState<WatchdogState>("watchdog"))?.value ?? { down: false };
    const now = new Date();
    // One debug row per run: the admin health strip proves the cron itself is alive.
    await logOps("cron", "debug", "watchdog tick", {
      ageMs: Number.isFinite(age) ? Math.round(age) : null, state: v.state, degraded: v.fill,
      freshPairs: fresh?.freshPairs ?? null, pairs: fresh?.pairs ?? null, staleStores: fresh?.staleStores.length ?? null,
    });

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
