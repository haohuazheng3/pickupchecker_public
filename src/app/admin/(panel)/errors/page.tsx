import { desc, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { errorSummary, opsLogRows } from "@/lib/admin/ops";
import { Table, timeAgo, Stat } from "@/components/admin/Bits";
import { Section, Chip, Filters } from "@/components/admin/Status";

export default async function AdminErrors({ searchParams }: PageProps<"/admin/errors">) {
  const sp = await searchParams;
  const all = sp.all === "1";
  const [rows, summary, ops] = await Promise.all([
    db().select().from(schema.errorGroups).where(all ? undefined : isNull(schema.errorGroups.resolvedAt)).orderBy(desc(schema.errorGroups.lastSeenAt)).limit(200),
    errorSummary(24),
    opsLogRows({ level: "warn", limit: 40 }),
  ]);
  const bySrc = (s: string) => summary.find((x) => x.source === s);
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        {["poller", "web", "worker"].map((s) => <Stat key={s} label={`${s} · 24 h`} value={bySrc(s)?.open ?? 0} sub={`${bySrc(s)?.hits ?? 0} occurrences · ${bySrc(s)?.total ?? 0} groups`} tone={(bySrc(s)?.open ?? 0) ? "warn" : "ok"} />)}
      </section>
      <Section title="Error inbox" aside="grouped by fingerprint (numbers stripped) · a resolved group reopens if it happens again">
        <Filters><Chip href="/admin/errors" on={!all}>Open</Chip><Chip href="/admin/errors?all=1" on={all}>All</Chip></Filters>
        <Table head={["Last", "First", "Source", "Count", "Message", "Sample", "State", ""]} rows={rows.map((e) => [timeAgo(e.lastSeenAt), timeAgo(e.firstSeenAt), e.source, e.count, e.message, <code key="s" className="text-xs">{JSON.stringify(e.sample ?? {}).slice(0, 200)}</code>, e.resolvedAt ? <span key="r" className="text-ink-3">resolved {timeAgo(e.resolvedAt)}</span> : <span key="r" className="text-bad">open</span>, e.resolvedAt ? "" : <form key="f" action={`/api/admin/errors/${e.fingerprint}/resolve`} method="post"><button className="btn btn-ghost btn-sm">Resolve</button></form>])} />
      </Section>
      <Section title="Warnings & errors from the ops log" aside={<a className="underline" href="/admin/logs?t=ops&level=warn">all →</a>}>
        <Table head={["At", "Source", "Level", "Message", "Data"]} rows={ops.map((e) => [timeAgo(e.at), e.source, <span key="l" className={e.level === "error" ? "text-bad" : "text-warn"}>{e.level}</span>, e.message, <code key="d" className="text-xs">{JSON.stringify(e.data ?? {}).slice(0, 200)}</code>])} />
      </Section>
    </>
  );
}
