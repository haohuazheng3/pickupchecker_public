import { recentUsers } from "@/lib/admin/queries";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Table, timeAgo } from "@/components/admin/Bits";

export default async function AdminUsers() {
  const [users, subs] = await Promise.all([recentUsers(100), db().select().from(schema.subscriptions).orderBy(desc(schema.subscriptions.updatedAt)).limit(100)]);
  return (
    <div className="space-y-6">
      <section><h2 className="mb-2 text-lg font-semibold">Users</h2><Table head={["Joined", "Email", "Subscriptions", "Alerts", "Stripe"]} rows={users.map((r) => [timeAgo(r.u.createdAt), r.u.email, r.subs, r.watches, r.u.stripeCustomerId ?? "—"])} /></section>
      <section><h2 className="mb-2 text-lg font-semibold">Subscriptions</h2><Table head={["Updated", "Id", "User", "Model", "Status", "Period end", "Cancel at end"]} rows={subs.map((s) => [timeAgo(s.updatedAt), s.id, s.userId, s.model, s.status, s.currentPeriodEnd?.toLocaleDateString() ?? "—", s.cancelAtPeriodEnd ? "yes" : "no"])} /></section>
    </div>
  );
}
