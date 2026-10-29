import Link from "next/link";
import type { NodeHealth, NodeState } from "@/lib/admin/health";

const DOT: Record<NodeState, string> = { ok: "bg-accent", warn: "bg-warn", bad: "bg-bad", idle: "bg-ink-3" };
const RING: Record<NodeState, string> = { ok: "shadow-[0_0_0_4px_rgba(53,227,140,.18)]", warn: "shadow-[0_0_0_4px_rgba(255,181,71,.18)]", bad: "shadow-[0_0_0_4px_rgba(255,107,107,.2)]", idle: "" };
export const STATE_LABEL: Record<NodeState, string> = { ok: "Healthy", warn: "Attention", bad: "Down", idle: "Idle" };
const ICON: Record<NodeState, string> = { ok: "✓", warn: "!", bad: "✕", idle: "–" };

export function StateDot({ state, live }: { state: NodeState; live?: boolean }) {
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${DOT[state]} ${RING[state]} ${live && state === "ok" ? "dot-live" : ""}`} aria-hidden />;
}

export function StatePill({ state, label }: { state: NodeState; label?: string }) {
  const cls = state === "ok" ? "bg-accent/15 text-accent" : state === "warn" ? "bg-warn/15 text-warn" : state === "bad" ? "bg-bad/15 text-bad" : "bg-white/8 text-ink-3";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}><span aria-hidden>{ICON[state]}</span>{label ?? STATE_LABEL[state]}</span>;
}

/** One node on the status board: dot + name, the figure, one line of context. */
export function NodeCard({ node }: { node: NodeHealth }) {
  const border = node.state === "bad" ? "border-bad/40" : node.state === "warn" ? "border-warn/40" : "border-line";
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-2"><StateDot state={node.state} live /> {node.name}</div>
        <span className="text-[11px] uppercase tracking-wide text-ink-3">{STATE_LABEL[node.state]}</span>
      </div>
      <div className={`mt-2 text-lg font-semibold leading-tight ${node.state === "bad" ? "text-bad" : node.state === "warn" ? "text-warn" : ""}`}>{node.value}</div>
      <div className="mt-1 text-xs leading-relaxed text-ink-3">{node.detail}</div>
    </>
  );
  const cls = `pane-2 block border p-4 ${border} ${node.href ? "pane-hover" : ""}`;
  return node.href ? <Link href={node.href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

export interface StripCell { t: string; state: NodeState; title: string }

/** 24 h of 5-minute cells: a status-page style uptime bar. */
export function HealthStrip({ label, cells, legend }: { label: string; cells: StripCell[]; legend?: string }) {
  const bad = cells.filter((c) => c.state === "bad").length, warn = cells.filter((c) => c.state === "warn").length;
  const summary = bad ? `${bad} red` : warn ? `${warn} amber` : "all clear";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs"><span className="font-medium text-ink-2">{label}</span><span className="text-ink-3">{legend ? `${legend} · ` : ""}{summary}</span></div>
      <div className="flex h-3.5 gap-px overflow-hidden rounded-md" role="img" aria-label={`${label}: ${summary}`}>
        {cells.map((c) => <span key={c.t} title={c.title} className={`min-w-0 flex-1 ${c.state === "ok" ? "bg-accent/70" : c.state === "warn" ? "bg-warn/80" : c.state === "bad" ? "bg-bad/80" : "bg-white/8"}`} />)}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-3"><span>24 h ago</span><span>now</span></div>
    </div>
  );
}

export function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-line text-sm">
      {rows.map(([k, v]) => <div key={k} className="flex items-start justify-between gap-4 py-1.5"><dt className="shrink-0 text-ink-3">{k}</dt><dd className="min-w-0 break-all text-right text-ink-2">{v}</dd></div>)}
    </dl>
  );
}

export function Section({ title, aside, children, id }: { title: string; aside?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="pane min-w-0 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">{title}</h2>{aside && <div className="text-xs text-ink-3">{aside}</div>}</div>
      {children}
    </section>
  );
}

export function Filters({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-1.5 text-sm">{children}</div>;
}

export function Chip({ href, on, children }: { href: string; on?: boolean; children: React.ReactNode }) {
  return <Link href={href} className="chip px-3 py-1.5 text-xs" data-on={on ? "true" : undefined}>{children}</Link>;
}

export function Pager({ base, page, count, limit }: { base: string; page: number; count: number; limit: number }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-ink-3">
      <span>page {page + 1} · {count} rows</span>
      <span className="flex gap-2">{page > 0 && <Link className="chip px-3 py-1" href={`${base}${sep}page=${page - 1}`}>← Newer</Link>}{count >= limit && <Link className="chip px-3 py-1" href={`${base}${sep}page=${page + 1}`}>Older →</Link>}</span>
    </div>
  );
}
