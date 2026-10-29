import { recentUsers } from "@/lib/admin/queries";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Table, timeAgo, Stat, ageMs } from "@/components/admin/Bits";
import { Section } from "@/components/admin/Status";

export default async function AdminUsers() {
  const [users, subs] = await Promise.all([recentUsers(200), db().select().from(schema.subscriptions).orderBy(desc(schema.subscriptions.updatedAt)).limit(200)]);
  const active = subs.filter((s) => ["active", "trialing", "past_due"].includes(s.status));
  const DAY = 86400_000;
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={users.length} sub={`${users.filter((u) => ageMs(u.u.createdAt) < DAY).length} new in 24 h`} />
        <Stat label="Active subscriptions" value={active.length} sub={`${subs.filter((s) => s.cancelAtPeriodEnd).length} cancel at period end · ${subs.filter((s) => s.status === "past_due").length} past due`} tone={subs.some((s) => s.status === "past_due") ? "warn" : "ok"} />
        <Stat label="MRR" value={`$${active.reduce((n, s) => n + (s.plan === "pro" ? 10 : 5), 0)}`} sub={`${active.filter((s) => s.plan === "plus").length} Plus · ${active.filter((s) => s.plan === "pro").length} Pro`} />
        <Stat label="Seen in 24 h" value={users.filter((u) => ageMs(u.u.lastSeenAt) < DAY).length} sub="signed-in page loads" />
      </section>
      <Section title="Users"><Table head={["Joined", "Email", "Last seen", "Subscriptions", "Alerts", "Stripe customer"]} rows={users.map((r) => [timeAgo(r.u.createdAt), r.u.email, r.u.lastSeenAt ? timeAgo(r.u.lastSeenAt) : "—", r.subs, r.watches, <code key="c" className="text-xs">{r.u.stripeCustomerId ?? "—"}</code>])} /></Section>
      <Section title="Subscriptions"><Table head={["Updated", "Id", "User", "Plan", "Status", "Period end", "Cancel at end"]} rows={subs.map((s) => [timeAgo(s.updatedAt), <code key="i" className="text-xs">{s.id}</code>, <code key="u" className="text-xs">{s.userId}</code>, `${s.plan} · ${s.alertLimit} alerts`, <span key="s" className={["active", "trialing"].includes(s.status) ? "text-accent" : s.status === "past_due" ? "text-warn" : "text-ink-3"}>{s.status}</span>, s.currentPeriodEnd?.toLocaleDateString() ?? "—", s.cancelAtPeriodEnd ? "yes" : "no"])} /></Section>
    </>
  );
}
