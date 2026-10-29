import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ensureUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { activeSubscriptionsFor, subscriptionCovers } from "@/lib/billing";
import { MODELS, STORE_INDEX, PART_INDEX } from "@/lib/apple/catalog";
import { WatchList } from "@/components/account/WatchList";
import { BillingButton } from "@/components/account/BillingButton";
import { Identify } from "@/components/account/Identify";
import { SignOutButton } from "@/components/account/SignOutButton";
import { DeviceList } from "@/components/account/DeviceList";
import { PushSetup } from "@/components/push/PushSetup";
import { timeAgo } from "@/components/stock/StatusBits";
import { env } from "@/lib/env";

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
          {row[0]?.stripeCustomerId && <BillingButton />}
          <SignOutButton />
        </div>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {MODELS.map((m) => {
          const covered = subscriptionCovers(subs, m.key);
          const s = subs.find((x) => x.model === m.key);
          return (
            <div key={m.key} className="pane-2 p-4">
              <div className="font-semibold">{m.name}</div>
              <div className={`mt-1 text-sm ${covered ? "text-accent" : "text-ink-3"}`}>{covered ? `Active${s?.cancelAtPeriodEnd ? " · ends " + (s.currentPeriodEnd?.toLocaleDateString() ?? "") : s?.currentPeriodEnd ? " · renews " + s.currentPeriodEnd.toLocaleDateString() : ""}` : s ? `Subscription ${s.status}` : "No subscription"}</div>
            </div>
          );
        })}
      </section>

      <div className="mt-6">
        <PushSetup vapidPublicKey={env.vapidPublicKey()} />
        {devices.length > 0 && (
          <DeviceList devices={devices.map((d) => ({ id: d.id, platform: d.platform, standalone: d.standalone, createdAt: d.createdAt.toISOString(), lastSentAt: d.lastSentAt?.toISOString() ?? null, disabledAt: d.disabledAt?.toISOString() ?? null, lastError: d.lastError }))} />
        )}
      </div>

      <section className="pane mt-6 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Alerts</h2>
        <WatchList
          watches={watches.map((w) => ({
            id: w.id, model: w.model, storages: w.storages, colors: w.colors, paused: w.paused, active: w.active, zip: w.zip, radiusMiles: w.radiusMiles,
            storeNames: w.storeNumbers.map((n) => STORE_INDEX.get(n)?.name ?? n), covered: subscriptionCovers(subs, w.model), createdAt: w.createdAt.toISOString(),
          }))}
        />
      </section>

      <section className="pane mt-6 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Recent alerts</h2>
        {sent.length === 0 ? <p className="mt-2 text-sm text-ink-3">Nothing sent yet — the first restock that matches will show here.</p> : (
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
