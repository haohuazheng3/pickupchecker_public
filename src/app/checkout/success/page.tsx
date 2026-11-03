import Link from "next/link";
import { eq } from "drizzle-orm";
import { ensureUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { syncSubscription } from "@/lib/billing";
import { PLANS, isPaidPlan, type PaidPlanKey } from "@/lib/plans";
import { TrackOnce } from "@/components/site/TrackOnce";
import { PushSetup } from "@/components/push/PushSetup";
import { env } from "@/lib/env";
import { deviceSummary } from "@/lib/devices";
import { pageLocale, requestLocale, setPageLocale, t } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n/dict";
import { signInHome } from "@/lib/i18n/locales";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: dict((await requestLocale()).lang).account.success.metaTitle, robots: { index: false } };
}

export default async function Success({ searchParams }: PageProps<"/checkout/success">) {
  setPageLocale(await requestLocale());
  const d = t().account.success;
  const loc = pageLocale();
  const sp = await searchParams;
  const u = await ensureUser();
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  let plan: PaidPlanKey | null = isPaidPlan(sp.plan) ? sp.plan : null;
  let synced = false;
  if (u && sessionId) {
    try {
      const s = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
      if (s.metadata?.userId === u.id && s.subscription && typeof s.subscription !== "string") {
        await syncSubscription(s.subscription); // webhook may still be in flight — make the page truthful now
        if (isPaidPlan(s.metadata?.plan)) plan = s.metadata.plan;
        synced = true;
      }
    } catch { /* webhook will reconcile */ }
  }
  const [watches, devices] = u ? await Promise.all([db().select().from(schema.watches).where(eq(schema.watches.userId, u.id)), deviceSummary(u.id, loc.lang)]) : [[], null];
  const def = plan ? PLANS[plan] : null;
  const saved = watches.filter((w) => w.active).length; // deleted and retired rules stay as inactive rows
  return (
    <div className="mx-auto max-w-2xl px-4 pt-16">
      {/* FlowGlance's purchase shape: amount in dollars; the Checkout session id makes a reload count once. */}
      {sessionId && <TrackOnce event="purchase" props={{ amount: def?.priceUsd ?? 5, currency: "usd", item: plan ?? "plus", id: sessionId }} />}
      <div className="pane p-8 text-center">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-accent-ink">✓</div>
        <h1 className="display text-3xl">{synced ? d.isOn(def?.name ?? d.yourPlan) : d.received}</h1>
        <p className="mt-3 text-ink-2">{synced ? (def ? d.onPlan(def.limit) : d.planOn) : d.pending}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/account" className="btn btn-primary">{d.open}</Link>
          {/* Alerts are set on the home page of the person's language ("/" in English). */}
          <Link href={`${signInHome(loc.native ? loc : undefined)}#notify`} className="btn btn-ghost">{d.another}</Link>
        </div>
        <p className="mt-6 text-xs text-ink-3">{d.saved(saved)}</p>
      </div>
      <div className="mt-4">
        <PushSetup vapidPublicKey={env.vapidPublicKey()} title={devices?.active ? d.pushOn : d.pushNext} account={devices} />
      </div>
    </div>
  );
}
