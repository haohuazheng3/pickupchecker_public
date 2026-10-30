import { healthSnapshot, requestBuckets, sweepBuckets, eventBuckets, alertBuckets, cronBuckets, sweepRows } from "@/lib/admin/ops";
import { adminOverview } from "@/lib/admin/queries";
import { computeNodes, overallState } from "@/lib/admin/health";
import { pollerStrip, appleStrip, cronStrip, alertStrip } from "@/lib/admin/strips";
import { NodeCard, HealthStrip, Section, StatePill } from "@/components/admin/Status";
import { StackedBars, LineChart } from "@/components/admin/Charts";
import { PALETTE } from "@/lib/admin/palette";
import { Table, timeAgo } from "@/components/admin/Bits";

export default async function AdminHome() {
  const [snap, req6, sweeps6, req24, sweeps24, events24, alerts24, alerts24h, cron24, o, lastSweeps] = await Promise.all([
    healthSnapshot(), requestBuckets(6, 300), sweepBuckets(6, 300), requestBuckets(24, 300), sweepBuckets(24, 300), eventBuckets(24, 3600), alertBuckets(24, 3600), alertBuckets(24, 300), cronBuckets(24, 300), adminOverview(), sweepRows({ limit: 12 }),
  ]);
  const nodes = computeNodes(snap);
  const overall = overallState(nodes);
  const cadence = snap.heartbeat?.cadenceSec || 20;
  const sweepsPerBucket = Math.round(300 / cadence);
  const problems = nodes.filter((n) => n.state === "bad" || n.state === "warn");
  return (
    <>
      <Section title="System status" aside={<span className="flex items-center gap-2"><StatePill state={overall} label={overall === "ok" ? "All systems healthy" : overall === "warn" ? `${problems.length} need attention` : `${nodes.filter((n) => n.state === "bad").length} down`} /><span>snapshot {new Date(snap.now).toLocaleTimeString()}</span></span>}>
        {problems.length > 0 && (
          <ul className="mb-3 space-y-1 text-sm">
            {problems.map((n) => <li key={n.key} className={n.state === "bad" ? "text-bad" : "text-warn"}><b>{n.name}:</b> {n.value} — {n.detail}</li>)}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {nodes.map((n) => <NodeCard key={n.key} node={n} />)}
        </div>
      </Section>

      <Section title="Last 24 hours" aside="5-minute cells · hover a cell for the numbers">
        <div className="grid gap-4 lg:grid-cols-2">
          <HealthStrip label="Poller sweeps" cells={pollerStrip(sweeps24, sweepsPerBucket)} legend={`expect ~${sweepsPerBucket} per cell`} />
          <HealthStrip label="Apple API (541 throttling)" cells={appleStrip(req24)} legend="red ≥ 25 % throttled" />
          <HealthStrip label="Watchdog cron" cells={cronStrip(cron24, 5)} legend="runs every minute" />
          <HealthStrip label="Alerts delivered" cells={alertStrip(alerts24h)} legend="grey = nothing to send" />
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Apple requests · last 6 h" aside="per 5 min · hover for the split">
          <StackedBars data={req6} series={[{ key: "ok", label: "ok", color: PALETTE.good }, { key: "s541", label: "541 throttled", color: PALETTE.warning }, { key: "other", label: "other failure", color: PALETTE.critical }]} />
        </Section>
        <Section title="Sweep duration · last 6 h" aside="seconds per full pass (66 requests)">
          <LineChart data={sweeps6.map((b) => ({ ...b, avg: Number(b.avgMs) / 1000, max: Number(b.maxMs) / 1000 }))} series={[{ key: "avg", label: "average", color: PALETTE.blue }, { key: "max", label: "slowest", color: PALETTE.violet }]} unit=" s" format="fixed1" />
        </Section>
        <Section title="Stores covered per sweep · last 6 h" aside={`of ${snap.storesTotal}`}>
          <LineChart data={sweeps6} series={[{ key: "stores", label: "stores", color: PALETTE.aqua }]} maxValue={snap.storesTotal} />
        </Section>
        <Section title="Request latency · last 6 h" aside="average ms per Apple call">
          <LineChart data={req6} series={[{ key: "avgMs", label: "avg ms", color: PALETTE.blue }]} unit=" ms" />
        </Section>
        <Section title="Stock transitions · last 24 h" aside="hourly · restock = unavailable → available">
          <StackedBars data={events24} series={[{ key: "restocks", label: "restocks", color: PALETTE.blue }, { key: "soldouts", label: "sold out", color: PALETTE.orange }]} />
        </Section>
        <Section title="Alerts · last 24 h" aside="hourly">
          <StackedBars data={alerts24} series={[{ key: "pushSent", label: "push sent", color: PALETTE.blue }, { key: "emailSent", label: "email sent", color: PALETTE.aqua }, { key: "failed", label: "failed", color: PALETTE.critical }]} />
        </Section>
      </div>

      <Section title="Open errors" aside={<a href="/admin/errors" className="underline">all errors →</a>}>
        <Table head={["Last seen", "Source", "Count", "Message", "Sample", ""]} rows={o.errors.slice(0, 10).map((e) => [timeAgo(e.lastSeenAt), e.source, e.count, e.message, <code key="s" className="text-xs">{JSON.stringify(e.sample ?? {}).slice(0, 140)}</code>, <form key="f" action={`/api/admin/errors/${e.fingerprint}/resolve`} method="post"><button className="btn btn-ghost btn-sm">Resolve</button></form>])} />
      </Section>
      <Section title="Last sweeps" aside={<a href="/admin/logs?t=sweeps" className="underline">all sweeps →</a>}>
        <Table head={["Started", "Mode", "Host", "Requests", "Failures", "Stores", "Transitions", "Duration"]} rows={lastSweeps.map((s) => [timeAgo(s.startedAt), s.mode, s.host, s.requests, <span key="f" className={s.failures ? "text-warn" : ""}>{s.failures}</span>, s.storesCovered, s.transitions, s.durationMs ? `${(s.durationMs / 1000).toFixed(1)} s` : "…"])} />
      </Section>
    </>
  );
}
