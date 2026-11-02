/**
 * The marks every restock module uses for other trackers' reports (src/lib/restockReports.ts): a hollow, dashed
 * swatch, the legend entries, and the footnote linking the trackers' home pages. No hooks: server modules and
 * the client timeline both render it.
 */
import { andList, reportLegend, reportRange, type ReportSeries } from "@/lib/restockReports";

/** What these components need of a series (all JSON-safe, so a server page can hand it to a client component). */
export type ReportMeta = Pick<ReportSeries, "sources" | "models" | "from" | "to">;

/** Hollow and dashed: the reports' mark in every chart (ours are solid). */
export const REPORT_MARK = "border-[1.5px] border-dashed border-ink/45";

export function ReportSwatch({ round = false }: { round?: boolean }) {
  return <span aria-hidden className={`inline-block h-2.5 w-2.5 shrink-0 ${round ? "rounded-full" : "rounded-sm"} ${REPORT_MARK}`} />;
}

/** The legend entry: "Reported by other trackers (Apple Pickup Live, DuoReady), Oct 26 – Nov 1". */
export function ReportLegendItem({ reports, round }: { reports: ReportMeta; round?: boolean }) {
  return <span className="inline-flex items-center gap-1.5" data-series="reported"><ReportSwatch round={round} />{reportLegend(reports)}</span>;
}

/** The footnote under a module that draws reports: what they are, who published them, and that we do not count them. */
export function ReportsNote({ reports, mark = "Dashed" }: { reports: ReportMeta; mark?: string }) {
  const what = reports.models.length ? `${andList(reports.models)} restocks` : "restocks";
  const links = reports.sources.map((s, i) => (
    <span key={s.name}>
      {i > 0 && (i === reports.sources.length - 1 ? " and " : ", ")}
      {s.url ? <a href={s.url} target="_blank" rel="nofollow noopener" className="underline decoration-ink/30 underline-offset-2 hover:text-ink">{s.name}</a> : s.name}
    </span>
  ));
  return (
    <p className="mt-2 text-[11px] leading-relaxed text-ink-3" data-reports-note="">
      {mark}: {what} published by {links} for {reportRange(reports)}. They are those sites&apos; observations, not restocks PickupChecker confirmed, and none of our numbers count them.
    </p>
  );
}
