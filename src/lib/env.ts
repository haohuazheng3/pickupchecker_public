/** Environment access with explicit names; never log values. */
export const env = {
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com",
  cronSecret: () => process.env.CRON_SECRET ?? "",
  pollerToken: () => process.env.POLLER_TOKEN ?? "",
  inboxIngestSecret: () => process.env.INBOX_INGEST_SECRET ?? "",
  mailWorkerUrl: () => process.env.MAIL_WORKER_URL ?? "",
  mailWorkerToken: () => process.env.MAIL_WORKER_TOKEN ?? "",
  adminPassword: () => process.env.ADMIN_PASSWORD ?? "",
  adminSessionSecret: () => process.env.ADMIN_SESSION_SECRET ?? "",
  adminEmails: () =>
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  ownerEmail: () => process.env.OWNER_EMAIL ?? "",
  resendKey: () => process.env.RESEND_API_KEY ?? "",
  alertsFrom: () => process.env.ALERTS_FROM ?? "PickupChecker <alerts@pickupchecker.com>",
  stripeKey: () => process.env.STRIPE_SECRET_KEY ?? "",
  stripeContext: () => process.env.STRIPE_CONTEXT ?? "",
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceMonthly: () => process.env.STRIPE_PRICE_MONTHLY ?? "", // Plus ($5, 10 alerts)
  stripePricePro: () => process.env.STRIPE_PRICE_PRO ?? "", // Pro ($10, 20 alerts)
  stripePriceMax: () => process.env.STRIPE_PRICE_MAX ?? "", // Max ($20, 50 alerts)
  stripePmc: () => process.env.STRIPE_PMC_ID ?? "", // payment method configuration (card + Link)
  stripePortalConfig: () => process.env.STRIPE_PORTAL_CONFIG ?? "", // customer-portal configuration (found or created when unset)
  stripeApiVersion: () => process.env.STRIPE_API_VERSION ?? "2026-09-30.endive",
  vapidPublicKey: () => process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: () => process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: () => process.env.VAPID_SUBJECT ?? "mailto:alerts@pickupchecker.com",
  flowglanceKey: () => process.env.NEXT_PUBLIC_FLOWGLANCE_KEY ?? "",
  indexable: () => process.env.NEXT_PUBLIC_INDEXABLE === "1",
  isProd: () => process.env.VERCEL_ENV === "production",
};

/** Constant-time string compare for bearer tokens. */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function bearerOk(req: Request, expected: string): boolean {
  const h = req.headers.get("authorization") ?? "";
  const tok = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  return safeEqual(tok, expected);
}
