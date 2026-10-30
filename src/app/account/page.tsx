import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { ensureUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { activeSubscriptionsFor } from "@/lib/billing";
import { effectivePlan, PAID_PLANS, PLANS } from "@/lib/plans";
import { STORE_INDEX, PART_INDEX } from "@/lib/apple/catalog";
import { alertSetOf } from "@/lib/alertSet";
import { Identify } from "@/components/account/Identify";
import { SignOutButton } from "@/components/account/SignOutButton";
import { DeviceList } from "@/components/account/DeviceList";
import { PushSetup } from "@/components/push/PushSetup";
import { timeAgo } from "@/components/stock/StatusBits";
import { env } from "@/lib/env";
import { summarizeDevices } from "@/lib/devices";
import { RestockTimes, RestockTimesSkeleton } from "@/components/account/RestockTimes";
import { RefreshOnAlertsChange } from "@/components/account/RefreshOnAlertsChange";
import { AlertEditor } from "@/components/alerts/AlertEditor";
import { Section } from "@/components/alerts/Section";
import { PlanPanel } from "@/components/alerts/PlanPanel";
import { buildPhoneCatalog } from "@/components/alerts/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "My alerts", robots: { index: false } };

/**
 * The dashboard, one page of sections: alerts (phones × stores, ticked in place), plan, notifications,
 * restock patterns, alerts sent. Nothing opens a dialog or another page except Stripe's own checkout.
 */
export default async function Account() {
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
  const renews = sub?.currentPeriodEnd ? sub.currentPeriodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : null;
  const deviceInfo = summarizeDevices(devices);
  const fit = PAID_PLANS.find((k) => PLANS[k].limit >= active) ?? "max";
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 pt-8">
      <Identify userRef={u.id} email={u.email} />
      <RefreshOnAlertsChange />
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <div className="eyebrow">Signed in as {u.email}</div>
          <h1 className="display mt-1 text-3xl sm:text-4xl">My alerts</h1>
        </div>
        <SignOutButton />
      </div>

      <AlertEditor variant="page" catalog={buildPhoneCatalog()} account={{ set: alertSetOf(watches), plan: { key: plan.key, limit: plan.limit, used: active } }} />

      <Section id="plan" title="Plan" defaultOpen={plan.key === "free"}
        summary={plan.key === "free" ? "No plan yet: alerts are off" : `${PLANS[plan.key].name} · ${Math.min(active, plan.limit)} of ${plan.limit} alerts on${renews ? (sub?.cancelAtPeriodEnd ? ` · ends ${renews}` : ` · renews ${renews}`) : ""}`}>
        <PlanPanel recommend={plan.key === "free" ? fit : active > plan.limit ? PAID_PLANS.find((k) => PLANS[k].limit >= active) ?? "max" : null}
          plan={{ key: plan.key, limit: plan.limit, used: active, renewsAt: sub?.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: Boolean(sub?.cancelAtPeriodEnd), status: sub?.status ?? null, hasCustomer: Boolean(row[0]?.stripeCustomerId) }} />
      </Section>

      <Section id="notifications" title="Notifications" defaultOpen={!deviceInfo.active}
        summary={deviceInfo.active ? `On for your ${deviceInfo.label ?? "devices"}` : "Not on any device yet"}>
        <PushSetup vapidPublicKey={env.vapidPublicKey()} account={deviceInfo} />
        {devices.length > 0 && (
          <DeviceList devices={devices.map((d) => ({ id: d.id, platform: d.platform, standalone: d.standalone, added: timeAgo(d.createdAt), lastAlert: d.lastSentAt ? timeAgo(d.lastSentAt) : null, disabledAt: d.disabledAt?.toISOString() ?? null, lastError: d.lastError }))} />
        )}
      </Section>

      {/* Streams in after the rest: thirty days of events for every store the user watches. */}
      <Suspense fallback={active ? <RestockTimesSkeleton /> : null}>
        <RestockTimes watches={watches} />
      </Suspense>

      <Section id="sent" title="Sent alerts" defaultOpen={false} summary={sent.length ? `Last one ${timeAgo(sent[0].createdAt)}` : "Nothing sent yet"}>
        {sent.length === 0 ? <p className="text-sm text-ink-3">Nothing sent yet.</p> : (
          <ul className="divide-y divide-line text-sm">
            {sent.map((n) => {
              const item = PART_INDEX.get(n.partNumber); const store = STORE_INDEX.get(n.storeNumber);
              return <li key={n.id} className="flex justify-between gap-3 py-2"><span>{item ? `${item.model} ${item.storage} ${item.color}` : n.partNumber} · Apple {store?.name ?? n.storeNumber}</span><span className="shrink-0 text-ink-3">{n.channel === "push" ? "notification" : "email"} · {n.status} · {timeAgo(n.createdAt)}</span></li>;
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
