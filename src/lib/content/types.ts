/**
 * Content blocks for the hand-written parts of the stock pages (intros, keyword sections, FAQ, sources).
 * Inline text is a tiny Markdown subset: **bold**, [label](/path or https://url) and live tokens
 * such as {{duo.storesNow}} (see facts.ts), which are filled from the live database on every request.
 */
import type { ModelKey } from "../apple/catalog";

export type Inline = string;

export type Block =
  | { t: "p"; text: Inline }
  | { t: "ul"; items: Inline[] }
  | { t: "ol"; items: Inline[] }
  | { t: "h3"; text: Inline }
  | { t: "table"; head: Inline[]; rows: Inline[][]; caption?: Inline; source?: Inline }
  | { t: "img"; id: string }
  | { t: "note"; text: Inline; tone?: "tip" | "warn" }
  /** A server-rendered live widget (see components/content/LiveWidget.tsx). */
  | { t: "live"; id: LiveWidgetId; model?: ModelKey }
  | { t: "cta"; label: string; href: string; sub?: Inline };

export type LiveWidgetId = "status" | "restocks" | "clock" | "configs" | "prices" | "stores-now";

export interface Faq { q: string; a: Inline }

export interface Source { label: string; url: string }
