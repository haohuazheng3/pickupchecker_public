import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { stripe } from "./stripe";
import { env } from "./env";
import type { ModelKey } from "./apple/catalog";

/** Upsert a subscription row from a Stripe subscription object (idempotent). */
export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  const model = (sub.metadata?.model as ModelKey | undefined) ?? "18-pro";
  if (!userId) return;
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  await db()
    .insert(schema.subscriptions)
    .values({
      id: sub.id,
      userId,
      model,
      status: sub.status,
      priceId: item?.price?.id ?? null,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.subscriptions.id,
      set: {
        status: sub.status,
        priceId: item?.price?.id ?? null,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        updatedAt: new Date(),
      },
    });
  // Link the customer id to the user for the billing portal.
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await db().update(schema.users).set({ stripeCustomerId: customerId }).where(eq(schema.users.id, userId));
  // Attach any pending watch for this user+model to the subscription.
  await db()
    .update(schema.watches)
    .set({ subscriptionId: sub.id, updatedAt: new Date() })
    .where(and(eq(schema.watches.userId, userId), eq(schema.watches.model, model)));
}

export async function activeSubscriptionsFor(userId: string) {
  return db()
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, userId));
}

export function subscriptionCovers(subs: { model: string; status: string }[], model: string): boolean {
  return subs.some((s) => s.model === model && ["active", "trialing", "past_due"].includes(s.status));
}

/** Create a Checkout Session for one model; returns the hosted URL. */
export async function createCheckout(userId: string, email: string, model: ModelKey, watchId: string): Promise<string> {
  const s = stripe();
  const site = env.siteUrl();
  const existing = await db().select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const customerId = existing[0]?.stripeCustomerId ?? undefined;
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: env.stripePriceMonthly(), quantity: 1 }],
    customer: customerId,
    customer_email: customerId ? undefined : email,
    client_reference_id: userId,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}&watch=${encodeURIComponent(watchId)}`,
    cancel_url: `${site}/?checkout=cancelled&watch=${encodeURIComponent(watchId)}`,
    metadata: { userId, model, watchId, app: "pickupchecker" },
    subscription_data: { metadata: { userId, model, watchId, app: "pickupchecker" } },
    custom_text: {
      submit: { message: "Alerts start the moment payment completes. Cancel anytime from your account." },
    },
    // Per-session branding: the Stripe account is shared with sibling products, so the brand is set here.
    branding_settings: { display_name: "PickupChecker", background_color: "#07080c", button_color: "#35e38c", border_style: "rounded" },
  } as Stripe.Checkout.SessionCreateParams);
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function portalUrl(customerId: string): Promise<string> {
  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.siteUrl()}/account`,
  });
  return session.url;
}
