import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

const tabs = [
  ["/admin", "Overview"], ["/admin/poller", "Poller"], ["/admin/errors", "Errors"], ["/admin/users", "Users"], ["/admin/notifications", "Emails"], ["/admin/inbox", "Inbox"],
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-2">Admin</span>
        {tabs.map(([href, label]) => <Link key={href} href={href} className="chip">{label}</Link>)}
        <a href="/api/health" className="chip" target="_blank" rel="noreferrer">/api/health</a>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
