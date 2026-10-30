import { NextResponse } from "next/server";
import { env, bearerOk } from "@/lib/env";
import { readState, writeState } from "@/lib/stock/sweep";
import { degradedTick } from "@/lib/stock/degraded";
import { notifyOwner } from "@/lib/mail/owner";
import { recordError, errorMessage } from "@/lib/errors";
import { logOps } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STALE_MS = 120_000;
const REMIND_MS = 3 * 60 * 60 * 1000;

/**
 * Vercel Cron, every minute. If the VPS poller's heartbeat is older than 2 minutes:
 *  • switch the site to degraded mode (serverless polling keeps the picture moving, slowly)
 *  • email the owner once, then every 3 h while it stays down, and once on recovery
 */
export async function GET(req: Request) {
  if (!bearerOk(req, env.cronSecret())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const hb = await readState<{ at?: string; host?: string; mode?: string }>("heartbeat");
    const age = hb ? Date.now() - new Date(hb.value.at ?? hb.updatedAt).getTime() : Infinity;
    const wd = (await readState<{ down: boolean; since?: string; lastMail?: string }>("watchdog"))?.value ?? { down: false };
    const now = new Date();
    // One debug row per run: the admin health strip proves the cron itself is alive.
    await logOps("cron", "debug", "watchdog tick", { ageMs: Number.isFinite(age) ? Math.round(age) : null, degraded: age > STALE_MS });
    if (age > STALE_MS) {
      const firstTime = !wd.down;
      if (firstTime) await logOps("cron", "error", "poller heartbeat stale — degraded mode on", { ageMs: Number.isFinite(age) ? Math.round(age) : null, host: hb?.value.host ?? null });
      const lastMail = wd.lastMail ? new Date(wd.lastMail).getTime() : 0;
      if (firstTime || now.getTime() - lastMail > REMIND_MS) {
        await notifyOwner(
          `[PickupChecker] Poller silent for ${Math.round(age / 60000)} min — degraded mode on`,
          `The VPS poller has not written a heartbeat since ${hb ? new Date(hb.value.at ?? hb.updatedAt).toISOString() : "(never)"}.\n` +
            `Vercel is polling in degraded mode (≈1 request/min). Check the host, then /admin.`,
        ).catch((e) => recordError("web", `watchdog mail failed: ${errorMessage(e)}`));
        await writeState("watchdog", { down: true, since: wd.since ?? now.toISOString(), lastMail: now.toISOString() });
      }
      const tick = await degradedTick(3);
      return NextResponse.json({ degraded: true, ageMs: age, tick });
    }
    if (wd.down) {
      await logOps("cron", "info", "poller heartbeat back — degraded mode off", { host: hb?.value.host ?? null, downSince: wd.since ?? null });
      await notifyOwner(`[PickupChecker] Poller recovered`, `Heartbeat is back (${hb?.value.host ?? "?"}, mode ${hb?.value.mode ?? "?"}). Down since ${wd.since ?? "?"}.`).catch(() => undefined);
      await writeState("watchdog", { down: false });
    }
    return NextResponse.json({ degraded: false, ageMs: age });
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
