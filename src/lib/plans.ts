/**
 * Plans are about how many alert rules a user may have running. One rule = one store × one exact
 * configuration (model, storage, colour):
 *   free  — 0 alerts (browse only; a signed-in account with no subscription)      plus — $5/month, 10 alerts      pro — $10/month, 20 alerts
 * Paid plans are Stripe subscriptions that renew monthly until cancelled (no one-off month).
 * A user can save more rules than the plan allows; only the oldest `limit` active ones send alerts.
 */
import { env } from "./env";

export type PlanKey = "free" | "plus" | "pro";
export type PaidPlanKey = Exclude<PlanKey, "free">;

export interface PlanDef { key: PlanKey; name: string; priceUsd: number; limit: number; blurb: string }

export const PLANS: Record<PlanKey, PlanDef> = {
  free: { key: "free", name: "Free", priceUsd: 0, limit: 0, blurb: "Live stock, the map and the restock log. Alerts need Plus or Pro." },
  plus: { key: "plus", name: "Plus", priceUsd: 5, limit: 10, blurb: "Ten alerts — each one is one store and one exact configuration." },
  pro: { key: "pro", name: "Pro", priceUsd: 10, limit: 20, blurb: "Twenty alerts: several stores, colors or storages at once." },
};
export const PLAN_ORDER: PlanKey[] = ["free", "plus", "pro"];
export const PAID_PLANS: PaidPlanKey[] = ["plus", "pro"];
export const ACTIVE_STATUSES = ["active", "trialing", "past_due"];
/** Hard cap on saved rules per account (paid or not), so the picker stays sane and abuse is bounded. */
export const SAVE_CAP = 30;

export function isPaidPlan(v: unknown): v is PaidPlanKey {
  return v === "plus" || v === "pro";
}

export function priceIdFor(plan: PaidPlanKey): string {
  return plan === "pro" ? env.stripePricePro() : env.stripePriceMonthly();
}

/** Stripe price → plan: price metadata first, then the configured ids, then the amount. */
export function planFromPrice(price: { id?: string | null; metadata?: Record<string, string> | null; unit_amount?: number | null } | null | undefined): PaidPlanKey {
  if (!price) return "plus";
  if (isPaidPlan(price.metadata?.plan)) return price.metadata!.plan as PaidPlanKey;
  if (price.id && price.id === env.stripePricePro()) return "pro";
  if (price.id && price.id === env.stripePriceMonthly()) return "plus";
  return (price.unit_amount ?? 0) >= 1000 ? "pro" : "plus";
}

export interface SubLike { plan: string; status: string; alertLimit: number; id?: string; currentPeriodEnd?: Date | null; cancelAtPeriodEnd?: boolean }

/** The plan in force: the active subscription with the highest limit, else free. */
export function effectivePlan<T extends SubLike>(subs: T[]): { plan: PlanDef; sub: T | null } {
  const active = subs.filter((s) => ACTIVE_STATUSES.includes(s.status));
  if (active.length === 0) return { plan: PLANS.free, sub: null };
  const best = active.reduce((a, b) => (b.alertLimit > a.alertLimit ? b : a));
  const def = isPaidPlan(best.plan) ? PLANS[best.plan] : { ...PLANS.plus, limit: best.alertLimit };
  return { plan: { ...def, limit: Math.max(def.limit, best.alertLimit) }, sub: best };
}

/** Which active rules send alerts: the oldest `limit` ones (ties by id, so the order is stable). */
export function coveredWatchIds(watches: { id: string; active: boolean; createdAt: Date | string }[], limit: number): Set<string> {
  return new Set(
    watches
      .filter((w) => w.active)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id))
      .slice(0, Math.max(0, limit))
      .map((w) => w.id),
  );
}

export function comparePlans(a: PlanKey, b: PlanKey): number {
  return PLAN_ORDER.indexOf(a) - PLAN_ORDER.indexOf(b);
}
