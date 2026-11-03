import { ago } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/locales";

/** "3m ago", "just now" under 15 s, "never" (client-safe; other languages: "3分前", "vor 3 Min."). */
export function timeAgo(d: Date | string | null | undefined, lang: Lang = "en"): string {
  return ago(lang, d);
}

export function Dot({ state, live }: { state: "ok" | "bad" | "warn" | "idle"; live?: boolean }) {
  const cls = state === "ok" ? "dot-ok" : state === "bad" ? "dot-bad" : state === "warn" ? "dot-warn" : "";
  return <span className={`dot ${cls} ${live ? "dot-live" : ""}`} aria-hidden />;
}

/** Moved to the shared UI primitives; kept here so existing imports keep working. */
export { Skeleton } from "@/components/ui/Skeleton";
