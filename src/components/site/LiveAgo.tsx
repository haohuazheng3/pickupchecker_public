"use client";
/**
 * "checked 7s ago", ticking every second. The number is the proof of the 20-second sweep, so it is
 * never rounded away to "just now". Server-rendered with the same formatter; the client takes over
 * on mount (suppressHydrationWarning covers the second that passes in between).
 */
import { useEffect, useState } from "react";

export function formatAgo(d: Date | string | null | undefined, now: number): string {
  if (!d) return "never";
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function LiveAgo({ iso, className = "", never = "never" }: { iso: Date | string | null | undefined; className?: string; never?: string }) {
  const value = iso instanceof Date ? iso.toISOString() : iso ?? null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!value) return <span className={className}>{never}</span>;
  return <span className={`tabular-nums ${className}`} suppressHydrationWarning>{formatAgo(value, now)}</span>;
}
