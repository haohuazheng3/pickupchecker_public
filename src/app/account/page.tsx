import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { ensureUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { activeSubscriptionsFor } from "@/lib/billing";
import { effectivePlan, isPaidPlan, PAID_PLANS, PLANS } from "@/lib/plans";
import { STORE_INDEX, PART_INDEX, countryOfStore } from "@/lib/apple/catalog";
import { editorHomeCountry } from "@/lib/editorHome";
import { alertSetOf } from "@/lib/alertSet";
import { Identify } from "@/components/account/Identify";
import { SignOutButton } from "@/components/account/SignOutButton";
import { DeviceList } from "@/components/account/DeviceList";
import { PushSetup } from "@/components/push/PushSetup";
import { env } from "@/lib/env";
import { summarizeDevices } from "@/lib/devices";
import { RestockTimes, RestockTimesSkeleton } from "@/components/account/RestockTimes";
import { FastCheckoutCard } from "@/components/account/FastCheckoutCard";
import { RefreshOnAlertsChange } from "@/components/account/RefreshOnAlertsChange";
import { LanguageSection } from "@/components/account/LanguageSection";
import { AlertEditor } from "@/components/alerts/AlertEditor";
import { Section } from "@/components/alerts/Section";
import { CancelPlanLink, PlanPanel } from "@/components/alerts/PlanPanel";
import { HydrationProbe } from "@/components/account/HydrationProbe";
import { buildPhoneCatalog, pickerStoresFor } from "@/components/alerts/catalog";
import type { CountryCode } from "@/lib/apple/countries";
import { pageLocale, requestLocale, setPageLocale, t } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n/dict";
import { ago, day } from "@/lib/i18n/format";
import { appleStoreLabel, configLabel } from "@/lib/i18n/places";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: dict((await requestLocale()).lang).account.meta.title, robots: { index: false } };
}

/**
 * The dashboard, one page of sections: alerts (phones × stores, ticked in place), plan, notifications,
 * restock patterns, alerts sent. Nothing opens a dialog or another page except Stripe's own checkout.
 * Written in the person's language whatever countries their stores are in; times in each store's own zone.
 */
export default async function Account() {
  setPageLocale(await requestLocale());
  const d = t().account;
  const lang = pageLocale().lang;
  const u = await ensureUser();
  if (!u) return null; // proxy redirects signed-out users
  const [watches, subs, sent, devices] = await Promise.all([
    db().select().from(schema.watches).where(eq(schema.watches.userId, u.id)).orderBy(desc(schema.watches.createdAt)),
    activeSubscriptionsFor(u.id),
    db().select().from(schema.notifications).where(eq(schema.notifications.userId, u.id)).orderBy(desc(schema.notifications.createdAt)).limit(20),
    db().select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, u.id)).orderBy(desc(schema.pushSubscriptions.createdAt)),
  ]);
  const row = await db().select().from(schema.users).where(eq(schema.users.id, u.id)).limit(1);
  const { plan, sub } = effectivePlan(subs);
  const active = watches.filter((w) => w.active).length;
  const renews = sub?.currentPeriodEnd ? day(lang, sub.currentPeriodEnd, "UTC") : null;
  const deviceInfo = summarizeDevices(devices, lang);
  const fit = PAID_PLANS.find((k) => PLANS[k].limit >= active) ?? "max";
  // An account may watch stores in several countries: the picker opens on the country most of them are in,
  // and every chosen store keeps its name (grouped by country) whatever list is showing.
  const set = alertSetOf(watches);
  const chosen = pickerStoresFor(set.stores, lang);
  // With nothing active it no longer drops to the US: see editorHomeCountry (ops review 2026-11-11).
  const past = watches.filter((w) => !w.active).map((w) => countryOfStore(w.storeNumbers[0] ?? "")).filter((c): c is CountryCode => Boolean(c));
  const home = editorHomeCountry(chosen.map((s) => s.country), past, pageLocale().cc);
  return (
    <div id="account-root" className="mx-auto max-w-5xl space-y-4 px-4 pt-8">
      <HydrationProbe />
      <Identify userRef={u.id} email={u.email} />
      <RefreshOnAlertsChange />
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <div className="eyebrow">{d.signedInAs(u.email)}</div>
          <h1 className="display mt-1 text-3xl sm:text-4xl">{d.title}</h1>
        </div>
        <SignOutButton />
      </div>

      {/* First thing on the dashboard (owner 2026-11-05): are phone notifications on? If not, the one button that turns them on. */}
      <div>
        <PushSetup vapidPublicKey={env.vapidPublicKey()} account={deviceInfo} />
        {devices.length > 0 && (
          <DeviceList devices={devices.map((x) => ({ id: x.id, platform: x.platform, standalone: x.standalone, added: ago(lang, x.createdAt), lastAlert: x.lastSentAt ? ago(lang, x.lastSentAt) : null, disabledAt: x.disabledAt?.toISOString() ?? null, lastError: x.lastError }))} />
        )}
      </div>

      <AlertEditor variant="page" catalog={buildPhoneCatalog(home, lang)} known={chosen} account={{ set, plan: { key: plan.key, limit: plan.limit, used: active } }} />

      <Section id="plan" title={d.plan.title} defaultOpen={plan.key === "free"}
        foot={plan.key !== "free" && !sub?.cancelAtPeriodEnd ? <CancelPlanLink /> : undefined}
        summary={plan.key === "free" ? d.plan.none : `${d.plan.summary(PLANS[plan.key].name, Math.min(active, plan.limit), plan.limit)}${renews ? (sub?.cancelAtPeriodEnd ? d.plan.ends(renews) : d.plan.renews(renews)) : ""}`}>
        <PlanPanel recommend={plan.key === "free" ? fit : active > plan.limit ? PAID_PLANS.find((k) => PLANS[k].limit >= active) ?? "max" : null}
          plan={{ key: plan.key, limit: plan.limit, used: active, renewsAt: sub?.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: Boolean(sub?.cancelAtPeriodEnd), status: sub?.status ?? null, hasCustomer: Boolean(row[0]?.stripeCustomerId), nextPlan: isPaidPlan(sub?.nextPlan) && sub?.nextPlan !== plan.key ? sub.nextPlan : null }} />
      </Section>

      {/* What to do before the next alert, so the push leaves four taps; the guide and the window below. */}
      <FastCheckoutCard />

      {/* Streams in after the rest: thirty days of events for every store the user watches. */}
      <Suspense fallback={active ? <RestockTimesSkeleton /> : null}>
        <RestockTimes watches={watches} />
      </Suspense>

      <LanguageSection saved={row[0]?.locale ?? null} />

      <Section id="sent" title={d.sent.title} defaultOpen={false} summary={sent.length ? d.sent.last(ago(lang, sent[0].createdAt)) : d.sent.none}>
        {sent.length === 0 ? <p className="text-sm text-ink-3">{d.sent.empty}</p> : (
          <ul className="divide-y divide-line text-sm">
            {sent.map((n) => {
              const item = PART_INDEX.get(n.partNumber); const store = STORE_INDEX.get(n.storeNumber);
              // English as always; another language: Apple's own colour and store names in it.
              const what = item ? (lang === "en" ? `${item.model} ${item.storage} ${item.color}` : `${item.model} ${configLabel(item, lang)}`) : n.partNumber;
              const where = store && lang !== "en" ? appleStoreLabel(store, lang) : `Apple ${store?.name ?? n.storeNumber}`;
              return <li key={n.id} className="flex justify-between gap-3 py-2"><span>{what} · {where}</span><span className="shrink-0 text-ink-3">{n.channel === "push" ? d.sent.channel.push : d.sent.channel.email} · {d.sent.status[n.status === "sent" && n.deliveredAt ? "delivered" : n.status] ?? n.status} · {ago(lang, n.createdAt)}</span></li>;
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
