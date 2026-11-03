import { PendingLink as Link } from "@/components/ui/PendingLink";
import { requestLocale } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n/dict";

/** 404 in the language of the address that was asked for (/ja-jp/… → Japanese, links into that country's tree). */
export default async function NotFound() {
  const loc = await requestLocale();
  const F = dict(loc.lang).chrome.notFound;
  const p = loc.id ? `/${loc.id}` : "";
  const cls = "underline decoration-line-2 hover:text-ink";
  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 text-center">
      <div className="eyebrow">404</div>
      <h1 className="display mt-2 text-3xl sm:text-5xl">{F.title}</h1>
      <p className="mt-4 text-ink-2">{F.body(<Link href={`${p}/stores`} className={cls}>{F.stores}</Link>, <Link href={`${p}/map`} className={cls}>{F.map}</Link>)}</p>
      <Link href={p || "/"} className="btn btn-primary mt-6">{F.home}</Link>
    </div>
  );
}
