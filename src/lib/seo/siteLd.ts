/**
 * The site's own entity, on every page (root layout): who PickupChecker is and the facts an answer engine should
 * carry away from any page it lands on — the 5-second plan with its measured figures, the alert in seconds, the restock log behind every
 * store's restock times, the coverage. Other pages point at these @ids instead of repeating them.
 */
import { ALL_STORES } from "../apple/catalog";
import { INTL_CODES } from "../apple/countries";
import { SPEED } from "../plans";
import { OFFICIAL_SOCIAL_PROFILES } from "./social";

const SITE = "https://pickupchecker.com";
export const ORG_ID = `${SITE}/#organization`;
export const WEBSITE_ID = `${SITE}/#website`;

export const SITE_DESCRIPTION =
  `PickupChecker tracks iPhone Duo, iPhone 18 Pro and iPhone 18 Pro Max in-store pickup stock at ${ALL_STORES.length} Apple Stores in ${INTL_CODES.length + 1} countries. ` +
  `The stores your alerts point at are checked on a ${SPEED.fastSec}-second plan and every other store on a ${SPEED.checkSec}-second plan, with the measured intervals and alert delays published hourly at ${SITE}/service-report, ` +
  `and an alert is handed to the push service seconds after a restock is first seen (delivery to the phone is not measured). Every confirmed restock is logged, so each store page shows when that store usually restocks.`;

export const SITE_FEATURES = [
  `Your Apple Stores checked every ${SPEED.fastSec} seconds; every store every ${SPEED.checkSec} seconds`,
  "Alert handed to the push service seconds after a restock is first seen; measured delays published hourly",
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
      sameAs: OFFICIAL_SOCIAL_PROFILES.map(({ href }) => href),
      knowsAbout: ["iPhone in-store pickup availability", "Apple Store iPhone restock times", "iPhone Duo", "iPhone 18 Pro", "iPhone 18 Pro Max"],
    },
    { "@type": "WebSite", "@id": WEBSITE_ID, name: "PickupChecker", url: SITE, description: SITE_DESCRIPTION, publisher: { "@id": ORG_ID } },
  ],
};
