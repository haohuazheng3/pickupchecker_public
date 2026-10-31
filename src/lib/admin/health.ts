/**
 * Pure health rules for the admin status board: a snapshot of facts in, a list of nodes out.
 * Thresholds live here so the tests and the page agree.
 */
export type NodeState = "ok" | "warn" | "bad" | "idle";

export interface NodeHealth {
  key: string;
  name: string;
  state: NodeState;
  /** Big figure. */
  value: string;
  /** One line under it. */
  detail: string;
  /** Where to look next. */
  href?: string;
}

export interface Heartbeat {
  at?: string; host?: string; mode?: string; cadenceSec?: number; requests?: number; failures?: number; throttled?: number;
  storesCovered?: number; durationMs?: number; egress?: string; transitions?: number; held?: number;
  sys?: { load1?: number; load5?: number; cpus?: number; memTotalMb?: number; memFreeMb?: number; rssMb?: number; uptimeSec?: number; procUptimeSec?: number; node?: string; commit?: string | null; codeHash?: string | null; pid?: number };
  sweeps?: number; consecutiveBad?: number;
  ipv6Stats?: { requests: number; throttled: number; errors: number } | null;
}

export interface HealthSnapshot {
  now: number;
  heartbeat: Heartbeat | null;
  heartbeatUpdatedAt: string | null;
  watchdog: { down?: boolean; since?: string } | null;
  dbLatencyMs: number | null;
  /** The first `select 1` of the request, including any connection set-up. */
  dbConnectMs?: number | null;
  dbError: string | null;
  req15: { n: number; ok: number; s541: number; avgMs: number };
  reqHour: { n: number; ok: number; s541: number; avgMs: number };
  stock: { total: number; available: number; unknown: number; newest: string | null; storesChecked: number; storesStale: number };
  storesTotal: number;
  alerts24: { sent: number; failed: number; pushSent: number; emailSent: number; lastSentAt: string | null; lastFailedAt: string | null };
  push: { configured: boolean; enabled: number; disabled: number; lastSentAt: string | null };
  email: { configured: boolean; lastSentAt: string | null; lastFailedAt: string | null };
  /** missingPermission / permissionsCheckedAt: the live key probe (src/lib/admin/stripeCheck.ts). */
  stripe: { configured: boolean; lastEventAt: string | null; lastEventType: string | null; activeSubs: number; missingPermission?: string | null; permissionsCheckedAt?: string | null };
  cron: { lastTickAt: string | null; ticksHour: number };
  errors24: { open: number; lastAt: string | null };
  inbox: { lastAt: string | null; worker: boolean };
  /** When this build was made (BUILD_AT). */
  deployedAt?: string | null;
  /** pollerCode: fingerprint of the poller code this build was made from (POLLER_CODE_HASH). */
  deploy: { commit: string | null; env: string; region: string | null; node: string; pollerCode?: string | null };
  clerkConfigured: boolean;
}

const MIN = 60_000;

export function ageMs(iso: string | null | undefined, now: number): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? now - t : Infinity;
}

export function fmtAge(ms: number): string {
  if (!Number.isFinite(ms)) return "never";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function fmtDuration(sec: number | undefined | null): string {
  if (!sec && sec !== 0) return "—";
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

export function computeNodes(s: HealthSnapshot): NodeHealth[] {
  const nodes: NodeHealth[] = [];
  const hbAt = s.heartbeat?.at ?? s.heartbeatUpdatedAt;
  const hbAge = ageMs(hbAt, s.now);
  const hb = s.heartbeat;

  // 1. poller process
  nodes.push({
    key: "poller", name: "Poller (Linode)", href: "/admin/poller",
    state: hbAge < 2.5 * MIN ? (hb?.mode === "degraded" ? "warn" : "ok") : hbAge < 10 * MIN ? "warn" : "bad",
    value: hb ? `${hb.mode ?? "?"} · ${fmtAge(hbAge)}` : "no heartbeat",
    detail: hb ? `${hb.host ?? "?"} · every ${hb.cadenceSec ?? "?"} s via ${hb.egress ?? "?"} · last sweep ${hb.requests ?? 0} req, ${hb.storesCovered ?? 0} stores, ${hb.durationMs ? (hb.durationMs / 1000).toFixed(1) : "?"} s · ${hb.held ?? 0} unconfirmed blips held` : "the host has never written a heartbeat",
  });

  // 2. host vitals
  const sys = hb?.sys;
  if (sys) {
    const memUsed = sys.memTotalMb && sys.memFreeMb != null ? sys.memTotalMb - sys.memFreeMb : null;
    const memPct = memUsed != null && sys.memTotalMb ? memUsed / sys.memTotalMb : 0;
    // Judged on the 5-minute load: a dump, a vacuum or an update spikes the 1-minute figure for a moment.
    const load = sys.load5 ?? sys.load1;
    const loadPerCpu = load != null && sys.cpus ? load / sys.cpus : 0;
    nodes.push({
      key: "host", name: "Host vitals", href: "/admin/poller",
      state: hbAge > 10 * MIN ? "idle" : loadPerCpu > 1.5 || memPct > 0.9 ? "bad" : loadPerCpu > 0.8 || memPct > 0.75 ? "warn" : "ok",
      value: `load ${sys.load5 ?? sys.load1 ?? "?"} · mem ${Math.round(memPct * 100)}%`,
      detail: `${sys.cpus ?? "?"} vCPU · ${memUsed ?? "?"}/${sys.memTotalMb ?? "?"} MB · rss ${sys.rssMb ?? "?"} MB · up ${fmtDuration(sys.uptimeSec)} · ${sys.node ?? ""} ${sys.commit ? "@ " + sys.commit : ""}`,
    });
  } else {
    nodes.push({ key: "host", name: "Host vitals", href: "/admin/poller", state: "idle", value: "—", detail: "the poller reports vitals from commit d735966 onward" });
  }

  // 3. Apple API
  const r = s.req15.n ? s.req15 : s.reqHour;
  const share = r.n ? r.s541 / r.n : 0;
  const okShare = r.n ? r.ok / r.n : 0;
  nodes.push({
    key: "apple", name: "Apple pickup API", href: "/admin/poller",
    state: r.n === 0 ? (hbAge < 10 * MIN ? "warn" : "idle") : share >= 0.25 || okShare < 0.7 ? "bad" : share >= 0.05 || okShare < 0.95 ? "warn" : "ok",
    value: r.n ? `${Math.round(okShare * 100)}% ok · ${Math.round(share * 100)}% 541` : "no requests",
    detail: r.n ? `${r.n} requests in the last ${s.req15.n ? 15 : 60} min · ${r.avgMs} ms avg · ${s.reqHour.n} in the last hour` : "nothing polled recently",
  });

  // 4. stock freshness / coverage
  const newestAge = ageMs(s.stock.newest, s.now);
  const coverage = s.storesTotal ? s.stock.storesChecked / s.storesTotal : 0;
  nodes.push({
    key: "stock", name: "Stock freshness", href: "/admin/stock",
    state: newestAge > 10 * MIN ? "bad" : newestAge > 2.5 * MIN || coverage < 0.8 ? "warn" : "ok",
    value: `${s.stock.storesChecked}/${s.storesTotal} stores · ${fmtAge(newestAge)}`,
    detail: `${s.stock.available} configs available · ${s.stock.unknown} rows unknown · ${s.stock.storesStale} stores not confirmed in 30 min`,
  });

  // 5. database
  nodes.push({
    key: "db", name: "Database", href: "/admin/system",
    state: s.dbError ? "bad" : s.dbLatencyMs == null ? "idle" : s.dbLatencyMs > 1500 ? "bad" : s.dbLatencyMs > 400 ? "warn" : "ok",
    value: s.dbError ? "error" : s.dbLatencyMs != null ? `${s.dbLatencyMs} ms` : "—",
    detail: s.dbError ?? `round trip of \`select 1\` on an open connection${s.dbConnectMs != null ? ` · first query ${s.dbConnectMs} ms (includes connecting)` : ""}`,
  });

  // 6. cron watchdog
  const cronAge = ageMs(s.cron.lastTickAt, s.now);
  nodes.push({
    key: "cron", name: "Watchdog cron (Vercel)", href: "/admin/logs?t=ops&source=cron",
    state: cronAge < 3 * MIN ? (s.watchdog?.down ? "warn" : "ok") : cronAge < 15 * MIN ? "warn" : "bad",
    value: s.watchdog?.down ? `degraded since ${fmtAge(ageMs(s.watchdog.since, s.now))}` : `tick ${fmtAge(cronAge)}`,
    detail: `${s.cron.ticksHour} runs in the last hour (expected 60) · switches to serverless polling when the heartbeat is 75 s old, mails when stock checks stop landing`,
  });

  // 7. alerts
  const a = s.alerts24;
  const failShare = a.sent + a.failed ? a.failed / (a.sent + a.failed) : 0;
  nodes.push({
    key: "alerts", name: "Alerts (24 h)", href: "/admin/alerts",
    state: a.sent + a.failed === 0 ? "idle" : failShare > 0.5 ? "bad" : failShare > 0.1 ? "warn" : "ok",
    value: `${a.sent} sent · ${a.failed} failed`,
    detail: `${a.pushSent} push · ${a.emailSent} email · last sent ${fmtAge(ageMs(a.lastSentAt, s.now))}${a.lastFailedAt ? ` · last failure ${fmtAge(ageMs(a.lastFailedAt, s.now))}` : ""}`,
  });

  // 8. push
  nodes.push({
    key: "push", name: "Web Push (VAPID)", href: "/admin/alerts",
    state: !s.push.configured ? "bad" : s.push.enabled === 0 ? "idle" : s.push.disabled > s.push.enabled ? "warn" : "ok",
    value: s.push.configured ? `${s.push.enabled} devices on` : "keys missing",
    detail: s.push.configured ? `${s.push.disabled} stopped by the push service · last push ${fmtAge(ageMs(s.push.lastSentAt, s.now))}` : "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set on this deployment",
  });

  // 9. email
  nodes.push({
    key: "email", name: "Email (Resend)", href: "/admin/alerts?channel=email",
    state: !s.email.configured ? "bad" : s.email.lastFailedAt && ageMs(s.email.lastFailedAt, s.now) < ageMs(s.email.lastSentAt, s.now) ? "warn" : "ok",
    value: s.email.configured ? `last ${fmtAge(ageMs(s.email.lastSentAt, s.now))}` : "key missing",
    detail: s.email.configured ? "fallback channel for users without a device; owner mail goes through the Cloudflare worker first" : "RESEND_API_KEY is not set",
  });

  // 10. stripe
  nodes.push({
    key: "stripe", name: "Stripe", href: "/admin/users",
    state: !s.stripe.configured ? "bad" : s.stripe.missingPermission ? "warn" : "ok",
    value: s.stripe.configured ? (s.stripe.missingPermission ? "key lacks a permission" : `${s.stripe.activeSubs} active`) : "key missing",
    detail: s.stripe.missingPermission
      ? `the API key is missing “${s.stripe.missingPermission}” — plan changes / Billing fail until it is granted in Stripe → Developers → API keys`
      : `${s.stripe.permissionsCheckedAt ? `key has every permission the site uses (checked ${fmtAge(ageMs(s.stripe.permissionsCheckedAt, s.now))}) · ` : ""}${s.stripe.lastEventAt ? `last webhook ${s.stripe.lastEventType ?? ""} ${fmtAge(ageMs(s.stripe.lastEventAt, s.now))}` : "no webhook event received yet"}`,
  });

  // 11. errors
  nodes.push({
    key: "errors", name: "Open errors (24 h)", href: "/admin/errors",
    state: s.errors24.open === 0 ? "ok" : s.errors24.open < 5 ? "warn" : "bad",
    value: String(s.errors24.open),
    detail: s.errors24.lastAt ? `last ${fmtAge(ageMs(s.errors24.lastAt, s.now))} · grouped by fingerprint, resolve them on the Errors page` : "nothing recorded",
  });

  // 12. deploy — is the poller running the poller code this site was built from? Compared by code
  // fingerprint (poller/codeHash.mjs): a commit that only touched pages leaves it current. The host updates
  // itself within ~10 min of a deploy that changes it, so a difference only warns once it outlasts that.
  const siteCommit = s.deploy.commit?.slice(0, 7) ?? null;
  const pollerCommit = sys?.commit ?? null;
  const want = s.deploy.pollerCode || null, have = sys?.codeHash || null;
  const differs = want && have ? want !== have : Boolean(siteCommit && pollerCommit && !siteCommit.startsWith(pollerCommit) && !pollerCommit.startsWith(siteCommit));
  const settling = differs && s.deployedAt != null && ageMs(s.deployedAt, s.now) < 25 * MIN;
  nodes.push({
    key: "deploy", name: "Deploy", href: "/admin/system",
    state: differs && !settling ? "warn" : "ok",
    value: siteCommit ? `site @ ${siteCommit}` : s.deploy.env,
    detail: `${s.deploy.env}${s.deploy.region ? " · " + s.deploy.region : ""} · ${s.deploy.node}${pollerCommit ? ` · poller @ ${pollerCommit}` : ""}${
      !differs ? (want && have ? " · poller code current" : "") : settling ? " · poller updating to this deploy" : " · poller runs older code (auto-update hasn't caught up — see the host's autoupdate log, or run update.sh)"}`,
  });

  // 13. mail worker / inbox
  nodes.push({
    key: "inbox", name: "Mail worker · test@ inbox", href: "/admin/inbox",
    state: !s.inbox.worker ? "warn" : "ok",
    value: s.inbox.lastAt ? `mail ${fmtAge(ageMs(s.inbox.lastAt, s.now))}` : "no mail yet",
    detail: s.inbox.worker ? "Cloudflare Email Routing → worker → /api/inbox/ingest; owner notifications and the 5-min probe use the same worker" : "MAIL_WORKER_URL / TOKEN not set — owner mail falls back to Resend",
  });

  // 14. auth
  nodes.push({ key: "clerk", name: "Auth (Clerk)", href: "/admin/users", state: s.clerkConfigured ? "ok" : "bad", value: s.clerkConfigured ? "configured" : "keys missing", detail: "email-code sign-in with the custom wizard; production instance on pickupchecker.com" });

  return nodes;
}

export const STATE_ORDER: Record<NodeState, number> = { bad: 0, warn: 1, idle: 2, ok: 3 };

export function overallState(nodes: NodeHealth[]): NodeState {
  return nodes.reduce<NodeState>((acc, n) => (STATE_ORDER[n.state] < STATE_ORDER[acc] ? n.state : acc), "ok");
}
