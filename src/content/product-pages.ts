/**
 * Hand-written copy for the keyword-bound product pages at US level (seo.md §3, P02–P11).
 * Titles come from titles.ts; this file holds what answers them: the Answer-First intro, one block per
 * secondary keyword (its H2 is that keyword's entry title), extra FAQ, photos and sources.
 * Numbers are live tokens (see lib/content/facts.ts).
 */
import type { Block, Faq, Source } from "@/lib/content/types";

export interface ProductCopy {
  intro: string;
  /** Keyed by secondary keyword (must match titles.ts). */
  sections: Record<string, { lead: string; blocks: Block[] }>;
  faq: Faq[];
  photos: string[];
  sources: Source[];
}

const APPLE_PICKUP: Source = { label: "Apple: Shipping & Pickup help (what to bring to a pickup)", url: "https://www.apple.com/shop/help/shipping_delivery" };
const APPLE_DUO_SHOP: Source = { label: "Apple: Shop iPhone Duo (prices and monthly cost)", url: "https://www.apple.com/shop/buy-iphone/iphone-duo" };
const APPLE_PRO_SHOP: Source = { label: "Apple: Shop iPhone 18 Pro and 18 Pro Max", url: "https://www.apple.com/shop/buy-iphone/iphone-18-pro" };
const APPLE_PRO_SPECS: Source = { label: "Apple: iPhone 18 Pro and 18 Pro Max technical specifications", url: "https://www.apple.com/iphone-18-pro/specs/" };
const DUO_LAUNCH: Source = { label: "Apple Newsroom: iPhone Duo arrives at Apple Store locations worldwide (Oct 23, 2026)", url: "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/" };
const COLOR_RUMORS: Source = { label: "MacRumors: every iPhone 18 Pro color rumor, including Dark Cherry", url: "https://www.macrumors.com/guide/iphone-18-pro-ultra-colors/" };
const GLACIER_MACWORLD: Source = { label: "Macworld: the Glacier iPhone 18 Pro Max", url: "https://www.macworld.com/article/3240104/glacier-iphone-18-pro-max-is-anti-cosmic-orange.html" };

/** Storage × stores-now table for one color (rows filled by tokens). */
function colorTable(prefix: "pm" | "pro", color: string, prices: [string, string][]): Block {
  return {
    t: "table",
    head: ["Storage", "Price (unlocked)", "Stores with it now", "Restocks logged"],
    rows: prices.map(([size, price]) => [size, price, `{{${prefix}.cfg:${size} ${color}}}`, `{{${prefix}.rcfg:${size} ${color}}}`]),
    caption: `${color}: live pickup stock across the 269 US Apple Stores`,
    source: "apple.com prices; stock and restocks from PickupChecker's live tracker",
  };
}

const PM_PRICES: [string, string][] = [["256GB", "$1,299"], ["512GB", "$1,499"], ["1TB", "$1,899"], ["2TB", "$2,499"]];
const PRO_PRICES: [string, string][] = [["256GB", "$1,199"], ["512GB", "$1,399"], ["1TB", "$1,799"], ["2TB", "$2,399"]];

export const PRODUCT_COPY: Record<string, ProductCopy> = {
  "iphone-duo": {
    intro: "Right now **{{duo.storesNow}} of 269** US Apple Stores list an iPhone Duo for in-store pickup. We check all eight Night Sky and Star White configurations at every store about every 15 seconds, so this page shows what apple.com would tell you if you tried every store by hand.",
    sections: {
      "apple store duo": {
        lead: "Pickup is the dependable way to get a Duo from an Apple Store. Walk-in sales and pickup orders come out of the same store inventory, which is exactly what apple.com's pickup check reads, so a store that lists no Duo online has none to sell you at the counter either.",
        blocks: [
          { t: "ul", items: [
            "**Pickup:** buy on apple.com or in the Apple Store app, choose \"I'll pick it up\" and the store, then collect it with your order number, a government photo ID and the QR code ([Apple's pickup rules](https://www.apple.com/shop/help/shipping_delivery)).",
            "**Walk-in:** only works while the store still has unallocated units. The Duo [reached stores on October 23, 2026](https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/) and has been scarce ever since.",
          ] },
          { t: "p", text: "Our rule: never drive to a store for a Duo on the strength of a rumor or a two-hour-old post. Check the live list on this page, or let an alert tell you the minute a store lists one." },
          { t: "img", id: "apple-store-pickup-counter" },
        ],
      },
      "iphone duo near me": {
        lead: "Type your ZIP or tap Near me in the checker at the top, and every store is ranked by distance. Since {{trackingSince}} we have logged **{{duo.restocks}} Duo restocks at {{duo.restockStores}} stores**, and a restocked Duo stayed listed for a median of **{{duo.medianStay}}**. The nearest store only helps if you hear about it in time.",
        blocks: [
          { t: "live", id: "restocks", model: "duo" },
          { t: "p", text: "That is why we recommend watching three to five stores you can actually reach, not just the closest one. Each store × exact configuration is one alert, and your phone gets a push seconds after the store flips to available." },
        ],
      },
    },
    faq: [
      { q: "Which iPhone Duo configuration restocks most often?", a: "So far it is the {{duo.topConfig}}. Since {{trackingSince}}, 256GB Night Sky has logged {{duo.rcfg:256GB Night Sky}} restocks and 2TB Star White {{duo.rcfg:2TB Star White}}, so the bigger the storage, the longer the wait." },
      { q: "Does Apple hold a Duo for me once I order pickup?", a: "Yes. A pickup order is yours once you pay; Apple sends a notification with a QR code when it is ready, and you bring that code with a photo ID ([Apple](https://www.apple.com/shop/help/shipping_delivery))." },
    ],
    photos: ["apple-store-queue"],
    sources: [DUO_LAUNCH, APPLE_PICKUP, APPLE_DUO_SHOP],
  },

  "iphone-18-pro-max": {
    intro: "Right now **{{pm.storesNow}} of 269** US Apple Stores have at least one iPhone 18 Pro Max configuration for pickup, and **{{pm.pairsPct}}** of all store × configuration combinations are in stock. Prices run from $1,299 to $2,499 unlocked. The question is rarely \"is it in stock\" but \"is my size and color in stock nearby\".",
    sections: {
      "iphone 18 pro max in stock near me": {
        lead: "Type a ZIP or tap Near me in the checker at the top and the 269 stores reorder by distance, each with how many of the 16 configurations it has. With the Pro Max, distance matters less than configuration: most stores have some, fewer have the exact one you want.",
        blocks: [
          { t: "p", text: "Open a store from the checker to see its 16 configurations one by one. If yours is missing there but present 20 minutes away, the drive is usually worth it: a Pro Max that is listed tends to stay listed for **{{pm.medianStay}}** (median), unlike the Duo." },
          { t: "img", id: "phone-map" },
        ],
      },
      "iphone 18 pro max stock": {
        lead: "Sixteen configurations do not sell out evenly. The grid below counts how many of the 269 stores list each one right now. A low number means set an alert; a high number means just go.",
        blocks: [
          { t: "live", id: "configs", model: "18-pro-max" },
          { t: "p", text: "Since {{trackingSince}} we have logged **{{pm.restocks}} restocks and {{pm.soldouts}} sell-outs** across the Pro Max line. So far most restocks have been 256GB models, the size that sells fastest, which is also why a 256GB that shows as missing near you often comes back within hours." },
        ],
      },
    },
    faq: [
      { q: "Is the iPhone 18 Pro Max sold out?", a: "No. {{pm.storesNow}} of 269 US Apple Stores list at least one configuration right now, though individual sizes and colors run out at individual stores every day. The [restock log](/restocks?model=18-pro-max) shows which." },
      { q: "Can I buy the iPhone 18 Pro Max unlocked in an Apple Store?", a: "Yes. Apple sells it unlocked from $1,299; you can order it on [apple.com](https://www.apple.com/shop/buy-iphone/iphone-18-pro) and pick it up the same day at any store this page lists with your configuration." },
    ],
    photos: ["phone-hand-camera"],
    sources: [APPLE_PRO_SHOP, APPLE_PRO_SPECS, APPLE_PICKUP],
  },

  "iphone-18-pro-max-burgundy": {
    intro: "Burgundy is the deep red iPhone 18 Pro Max. Right now **{{pm.color:Burgundy}} of 269** US Apple Stores list at least one Burgundy storage size for pickup, from $1,299 for 256GB to $2,499 for 2TB.",
    sections: {
      "iphone 18 pro max dark cherry": {
        lead: "Yes, Dark Cherry and Burgundy are the same phone. \"Dark Cherry\" was the name in pre-launch leaks; Apple shipped the deep red finish as Burgundy. If you searched for Dark Cherry, this is the color you saw, and you can buy it in all four storage sizes.",
        blocks: [
          { t: "p", text: "The rumor trail is collected in [MacRumors' color guide](https://www.macrumors.com/guide/iphone-18-pro-ultra-colors/). On apple.com and on the box, the only name is Burgundy, which is also what you choose at checkout and what our alerts use." },
          { t: "img", id: "red-phone" },
        ],
      },
      "iphone 18 pro max cherry red": {
        lead: "Burgundy is a dark, wine-colored red rather than a bright cherry, and it comes in every storage size. Here is how many of the 269 stores list each size right now:",
        blocks: [
          colorTable("pm", "Burgundy", PM_PRICES),
          { t: "p", text: "Our take: if you want Burgundy, settle on the storage first and read its row above. Swapping to another color just to get a phone a day sooner is a trade most people regret within a week." },
        ],
      },
    },
    faq: [
      { q: "Is Burgundy the same as the red iPhone 18 Pro Max?", a: "Yes. Burgundy is the only red finish on the iPhone 18 Pro Max; search terms like cherry red, red and Dark Cherry all point to it." },
      { q: "Which Burgundy iPhone 18 Pro Max is easiest to find?", a: "Right now 256GB Burgundy is at {{pm.cfg:256GB Burgundy}} stores and 2TB Burgundy at {{pm.cfg:2TB Burgundy}}; the table on this page updates with every check." },
    ],
    photos: ["red-iphone-set"],
    sources: [APPLE_PRO_SHOP, COLOR_RUMORS, APPLE_PICKUP],
  },

  "iphone-18-pro-max-glacier": {
    intro: "Glacier is the light-blue iPhone 18 Pro Max. Right now **{{pm.color:Glacier}} of 269** US Apple Stores list at least one Glacier storage size for pickup, priced from $1,299 (256GB) to $2,499 (2TB).",
    sections: {
      "iphone 18 pro max blue": {
        lead: "If you are looking for a blue iPhone 18 Pro Max, Glacier is the one. It is a pale, icy blue rather than a deep navy, and it is the only blue finish Apple sells for the 18 Pro Max this year.",
        blocks: [
          { t: "p", text: "[Macworld called Glacier the anti-Cosmic Orange](https://www.macworld.com/article/3240104/glacier-iphone-18-pro-max-is-anti-cosmic-orange.html), a quiet color after last year's loud one. Photos of pale finishes swing a lot with lighting, so if the exact shade matters, see it at a store before you commit to a 2TB model." },
          { t: "img", id: "light-blue-case" },
        ],
      },
      "iphone 18 pro max glacier blue": {
        lead: "Glacier blue comes in all four storage sizes. This is how many of the 269 stores list each one right now, with the restocks we have logged since {{trackingSince}}:",
        blocks: [
          colorTable("pm", "Glacier", PM_PRICES),
          { t: "p", text: "Glacier sells out unevenly by store, so the national number hides a lot. Use the checker at the top with your ZIP to see the stores you can actually reach." },
        ],
      },
    },
    faq: [
      { q: "Is there a blue iPhone 18 Pro Max?", a: "Yes, Glacier. It is the only blue finish for the iPhone 18 Pro Max and 18 Pro; the other colors are Silver, Black and Burgundy." },
      { q: "Which Glacier iPhone 18 Pro Max size is in the most stores?", a: "Right now 256GB Glacier is at {{pm.cfg:256GB Glacier}} stores, 512GB at {{pm.cfg:512GB Glacier}}, 1TB at {{pm.cfg:1TB Glacier}} and 2TB at {{pm.cfg:2TB Glacier}}." },
    ],
    photos: ["blue-phone"],
    sources: [APPLE_PRO_SHOP, GLACIER_MACWORLD, APPLE_PICKUP],
  },

  "iphone-18-pro-max-silver": {
    intro: "Right now **{{pm.color:Silver}} of 269** US Apple Stores list at least one Silver iPhone 18 Pro Max for pickup. Silver runs from $1,299 (256GB) to $2,499 (2TB); the table below shows each size store by store count, live.",
    sections: {
      "silver iphone 18 pro max": {
        lead: "The easiest Silver iPhone 18 Pro Max to find is usually the one most stores carry in depth, and the table makes that obvious in a second. Pick the size with the biggest number unless you truly need more storage.",
        blocks: [
          colorTable("pm", "Silver", PM_PRICES),
          { t: "img", id: "phone-on-box" },
        ],
      },
      "iphone 18 pro max silver color": {
        lead: "Silver is the light, neutral finish: a white-silver back with a bright frame. Next to it, Black is the dark option, Glacier the pale blue and Burgundy the deep red; all four come in every storage size.",
        blocks: [
          { t: "table", head: ["Color", "Stores with any size now", "Restocks logged"], rows: [["Silver", "{{pm.color:Silver}}", "{{pm.rcolor:Silver}}"], ["Black", "{{pm.color:Black}}", "{{pm.rcolor:Black}}"], ["Glacier", "{{pm.color:Glacier}}", "{{pm.rcolor:Glacier}}"], ["Burgundy", "{{pm.color:Burgundy}}", "{{pm.rcolor:Burgundy}}"]], caption: "iPhone 18 Pro Max colors side by side, live", source: "PickupChecker live tracker" },
          { t: "p", text: "If you are torn between two colors, check both rows above before you choose. Picking the one that is in stock near you today beats waiting a week for a shade you will stop noticing after a month." },
        ],
      },
    },
    faq: [
      { q: "Is there a white iPhone 18 Pro Max?", a: "Silver is the closest: a white-silver back. Apple does not sell a separate white finish for the 18 Pro Max this year." },
      { q: "Does the Silver iPhone 18 Pro Max cost more than other colors?", a: "No. Every color costs the same at each storage size: $1,299, $1,499, $1,899 and $2,499 unlocked." },
    ],
    photos: ["apple-store-pickup-counter"],
    sources: [APPLE_PRO_SHOP, APPLE_PRO_SPECS, APPLE_PICKUP],
  },

  "iphone-18-pro-glacier": {
    intro: "Glacier is the light-blue iPhone 18 Pro. Right now **{{pro.color:Glacier}} of 269** US Apple Stores list at least one Glacier size for pickup, from $1,199 (256GB) to $2,399 (2TB).",
    sections: {
      "iphone 18 pro blue": {
        lead: "Yes, the blue iPhone 18 Pro is Glacier, the same pale blue as the 18 Pro Max. It comes in all four storage sizes; this is how many stores list each one right now:",
        blocks: [
          colorTable("pro", "Glacier", PRO_PRICES),
          { t: "p", text: "If you want Glacier this week and do not need the bigger screen, compare these rows with the [18 Pro Max Glacier page](/stock/iphone-18-pro-max-glacier): the two models sell out differently store by store." },
          { t: "img", id: "light-blue-case" },
        ],
      },
    },
    faq: [
      { q: "Is Glacier the same color on the iPhone 18 Pro and 18 Pro Max?", a: "Yes. Both Pro models share the same four finishes: Silver, Black, Glacier and Burgundy." },
      { q: "How much is the Glacier iPhone 18 Pro?", a: "The same as every other color: $1,199 (256GB), $1,399 (512GB), $1,799 (1TB) and $2,399 (2TB), unlocked." },
    ],
    photos: ["blue-phone"],
    sources: [APPLE_PRO_SHOP, GLACIER_MACWORLD, APPLE_PICKUP],
  },

  "iphone-duo-night-sky": {
    intro: "Night Sky is the dark iPhone Duo. Right now **{{duo.color:Night Sky}} of 269** US Apple Stores list a Night Sky Duo for pickup; since {{trackingSince}} we have logged **{{duo.rcolor:Night Sky}} Night Sky restocks**.",
    sections: {
      "iphone duo black": {
        lead: "There is no \"black\" iPhone Duo by name: the dark finish is called Night Sky. The other Duo color is Star White. Both cost the same at every storage size, from $1,999 to $3,199.",
        blocks: [
          { t: "table", head: ["Storage", "Price", "Stores with it now", "Restocks logged"], rows: [["256GB", "$1,999", "{{duo.cfg:256GB Night Sky}}", "{{duo.rcfg:256GB Night Sky}}"], ["512GB", "$2,199", "{{duo.cfg:512GB Night Sky}}", "{{duo.rcfg:512GB Night Sky}}"], ["1TB", "$2,599", "{{duo.cfg:1TB Night Sky}}", "{{duo.rcfg:1TB Night Sky}}"], ["2TB", "$3,199", "{{duo.cfg:2TB Night Sky}}", "{{duo.rcfg:2TB Night Sky}}"]], caption: "Night Sky iPhone Duo: live pickup stock and restocks", source: "apple.com prices; PickupChecker live tracker" },
          { t: "p", text: "Compare the restock column with [Star White's](/stock/iphone-duo-star-white): the color with more restocks is your faster route, and an alert for both colors at the same size roughly doubles your chances." },
          { t: "img", id: "black-phone" },
        ],
      },
    },
    faq: [
      { q: "Is Night Sky black?", a: "It is the dark iPhone Duo finish, the closest thing to black. Apple's two iPhone Duo colors are Night Sky and Star White." },
      { q: "Is the Night Sky iPhone Duo easier to get than Star White?", a: "Count the restocks: since {{trackingSince}}, Night Sky has {{duo.rcolor:Night Sky}} and Star White {{duo.rcolor:Star White}}. The bigger number is the easier color; both vanish within minutes." },
    ],
    photos: ["foldable-hands"],
    sources: [APPLE_DUO_SHOP, DUO_LAUNCH, APPLE_PICKUP],
  },

  "iphone-duo-star-white": {
    intro: "Star White is the light iPhone Duo. Right now **{{duo.color:Star White}} of 269** US Apple Stores list a Star White Duo for pickup; since {{trackingSince}} we have logged **{{duo.rcolor:Star White}} Star White restocks**.",
    sections: {
      "iphone duo white": {
        lead: "The white iPhone Duo is Star White, the light finish. It is one of two Duo colors (the other is Night Sky) and costs the same at every size, from $1,999 to $3,199.",
        blocks: [
          { t: "table", head: ["Storage", "Price", "Stores with it now", "Restocks logged"], rows: [["256GB", "$1,999", "{{duo.cfg:256GB Star White}}", "{{duo.rcfg:256GB Star White}}"], ["512GB", "$2,199", "{{duo.cfg:512GB Star White}}", "{{duo.rcfg:512GB Star White}}"], ["1TB", "$2,599", "{{duo.cfg:1TB Star White}}", "{{duo.rcfg:1TB Star White}}"], ["2TB", "$3,199", "{{duo.cfg:2TB Star White}}", "{{duo.rcfg:2TB Star White}}"]], caption: "Star White iPhone Duo: live pickup stock and restocks", source: "apple.com prices; PickupChecker live tracker" },
          { t: "p", text: "Star White restocks vanish as fast as any Duo restock. If white is non-negotiable, set alerts at every store you can reach rather than at one." },
          { t: "img", id: "foldable-apps" },
        ],
      },
    },
    faq: [
      { q: "Is there a white iPhone Duo?", a: "Yes, Star White. It is one of the two iPhone Duo finishes; the other is Night Sky." },
      { q: "How often does the Star White iPhone Duo restock?", a: "{{duo.rcolor:Star White}} times at US Apple Stores since {{trackingSince}}, each listing lasting about as long as other Duo restocks: {{duo.medianStay}} at the median." },
    ],
    photos: ["apple-store-entrance"],
    sources: [APPLE_DUO_SHOP, DUO_LAUNCH, APPLE_PICKUP],
  },

  "iphone-duo-1tb": {
    intro: "The iPhone Duo 1TB costs **$2,599** unlocked. Right now **{{duo.storage:1TB}} of 269** US Apple Stores list a 1TB Duo for pickup, and we have logged **{{duo.rstorage:1TB}} 1TB restocks** since {{trackingSince}}.",
    sections: {
      "iphone duo 1tb price": {
        lead: "Apple charges **$2,599** for the 1TB iPhone Duo in either color, or **$108.29 a month** over 24 months with Apple Card Monthly Installments, before tax. That is $400 more than the 512GB and $600 less than the 2TB.",
        blocks: [
          { t: "table", head: ["iPhone Duo", "Price", "Monthly (ACMI)", "Lease from"], rows: [["256GB", "$1,999", "$83.29", "$57.99"], ["512GB", "$2,199", "$91.62", "$63.80"], ["**1TB**", "**$2,599**", "**$108.29**", "**$75.40**"], ["2TB", "$3,199", "$133.29", "$92.81"]], caption: "iPhone Duo prices on apple.com, checked October 30, 2026 (before tax and trade-in)", source: "[Apple: Shop iPhone Duo](https://www.apple.com/shop/buy-iphone/iphone-duo)" },
          { t: "p", text: "Is 1TB worth $400 over 512GB? Only if you shoot a lot of 4K video on it. The Duo's big inner screen makes it a tempting video device, but for photos, apps and offline maps 512GB is plenty, and the $400 stays in your pocket." },
          { t: "img", id: "phone-card-payment" },
        ],
      },
    },
    faq: [
      { q: "How much is the iPhone Duo 1TB with tax?", a: "It depends on your state's sales tax: $2,599 plus, for example, 6.25% in Texas or 7.25% statewide in California before local rates. The [Apple Stores by state](/stores) page lists every state's rate, and each state page prices the Duo with its tax." },
      { q: "Is the 1TB iPhone Duo in stock anywhere?", a: "Right now {{duo.storage:1TB}} of 269 stores list one; 1TB Night Sky has restocked {{duo.rcfg:1TB Night Sky}} times and 1TB Star White {{duo.rcfg:1TB Star White}} times since {{trackingSince}}." },
    ],
    photos: ["foldable-hands"],
    sources: [APPLE_DUO_SHOP, APPLE_PICKUP],
  },

  "iphone-duo-2tb": {
    intro: "The iPhone Duo 2TB costs **$3,199** unlocked and is the hardest Duo to find: right now **{{duo.storage:2TB}} of 269** US Apple Stores list one, and we have logged **{{duo.rstorage:2TB}} 2TB restocks** since {{trackingSince}}.",
    sections: {
      "iphone duo 2tb price": {
        lead: "The 2TB iPhone Duo is **$3,199** in Night Sky or Star White, or **$133.29 a month** over 24 months with Apple Card Monthly Installments, before tax. Is it ever in stock? Rarely: the 2TB has the fewest restocks of any Duo size.",
        blocks: [
          { t: "table", head: ["Size", "Price", "Stores with it now", "Restocks logged"], rows: [["2TB Night Sky", "$3,199", "{{duo.cfg:2TB Night Sky}}", "{{duo.rcfg:2TB Night Sky}}"], ["2TB Star White", "$3,199", "{{duo.cfg:2TB Star White}}", "{{duo.rcfg:2TB Star White}}"], ["1TB (either color)", "$2,599", "{{duo.storage:1TB}}", "{{duo.rstorage:1TB}}"]], caption: "iPhone Duo 2TB: price and live pickup stock", source: "[Apple: Shop iPhone Duo](https://www.apple.com/shop/buy-iphone/iphone-duo); PickupChecker live tracker" },
          { t: "p", text: "Our honest advice: unless 2TB is a hard requirement, go 1TB. It has restocked {{duo.rstorage:1TB}} times since {{trackingSince}} against {{duo.rstorage:2TB}} for 2TB, and costs $600 less. If 2TB is a must, set alerts for both colors at every store within a drive you would make." },
          { t: "img", id: "night-line" },
        ],
      },
    },
    faq: [
      { q: "Why is the 2TB iPhone Duo so hard to find?", a: "It restocks least of all: since {{trackingSince}} the 2TB has logged {{duo.rstorage:2TB}} restocks against {{duo.rstorage:256GB}} for 256GB, and Duo restocks stay listed only {{duo.medianStay}} at the median." },
      { q: "How much is the 2TB iPhone Duo per month?", a: "$133.29 a month over 24 months with Apple Card Monthly Installments, or a lease from $92.81 a month with Apple Upgrade, before tax ([Apple](https://www.apple.com/shop/buy-iphone/iphone-duo))." },
    ],
    photos: ["foldable-apps"],
    sources: [APPLE_DUO_SHOP, APPLE_PICKUP],
  },
};
