"use client";
/** The server's English error text in the reader's language (cdict chrome.apiErrors); anything unknown as sent. */
import { useCallback } from "react";
import { useLang, useT } from "./LangProvider";
import { fill } from "@/lib/i18n/format";
import { cen } from "@/lib/i18n/cdict/en";

const ENGLISH = cen.chrome.apiErrorTemplates;
const pattern = (tpl: string) => new RegExp(`^${tpl.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\w+)\}/g, "(?<$1>.+?)")}$`);
const PATTERNS = (Object.keys(ENGLISH) as (keyof typeof ENGLISH)[]).map((k) => ({ k, re: pattern(ENGLISH[k]) }));

export function useApiError(): (msg: string) => string {
  const lang = useLang();
  const d = useT().chrome;
  return useCallback((msg: string) => {
    if (lang === "en") return msg;
    const exact = (d.apiErrors as Record<string, string>)[msg];
    if (exact) return exact;
    for (const { k, re } of PATTERNS) {
      const m = msg.match(re);
      if (m?.groups) return fill(d.apiErrorTemplates[k], m.groups);
    }
    return msg;
  }, [lang, d]);
}
