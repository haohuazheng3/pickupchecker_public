import Link from "next/link";
import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { ensureUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { activeSubscriptionsFor } from "@/lib/billing";
import { effectivePlan, coveredWatchIds } from "@/lib/plans";
import { STORE_INDEX, PART_INDEX, stateCodeOf, storePath } from "@/lib/apple/catalog";
import { WatchList } from "@/components/account/WatchList";
import { PlanCard } from "@/components/account/PlanCard";
import { Identify } from "@/components/account/Identify";
import { SignOutButton } from "@/components/account/SignOutButton";
import { DeviceList } from "@/components/account/DeviceList";
import { PushSetup } from "@/components/push/PushSetup";
import { timeAgo } from "@/components/stock/StatusBits";
import { env } from "@/lib/env";
import { summarizeDevices } from "@/lib/devices";
import { RestockTimes, RestockTimesSkeleton } from "@/components/account/RestockTimes";

export const dynamic = "force-dynamic";
export const metadata = { title: "My alerts", robots: { index: false } };

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
  const covered = coveredWatchIds(watches, plan.limit);
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <Identify userRef={u.id} email={u.email} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Signed in as {u.email}</div>
          <h1 className="display mt-1 text-3xl sm:text-4xl">My alerts</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/#notify" className="btn btn-primary btn-sm">New alert</Link>
          <SignOutButton />
        </div>
      </div>

      <div className="mt-6">
        <PlanCard plan={{ key: plan.key, limit: plan.limit, used: watches.filter((w) => w.active).length, renewsAt: sub?.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: Boolean(sub?.cancelAtPeriodEnd), status: sub?.status ?? null, hasCustomer: Boolean(row[0]?.stripeCustomerId) }} />
      </div>

      <div className="mt-6">
        <PushSetup vapidPublicKey={env.vapidPublicKey()} account={summarizeDevices(devices)} />
        {devices.length > 0 && (
          <DeviceList devices={devices.map((d) => ({ id: d.id, platform: d.platform, standalone: d.standalone, added: timeAgo(d.createdAt), lastAlert: d.lastSentAt ? timeAgo(d.lastSentAt) : null, disabledAt: d.disabledAt?.toISOString() ?? null, lastError: d.lastError }))} />
        )}
      </div>

      {/* Streams in after the rest: thirty days of events for every store the user watches. */}
      <Suspense fallback={watches.some((w) => w.active) ? <RestockTimesSkeleton /> : null}>
        <RestockTimes watches={watches} />
      </Suspense>

      <section className="pane mt-6 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Alerts</h2>
        <WatchList
          watches={watches.map((w) => {
            const s = w.storeNumbers.length === 1 ? STORE_INDEX.get(w.storeNumbers[0]) : undefined;
            const legacyWhere = w.storeNumbers.length > 1 ? `${w.storeNumbers.length} stores` : w.zip ? `within ${w.radiusMiles ?? 50} mi of ${w.zip}` : w.lat != null ? `within ${w.radiusMiles ?? 50} mi of your location` : w.storeNumbers.length === 0 ? "every US store" : null;
            return {
              id: w.id, model: w.model, storage: w.storages[0] ?? null, color: w.colors[0] ?? null, paused: w.paused, active: w.active, covered: covered.has(w.id), createdAt: w.createdAt.toISOString(),
              store: s ? { number: s.storeNumber, name: s.name, city: s.city, code: stateCodeOf(s), href: storePath(s) } : null,
              deactivatedReason: w.deactivatedReason ?? null,
              legacy: { storages: w.storages, colors: w.colors, where: legacyWhere },
            };
          })}
        />
      </section>

      <section className="pane mt-6 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Sent alerts</h2>
        {sent.length === 0 ? <p className="mt-2 text-sm text-ink-3">Nothing sent yet.</p> : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {sent.map((n) => {
              const item = PART_INDEX.get(n.partNumber); const store = STORE_INDEX.get(n.storeNumber);
              return <li key={n.id} className="flex justify-between gap-3 py-2"><span>{item ? `${item.model} ${item.storage} ${item.color}` : n.partNumber} · Apple {store?.name ?? n.storeNumber}</span><span className="text-ink-3">{n.channel === "push" ? "notification" : "email"} · {n.status} · {timeAgo(n.createdAt)}</span></li>;
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
