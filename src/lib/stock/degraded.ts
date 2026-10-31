/**
 * Degraded mode: when the VPS poller is silent, Vercel itself keeps the picture moving with its single
 * fixed IP (≈1 request/min sustainable). It spends those requests on the stores × phones paying alerts
 * watch first, stalest first, then on whatever has gone longest unchecked (fallback.ts).
 */
import { buildTasks, runSweep, readState, writeState, singleIdentityEgress, type BudgetState } from "./sweep";
import { fallbackOrder } from "./fallback";

const BUDGET_KEY = "egress:vercel";

export async function degradedTick(maxRequests = 3): Promise<{ requests: number; failures: number; exhausted: boolean; first: string | null }> {
  const bud = (await readState<BudgetState>(BUDGET_KEY))?.value ?? { used: 0, windowStart: Date.now(), cooldownUntil: 0 };
  const slice = (await fallbackOrder(buildTasks())).slice(0, maxRequests);
  const egress = singleIdentityEgress("vercel", bud, fetch as never);
  // One identity: a failed request is not worth a second slot of its budget.
  const r = await runSweep({ egress, tasks: slice, concurrency: 1, mode: "degraded", host: process.env.VERCEL_REGION ?? "vercel", retryFailed: false });
  await writeState(BUDGET_KEY, { ...egress.state });
  return { requests: r.requests, failures: r.failures, exhausted: r.exhausted, first: slice[0] ? `${slice[0].anchor.location}#${slice[0].batchIndex}` : null };
}
