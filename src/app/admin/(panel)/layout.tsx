import Link from "next/link";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { AdminTools } from "@/components/admin/AdminTools";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ops", robots: { index: false, follow: false } };

const TABS: [string, string][] = [
  ["/admin", "Overview"], ["/admin/poller", "Poller"], ["/admin/stock", "Stock"], ["/admin/alerts", "Alerts"], ["/admin/users", "Users"],
  ["/admin/errors", "Errors"], ["/admin/logs", "Logs"], ["/admin/inbox", "Inbox"], ["/admin/system", "System"],
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const who = await requireAdmin();
  const path = (await headers()).get("x-pathname") ?? "/admin";
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-5">
      <div className="pane flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="eyebrow mr-1 pl-1">Ops</span>
        <nav className="flex flex-wrap gap-1" aria-label="Admin sections">
          {TABS.map(([href, label]) => <Link key={href} href={href} className="chip px-3 py-1.5 text-xs" data-on={href === "/admin" ? path === "/admin" : path.startsWith(href)}>{label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <AdminTools via={who.via} />
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
      <p className="mt-6 text-center text-[11px] text-ink-3">Times are shown in your browser&apos;s zone · figures come straight from the database on every load</p>
    </div>
  );
}
