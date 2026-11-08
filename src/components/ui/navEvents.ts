/** PendingLink → NavSkeleton: a client-side navigation to `href` started (pending) or ended. */
export const NAV_EVENT = "pc:nav";
export interface NavEventDetail { href: string; pending: boolean }

/**
 * PendingLink → FreshOnReturn: a link to the page already on screen was tapped. In the iPhone Home Screen app there is
 * no reload button and no pull-to-refresh, so people tap the header link of the page they are on to get fresh stock
 * (FlowGlance 11-07: paying members 40–88 times each, the page looking unchanged). That tap now refreshes.
 */
export const SAME_PAGE_EVENT = "pc:same-page";

/** True when `href` (no #fragment) is the page on screen: same path, same query. */
export function isSamePage(href: string, here: { pathname: string; search: string; href: string }): boolean {
  if (href.includes("#")) return false;
  try {
    const u = new URL(href, here.href);
    return u.origin === new URL(here.href).origin && u.pathname.replace(/\/$/, "") === here.pathname.replace(/\/$/, "") && u.search === here.search;
  } catch { return false; }
}
