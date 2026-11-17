/**
 * "Where did you hear about us?" (owner 2026-11-17): asked once, on the dashboard, one tap. The answers land in
 * Neon (`referral_sources`, scripts/survey-db.mjs), never in the main database. The owner asked for the dozen or
 * so likeliest places, most likely first ("38 is too many"), and an Other that lets them type the brand. The
 * order is the grid's: 15 tiles fill 3 columns on a phone and 5 on a larger screen. Brand names stay as the
 * brands write them (SourceStrings.brands can give a local one).
 */
export const SOURCES = [
  { id: "google", name: "Google", kind: "search" },
  { id: "chatgpt", name: "ChatGPT", kind: "ai" },
  { id: "grok", name: "Grok", kind: "ai" },
  { id: "gemini", name: "Gemini", kind: "ai" },
  { id: "perplexity", name: "Perplexity", kind: "ai" },
  { id: "reddit", name: "Reddit", kind: "social" },
  { id: "youtube", name: "YouTube", kind: "social" },
  { id: "tiktok", name: "TikTok", kind: "social" },
  { id: "x", name: "X", kind: "social" },
  { id: "facebook", name: "Facebook", kind: "social" },
  { id: "instagram", name: "Instagram", kind: "social" },
  { id: "discord", name: "Discord", kind: "social" },
  { id: "bing", name: "Bing", kind: "search" },
  { id: "friend", name: "", kind: "other" },
  { id: "other", name: "", kind: "other" },
] as const;

export type SourceId = (typeof SOURCES)[number]["id"];
/** What is stored for someone who closed it without answering (the X, Esc). */
export const SKIPPED = "skipped";
export type SourceAnswer = SourceId | typeof SKIPPED;

const IDS = new Set<string>(SOURCES.map((s) => s.id));
export function isSourceAnswer(v: unknown): v is SourceAnswer {
  return typeof v === "string" && (v === SKIPPED || IDS.has(v));
}

/** What they typed after Other: one line, at most 60 characters, no control characters; null when empty. */
export const DETAIL_MAX = 60;
export function cleanDetail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, DETAIL_MAX).trim();
  return s || null;
}

/** The dashboard's words for the lightbox (server dictionaries, account.source); brand names are not translated. */
export interface SourceStrings {
  title: string;
  /** One line under the title. */
  lead: string;
  friend: string;
  other: string;
  /** Other: the box where they type the brand (placeholder). */
  otherAsk: string;
  send: string;
  close: string;
  /** Local names for brands that have one in this language (微信, 네이버 …). */
  brands?: Partial<Record<SourceId, string>>;
}

/** Clerk public metadata key that marks "asked already" (answered or closed), read on every dashboard render. */
export const ASKED_META = "sourceSurvey";
/** The same, per browser: hides it at once after the tap, before Clerk's copy of the user catches up. */
export const ASKED_STORAGE = "pc_source_survey";

/** ios-app (home-screen app) / ios / android / desktop / other, from the user agent and display mode. */
export function deviceOf(ua: string, standalone: boolean): string {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && /Mobile\//.test(ua));
  if (ios) return standalone ? "ios-app" : "ios";
  if (/Android/.test(ua)) return standalone ? "android-app" : "android";
  if (/Windows|Macintosh|Linux|CrOS/.test(ua)) return "desktop";
  return "other";
}
