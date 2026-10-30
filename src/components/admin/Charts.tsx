"use client";
/**
 * Small, dependency-free SVG charts for the admin panel. Marks follow the data-viz house rules:
 * thin bars (≤ 24 px) with a 2 px surface gap between segments, 2 px lines, ≥ 8 px markers, a
 * legend whenever there are two or more series, hairline gridlines, and a hover readout that
 * lists every series at the hovered bucket (values first).
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

export interface Series { key: string; label: string; color: string }
export interface Point { t: string; [k: string]: number | string }

import { PALETTE } from "@/lib/admin/palette";
export { PALETTE };

const PAD = { l: 40, r: 8, t: 10, b: 22 };
const GRID = "var(--chart-grid)";
const INK3 = "var(--chart-ink)";

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => { const cw = entries[0]?.contentRect.width; if (cw) setW(Math.max(240, Math.floor(cw))); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Server components can't pass functions to this client module, so formats are named. */
export type Format = "compact" | "fixed1" | "int";
const FORMATS: Record<Format, (v: number) => string> = { compact: (v) => compact(v), fixed1: (v) => v.toFixed(1), int: (v) => String(Math.round(v)) };

export function compact(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  const n = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return n * p;
}

const noSubscribe = () => () => {};
/** False while the server renders and the page hydrates, true after: clock labels are the reader's time zone, which the server cannot know. */
function useIsClient(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fullTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {series.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />{s.label}</span>)}
    </div>
  );
}

function Tooltip({ x, w, title, rows }: { x: number; w: number; title: string; rows: { label: string; value: string; color: string }[] }) {
  const left = x > w * 0.6;
  return (
    <div className="pointer-events-none absolute top-0 z-10 rounded-xl border border-line bg-[var(--pane-solid)] px-3 py-2 text-xs shadow-xl" style={left ? { right: w - x + 10 } : { left: x + 10 }}>
      <div className="text-ink-3">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="mt-0.5 flex items-center gap-2"><span className="inline-block h-0.5 w-3 rounded" style={{ background: r.color }} /><span className="font-semibold text-ink">{r.value}</span><span className="text-ink-3">{r.label}</span></div>
      ))}
    </div>
  );
}

/** Stacked columns per bucket; hover a column for every series' value. */
export function StackedBars({ data, series, height = 170, format: fmtName = "compact", unit = "", maxValue }: { data: Point[]; series: Series[]; height?: number; format?: Format; unit?: string; maxValue?: number }) {
  const format = FORMATS[fmtName];
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const client = useIsClient();
  const n = data.length;
  const plotW = w - PAD.l - PAD.r, plotH = height - PAD.t - PAD.b;
  const totals = data.map((d) => series.reduce((a, s) => a + Number(d[s.key] ?? 0), 0));
  const max = niceMax(maxValue ?? Math.max(1, ...totals));
  const slot = n ? plotW / n : plotW;
  const bw = Math.max(2, Math.min(24, slot - 2));
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left) - PAD.l) / slot);
    setHover(i >= 0 && i < n ? i : null);
  };
  return (
    <div ref={ref} className="relative">
      <Legend series={series} />
      <svg width={w} height={height} className="block overflow-visible" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={series.map((s) => s.label).join(", ")}>
        {ticks.map((t) => <g key={t}><line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} style={{ stroke: GRID }} /><text x={PAD.l - 6} y={y(t) + 3} fontSize="10" style={{ fill: INK3 }} textAnchor="end">{format(t)}{unit}</text></g>)}
        {data.map((d, i) => {
          let acc = 0;
          const x = PAD.l + i * slot + (slot - bw) / 2;
          return (
            <g key={d.t} opacity={hover == null || hover === i ? 1 : 0.55}>
              {series.map((s) => {
                const v = Number(d[s.key] ?? 0);
                if (v <= 0) return null;
                const y1 = y(acc + v), y0 = y(acc);
                acc += v;
                const h = Math.max(1, y0 - y1 - 2);
                const isTop = acc >= totals[i];
                return <rect key={s.key} x={x} y={y1 + (isTop ? 0 : 1)} width={bw} height={h} rx={isTop ? 3 : 0} style={{ fill: s.color }} />;
              })}
              {i % labelEvery === 0 && <text x={x + bw / 2} y={height - 6} fontSize="10" style={{ fill: INK3 }} textAnchor="middle">{client ? hhmm(d.t) : ""}</text>}
            </g>
          );
        })}
        {hover != null && <rect x={PAD.l + hover * slot} y={PAD.t} width={slot} height={plotH} style={{ fill: "var(--fill-2)" }} />}
      </svg>
      {hover != null && data[hover] && (
        <Tooltip x={PAD.l + hover * slot + slot / 2} w={w} title={fullTime(data[hover].t)} rows={[...series.map((s) => ({ label: s.label, value: format(Number(data[hover][s.key] ?? 0)) + unit, color: s.color })), ...(series.length > 1 ? [{ label: "total", value: format(totals[hover]) + unit, color: "transparent" }] : [])]} />
      )}
    </div>
  );
}

/** One or more lines on a single axis; crosshair snaps to the nearest bucket. */
export function LineChart({ data, series, height = 170, format: fmtName = "compact", unit = "", area = true, maxValue }: { data: Point[]; series: Series[]; height?: number; format?: Format; unit?: string; area?: boolean; maxValue?: number }) {
  const format = FORMATS[fmtName];
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const client = useIsClient();
  const n = data.length;
  const plotW = w - PAD.l - PAD.r, plotH = height - PAD.t - PAD.b;
  const max = niceMax(maxValue ?? Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key] ?? 0)))));
  const x = (i: number) => PAD.l + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  const paths = useMemo(() => series.map((s) => {
    const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(Number(d[s.key] ?? 0)).toFixed(1)}`);
    const line = pts.length ? `M${pts.join("L")}` : "";
    const fill = pts.length ? `${line}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : "";
    return { s, line, fill };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- x/y are derived from the same inputs
  }), [data, series, w, height, max]);
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left - PAD.l;
    const i = n > 1 ? Math.round((px / plotW) * (n - 1)) : 0;
    setHover(i >= 0 && i < n ? i : null);
  };
  return (
    <div ref={ref} className="relative">
      <Legend series={series} />
      <svg width={w} height={height} className="block overflow-visible" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={series.map((s) => s.label).join(", ")}>
        {ticks.map((t) => <g key={t}><line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} style={{ stroke: GRID }} /><text x={PAD.l - 6} y={y(t) + 3} fontSize="10" style={{ fill: INK3 }} textAnchor="end">{format(t)}{unit}</text></g>)}
        {paths.map((p) => <g key={p.s.key}>{area && <path d={p.fill} style={{ fill: p.s.color }} opacity="0.1" />}<path d={p.line} fill="none" style={{ stroke: p.s.color }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></g>)}
        {data.map((d, i) => i % labelEvery === 0 ? <text key={d.t} x={x(i)} y={height - 6} fontSize="10" style={{ fill: INK3 }} textAnchor="middle">{client ? hhmm(d.t) : ""}</text> : null)}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + plotH} style={{ stroke: "var(--chart-cross)" }} />
            {series.map((s) => <circle key={s.key} cx={x(hover)} cy={y(Number(data[hover][s.key] ?? 0))} r="4.5" style={{ fill: s.color, stroke: "var(--pane-solid)" }} strokeWidth="2" />)}
          </g>
        )}
      </svg>
      {hover != null && data[hover] && <Tooltip x={x(hover)} w={w} title={fullTime(data[hover].t)} rows={series.map((s) => ({ label: s.label, value: format(Number(data[hover][s.key] ?? 0)) + unit, color: s.color }))} />}
    </div>
  );
}

/** Inline 12–72 point sparkline for stat tiles. */
export function Spark({ values, color = PALETTE.blue, width = 96, height = 26 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => `${(n > 1 ? (i / (n - 1)) * (width - 2) : 0) + 1},${height - 1 - (v / max) * (height - 4)}`);
  return <svg width={width} height={height} aria-hidden className="inline-block"><path d={`M${pts.join("L")}`} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
