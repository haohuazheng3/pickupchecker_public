import { opsLogRows, pollLogRows, notificationRows, sweepRows, stripeEventRows } from "@/lib/admin/ops";
import { COVERAGE, PART_INDEX, STORE_INDEX } from "@/lib/apple/catalog";
import { Section, Chip, Filters, Pager } from "@/components/admin/Status";
import { Table, timeAgo } from "@/components/admin/Bits";

type Tab = "ops" | "requests" | "alerts" | "sweeps" | "stripe";
const TABS: [Tab, string][] = [["ops", "Ops events"], ["requests", "Apple requests"], ["alerts", "Alert deliveries"], ["sweeps", "Sweeps"], ["stripe", "Stripe webhooks"]];
const LIMIT = 100;

/** Every log the system writes, filterable and paged. Newest first. */
export default async function AdminLogs({ searchParams }: PageProps<"/admin/logs">) {
  const sp = await searchParams;
  const t = (TABS.find(([k]) => k === sp.t)?.[0] ?? "ops") as Tab;
  const page = Number(sp.page ?? 0) || 0;
  const q = (k: string) => (typeof sp[k] === "string" ? String(sp[k]) : "");
  const base = `/admin/logs?t=${t}` + ["level", "source", "status", "anchor", "egress", "channel"].filter((k) => q(k)).map((k) => `&${k}=${encodeURIComponent(q(k))}`).join("");
  return (
    <>
      <Filters>{TABS.map(([k, label]) => <Chip key={k} href={`/admin/logs?t=${k}`} on={t === k}>{label}</Chip>)}</Filters>

      {t === "ops" && (
        <Section title="Ops events" aside="poller lifecycle, throttling, watchdog, admin logins · debug rows are the per-minute watchdog ticks">
          <Filters>
            <Chip href={`/admin/logs?t=ops&source=${q("source")}`} on={!q("level")}>Info+</Chip><Chip href={`/admin/logs?t=ops&level=warn&source=${q("source")}`} on={q("level") === "warn"}>Warn+</Chip><Chip href={`/admin/logs?t=ops&level=error&source=${q("source")}`} on={q("level") === "error"}>Errors</Chip><Chip href={`/admin/logs?t=ops&level=debug&source=${q("source")}`} on={q("level") === "debug"}>Everything</Chip>
            <span className="mx-1 text-ink-3">·</span>
            {["", "poller", "web", "cron", "worker"].map((s) => <Chip key={s || "all"} href={`/admin/logs?t=ops&level=${q("level")}&source=${s}`} on={q("source") === s}>{s || "All sources"}</Chip>)}
          </Filters>
          <OpsTable level={q("level")} source={q("source")} page={page} base={base} />
        </Section>
      )}
      {t === "requests" && (
        <Section title="Apple requests" aside="one row per pickup-message call">
          <Filters>
            {(["all", "ok", "fail", "541"] as const).map((s) => <Chip key={s} href={`/admin/logs?t=requests&status=${s}&anchor=${q("anchor")}&egress=${q("egress")}`} on={(q("status") || "all") === s}>{s === "all" ? "All" : s === "ok" ? "OK" : s === "fail" ? "Failures" : "541 only"}</Chip>)}
            <span className="mx-1 text-ink-3">·</span>
            <Chip href={`/admin/logs?t=requests&status=${q("status")}&anchor=${q("anchor")}`} on={!q("egress")}>Any egress</Chip><Chip href={`/admin/logs?t=requests&status=${q("status")}&anchor=${q("anchor")}&egress=ipv6`} on={q("egress") === "ipv6"}>IPv6</Chip><Chip href={`/admin/logs?t=requests&status=${q("status")}&anchor=${q("anchor")}&egress=vercel`} on={q("egress") === "vercel"}>Vercel</Chip>
            <form className="ml-auto flex items-center gap-1" action="/admin/logs" method="get"><input type="hidden" name="t" value="requests" /><input type="hidden" name="status" value={q("status")} /><input type="hidden" name="egress" value={q("egress")} />
              <select name="anchor" defaultValue={q("anchor")} className="input w-auto py-1.5 text-xs"><option value="">Any anchor</option>{COVERAGE.map((c) => <option key={c.location} value={c.location}>{c.location} · {STORE_INDEX.get(c.anchorStore)?.name}</option>)}</select>
              <button className="chip px-3 py-1.5 text-xs" type="submit">Filter</button></form>
          </Filters>
          <RequestsTable status={(q("status") || "all") as "all" | "ok" | "fail" | "541"} anchor={q("anchor")} egress={q("egress")} page={page} base={base} />
        </Section>
      )}
      {t === "alerts" && (
        <Section title="Alert deliveries">
          <Filters>{["", "push", "email"].map((c) => <Chip key={c || "all"} href={`/admin/logs?t=alerts&channel=${c}&status=${q("status")}`} on={q("channel") === c}>{c || "All channels"}</Chip>)}<span className="mx-1 text-ink-3">·</span>{["", "sent", "failed"].map((s) => <Chip key={s || "any"} href={`/admin/logs?t=alerts&channel=${q("channel")}&status=${s}`} on={q("status") === s}>{s || "Any status"}</Chip>)}</Filters>
          <AlertsTable channel={q("channel")} status={q("status")} page={page} base={base} />
        </Section>
      )}
      {t === "sweeps" && <Section title="Sweeps" aside="one row per full pass"><SweepsTable page={page} base={base} /></Section>}
      {t === "stripe" && <Section title="Stripe webhook events" aside="ids are stored for idempotency; payloads are not kept"><StripeTable page={page} base={base} /></Section>}
    </>
  );
}

async function OpsTable({ level, source, page, base }: { level: string; source: string; page: number; base: string }) {
  const rows = await opsLogRows({ level: level || undefined, source: source || undefined, limit: LIMIT, page });
  return (<><Table head={["At", "Source", "Level", "Message", "Data"]} rows={rows.map((e) => [<span key="t" title={e.at.toISOString()}>{timeAgo(e.at)}</span>, e.source, <span key="l" className={e.level === "error" ? "text-bad" : e.level === "warn" ? "text-warn" : e.level === "debug" ? "text-ink-3" : ""}>{e.level}</span>, e.message, <code key="d" className="text-xs">{JSON.stringify(e.data ?? {}).slice(0, 240)}</code>])} /><Pager base={base} page={page} count={rows.length} limit={LIMIT} /></>);
}
async function RequestsTable({ status, anchor, egress, page, base }: { status: "all" | "ok" | "fail" | "541"; anchor: string; egress: string; page: number; base: string }) {
  const rows = await pollLogRows({ status, anchor: anchor || undefined, egress: egress || undefined, limit: LIMIT, page });
  return (<><Table head={["At", "Sweep", "Egress", "Anchor", "Batch", "HTTP", "ms", "Bytes", "Stores", "Error"]} rows={rows.map((r) => [<span key="t" title={r.at.toISOString()}>{timeAgo(r.at)}</span>, <code key="s" className="text-xs">{r.sweepId?.slice(0, 8)}</code>, <code key="e" className="text-xs">{r.egress}</code>, r.anchor, r.batch, <span key="h" className={r.ok ? "text-accent" : "text-bad"}>{r.httpStatus ?? "—"}</span>, r.durationMs, r.bytes, r.storesSeen, r.error])} /><Pager base={base} page={page} count={rows.length} limit={LIMIT} /></>);
}
async function AlertsTable({ channel, status, page, base }: { channel: string; status: string; page: number; base: string }) {
  const rows = await notificationRows({ channel: channel || undefined, status: status || undefined, limit: LIMIT, page });
  return (<><Table head={["At", "To", "Channel", "Item", "Store", "Status", "Latency", "Provider id / error"]} rows={rows.map(({ n, email }) => { const i = PART_INDEX.get(n.partNumber); const s = STORE_INDEX.get(n.storeNumber); return [timeAgo(n.createdAt), email, n.channel, i ? `${i.model} ${i.storage} ${i.color}` : n.partNumber, s?.name ?? n.storeNumber, <span key="s" className={n.status === "sent" ? "text-accent" : "text-bad"}>{n.status}</span>, n.latencyMs ? `${n.latencyMs} ms` : "—", <span key="e" className="break-all text-xs">{n.error ?? n.providerId}</span>]; })} /><Pager base={base} page={page} count={rows.length} limit={LIMIT} /></>);
}
async function SweepsTable({ page, base }: { page: number; base: string }) {
  const rows = await sweepRows({ limit: LIMIT, page });
  return (<><Table head={["Started", "Id", "Mode", "Host", "Requests", "Failures", "Stores", "Transitions", "Duration"]} rows={rows.map((s) => [<span key="t" title={s.startedAt.toISOString()}>{timeAgo(s.startedAt)}</span>, <code key="i" className="text-xs">{s.id.slice(0, 8)}</code>, s.mode, s.host, s.requests, <span key="f" className={s.failures ? "text-warn" : ""}>{s.failures}</span>, s.storesCovered, s.transitions, s.durationMs ? `${(s.durationMs / 1000).toFixed(1)} s` : "…"])} /><Pager base={base} page={page} count={rows.length} limit={LIMIT} /></>);
}
async function StripeTable({ page, base }: { page: number; base: string }) {
  const rows = await stripeEventRows({ limit: LIMIT, page });
  return (<><Table head={["Received", "Event id", "Type"]} rows={rows.map((e) => [timeAgo(e.receivedAt), <code key="i" className="text-xs">{e.id}</code>, e.type])} /><Pager base={base} page={page} count={rows.length} limit={LIMIT} /></>);
}
