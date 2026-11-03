"use client";
/**
 * The dashboard's language: one select for this page, pushes, alert emails and Stripe (docs/i18n.md §6). A member
 * may watch stores in several countries; the language is theirs, not the stores'. On a new device the account's
 * saved language wins once (the cookie follows it), so pushes and the dashboard never disagree.
 */
import { useEffect, useState } from "react";
import { Section } from "@/components/alerts/Section";
import { useLocale, useT } from "@/components/i18n/LangProvider";
import { LANG_COOKIE, LANG_NAMES, NATIVE_LOCALES, nativeLocale } from "@/lib/i18n/locales";
import { fill } from "@/lib/i18n/format";

const OPTIONS = [{ id: "en", lang: "en" as const }, ...NATIVE_LOCALES.filter((l, i, a) => a.findIndex((x) => x.lang === l.lang) === i).map((l) => ({ id: l.id, lang: l.lang }))];

export function LanguageSection({ saved }: { saved: string | null }) {
  const d = useT().account.language;
  const loc = useLocale();
  const current = loc.native ? (OPTIONS.find((o) => o.lang === loc.lang)?.id ?? loc.id) : "en";
  const [busy, setBusy] = useState(false);
  // A saved language that is not this page's (signed in on a new device): follow it once.
  useEffect(() => {
    if (!saved || saved === current) return;
    try { if (sessionStorage.getItem("pc_lang_synced") === saved) return; sessionStorage.setItem("pc_lang_synced", saved); } catch { /* private mode: still once per load */ }
    document.cookie = `${LANG_COOKIE}=${saved}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.reload();
  }, [saved, current]);
  const pick = async (id: string) => {
    setBusy(true);
    await fetch("/api/me/locale", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale: id }) }).catch(() => null);
    document.cookie = `${LANG_COOKIE}=${id}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.reload();
  };
  const savedLang = nativeLocale(saved)?.lang ?? "en";
  return (
    <Section id="language" title={d.title} summary={LANG_NAMES[loc.native ? loc.lang : "en"]} defaultOpen={false}>
      <label className="block text-sm font-medium text-ink" htmlFor="pc-language">{d.label}</label>
      <select id="pc-language" className="mt-2 w-full max-w-sm rounded-xl border border-line-2 bg-[var(--pane-solid)] px-3 py-2 text-sm text-ink" value={current} disabled={busy} onChange={(e) => void pick(e.target.value)}>
        {OPTIONS.map((o) => <option key={o.id} value={o.id}>{LANG_NAMES[o.lang]}</option>)}
      </select>
      {busy && <span className="ms-2 text-xs text-ink-3">{d.saving}</span>}
      <p className="mt-2 text-xs text-ink-3">{d.help}</p>
      {savedLang !== (loc.native ? loc.lang : "en") && !saved && <p className="mt-1 text-xs text-ink-3">{fill(d.alertsIn, { lang: LANG_NAMES[savedLang] })}</p>}
    </Section>
  );
}
