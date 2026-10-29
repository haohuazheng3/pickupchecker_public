import Link from "next/link";
import { Logo } from "./Logo";
import { topStates } from "@/lib/seo/links";

export function Footer() {
  return (
    <footer className="mx-auto mt-24 w-full max-w-6xl px-4 pb-10">
      <div className="pane px-6 py-8 sm:px-8">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-3">
              A notification on your phone the moment an iPhone 18 Pro, Pro Max or iPhone Duo shows up for in-store pickup at any of the 269 Apple Stores in the US.
            </p>
            <p className="mt-3 text-xs text-ink-3">Independent service. Not affiliated with or endorsed by Apple Inc. Apple, iPhone and Apple Store are trademarks of Apple Inc.</p>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">Product</div>
            <ul className="space-y-2 text-ink-2">
              <li><Link href="/stock/iphone-duo" className="hover:text-ink">iPhone Duo stock</Link></li>
              <li><Link href="/stock/iphone-18-pro" className="hover:text-ink">iPhone 18 Pro stock</Link></li>
              <li><Link href="/stock/iphone-18-pro-max" className="hover:text-ink">iPhone 18 Pro Max stock</Link></li>
              <li><Link href="/restocks" className="hover:text-ink">Restock log</Link></li>
              <li><Link href="/map" className="hover:text-ink">Live stock map</Link></li>
              <li><Link href="/stores" className="hover:text-ink">Apple Stores by state</Link></li>
              <li><Link href="/pricing" className="hover:text-ink">Pricing</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">Company</div>
            <ul className="space-y-2 text-ink-2">
              <li><Link href="/how-it-works" className="hover:text-ink">How it works</Link></li>
              <li><Link href="/install" className="hover:text-ink">Get the app</Link></li>
              <li><Link href="/about" className="hover:text-ink">About</Link></li>
              <li><Link href="/blog" className="hover:text-ink">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-ink">Contact</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">Stores by state</div>
            <ul className="space-y-2 text-ink-2">
              {topStates(8).map((s) => <li key={s.slug}><Link href={s.href} className="hover:text-ink">{s.name}</Link></li>)}
              <li><Link href="/stores" className="hover:text-ink">All states & cities →</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">Legal</div>
            <ul className="space-y-2 text-ink-2">
              <li><Link href="/privacy" className="hover:text-ink">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-ink">Terms</Link></li>
              <li><Link href="/refunds" className="hover:text-ink">Refunds</Link></li>
            </ul>
          </div>
        </div>
        <div className="hairline mt-8 flex flex-wrap items-center justify-between gap-3 pt-5 text-xs text-ink-3">
          <span>© {new Date().getFullYear()} PickupChecker</span>
          <span>Status: <Link href="/api/health" className="hover:text-ink">/api/health</Link></span>
        </div>
      </div>
    </footer>
  );
}
