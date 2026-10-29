import Link from "next/link";
import { eq } from "drizzle-orm";
import { ensureUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { syncSubscription } from "@/lib/billing";
import { modelByKey } from "@/lib/apple/catalog";
import { TrackOnce } from "@/components/site/TrackOnce";
import { PushSetup } from "@/components/push/PushSetup";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alerts are on", robots: { index: false } };

export default async function Success({ searchParams }: PageProps<"/checkout/success">) {
  const sp = await searchParams;
  const u = await ensureUser();
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  let model: string | null = null;
  let synced = false;
  if (u && sessionId) {
    try {
      const s = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
      if (s.metadata?.userId === u.id && s.subscription && typeof s.subscription !== "string") {
        await syncSubscription(s.subscription); // webhook may still be in flight — make the page truthful now
        model = s.metadata?.model ?? null;
        synced = true;
      }
    } catch { /* webhook will reconcile */ }
  }
  const watches = u ? await db().select().from(schema.watches).where(eq(schema.watches.userId, u.id)) : [];
  const m = model ? modelByKey(model) : null;
  return (
    <div className="mx-auto max-w-2xl px-4 pt-16">
      <TrackOnce event="purchase" props={{ model, value: 5, currency: "USD" }} />
      <div className="pane p-8 text-center">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-accent-ink">✓</div>
        <h1 className="display text-3xl">{synced ? `${m?.name ?? "Your"} alerts are on` : "Payment received"}</h1>
        <p className="mt-3 text-ink-2">{synced ? "We're watching every store you chose. The next restock reaches you within seconds." : "Your subscription will show up in your account within a minute."}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/account" className="btn btn-primary">Open my alerts</Link>
          {m && <Link href={`/stock/${m.slug}`} className="btn btn-ghost">Live {m.short} stock</Link>}
        </div>
        <p className="mt-6 text-xs text-ink-3">{watches.length} alert{watches.length === 1 ? "" : "s"} saved · receipts come from Stripe</p>
      </div>
      <div className="mt-4">
        <PushSetup vapidPublicKey={env.vapidPublicKey()} title="Next: alerts on your phone" />
      </div>
    </div>
  );
}
