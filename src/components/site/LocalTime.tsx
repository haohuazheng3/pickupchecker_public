"use client";
/**
 * A timestamp in the reader's own time zone: "Today 5:42 PM", "Yesterday 9:03 AM", "Oct 29, 5:42 PM".
 * Server-rendered as a relative time, swapped after hydration (so the HTML never depends on the server's zone).
 */
import { useEffect, useState } from "react";
import { timeAgo } from "@/components/stock/StatusBits";
import { LiveAgo } from "./LiveAgo";
import { useLang, useT } from "@/components/i18n/LangProvider";
import { ago, fill, LANG_TAG } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/locales";

/** English: the reader's own locale for the clock (as always); another language: that language's. */
export function formatLocal(iso: string, now = new Date(), lang: Lang = "en", words = { today: "Today {time}", yesterday: "Yesterday {time}" }): string {
  const d = new Date(iso);
  const tag = lang === "en" ? undefined : LANG_TAG[lang];
  const time = d.toLocaleTimeString(tag, { hour: "numeric", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay) return fill(words.today, { time });
  if (d.toDateString() === y.toDateString()) return fill(words.yesterday, { time });
  const date = d.toLocaleDateString(tag, { month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
  return `${date}, ${time}`;
}

export function LocalTime({ iso, withAgo = true, className = "" }: { iso: string; withAgo?: boolean; className?: string }) {
  const lang = useLang();
  const words = useT().chrome.time;
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setText(formatLocal(iso, new Date(), lang, words)), 0);
    return () => window.clearTimeout(t);
  }, [iso, lang, words]);
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text ?? (lang === "en" ? timeAgo(iso) : ago(lang, iso))}
      {text && withAgo && <span className="text-ink-3"> · <LiveAgo iso={iso} /></span>}
    </time>
  );
}
