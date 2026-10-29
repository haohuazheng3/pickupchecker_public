import { anchorHealth, adminOverview } from "@/lib/admin/queries";
import { requestBuckets, opsLogRows, pollLogRows } from "@/lib/admin/ops";
import { fmtDuration, type Heartbeat } from "@/lib/admin/health";
import { COVERAGE, STORE_INDEX, ALL_PART_NUMBERS } from "@/lib/apple/catalog";
import { Table, timeAgo, Stat, ageMs, isPast } from "@/components/admin/Bits";
import { Section, KV, Chip, Filters } from "@/components/admin/Status";
import { StackedBars, LineChart, PALETTE } from "@/components/admin/Charts";

export default async function AdminPoller({ searchParams }: PageProps<"/admin/poller">) {
  const sp = await searchParams;
  const status = (typeof sp.status === "string" ? sp.status : "all") as "all" | "fail" | "541";
  const [anchors, log, o, req24, events] = await Promise.all([anchorHealth(), pollLogRows({ status, limit: 80 }), adminOverview(), requestBuckets(24, 900), opsLogRows({ source: "poller", limit: 30 })]);
  const byAnchor = new Map(anchors.map((a) => [a.anchor, a]));
  const cfg = o.config?.value as { cadenceSec?: number; concurrency?: number; prefix?: string | null; startedAt?: string; commit?: string; node?: string } | undefined;
  const hb = o.heartbeat?.value as Heartbeat | undefined;
  const eg = o.egress?.value as { used?: number; cooldownUntil?: number } | undefined;
  const sys = hb?.sys;
  const hbAge = ageMs(hb?.at);
  const batches = Math.ceil(ALL_PART_NUMBERS.length / 20);
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Heartbeat" value={hb?.at ? timeAgo(hb.at) : "never"} sub={hb ? `${hb.mode} · ${hb.host} · ${hb.egress} egress` : "no poller yet"} tone={hbAge < 150_000 ? "ok" : hbAge < 600_000 ? "warn" : "bad"} />
        <Stat label="Last sweep" value={hb?.requests != null ? `${hb.requests} req · ${hb.throttled ?? 0} × 541` : "—"} sub={hb ? `${hb.storesCovered} stores · ${hb.transitions ?? 0} transitions · ${hb.durationMs ? (hb.durationMs / 1000).toFixed(1) : "?"} s · ${hb.sweeps ?? "?"} sweeps since start` : ""} tone={hb && hb.requests && (hb.throttled ?? 0) / hb.requests >= 0.25 ? "warn" : undefined} />
        <Stat label="Host" value={sys ? `load ${sys.load1} · ${sys.memTotalMb && sys.memFreeMb != null ? Math.round(((sys.memTotalMb - sys.memFreeMb) / sys.memTotalMb) * 100) : "?"} % mem` : "—"} sub={sys ? `${sys.cpus} vCPU · rss ${sys.rssMb} MB · up ${fmtDuration(sys.uptimeSec)} · proc ${fmtDuration(sys.procUptimeSec)}` : "vitals arrive with the next heartbeat"} />
        <Stat label="Requests / 24h" value={o.reqDay.n} sub={`${o.reqDay.ok} ok · ${o.reqDay.s541} throttled · ${o.reqHour.n} in the last hour (${o.reqHour.avgMs} ms avg)`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Section title="Configuration">
          <KV rows={[
            ["Cadence", cfg?.cadenceSec ? `${cfg.cadenceSec} s per sweep` : "—"],
            ["Concurrency", cfg?.concurrency ?? "—"],
            ["Plan per sweep", `${COVERAGE.length} anchors × ${batches} batches = ${COVERAGE.length * batches} requests · ${ALL_PART_NUMBERS.length} parts`],
            ["IPv6 prefix", <code key="p" className="text-xs">{cfg?.prefix ?? "none (Vercel egress)"}</code>],
            ["IPv6 stats", hb?.ipv6Stats ? `${hb.ipv6Stats.requests} requests · ${hb.ipv6Stats.throttled} throttled · ${hb.ipv6Stats.errors} socket errors (since start)` : "—"],
            ["Adaptive state", hb ? `${hb.consecutiveBad ?? 0} consecutive throttled sweeps (3 → pause 40 s; 90 % × 3 → degraded)` : "—"],
            ["Process", cfg ? `started ${timeAgo(cfg.startedAt ?? null)} · ${cfg.node ?? sys?.node ?? ""} · commit ${cfg.commit ?? sys?.commit ?? "?"} · pid ${sys?.pid ?? "?"}` : "—"],
            ["Vercel egress budget", eg ? `${eg.used ?? 0}/25 used${!isPast(eg.cooldownUntil) ? ` · cooling until ${new Date(eg!.cooldownUntil!).toLocaleTimeString()}` : " · ready"}` : "unused"],
            ["Deploy on host", <code key="u" className="text-xs">ssh root@172.232.3.151 /opt/pickupchecker/update.sh</code>],
          ]} />
        </Section>
        <Section title="Poller events" aside={<a className="underline" href="/admin/logs?t=ops&source=poller">all →</a>}>
          {events.length === 0 ? <p className="text-sm text-ink-3">Nothing logged yet — starts, stops, throttling and mode switches show here.</p> : (
            <ul className="divide-y divide-line text-sm">
              {events.map((e) => <li key={e.id} className="flex gap-3 py-1.5"><span className="w-16 shrink-0 text-ink-3">{timeAgo(e.at)}</span><span className={`w-12 shrink-0 text-xs uppercase ${e.level === "error" ? "text-bad" : e.level === "warn" ? "text-warn" : "text-ink-3"}`}>{e.level}</span><span className="text-ink-2">{e.message}{e.data ? <code className="ml-2 text-xs text-ink-3">{JSON.stringify(e.data).slice(0, 120)}</code> : null}</span></li>)}
            </ul>
          )}
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Requests · last 24 h" aside="per 15 min">
          <StackedBars data={req24} series={[{ key: "ok", label: "ok", color: PALETTE.good }, { key: "s541", label: "541 throttled", color: PALETTE.warning }, { key: "other", label: "other failure", color: PALETTE.critical }]} />
        </Section>
        <Section title="Latency · last 24 h" aside="average ms per call">
          <LineChart data={req24} series={[{ key: "avgMs", label: "avg ms", color: PALETTE.blue }]} unit=" ms" />
        </Section>
      </div>

      <Section title={`Anchors · ${COVERAGE.length} ZIPs cover the country`} aside="last hour · a stale anchor means its ~12 stores stop updating">
        <Table head={["Anchor", "Store", "Covers", "Last OK", "Req/h", "Failures", "Avg ms"]} rows={COVERAGE.map((c) => { const a = byAnchor.get(c.location); const stale = ageMs(a?.last) > 300_000; return [c.location, STORE_INDEX.get(c.anchorStore)?.name ?? c.anchorStore, c.covers.length, <span key="l" className={stale ? "text-warn" : "text-accent"}>{a?.last ? timeAgo(a.last) : "never"}</span>, a?.n ?? 0, <span key="b" className={a?.bad ? "text-warn" : ""}>{a?.bad ?? 0}</span>, a?.avgMs ?? "—"]; })} />
      </Section>

      <Section title="Request log" aside={<a className="underline" href="/admin/logs?t=requests">search & page →</a>}>
        <Filters><Chip href="/admin/poller" on={status === "all"}>All</Chip><Chip href="/admin/poller?status=fail" on={status === "fail"}>Failures</Chip><Chip href="/admin/poller?status=541" on={status === "541"}>541 only</Chip></Filters>
        <Table head={["At", "Egress", "Anchor", "Batch", "HTTP", "ms", "Bytes", "Stores", "Error"]} rows={log.map((r) => [timeAgo(r.at), <code key="e" className="text-xs">{r.egress}</code>, r.anchor, r.batch, <span key="h" className={r.ok ? "text-accent" : "text-bad"}>{r.httpStatus ?? "—"}</span>, r.durationMs, r.bytes, r.storesSeen, r.error])} />
      </Section>
    </>
  );
}
