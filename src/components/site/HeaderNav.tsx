"use client";
/**
 * The header's section links for the country the page is about: /stock/iphone-duo on US pages, /jp/stock/iphone-duo
 * on Japan's English pages, /ja-jp/stock/iphone-duo on its Japanese ones; app pages (dashboard, pricing) use the
 * person's language version. From the pathname, so a soft navigation between countries keeps them right.
 */
import { usePathname } from "next/navigation";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { useAppLocale, useT } from "@/components/i18n/LangProvider";
import { isAppPath, localeFromSegment } from "@/lib/i18n/locales";

/** The prefix of the country tree a path belongs to ("" for the US). */
export function treePrefix(pathname: string, app: string | null): string {
  const seg = pathname.split("/")[1];
  if (localeFromSegment(seg)) return `/${seg}`;
  return isAppPath(pathname) && app ? `/${app}` : "";
}

export function HeaderNav({ variant }: { variant: "main" | "sections" }) {
  const pathname = usePathname() ?? "/";
  const app = useAppLocale();
  const d = useT().chrome.nav;
  const p = treePrefix(pathname, app?.id ?? null);
  const links: [string, string][] = [[`${p}/stock/iphone-duo`, d.duoStock], [`${p}/restocks`, d.restocks], [`${p}/map`, d.map], [`${p}/stores`, d.stores], ["/pricing", d.pricing]];
  if (variant === "main") {
    return (
      <nav className="hidden items-center gap-1 text-sm text-ink-2 md:flex" aria-label={d.main}>
        {links.map(([href, label]) => <Link key={href} className="rounded-full px-3 py-2 hover:bg-ink/5 hover:text-ink" href={href}>{label}</Link>)}
      </nav>
    );
  }
  return (
    <nav className="-mx-1 mt-2 flex gap-1 overflow-x-auto pb-0.5 text-sm text-ink-2 md:hidden [scrollbar-width:none]" aria-label={d.sections}>
      {links.map(([href, label]) => <Link key={href} className="shrink-0 rounded-full px-3 py-1.5 hover:bg-ink/5 hover:text-ink" href={href}>{label}</Link>)}
      <Link className="not-in-app shrink-0 rounded-full px-3 py-1.5 hover:bg-ink/5 hover:text-ink" href="/install">{d.getApp}</Link>
    </nav>
  );
}
