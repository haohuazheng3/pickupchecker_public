import { PendingLink as Link } from "@/components/ui/PendingLink";
import { Logo } from "./Logo";
import { AuthNav } from "./AuthNav";
import { SiteSearch } from "./SiteSearch";
import { ThemeToggle } from "./ThemeToggle";

const LINKS: [string, string][] = [["/stock/iphone-duo", "Duo stock"], ["/restocks", "Restocks"], ["/map", "Map"], ["/stores", "Stores"], ["/pricing", "Pricing"]];

export function Header() {
  return (
    <header className="site-header sticky top-3 z-40 px-3 sm:px-4">
      <div className="pane mx-auto max-w-6xl px-3 py-2.5 sm:px-5">
        {/* One row on every width: mark (+ wordmark from 420 px), nav on md+, then My alerts + search. The "Alert me" call to action lives in the floating AlertBar. */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <Link href="/" className="flex min-w-0 shrink items-center" aria-label="PickupChecker home">
            <Logo compact />
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-ink-2 md:flex" aria-label="Main">
            {LINKS.map(([href, label]) => <Link key={href} className="rounded-full px-3 py-2 hover:bg-ink/5 hover:text-ink" href={href}>{label}</Link>)}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <AuthNav />
            <SiteSearch />
            <ThemeToggle />
          </div>
        </div>
        {/* Phones and the Home Screen app (no address bar) still need every section one tap away. */}
        <nav className="-mx-1 mt-2 flex gap-1 overflow-x-auto pb-0.5 text-sm text-ink-2 md:hidden [scrollbar-width:none]" aria-label="Sections">
          {LINKS.map(([href, label]) => <Link key={href} className="shrink-0 rounded-full px-3 py-1.5 hover:bg-ink/5 hover:text-ink" href={href}>{label}</Link>)}
          <Link className="shrink-0 rounded-full px-3 py-1.5 hover:bg-ink/5 hover:text-ink" href="/install">Get the app</Link>
        </nav>
      </div>
    </header>
  );
}
