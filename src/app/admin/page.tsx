import { adminOverview } from "@/lib/admin/queries";
import { Stat, Table, timeAgo, ageMs } from "@/components/admin/Bits";

export default async function AdminHome() {
  const o = await adminOverview();
  const hb = o.heartbeat?.value as { at?: string; mode?: string; host?: string; cadenceSec?: number; requests?: number; throttled?: number; storesCovered?: number; durationMs?: number; egress?: string } | undefined;
  const hbAge = ageMs(hb?.at);
  const pollerTone = hbAge < 150_000 ? "ok" : hbAge < 600_000 ? "warn" : "bad";
  const s541 = o.reqHour.n ? Math.round((o.reqHour.s541 / o.reqHour.n) * 100) : 0;
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Poller heartbeat" value={hb?.at ? timeAgo(hb.at) : "never"} sub={hb ? `${hb.mode} · ${hb.host} · every ${hb.cadenceSec}s via ${hb.egress}` : "no poller yet"} tone={pollerTone} />
        <Stat label="Requests / last hour" value={o.reqHour.n} sub={`${o.reqHour.ok} ok · ${o.reqHour.s541} throttled (${s541}%) · ${o.reqHour.avgMs} ms avg`} tone={s541 > 25 ? "warn" : undefined} />
        <Stat label="Stock rows" value={`${o.stock.available} avail`} sub={`${o.stock.total} tracked · ${o.stock.unknown} unknown · freshest ${timeAgo(o.stock.newest)}`} />
        <Stat label="Restocks / 24h" value={o.events.restocks} sub={`${o.events.soldout} sold out`} />
        <Stat label="Active subscriptions" value={o.subs.active} sub={`${o.subs.total} total · ${o.watches.n} active alerts`} tone="ok" />
        <Stat label="Users" value={o.users.n} sub={`${o.users.day} new in 24h`} />
        <Stat label="Alerts / 24h" value={o.notes.sent} sub={`${o.notes.failed} failed · p50 ${o.notes.p50} ms`} tone={o.notes.failed ? "warn" : undefined} />
        <Stat label="Open errors (24h)" value={o.errCount} sub={o.watchdog?.value.down ? `degraded since ${timeAgo(String(o.watchdog.value.since))}` : "watchdog quiet"} tone={o.errCount ? "bad" : "ok"} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Last sweeps</h2>
        <Table head={["Started", "Mode", "Host", "Requests", "Failures", "Stores", "Transitions", "Duration"]} rows={o.sweeps.map((s) => [timeAgo(s.startedAt), s.mode, s.host, s.requests, s.failures, s.storesCovered, s.transitions, s.durationMs ? `${(s.durationMs / 1000).toFixed(1)} s` : "…"])} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Open errors</h2>
        <Table head={["Last seen", "Source", "Count", "Message", "Sample", ""]} rows={o.errors.map((e) => [timeAgo(e.lastSeenAt), e.source, e.count, e.message, <code key="s" className="text-xs">{JSON.stringify(e.sample ?? {}).slice(0, 160)}</code>, <form key="f" action={`/api/admin/errors/${e.fingerprint}/resolve`} method="post"><button className="btn btn-ghost btn-sm">Resolve</button></form>])} />
      </section>
    </div>
  );
}
