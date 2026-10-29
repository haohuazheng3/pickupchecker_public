/**
 * Degraded mode: when the VPS poller is silent, Vercel itself keeps the national picture fresh
 * with its single fixed IP (≈1 request/min sustainable), walking the task list round-robin.
 */
import { buildTasks, runSweep, readState, writeState, singleIdentityEgress, type BudgetState } from "./sweep";

const CURSOR_KEY = "degraded:cursor";
const BUDGET_KEY = "egress:vercel";

export async function degradedTick(maxRequests = 3): Promise<{ requests: number; failures: number; cursor: number; exhausted: boolean }> {
  const tasks = buildTasks();
  const cur = (await readState<{ i: number }>(CURSOR_KEY))?.value.i ?? 0;
  const bud = (await readState<BudgetState>(BUDGET_KEY))?.value ?? { used: 0, windowStart: Date.now(), cooldownUntil: 0 };
  const slice: typeof tasks = [];
  for (let k = 0; k < Math.min(maxRequests, tasks.length); k++) slice.push(tasks[(cur + k) % tasks.length]);
  const egress = singleIdentityEgress("vercel", bud, fetch as never);
  const r = await runSweep({ egress, tasks: slice, concurrency: 1, mode: "degraded", host: process.env.VERCEL_REGION ?? "vercel" });
  await writeState(BUDGET_KEY, { ...egress.state });
  const next = (cur + r.requests) % tasks.length;
  await writeState(CURSOR_KEY, { i: next });
  return { requests: r.requests, failures: r.failures, cursor: next, exhausted: r.exhausted };
}
