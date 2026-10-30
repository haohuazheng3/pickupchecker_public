"use client";
/**
 * A timestamp in the reader's own time zone: "Today 5:42 PM", "Yesterday 9:03 AM", "Oct 29, 5:42 PM".
 * Server-rendered as a relative time, swapped after hydration (so the HTML never depends on the server's zone).
 */
import { useEffect, useState } from "react";
import { timeAgo } from "@/components/stock/StatusBits";
import { LiveAgo } from "./LiveAgo";

export function formatLocal(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay) return `Today ${time}`;
  if (d.toDateString() === y.toDateString()) return `Yesterday ${time}`;
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
  return `${date}, ${time}`;
}

export function LocalTime({ iso, withAgo = true, className = "" }: { iso: string; withAgo?: boolean; className?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setText(formatLocal(iso)), 0);
    return () => window.clearTimeout(t);
  }, [iso]);
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text ?? timeAgo(iso)}
      {text && withAgo && <span className="text-ink-3"> · <LiveAgo iso={iso} /></span>}
    </time>
  );
}
