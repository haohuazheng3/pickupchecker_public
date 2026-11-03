/**
 * Server dictionaries: every string a page renders, per language. English is the source and the type; a
 * language that lacks a module falls back to English for it (the typecheck makes a finished language complete).
 */
import type { Lang } from "./locales";
import { en, type Dict } from "./dict/en";
import { DICTS } from "./dict/all";

export type { Dict };
export function dict(lang: Lang): Dict {
  return DICTS[lang] ?? en;
}
