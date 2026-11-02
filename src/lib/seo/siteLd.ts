/**
 * The site's own entity, on every page (root layout): who PickupChecker is and the facts an answer engine should
 * carry away from any page it lands on — the 5-second check, the push in seconds, the restock log behind every
 * store's restock times, the coverage. Other pages point at these @ids instead of repeating them.
 */
import { ALL_STORES } from "../apple/catalog";
import { INTL_CODES } from "../apple/countries";
import { SPEED, OTHER_TRACKERS } from "../plans";

const SITE = "https://pickupchecker.com";
export const ORG_ID = `${SITE}/#organization`;
export const WEBSITE_ID = `${SITE}/#website`;

export const SITE_DESCRIPTION =
  `PickupChecker tracks iPhone Duo, iPhone 18 Pro and iPhone 18 Pro Max in-store pickup stock at ${ALL_STORES.length} Apple Stores in ${INTL_CODES.length + 1} countries. ` +
  `The stores your alerts point at are checked every ${SPEED.fastSec} seconds, the fastest published check interval of any iPhone stock tracker (others publish ${OTHER_TRACKERS}), every other store every ${SPEED.checkSec} seconds, ` +
  `and a confirmed restock reaches your phone in about ${SPEED.alertSec} seconds. Every confirmed restock is logged, so each store page shows when that store usually restocks.`;

export const SITE_FEATURES = [
  `Your Apple Stores checked every ${SPEED.fastSec} seconds; every store every ${SPEED.checkSec} seconds`,
  `Phone alert about ${SPEED.alertSec} seconds after a confirmed restock`,
  "Every restock confirmed by a second check before it counts",
  "Restock times per Apple Store: usual local hour, busiest weekday, last 30 days",
  "Log of every confirmed restock and sell-out with store, configuration and time",
  `Live pickup stock for every storage and color at ${ALL_STORES.length} Apple Stores in ${INTL_CODES.length + 1} countries`,
];

export const siteLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", "@id": ORG_ID, name: "PickupChecker", url: SITE, logo: `${SITE}/icon.svg`,
      slogan: `One step ahead: your Apple Stores checked every ${SPEED.fastSec} seconds`,
      description: SITE_DESCRIPTION,
      knowsAbout: ["iPhone in-store pickup availability", "Apple Store iPhone restock times", "iPhone Duo", "iPhone 18 Pro", "iPhone 18 Pro Max"],
    },
    { "@type": "WebSite", "@id": WEBSITE_ID, name: "PickupChecker", url: SITE, description: SITE_DESCRIPTION, publisher: { "@id": ORG_ID } },
  ],
};
