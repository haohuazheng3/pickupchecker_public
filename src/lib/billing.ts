import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { stripe } from "./stripe";
import { env } from "./env";
import { PLANS, planFromPrice, priceIdFor, effectivePlan, type PaidPlanKey } from "./plans";

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

/** Move an existing subscription to another paid plan in place (prorated), then mirror it. */
export async function changePlan(subscriptionId: string, plan: PaidPlanKey): Promise<void> {
  const s = stripe();
  const sub = await s.subscriptions.retrieve(subscriptionId);
  const item = sub.items.data[0];
  if (!item) throw new Error("subscription has no item");
  const updated = await s.subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price: priceIdFor(plan) }],
    proration_behavior: "create_prorations",
    cancel_at_period_end: false,
    metadata: { ...sub.metadata, plan },
  });
  await syncSubscription(updated);
}

export async function portalUrl(customerId: string): Promise<string> {
  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.siteUrl()}/account`,
  });
  return session.url;
}
