import Link from "next/link";
import { Logo } from "./Logo";
import { AuthNav } from "./AuthNav";

const LINKS: [string, string][] = [["/stock/iphone-18-pro", "Live stock"], ["/map", "Map"], ["/stores", "Stores"], ["/how-it-works", "How it works"], ["/pricing", "Pricing"]];

export function Header() {
  return (
    <header className="site-header sticky top-3 z-40 px-4">
      <div className="pane mx-auto max-w-6xl px-4 py-2.5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0" aria-label="PickupChecker home">
            <Logo compact />
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-ink-2 md:flex" aria-label="Main">
            {LINKS.map(([href, label]) => <Link key={href} className="rounded-full px-3 py-2 hover:bg-white/5 hover:text-ink" href={href}>{label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <AuthNav />
            <Link href="/#notify" className="btn btn-primary btn-sm">Get notified</Link>
          </div>
        </div>
        {/* Phones and the Home Screen app (no address bar) still need every section one tap away. */}
        <nav className="-mx-1 mt-2 flex gap-1 overflow-x-auto pb-0.5 text-sm text-ink-2 md:hidden [scrollbar-width:none]" aria-label="Sections">
          {LINKS.map(([href, label]) => <Link key={href} className="shrink-0 rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-ink" href={href}>{label}</Link>)}
          <Link className="shrink-0 rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-ink" href="/install">Get the app</Link>
        </nav>
      </div>
    </header>
  );
}
