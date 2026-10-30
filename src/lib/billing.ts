import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { stripe } from "./stripe";
import { env } from "./env";
import { PLANS, comparePlans, planFromPrice, priceIdFor, effectivePlan, type PaidPlanKey } from "./plans";

/** Upsert a subscription row from a Stripe subscription object (idempotent). */
export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  const item = sub.items.data[0];
  const price = item?.price as (Stripe.Price & { metadata?: Record<string, string> }) | undefined;
  const plan = planFromPrice(price ? { id: price.id, metadata: price.metadata, unit_amount: price.unit_amount } : { id: null });
  const alertLimit = PLANS[plan].limit;
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  await db()
    .insert(schema.subscriptions)
    .values({
      id: sub.id,
      userId,
      model: "all",
      plan,
      alertLimit,
      status: sub.status,
      priceId: price?.id ?? null,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.subscriptions.id,
      set: {
        plan,
        alertLimit,
        status: sub.status,
        priceId: price?.id ?? null,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        updatedAt: new Date(),
      },
    });
  // Link the customer id to the user for the billing portal.
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await db().update(schema.users).set({ stripeCustomerId: customerId }).where(eq(schema.users.id, userId));
  // Every rule of this user hangs off the current subscription (informational; coverage is computed).
  await db().update(schema.watches).set({ subscriptionId: sub.id, updatedAt: new Date() }).where(eq(schema.watches.userId, userId));
}

export async function activeSubscriptionsFor(userId: string) {
  return db().select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId));
}

/** Plan in force + the subscription row behind it (null on the free plan). */
export async function userPlan(userId: string) {
  return effectivePlan(await activeSubscriptionsFor(userId));
}

/**
 * Create a Checkout Session for a paid plan; returns the hosted URL. Subscriptions renew monthly
 * until cancelled — there is deliberately no one-off month. Link is offered next to cards via the
 * payment method configuration named in STRIPE_PMC_ID.
 */
export async function createCheckout(userId: string, email: string, plan: PaidPlanKey, watchId?: string | null): Promise<string> {
  const existing = await db().select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const customerId = existing[0]?.stripeCustomerId ?? undefined;
  try {
    return await checkoutSession(userId, email, plan, watchId ?? null, customerId);
  } catch (e) {
    // A customer id we stored no longer exists on Stripe (deleted, or test data): forget it and start fresh.
    const err = e as { code?: string; param?: string };
    if (customerId && err?.code === "resource_missing" && err?.param === "customer") {
      await db().update(schema.users).set({ stripeCustomerId: null }).where(eq(schema.users.id, userId));
      return checkoutSession(userId, email, plan, watchId ?? null, undefined);
    }
    throw e;
  }
}

async function checkoutSession(userId: string, email: string, plan: PaidPlanKey, watchId: string | null, customerId: string | undefined): Promise<string> {
  const s = stripe();
  const site = env.siteUrl();
  const meta = { userId, plan, watchId: watchId ?? "", app: "pickupchecker" };
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    // Payment methods are dynamic: a PickupChecker-specific configuration (card + Link on) keeps the
    // shared account's other products untouched. Without it Stripe uses the account default.
    payment_method_configuration: env.stripePmc() || undefined,
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    customer: customerId,
    customer_email: customerId ? undefined : email,
    client_reference_id: userId,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}${watchId ? `&watch=${encodeURIComponent(watchId)}` : ""}`,
    cancel_url: `${site}/account?checkout=cancelled`,
    metadata: meta,
    subscription_data: { metadata: meta },
    custom_text: {
      submit: { message: `${PLANS[plan].name}: ${PLANS[plan].limit} alerts. Monthly, cancel anytime.` },
    },
    // Per-session branding: the Stripe account is shared with sibling products, so the brand is set here.
    branding_settings: { display_name: "PickupChecker", background_color: "#f6f7f5", button_color: "#0a7f49", border_style: "rounded" },
  } as Stripe.Checkout.SessionCreateParams);
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Stripe refused because the API key lacks a permission (a restricted key), not because of the request. */
export function isPermissionError(e: unknown): boolean {
  const err = e as { type?: string; statusCode?: number; message?: string };
  return err?.type === "StripePermissionError" || err?.statusCode === 403 || /permission/i.test(err?.message ?? "");
}

export class BillingPermissionError extends Error {
  constructor(public missing: string) { super(`Stripe key lacks ${missing}`); }
}

/** What switching plans would do, shown before the user confirms. Money in cents (USD). */
export interface PlanChangePreview {
  from: PaidPlanKey; to: PaidPlanKey; upgrade: boolean;
  /** Charged today (upgrade) or credited to the account (downgrade, negative). */
  nowCents: number;
  /** Stripe's own figure (invoice preview) or our estimate from the days left in the period. */
  exact: boolean;
  /** The monthly price from the next renewal on, after any lasting discount. */
  monthlyCents: number;
  renewsAt: string | null;
  daysLeft: number;
  /** "Visa ·· 4242" when Stripe lets us read it. */
  card: string | null;
  /** Unix seconds: the moment the preview prices, sent back on confirm so the charge matches it. */
  prorationDate: number;
}

type Disc = { coupon?: Coupon | string | null; source?: { coupon?: Coupon | string | null } | null; end?: number | null };
type Coupon = { percent_off?: number | null; amount_off?: number | null; duration?: string | null };

/** The share of a price that is still paid under the subscription's discounts (1 = none, 0 = free). */
function paidShare(discounts: unknown[]): number {
  let share = 1;
  for (const d of discounts) {
    if (!d || typeof d !== "object") continue;
    const c = ((d as Disc).coupon ?? (d as Disc).source?.coupon) as Coupon | string | null | undefined;
    if (c && typeof c === "object" && c.percent_off) share *= 1 - c.percent_off / 100;
  }
  return Math.max(0, share);
}

export async function previewPlanChange(subscriptionId: string, to: PaidPlanKey): Promise<PlanChangePreview> {
  const s = stripe();
  // Discounts with their coupons (a promo code may take some or all of the price), when the key may read them.
  const sub = await s.subscriptions.retrieve(subscriptionId, { expand: ["discounts.source.coupon"] })
    .catch(() => s.subscriptions.retrieve(subscriptionId, { expand: ["discounts"] }))
    .catch(() => s.subscriptions.retrieve(subscriptionId));
  const item = sub.items.data[0];
  if (!item) throw new Error("subscription has no item");
  const from = planFromPrice({ id: item.price.id, metadata: item.price.metadata, unit_amount: item.price.unit_amount });
  const now = Math.floor(Date.now() / 1000);
  const start = item.current_period_start, end = item.current_period_end;
  const left = Math.max(0, Math.min(1, (end - now) / Math.max(1, end - start)));
  const share = paidShare((sub.discounts ?? []) as unknown[]);
  const oldCents = item.price.unit_amount ?? PLANS[from].priceUsd * 100, newCents = PLANS[to].priceUsd * 100;
  let nowCents = Math.round((newCents - oldCents) * left * share), exact = false;
  try {
    // Exact, when the key may read invoices: the invoice Stripe would raise right now for the switch.
    const inv = await s.invoices.createPreview({
      customer: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      subscription: sub.id,
      subscription_details: { items: [{ id: item.id, price: priceIdFor(to) }], proration_behavior: "always_invoice", proration_date: now },
    });
    nowCents = inv.total; exact = true;
  } catch { /* estimate stands */ }
  let card: string | null = null;
  const pm = sub.default_payment_method ?? null;
  if (pm) {
    try {
      const m = typeof pm === "string" ? await s.paymentMethods.retrieve(pm) : pm;
      if (m.card) card = `${m.card.brand.charAt(0).toUpperCase()}${m.card.brand.slice(1)} ·· ${m.card.last4}`;
      else if (m.type === "link") card = "Link";
    } catch { /* not readable with this key */ }
  }
  return {
    from, to, upgrade: comparePlans(to, from) > 0, nowCents, exact,
    monthlyCents: Math.round(newCents * share), renewsAt: end ? new Date(end * 1000).toISOString() : null,
    daysLeft: Math.round(((end - now) / 86400) * 10) / 10, card, prorationDate: now,
  };
}

/**
 * Move an existing subscription to another paid plan, after the user confirmed the preview. The difference
 * is invoiced at once (an upgrade is charged, a downgrade becomes account credit), and with
 * pending_if_incomplete the new plan only takes hold once that payment succeeds: a card that needs the
 * bank's confirmation (3-D Secure) or is declined leaves the old plan in place ({ pending: true }).
 */
export async function changePlan(subscriptionId: string, plan: PaidPlanKey, prorationDate?: number): Promise<{ pending?: boolean }> {
  const s = stripe();
  try {
    const sub = await s.subscriptions.retrieve(subscriptionId);
    const item = sub.items.data[0];
    if (!item) throw new Error("subscription has no item");
    // A plan change keeps the subscription going (pending updates take no other parameters, so separately).
    if (sub.cancel_at_period_end) await s.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
    const now = Math.floor(Date.now() / 1000);
    const at = prorationDate && prorationDate <= now && now - prorationDate < 30 * 60 && prorationDate >= item.current_period_start ? prorationDate : now;
    const updated = await s.subscriptions.update(subscriptionId, {
      items: [{ id: item.id, price: priceIdFor(plan) }],
      proration_behavior: "always_invoice",
      proration_date: at,
      payment_behavior: "pending_if_incomplete",
    });
    if (updated.pending_update) return { pending: true };
    const tagged = await s.subscriptions.update(subscriptionId, { metadata: { ...updated.metadata, plan } }).catch(() => updated);
    await syncSubscription(tagged);
    return {};
  } catch (e) {
    if (isPermissionError(e)) throw new BillingPermissionError("Subscriptions write");
    throw e;
  }
}

let portalConfig: string | null = null;
/** PickupChecker's own customer-portal configuration (invoices, card, cancel at period end), found or created once. */
async function portalConfiguration(): Promise<string> {
  if (portalConfig) return portalConfig;
  if (env.stripePortalConfig()) return (portalConfig = env.stripePortalConfig());
  const s = stripe();
  const list = await s.billingPortal.configurations.list({ limit: 100 });
  const mine = list.data.find((c) => c.metadata?.app === "pickupchecker" && c.active);
  if (mine) return (portalConfig = mine.id);
  const site = env.siteUrl();
  const created = await s.billingPortal.configurations.create({
    metadata: { app: "pickupchecker" },
    business_profile: { headline: "PickupChecker — iPhone pickup alerts", privacy_policy_url: `${site}/privacy`, terms_of_service_url: `${site}/terms` },
    default_return_url: `${site}/account`,
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      // Plan switching happens in place through the API; Stripe's portal cannot list three monthly prices of one product.
      subscription_update: { enabled: false },
    },
  });
  return (portalConfig = created.id);
}

export async function portalUrl(customerId: string, flow?: { subscriptionId: string; returnTo: string }): Promise<string> {
  const site = env.siteUrl();
  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    configuration: await portalConfiguration(),
    return_url: `${site}/account`,
    ...(flow ? { flow_data: { type: "subscription_update", subscription_update: { subscription: flow.subscriptionId }, after_completion: { type: "redirect", redirect: { return_url: `${site}${flow.returnTo}` } } } } : {}),
  } as Stripe.BillingPortal.SessionCreateParams);
  return session.url;
}
