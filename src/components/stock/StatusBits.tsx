export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "never";
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function Dot({ state, live }: { state: "ok" | "bad" | "warn" | "idle"; live?: boolean }) {
  const cls = state === "ok" ? "dot-ok" : state === "bad" ? "dot-bad" : state === "warn" ? "dot-warn" : "";
  return <span className={`dot ${cls} ${live ? "dot-live" : ""}`} aria-hidden />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}
