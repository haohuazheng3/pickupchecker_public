"use client";
/**
 * The words of the other-trackers marks (legend entry and footnote) in the page's language. ReportsNote has no
 * hooks, so server modules and the client timeline can both render it; this client part reads the language from
 * the page's LangProvider wherever it is rendered. Props are JSON-safe (a server module hands them over).
 */
import type { ReactNode } from "react";
import { useLang, useT } from "@/components/i18n/LangProvider";
import { Rich } from "@/components/i18n/Rich";
import { LANG_TAG, day, fill, list } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/locales";
import type { CDict } from "@/lib/i18n/cdict/en";
import { andList, reportRange, type ReportSeries } from "@/lib/restockReports";

export type ReportText = Pick<ReportSeries, "sources" | "models" | "from" | "to">;
type Strings = CDict["modules"]["reports"];

/** "Oct 26 – Nov 1" (English: restockReports' own form). */
function range(lang: Lang, r: Pick<ReportText, "from" | "to">): string {
  if (lang === "en") return reportRange(r);
  const d = (ymd: string) => {
    const [y, m, dd] = ymd.split("-").map(Number);
    return day(lang, new Date(Date.UTC(y, m - 1, dd)), "UTC");
  };
  return r.from === r.to ? d(r.from) : `${d(r.from)} – ${d(r.to)}`;
}

/** "Reported by other trackers (Apple Pickup Live, DuoReady), Oct 26 – Nov 1". */
export function ReportLegendText({ reports }: { reports: ReportText }) {
  const s = useT().modules.reports;
  const lang = useLang();
  const names = reports.sources.map((x) => x.name);
  return <>{fill(s.legend, { sources: lang === "en" ? names.join(", ") : list(lang, names, names.length), range: range(lang, reports) })}</>;
}

/** The marks callers name in English, read in the page's language. */
const MARKS: Record<string, keyof Strings> = { Dashed: "markDashed", "Dashed rings": "markDashedRings", "Hollow dots": "markHollowDots" };

/** Each tracker linked, joined as the language joins a list ("A, B and C"); the separator sits in the item's span. */
function linked(lang: Lang, sources: ReportText["sources"]): ReactNode[] {
  const link = (x: ReportText["sources"][number]) => (x.url ? <a href={x.url} target="_blank" rel="nofollow noopener" className="underline decoration-ink/30 underline-offset-2 hover:text-ink">{x.name}</a> : x.name);
  if (lang === "en") {
    return sources.map((x, i) => (
      <span key={x.name}>
        {i > 0 && (i === sources.length - 1 ? " and " : ", ")}
        {link(x)}
      </span>
    ));
  }
  const parts = new Intl.ListFormat(LANG_TAG[lang], { style: "long", type: "conjunction" }).formatToParts(sources.map((_, i) => String(i)));
  const out: ReactNode[] = [];
  let sep = "";
  for (const p of parts) {
    if (p.type === "literal") { sep += p.value; continue; }
    const x = sources[Number(p.value)];
    out.push(<span key={x.name}>{sep}{link(x)}</span>);
    sep = "";
  }
  if (sep) out.push(sep);
  return out;
}

/** The footnote: what the marks are, who published them, and that none of our numbers count them. */
export function ReportsNoteText({ reports, mark }: { reports: ReportText; mark?: string }) {
  const s = useT().modules.reports;
  const lang = useLang();
  const what = reports.models.length ? fill(s.what, { models: lang === "en" ? andList(reports.models) : list(lang, reports.models, reports.models.length) }) : s.whatAny;
  const m = mark == null ? s.markDashed : MARKS[mark] ? s[MARKS[mark]] : mark;
  return (
    <p className="mt-2 text-[11px] leading-relaxed text-ink-3" data-reports-note="">
      <Rich text={s.note} vars={{ mark: m, what, links: linked(lang, reports.sources), range: range(lang, reports) }} />
    </p>
  );
}
