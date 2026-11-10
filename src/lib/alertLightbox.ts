/**
 * Opening the alert lightbox (components/alerts/AlertLightbox.tsx) from anywhere: an "Alert me" or "Sign in"
 * link (AlertLinkHost), the home page's block, the pricing page. The href is the link's own (/?…#notify,
 * /ja-jp?signin=1&next=…): its path names the country and language, its query the pre-fill.
 * A call made before the lightbox is mounted (the home page opening itself on load) waits for it.
 */
import type { PhoneCatalog } from "@/components/alerts/PhoneMatrix";

type Open = (href: string) => void;
let opener: Open | null = null;
let pending: string | null = null;

export function openAlertLightbox(href: string) {
  if (opener) opener(href); else pending = href;
}

export function registerAlertLightbox(fn: Open): () => void {
  opener = fn;
  if (pending) { const h = pending; pending = null; fn(h); }
  return () => { if (opener === fn) opener = null; };
}

const catalogs = new Map<string, Promise<PhoneCatalog>>();
/** One fetch per country × language per page load (the response is cached at the edge as well). */
export function loadAlertCatalog(cc: string, lang: string): Promise<PhoneCatalog> {
  const key = `${cc}/${lang}`;
  let p = catalogs.get(key);
  if (!p) {
    p = fetch(`/api/alert-catalog/${cc}/${encodeURIComponent(lang)}`).then((r) => {
      if (!r.ok) throw new Error(`catalog ${r.status}`);
      return r.json() as Promise<PhoneCatalog>;
    });
    p.catch(() => catalogs.delete(key));
    catalogs.set(key, p);
  }
  return p;
}
