import { PendingLink as Link } from "@/components/ui/PendingLink";
import { Logo } from "./Logo";
import { topStates } from "@/lib/seo/links";
import { TrackingChoice } from "./Consent";
import { switchCountries } from "./countries";
import type { Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";
import { cityPages, regionPages, storeRefs } from "@/lib/seo/countryLinks";
import { cityLabel, regionLabel, storeLabel } from "@/lib/i18n/places";

/** English pages keep the US-wide footer; a native version gets its own country's links in its language. */
export function Footer({ loc }: { loc: Locale }) {
  if (loc.native) return <NativeFooter loc={loc} />;
  return (
    <footer className="mx-auto mt-24 w-full max-w-6xl px-4 pb-10">
      <div className="pane px-6 py-8 sm:px-8">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-3">
              iPhone pickup restock alerts for all 269 US Apple Stores: every store checked every 15 seconds, the stores your alerts point at every 5.
            </p>
            <p className="mt-3 text-xs text-ink-3">Not affiliated with or endorsed by Apple Inc. Apple, iPhone and Apple Store are trademarks of Apple Inc.</p>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">Product</div>
            <ul className="space-y-2 text-ink-2">
              <li><Link href="/stock/iphone-duo" className="hover:text-ink">iPhone Duo stock</Link></li>
              <li><Link href="/stock/iphone-18-pro" className="hover:text-ink">iPhone 18 Pro stock</Link></li>
              <li><Link href="/stock/iphone-18-pro-max" className="hover:text-ink">iPhone 18 Pro Max stock</Link></li>
              <li><Link href="/restocks" className="hover:text-ink">Restock log</Link></li>
              <li><Link href="/map" className="hover:text-ink">Live map</Link></li>
              <li><Link href="/stores" className="hover:text-ink">Stores by state</Link></li>
              <li><Link href="/pricing" className="hover:text-ink">Pricing</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">Company</div>
            <ul className="space-y-2 text-ink-2">
              <li><Link href="/how-it-works" className="hover:text-ink">How it works</Link></li>
              <li className="not-in-app"><Link href="/install" className="hover:text-ink">Get the app</Link></li>
              <li><Link href="/about" className="hover:text-ink">About</Link></li>
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
              <li><TrackingChoice /></li>
            </ul>
          </div>
        </div>
        <div className="hairline mt-8 pt-5 text-sm">
          <div className="eyebrow mb-3">iPhone Duo questions</div>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-ink-2">
            <li><Link href="/iphone-duo-restock-times" className="hover:text-ink">When does Apple restock the iPhone Duo?</Link></li>
            <li><Link href="/iphone-duo-sell-out-times" className="hover:text-ink">How fast does it sell out?</Link></li>
            <li><Link href="/iphone-duo-stock-alerts" className="hover:text-ink">Fastest way to get notified</Link></li>
            <li><Link href="/iphone-duo-near-me" className="hover:text-ink">iPhone Duo in stock near me</Link></li>
            <li><Link href="/how-to-get-an-iphone-duo" className="hover:text-ink">How to get an iPhone Duo</Link></li>
            <li><Link href="/how-to-grab-an-iphone-duo-restock" className="hover:text-ink">Grab a restock in 20 seconds</Link></li>
            <li><Link href="/which-iphone-duo-restocks-most" className="hover:text-ink">Which configuration restocks most?</Link></li>
            <li><Link href="/apple-store-pickup-availability-explained" className="hover:text-ink">What “unavailable for pickup” means</Link></li>
            <li><Link href="/iphone-duo-back-in-stock" className="hover:text-ink">Is it back in stock right now?</Link></li>
            <li><Link href="/iphone-duo-stock-checker" className="hover:text-ink">iPhone Duo stock checker</Link></li>
            <li><Link href="/where-to-buy-iphone-duo" className="hover:text-ink">Where to buy one today</Link></li>
            <li><Link href="/iphone-duo-shortage" className="hover:text-ink">Is the shortage easing?</Link></li>
            <li><Link href="/iphone-duo-apple-vs-carriers-vs-retailers" className="hover:text-ink">Apple, Best Buy or a carrier?</Link></li>
            <li><Link href="/iphone-duo-stock-api" className="hover:text-ink">Free stock API</Link></li>
          </ul>
        </div>
        <div className="hairline mt-6 pt-5 text-sm">
          <div className="eyebrow mb-3">Countries</div>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-ink-2">
            {switchCountries().map((c) => <li key={c.cc}><Link href={c.cc === "us" ? "/" : `/${c.cc}`} className="hover:text-ink">{c.name}</Link></li>)}
          </ul>
        </div>
        <div className="hairline mt-6 flex flex-wrap items-center justify-between gap-3 pt-5 text-xs text-ink-3">
          <span>© {new Date().getFullYear()} PickupChecker</span>
          <Link href="/api/health" className="hover:text-ink">Status</Link>
        </div>
      </div>
    </footer>
  );
}

function NativeFooter({ loc }: { loc: Locale }) {
  const D = dict(loc.lang);
  const F = D.chrome.footer;
  const cc = loc.cc;
  const p = `/${cc}`;
  const places = [
    ...regionPages(cc).map((r) => ({ href: r.href, label: regionLabel(cc, r.name, loc.lang) })),
    ...cityPages(cc).map((c) => ({ href: c.href, label: cityLabel(cc, c.name, loc.lang) })),
  ];
  const list = (places.length ? places : storeRefs(cc).map((x) => ({ href: x.href, label: storeLabel(x.store, loc.lang) }))).slice(0, 8);
  const names = switchCountries();
  return (
    <footer className="mx-auto mt-24 w-full max-w-6xl px-4 pb-10" lang={loc.tag}>
      <div className="pane px-6 py-8 sm:px-8">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-3">{F.blurbIn(D.place.allStoresPhrase(cc))}</p>
            <p className="mt-3 text-xs text-ink-3">{F.trademark}</p>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">{F.product}</div>
            <ul className="space-y-2 text-ink-2">
              <li><Link href={`${p}/stock/iphone-duo`} className="hover:text-ink">{F.duoStock}</Link></li>
              <li><Link href={`${p}/stock/iphone-18-pro`} className="hover:text-ink">{F.proStock}</Link></li>
              <li><Link href={`${p}/stock/iphone-18-pro-max`} className="hover:text-ink">{F.proMaxStock}</Link></li>
              <li><Link href={`${p}/restocks`} className="hover:text-ink">{F.restockLog}</Link></li>
              <li><Link href={`${p}/map`} className="hover:text-ink">{F.liveMap}</Link></li>
              <li><Link href={`${p}/iphone-duo-restock-times`} className="hover:text-ink">{F.restockTimes}</Link></li>
              <li><Link href={`${p}/which-iphone-duo-restocks-most`} className="hover:text-ink">{F.configsPage}</Link></li>
              <li><Link href={`${p}/iphone-duo-shortage`} className="hover:text-ink">{F.shortagePage}</Link></li>
              <li><Link href={`${p}/iphone-duo-apple-vs-carriers-vs-retailers`} className="hover:text-ink">{F.channelsPage}</Link></li>
              <li><Link href={`${p}/iphone-duo-stock-api`} className="hover:text-ink">{F.apiPage}</Link></li>
              <li><Link href="/pricing" className="hover:text-ink">{F.pricing}</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">{F.company}</div>
            <ul className="space-y-2 text-ink-2">
              <li className="not-in-app"><Link href="/install" className="hover:text-ink">{F.getApp}</Link></li>
              <li><Link href="/how-it-works" className="hover:text-ink">{F.howItWorks}</Link> <span className="text-xs text-ink-3">· {F.englishOnly}</span></li>
              <li><Link href="/about" className="hover:text-ink">{F.about}</Link></li>
              <li><Link href="/contact" className="hover:text-ink">{F.contact}</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">{F.storesIn}</div>
            <ul className="space-y-2 text-ink-2">
              {list.map((x) => <li key={x.href}><Link href={x.href} className="hover:text-ink">{x.label}</Link></li>)}
              <li><Link href={`${p}/stores`} className="hover:text-ink">{F.allStores}</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="eyebrow mb-3">{F.legal} <span className="normal-case tracking-normal text-ink-3">· {F.englishOnly}</span></div>
            <ul className="space-y-2 text-ink-2">
              <li><Link href="/privacy" className="hover:text-ink">{F.privacy}</Link></li>
              <li><Link href="/terms" className="hover:text-ink">{F.terms}</Link></li>
              <li><Link href="/refunds" className="hover:text-ink">{F.refunds}</Link></li>
              <li><TrackingChoice /></li>
            </ul>
          </div>
        </div>
        <div className="hairline mt-6 pt-5 text-sm">
          <div className="eyebrow mb-3">{F.countries}</div>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-ink-2">
            {names.map((c) => <li key={c.cc}><Link href={c.cc === "us" ? "/" : `/${c.cc}`} className="hover:text-ink">{c.names?.[loc.lang] ?? c.name}</Link></li>)}
          </ul>
        </div>
        <div className="hairline mt-6 flex flex-wrap items-center justify-between gap-3 pt-5 text-xs text-ink-3">
          <span>© {new Date().getFullYear()} PickupChecker</span>
          <Link href="/api/health" className="hover:text-ink">{F.status}</Link>
        </div>
      </div>
    </footer>
  );
}
