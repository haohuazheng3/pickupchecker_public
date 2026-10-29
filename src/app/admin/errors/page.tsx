import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Table, timeAgo } from "@/components/admin/Bits";

export default async function AdminErrors() {
  const rows = await db().select().from(schema.errorGroups).orderBy(desc(schema.errorGroups.lastSeenAt)).limit(200);
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">Error inbox (grouped)</h2>
      <Table head={["Last", "First", "Source", "Count", "Message", "Sample", "State", ""]} rows={rows.map((e) => [timeAgo(e.lastSeenAt), timeAgo(e.firstSeenAt), e.source, e.count, e.message, <code key="s" className="text-xs">{JSON.stringify(e.sample ?? {}).slice(0, 200)}</code>, e.resolvedAt ? "resolved" : <span className="text-bad">open</span>, e.resolvedAt ? "" : <form key="f" action={`/api/admin/errors/${e.fingerprint}/resolve`} method="post"><button className="btn btn-ghost btn-sm">Resolve</button></form>])} />
    </section>
  );
}
