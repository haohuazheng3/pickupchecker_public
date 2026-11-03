import type { ReactNode } from "react";

/** English strings: chrome — footer, 404 page, the language-version note. (Header labels are client strings: cdict chrome.nav.) */
export const chrome = {
  footer: {
    blurb: "iPhone pickup restock alerts for all 269 US Apple Stores: every store checked every 15 seconds, the stores your alerts point at every 5.",
    /** On a country's native pages: the same line for that country ("all 11 Apple Stores in Japan"). */
    blurbIn: (allStores: string) => `iPhone pickup restock alerts for ${allStores}: every store checked every 15 seconds, the stores your alerts point at every 5.`,
    trademark: "Not affiliated with or endorsed by Apple Inc. Apple, iPhone and Apple Store are trademarks of Apple Inc.",
    product: "Product",
    duoStock: "iPhone Duo stock",
    proStock: "iPhone 18 Pro stock",
    proMaxStock: "iPhone 18 Pro Max stock",
    restockLog: "Restock log",
    liveMap: "Live map",
    storesByState: "Stores by state",
    pricing: "Pricing",
    company: "Company",
    howItWorks: "How it works",
    getApp: "Get the app",
    about: "About",
    contact: "Contact",
    allStates: "All states & cities →",
    /** Native pages: the country's regions/cities column. */
    storesIn: "Apple Stores",
    allStores: "All stores →",
    legal: "Legal",
    privacy: "Privacy",
    terms: "Terms",
    refunds: "Refunds",
    /** Native pages: legal texts and the guides are in English; said once, next to them. */
    englishOnly: "In English",
    questions: "iPhone Duo questions",
    restockTimes: "When does Apple restock the iPhone Duo?",
    countries: "Countries",
    status: "Status",
  },
  notFound: {
    title: "Nothing here",
    /** `stores`, `map`: the two links (already built), placed in the sentence. */
    body: (stores: ReactNode, map: ReactNode) => <>That page doesn&apos;t exist. Try {stores} or the {map}.</>,
    stores: "stores by state",
    map: "live map",
    home: "Back home",
  },
};
