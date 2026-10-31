import { healthSnapshot, tableStats, stateDump } from "@/lib/admin/ops";
import { computeNodes } from "@/lib/admin/health";
import { COVERAGE, ALL_PART_NUMBERS, STORES, MODELS } from "@/lib/apple/catalog";
import { env } from "@/lib/env";
import { Section, KV, StatePill } from "@/components/admin/Status";
import { Table, timeAgo } from "@/components/admin/Bits";

const ENV_KEYS = [
  ["DATABASE_URL", "Postgres on the poller host"], ["DATABASE_URL_UNPOOLED", "Postgres (migrations)"], ["DATABASE_CA", "Postgres TLS CA"], ["CLERK_SECRET_KEY", "Clerk server"], ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "Clerk client"],
  ["STRIPE_SECRET_KEY", "Stripe"], ["STRIPE_WEBHOOK_SECRET", "Stripe webhook"], ["STRIPE_PRICE_MONTHLY", "Stripe price · Plus $5"], ["STRIPE_PRICE_PRO", "Stripe price · Pro $10"], ["STRIPE_PMC_ID", "Stripe payment methods (card + Link)"], ["STRIPE_CONTEXT", "Stripe org context"],
  ["RESEND_API_KEY", "Resend"], ["VAPID_PUBLIC_KEY", "Web Push public"], ["VAPID_PRIVATE_KEY", "Web Push private"], ["VAPID_SUBJECT", "Web Push subject"],
  ["CRON_SECRET", "Vercel Cron bearer"], ["POLLER_TOKEN", "Poller → site bearer"], ["INBOX_INGEST_SECRET", "Worker → inbox bearer"], ["MAIL_WORKER_URL", "Mail worker"], ["MAIL_WORKER_TOKEN", "Mail worker bearer"],
  ["GITHUB_WEBHOOK_SECRET", "Actions → deploy-hook fallback"], ["VERCEL_DEPLOY_HOOK_URL", "Vercel deploy hook"], ["ADMIN_PASSWORD", "This console"], ["ADMIN_SESSION_SECRET", "Console session signing"],
  ["ADMIN_EMAILS", "Clerk admin whitelist"], ["OWNER_EMAIL", "Owner notifications"], ["NEXT_PUBLIC_SITE_URL", "Canonical URL"], ["NEXT_PUBLIC_INDEXABLE", "robots index"], ["NEXT_PUBLIC_FLOWGLANCE_KEY", "Analytics"],
] as const;

function bytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
}

export default async function AdminSystem() {
  const [snap, tables, state] = await Promise.all([healthSnapshot(), tableStats(), stateDump()]);
  const nodes = computeNodes(snap);
  const integrations = nodes.filter((n) => ["db", "cron", "push", "email", "stripe", "inbox", "clerk", "deploy"].includes(n.key));
  const batches = Math.ceil(ALL_PART_NUMBERS.length / 20);
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="This deployment">
          <KV rows={[
            ["Environment", `${snap.deploy.env}${snap.deploy.region ? ` · ${snap.deploy.region}` : ""}`],
            ["Site commit", <code key="c" className="text-xs">{snap.deploy.commit ?? "local checkout"}</code>],
            ["Poller commit", <code key="p" className="text-xs">{snap.heartbeat?.sys?.commit ?? "—"}</code>],
            ["Node", `${snap.deploy.node} (site) · ${snap.heartbeat?.sys?.node ?? "—"} (poller)`],
            ["Site URL", env.siteUrl()],
            ["Indexing", env.indexable() ? "open to search engines" : "noindex (robots disallow all)"],
            ["Build path", "GitHub Actions prebuilt → Vercel; when Actions is out of minutes the Actions failure webhook fires the Vercel deploy hook and Vercel builds"],
            ["Poller host", "Linode Nanode (us-ord) · systemd pickupchecker-poller · routed IPv6 /56 via AnyIP"],
          ]} />
        </Section>
        <Section title="Operating parameters" aside="constants in code unless noted">
          <KV rows={[
            ["Sweep cadence", `${snap.heartbeat?.cadenceSec ?? 20} s (CADENCE_SEC on the host)`],
            ["Requests per sweep", `${COVERAGE.length} anchor ZIPs × ${batches} part batches = ${COVERAGE.length * batches}`],
            ["Catalog", `${ALL_PART_NUMBERS.length} configurations across ${MODELS.length} models · ${STORES.length} stores`],
            ["Apple throttle", "≈ 50–70 requests per IP then HTTP 541 for ~30 min → one fresh IPv6 address per request"],
            ["Adaptive backoff", "541 share ≥ 25 % for 3 sweeps → +40 s pause and an owner email; ≥ 90 % → degraded (Vercel egress, 25 req / 35 min), probe full mode every 15 min"],
            ["Stale → unknown", "a status not confirmed for 30 min becomes unknown (never 'sold out' by silence)"],
            ["Heartbeat thresholds", "health: 150 s · watchdog: 120 s → degraded mode + owner email, reminders every 3 h"],
            ["Plans", "no free alerts · Plus $5/mo 10 rules · Pro $10/mo 20 rules · the oldest rules within the limit send; extra ones are saved but silent · hard cap 30 saved"],
            ["Alert rules", "push to every enabled device, else email · one per (rule, event) · 30 min cool-down per rule × store × SKU · push TTL 600 s"],
            ["Rate limits", "alerts API 30/h per user · push subscribe 30/h · push test 10/h · console login 10 per 15 min per IP"],
            ["Console session", "30 days, HMAC-signed cookie; rotate ADMIN_SESSION_SECRET to sign everyone out"],
          ]} />
        </Section>
      </div>

      <Section title="Integrations">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {integrations.map((n) => <div key={n.key} className="pane-2 p-3"><div className="flex items-center justify-between gap-2 text-sm font-medium">{n.name}<StatePill state={n.state} /></div><div className="mt-1 text-sm">{n.value}</div><div className="mt-0.5 text-xs text-ink-3">{n.detail}</div></div>)}
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Environment variables" aside="presence only — values are never shown">
          <Table head={["Variable", "Used for", "Set"]} rows={ENV_KEYS.map(([k, use]) => [<code key="k" className="text-xs">{k}</code>, use, process.env[k] ? <span key="s" className="text-accent">yes</span> : <span key="s" className="text-bad">missing</span>])} />
        </Section>
        <Section title="Database" aside={`${bytes(tables.dbBytes)} total · 25 GB disk on the poller host`}>
          <Table head={["Table", "Rows (est.)", "Size"]} rows={tables.tables.sort((a, b) => b.bytes - a.bytes).map((t) => [<code key="n" className="text-xs">{t.name}</code>, t.est.toLocaleString(), bytes(t.bytes)])} />
          <p className="mt-2 text-xs text-ink-3">poll_log grows ~380 k rows/day at 15 s cadence; prune rows older than 7 days if the size matters.</p>
          <h3 className="mt-4 text-sm font-semibold">Migrations</h3>
          <ul className="mt-1 text-xs text-ink-2">{tables.migrations.map((m) => <li key={m.name} className="flex justify-between py-0.5"><code>{m.name}</code><span className="text-ink-3">{timeAgo(m.applied_at)}</span></li>)}</ul>
        </Section>
      </div>

      <Section title="Stored state" aside="poller_state / app_state, as the poller and the watchdog wrote them">
        <div className="grid gap-3 md:grid-cols-2">
          {[...state.poller.map((r) => ({ ...r, table: "poller_state" })), ...state.app.map((r) => ({ ...r, table: "app_state" }))].map((r) => (
            <div key={`${r.table}:${r.key}`} className="pane-2 p-3"><div className="flex items-center justify-between text-xs"><code>{r.table} · {r.key}</code><span className="text-ink-3">{timeAgo(r.updatedAt)}</span></div><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[11px] text-ink-2">{JSON.stringify(r.value, null, 1)}</pre></div>
          ))}
        </div>
      </Section>
    </>
  );
}
