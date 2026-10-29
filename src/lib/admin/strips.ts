/** Turns bucketed rows into 24 h health-strip cells. Pure; see tests/admin-health.test.ts. */
import type { Bucket } from "./ops";
import type { StripCell } from "@/components/admin/Status";
import type { NodeState } from "./health";

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Cells before the first row with any data are "idle" (no evidence), not "bad". */
export function stripFrom(buckets: Bucket[], judge: (b: Bucket) => { state: NodeState; text: string }, hasData: (b: Bucket) => boolean): StripCell[] {
  const first = buckets.findIndex(hasData);
  return buckets.map((b, i) => {
    if (first < 0 || i < first) return { t: b.t, state: "idle", title: `${hhmm(b.t)} · no data` };
    const j = judge(b);
    return { t: b.t, state: j.state, title: `${hhmm(b.t)} · ${j.text}` };
  });
}

export function pollerStrip(sweeps: Bucket[], expectedPerBucket: number): StripCell[] {
  return stripFrom(sweeps, (b) => {
    const n = Number(b.n), degraded = Number(b.degraded), failures = Number(b.failures);
    if (n === 0) return { state: "bad", text: "no sweeps" };
    if (degraded > 0) return { state: "warn", text: `${degraded} degraded sweep${degraded > 1 ? "s" : ""}` };
    if (n < expectedPerBucket * 0.5) return { state: "warn", text: `${n} sweeps (expected ~${expectedPerBucket})` };
    return { state: "ok", text: `${n} sweeps · ${(Number(b.avgMs) / 1000).toFixed(1)} s · ${b.stores} stores${failures ? ` · ${failures} failed req` : ""}` };
  }, (b) => Number(b.n) > 0);
}

export function appleStrip(req: Bucket[]): StripCell[] {
  return stripFrom(req, (b) => {
    const n = Number(b.n), s541 = Number(b.s541), ok = Number(b.ok);
    if (n === 0) return { state: "idle", text: "no requests" };
    const share = s541 / n, okShare = ok / n;
    const text = `${n} req · ${Math.round(okShare * 100)}% ok · ${s541} × 541 · ${b.avgMs} ms`;
    if (share >= 0.25 || okShare < 0.7) return { state: "bad", text };
    if (share >= 0.05 || okShare < 0.95) return { state: "warn", text };
    return { state: "ok", text };
  }, (b) => Number(b.n) > 0);
}

export function cronStrip(ticks: Bucket[], expectedPerBucket: number): StripCell[] {
  return stripFrom(ticks, (b) => {
    const n = Number(b.ticks), degraded = Number(b.degraded);
    if (n === 0) return { state: "bad", text: "no watchdog run" };
    if (degraded > 0) return { state: "warn", text: `${n} runs · degraded mode on` };
    if (n < expectedPerBucket * 0.5) return { state: "warn", text: `${n} runs (expected ${expectedPerBucket})` };
    return { state: "ok", text: `${n} runs` };
  }, (b) => Number(b.ticks) > 0);
}

export function alertStrip(alerts: Bucket[]): StripCell[] {
  return stripFrom(alerts, (b) => {
    const sent = Number(b.pushSent) + Number(b.emailSent), failed = Number(b.failed);
    if (sent === 0 && failed === 0) return { state: "idle", text: "no alerts" };
    if (failed > 0 && sent === 0) return { state: "bad", text: `${failed} failed, none sent` };
    if (failed > 0) return { state: "warn", text: `${sent} sent · ${failed} failed` };
    return { state: "ok", text: `${sent} sent (${b.pushSent} push, ${b.emailSent} email)` };
  }, () => true);
}
