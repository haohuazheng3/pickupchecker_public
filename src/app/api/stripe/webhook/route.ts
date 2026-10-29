import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db, schema } from "@/lib/db";
import { syncSubscription } from "@/lib/billing";
import { recordError, errorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stripe → us. Signature-verified, idempotent by event id. */
export async function POST(req: Request) {
  const secret = env.stripeWebhookSecret();
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `invalid signature: ${errorMessage(e)}` }, { status: 400 });
  }
  // Ignore events that belong to sibling apps on the shared account.
  const obj = event.data.object as { metadata?: Record<string, string> };
  if (obj?.metadata?.app && obj.metadata.app !== "pickupchecker") return NextResponse.json({ ignored: "other app" });

  const d = db();
  const dup = await d.insert(schema.stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing().returning({ id: schema.stripeEvents.id });
  if (dup.length === 0) return NextResponse.json({ duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription" && s.subscription) {
          const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
          const sub = await stripe().subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subRef = inv.parent?.subscription_details?.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;
        if (subId) await syncSubscription(await stripe().subscriptions.retrieve(subId));
        break;
      }
      default:
        break;
    }
  } catch (e) {
    await recordError("web", `stripe webhook ${event.type}: ${errorMessage(e)}`, { eventId: event.id });
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
