import { timeAgo } from "@/components/stock/StatusBits";

export function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "ok" ? "text-accent" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "";
  return (
    <div className="pane-2 px-4 py-3">
      <div className="text-xs text-ink-3">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: (string | number | null | undefined | React.ReactNode)[][] }) {
  return (
    <div className="min-w-0 overflow-auto rounded-2xl border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-ink/4 text-xs uppercase tracking-wide text-ink-3"><tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-ink-3" colSpan={head.length}>Nothing here.</td></tr>}
          {rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="px-3 py-2 align-top text-ink-2">{c as React.ReactNode}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

/** Age in ms of a timestamp (helper outside components so render stays pure). */
export function ageMs(d: Date | string | null | undefined): number {
  if (!d) return Infinity;
  return Date.now() - new Date(d).getTime();
}
export function isPast(ts: number | undefined | null): boolean {
  return !ts || ts <= Date.now();
}

export { timeAgo };
