/** Home page copy (seo.md P01): the category tool. Titles live in titles.ts (HOME_TITLES). */
import type { Block, Faq, Source } from "@/lib/content/types";

export const HOME_INTRO = "Right now the iPhone Duo is in stock for pickup at **{{duo.storesNow}} of 269** US Apple Stores, the iPhone 18 Pro at **{{pro.storesNow}}** and the iPhone 18 Pro Max at **{{pm.storesNow}}**. Every store is re-checked about every 15 seconds. Browse for free, or pick your stores and exact phone and get a push the moment one lists it.";

export const HOME_SECTIONS: Record<string, { lead: string; blocks: Block[] }> = {
  "apple inventory checker": {
    lead: "This is an Apple inventory checker for the three phones people actually hunt for. It reads apple.com's in-store pickup availability for all 40 configurations at every US Apple Store, about every 15 seconds, and shows the answer by store, by state and by configuration.",
    blocks: [
      { t: "table", head: ["Model", "Configurations", "Stores with stock now", "Restocks logged"], rows: [["[iPhone Duo](/stock/iphone-duo)", "8", "{{duo.storesNow}}", "{{duo.restocks}}"], ["[iPhone 18 Pro](/stock/iphone-18-pro)", "16", "{{pro.storesNow}}", "{{pro.restocks}}"], ["[iPhone 18 Pro Max](/stock/iphone-18-pro-max)", "16", "{{pm.storesNow}}", "{{pm.restocks}}"]], caption: "What the checker sees right now (restocks since {{trackingSince}})", source: "PickupChecker live tracker of all 269 US Apple Stores" },
      { t: "p", text: "A change only counts after a second check confirms it, so one glitchy response from apple.com never shows up as a fake restock or a fake sell-out. Every confirmed change goes into the [restock log](/restocks), which is where the restock-time charts on store pages come from." },
      { t: "img", id: "phone-notification" },
    ],
  },
  "apple store stock checker": {
    lead: "Checking is free; the paid part is not having to check. Pick the Apple Stores you can reach and the exact phone, model, storage and color, and your phone gets a push seconds after any of those stores lists it for in-store pickup.",
    blocks: [
      { t: "ol", items: [
        "Tap **Alert me** and choose the iPhone, storage and color.",
        "Tick the stores you can get to; the nearest are listed first, with miles and drive time.",
        "On an iPhone, add PickupChecker to your Home Screen and allow notifications ([how to install](/install)).",
        "When the push arrives, open apple.com from it and check out with in-store pickup at that store.",
      ] },
      { t: "p", text: "One alert is one store and one exact configuration. Plus is $5 a month for 10 alerts, Pro $10 for 20 and Max $20 for 50 ([pricing](/pricing)). Our honest view: the Duo is worth alerts at three to five stores; for the 18 Pro and Pro Max, look at the live numbers first, because most configurations are in stock at most stores." },
      { t: "img", id: "apple-store-pickup-counter" },
    ],
  },
};

export const HOME_FAQ: Faq[] = [
  { q: "How fast are the alerts?", a: "Every US Apple Store is re-checked about every 15 seconds, and the push goes out seconds after a store flips to available. Duo restocks stay listed for a median of {{duo.medianStay}}, which is why speed matters." },
  { q: "What is one alert?", a: "One Apple Store × one exact phone (model, storage and color). Watching three stores for one configuration is three alerts." },
  { q: "What does it cost?", a: "Live stock, the map and the restock log are free. Alerts are Plus $5/month for 10, Pro $10 for 20 and Max $20 for 50; cancel anytime ([pricing](/pricing))." },
  { q: "How do I get notifications on my iPhone?", a: "Open pickupchecker.com in Safari, add it to your Home Screen, open it from there, sign in and allow notifications ([step by step](/install))." },
  { q: "Can you reserve the phone for me?", a: "No. We tell you the instant a store lists it; you buy on apple.com with in-store pickup, and Apple holds it for you ([Apple's pickup help](https://www.apple.com/shop/help/shipping_delivery))." },
];

export const HOME_SOURCES: Source[] = [
  { label: "Apple: Shipping & Pickup help (what to bring to a pickup)", url: "https://www.apple.com/shop/help/shipping_delivery" },
  { label: "Apple: Delivery and Pickup (how to check pickup availability)", url: "https://www.apple.com/shop/shipping-pickup" },
  { label: "Apple Newsroom: iPhone Duo arrives at Apple Store locations worldwide (Oct 23, 2026)", url: "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/" },
];
