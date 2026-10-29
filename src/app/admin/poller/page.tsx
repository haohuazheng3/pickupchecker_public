import { anchorHealth, recentPollLog, adminOverview } from "@/lib/admin/queries";
import { COVERAGE, STORE_INDEX } from "@/lib/apple/catalog";
import { Table, timeAgo, Stat, ageMs, isPast } from "@/components/admin/Bits";

export default async function AdminPoller({ searchParams }: PageProps<"/admin/poller">) {
  const sp = await searchParams;
  const failures = sp.failures === "1";
  const [anchors, log, o] = await Promise.all([anchorHealth(), recentPollLog(150, failures), adminOverview()]);
  const byAnchor = new Map(anchors.map((a) => [a.anchor, a]));
  const cfg = o.config?.value as Record<string, unknown> | undefined;
  const eg = o.egress?.value as { used?: number; cooldownUntil?: number } | undefined;
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Configured cadence" value={cfg?.cadenceSec ? `${cfg.cadenceSec}s` : "—"} sub={cfg ? `concurrency ${cfg.concurrency} · prefix ${cfg.prefix ?? "none"} · since ${timeAgo(String(cfg.startedAt))}` : "poller never started"} />
        <Stat label="Requests / 24h" value={o.reqDay.n} sub={`${o.reqDay.ok} ok · ${o.reqDay.s541} throttled`} />
        <Stat label="Vercel egress budget" value={eg ? `${eg.used ?? 0}/25` : "unused"} sub={!isPast(eg?.cooldownUntil) ? `cooling until ${new Date(eg!.cooldownUntil!).toLocaleTimeString()}` : "ready"} />
        <Stat label="Bytes / hour" value={`${(Number(o.reqHour.bytes) / 1e6).toFixed(1)} MB`} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Anchors (33 ZIPs cover all 269 stores)</h2>
        <Table head={["Anchor", "Store", "Covers", "Last OK", "Req/h", "Failures", "Avg ms"]} rows={COVERAGE.map((c) => { const a = byAnchor.get(c.location); const stale = ageMs(a?.last) > 300_000; return [c.location, `${STORE_INDEX.get(c.anchorStore)?.name ?? c.anchorStore}`, c.covers.length, <span key="l" className={stale ? "text-warn" : "text-accent"}>{a?.last ? timeAgo(a.last) : "never"}</span>, a?.n ?? 0, a?.bad ?? 0, a?.avgMs ?? "—"]; })} />
      </section>
      <section>
        <div className="mb-2 flex items-center gap-3"><h2 className="text-lg font-semibold">Request log</h2><a className="chip" href="/admin/poller">All</a><a className="chip" href="/admin/poller?failures=1" data-on={failures}>Failures only</a></div>
        <Table head={["At", "Egress", "Anchor", "Batch", "HTTP", "ms", "Bytes", "Stores", "Error"]} rows={log.map((r) => [timeAgo(r.at), r.egress, r.anchor, r.batch, <span key="h" className={r.ok ? "text-accent" : "text-bad"}>{r.httpStatus ?? "—"}</span>, r.durationMs, r.bytes, r.storesSeen, r.error])} />
      </section>
    </div>
  );
}
