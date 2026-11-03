/**
 * The marks every restock module uses for other trackers' reports (src/lib/restockReports.ts): a hollow, dashed
 * swatch, the legend entries, and the footnote linking the trackers' home pages. No hooks: server modules and
 * the client timeline both render it (the words come from ReportsText, a client part that reads the page's language).
 */
import type { ReportSeries } from "@/lib/restockReports";
import { ReportLegendText, ReportsNoteText, type ReportText } from "./ReportsText";

/** What these components need of a series (all JSON-safe, so a server page can hand it to a client component). */
export type ReportMeta = Pick<ReportSeries, "sources" | "models" | "from" | "to">;

/** Hollow and dashed: the reports' mark in every chart (ours are solid). */
export const REPORT_MARK = "border-[1.5px] border-dashed border-ink/45";

/** Only what the words need crosses to the client part (a full series carries its histograms and slots). */
const text = (r: ReportMeta): ReportText => ({ sources: r.sources, models: r.models, from: r.from, to: r.to });

export function ReportSwatch({ round = false }: { round?: boolean }) {
  return <span aria-hidden className={`inline-block h-2.5 w-2.5 shrink-0 ${round ? "rounded-full" : "rounded-sm"} ${REPORT_MARK}`} />;
}

/** The legend entry: "Reported by other trackers (Apple Pickup Live, DuoReady), Oct 26 – Nov 1". */
export function ReportLegendItem({ reports, round }: { reports: ReportMeta; round?: boolean }) {
  return <span className="inline-flex items-center gap-1.5" data-series="reported"><ReportSwatch round={round} /><ReportLegendText reports={text(reports)} /></span>;
}

/**
 * The footnote under a module that draws reports: what they are, who published them, and that we do not count them.
 * `mark` names how the chart draws them; "Dashed" (the default), "Dashed rings" and "Hollow dots" are read in the
 * page's language.
 */
export function ReportsNote({ reports, mark }: { reports: ReportMeta; mark?: string }) {
  return <ReportsNoteText reports={text(reports)} mark={mark} />;
}
