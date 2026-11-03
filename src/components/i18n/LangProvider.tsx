"use client";
/**
 * The page's language for client components. The root layout provides it once per full page load (crossing
 * languages is always a full load: PendingLink), with that language's client strings; English strings are
 * bundled, so English pages carry nothing extra.
 */
import { createContext, useContext, type ReactNode } from "react";
import { EN_US, type Lang, type Locale } from "@/lib/i18n/locales";
import { cen, type CDict } from "@/lib/i18n/cdict/en";

interface Ctx { loc: Locale; app: Locale | null; d: CDict }
const C = createContext<Ctx>({ loc: EN_US, app: null, d: cen });

/** `app`: the person's language for app pages (cookie), null for English. */
export function LangProvider({ loc, app, d, children }: { loc: Locale; app: Locale | null; d: CDict | null; children: ReactNode }) {
  return <C.Provider value={{ loc, app, d: d ?? cen }}>{children}</C.Provider>;
}
export function useLocale(): Locale {
  return useContext(C).loc;
}
export function useLang(): Lang {
  return useContext(C).loc.lang;
}
/** The person's language for app pages (null = English). */
export function useAppLocale(): Locale | null {
  return useContext(C).app;
}
export function useT(): CDict {
  return useContext(C).d;
}
