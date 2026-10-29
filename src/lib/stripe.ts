import Stripe from "stripe";
import { env } from "./env";

let _stripe: Stripe | null = null;

/** Stripe through the owner's organization key, scoped to the shared account via Stripe-Context. */
export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = env.stripeKey();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key, {
    apiVersion: env.stripeApiVersion() as Stripe.LatestApiVersion,
    stripeContext: env.stripeContext() || undefined,
    appInfo: { name: "PickupChecker", url: "https://pickupchecker.com" },
  });
  return _stripe;
}

export const PLAN = {
  priceUsd: 5,
  label: "$5 / month",
  description: "Instant email alerts for one iPhone model at any Apple Store you choose.",
};
