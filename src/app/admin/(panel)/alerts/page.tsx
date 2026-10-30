import { alertBuckets, notificationRows, pushDevices, watchesTable } from "@/lib/admin/ops";
import { PART_INDEX, STORE_INDEX, MODELS } from "@/lib/apple/catalog";
import { platformLabel, type Platform } from "@/lib/push/platform";
import { Section, Chip, Filters, Pager } from "@/components/admin/Status";
import { StackedBars } from "@/components/admin/Charts";
import { PALETTE } from "@/lib/admin/palette";
import { Table, timeAgo, Stat } from "@/components/admin/Bits";

export default async function AdminAlerts({ searchParams }: PageProps<"/admin/alerts">) {
  const sp = await searchParams;
  const channel = typeof sp.channel === "string" ? sp.channel : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Number(sp.page ?? 0) || 0;
  const [buckets, rows, devices, watches] = await Promise.all([alertBuckets(24, 3600), notificationRows({ channel: channel || undefined, status: status || undefined, limit: 60, page }), pushDevices(200), watchesTable(200)]);
  const sent = buckets.reduce((n, b) => n + Number(b.pushSent) + Number(b.emailSent), 0), failed = buckets.reduce((n, b) => n + Number(b.failed), 0);
  const enabled = devices.filter((d) => !d.d.disabledAt).length;
  const base = `/admin/alerts?channel=${channel}&status=${status}`;
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Alerts / 24h" value={sent} sub={`${failed} failed`} tone={failed > sent ? "bad" : failed ? "warn" : "ok"} />
        <Stat label="Push devices" value={enabled} sub={`${devices.length - enabled} stopped · ${devices.filter((d) => d.d.standalone).length} installed as Home Screen app`} />
        <Stat label="Active alert rules" value={watches.filter((w) => w.w.active && !w.w.paused).length} sub={`${watches.filter((w) => w.w.paused).length} paused · ${watches.filter((w) => !w.w.active).length} deleted · ${watches.filter((w) => w.w.active && ["active", "trialing", "past_due"].includes(w.subStatus ?? "")).length} covered by a subscription`} />
        <Stat label="Rules by model" value={MODELS.map((m) => `${m.short} ${watches.filter((w) => w.w.active && w.w.model === m.key).length}`).join(" · ")} />
      </section>
      <Section title="Alerts · last 24 h" aside="hourly · push first, email only for users without a device">
        <StackedBars data={buckets} series={[{ key: "pushSent", label: "push sent", color: PALETTE.blue }, { key: "emailSent", label: "email sent", color: PALETTE.aqua }, { key: "failed", label: "failed", color: PALETTE.critical }]} />
      </Section>
      <Section title="Delivery log">
        <Filters>
          <Chip href={`/admin/alerts?status=${status}`} on={!channel}>All channels</Chip><Chip href={`/admin/alerts?channel=push&status=${status}`} on={channel === "push"}>Push</Chip><Chip href={`/admin/alerts?channel=email&status=${status}`} on={channel === "email"}>Email</Chip>
          <span className="mx-1 text-ink-3">·</span>
          <Chip href={`/admin/alerts?channel=${channel}`} on={!status}>Any status</Chip><Chip href={`/admin/alerts?channel=${channel}&status=sent`} on={status === "sent"}>Sent</Chip><Chip href={`/admin/alerts?channel=${channel}&status=failed`} on={status === "failed"}>Failed</Chip>
        </Filters>
        <Table head={["At", "To", "Channel", "Item", "Store", "Status", "Latency", "Provider id / error"]} rows={rows.map(({ n, email }) => { const i = PART_INDEX.get(n.partNumber); const s = STORE_INDEX.get(n.storeNumber); return [timeAgo(n.createdAt), email, n.channel, i ? `${i.model} ${i.storage} ${i.color}` : n.partNumber, s?.name ?? n.storeNumber, <span key="s" className={n.status === "sent" ? "text-accent" : "text-bad"}>{n.status}</span>, n.latencyMs ? `${n.latencyMs} ms` : "—", <span key="e" className="break-all text-xs">{n.error ?? n.providerId}</span>]; })} />
        <Pager base={base} page={page} count={rows.length} limit={60} />
      </Section>
      <Section title="Push devices" aside="a stopped device was rejected by Apple/Google (404/410): the user has to turn notifications on again">
        <Table head={["Added", "User", "Platform", "Installed", "Last alert", "State", "Last error", "Agent"]} rows={devices.map(({ d, email }) => [timeAgo(d.createdAt), email, platformLabel(d.platform as Platform), d.standalone ? "Home Screen" : "browser", d.lastSentAt ? timeAgo(d.lastSentAt) : "—", d.disabledAt ? <span key="s" className="text-bad">stopped {timeAgo(d.disabledAt)}</span> : <span key="s" className="text-accent">on</span>, <span key="e" className="text-xs">{d.lastError}</span>, <span key="u" className="text-xs text-ink-3">{d.userAgent?.slice(0, 60)}</span>])} />
      </Section>
      <Section title="Alert rules">
        <Table head={["Created", "User", "Model", "Storage", "Color", "Where", "State", "Subscription"]} rows={watches.map(({ w, email, subStatus }) => [timeAgo(w.createdAt), email, w.model, w.storages.length ? w.storages.join("/") : "any", w.colors.length ? w.colors.join("/") : "any", w.storeNumbers.length ? `${w.storeNumbers.length} stores` : w.zip ? `${w.radiusMiles ?? 50} mi of ${w.zip}` : "all US", !w.active ? "deleted" : w.paused ? "paused" : <span key="s" className="text-accent">active</span>, subStatus ?? "none"])} />
      </Section>
    </>
  );
}
