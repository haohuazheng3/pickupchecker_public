/** Home page copy (seo.md P01): the category tool. Titles live in titles.ts (HOME_TITLES). */
import type { Block, Faq, Source } from "@/lib/content/types";

export const HOME_INTRO = "**{{duo.storesNow}} of 269** US Apple Stores list the iPhone Duo for pickup now; the 18 Pro is at **{{pro.storesNow}}**, the 18 Pro Max at **{{pm.storesNow}}**.";

export const HOME_SECTIONS: Record<string, { lead: string; blocks: Block[] }> = {
  "apple inventory checker": {
    lead: "PickupChecker reads apple.com's in-store pickup availability for all **40 configurations** at every US Apple Store **every 15 seconds**, **every 5** for alert stores.",
    blocks: [
      { t: "table", head: ["Model", "Configurations", "Stores with stock now", "Restocks logged"], rows: [["[iPhone Duo](/stock/iphone-duo)", "8", "{{duo.storesNow}}", "{{duo.restocks}}"], ["[iPhone 18 Pro](/stock/iphone-18-pro)", "16", "{{pro.storesNow}}", "{{pro.restocks}}"], ["[iPhone 18 Pro Max](/stock/iphone-18-pro-max)", "16", "{{pm.storesNow}}", "{{pm.restocks}}"]], caption: "What the checker sees right now (restocks since {{trackingSince}})", source: "PickupChecker live tracker of all 269 US Apple Stores" },
      { t: "ul", items: [
        "**Two checks to count:** a change shows only after a second check confirms it",
        "**No fake restocks:** one glitchy apple.com response never counts",
        "**Restock log:** every confirmed change goes into the [restock log](/restocks)",
        "**Store charts:** the restock-time charts on store pages come from that log",
      ] },
      { t: "img", id: "phone-notification" },
    ],
  },
  "apple store stock checker": {
    lead: "Checking is free; the paid part is not having to check: a push **seconds** after one of your stores lists your exact phone.",
    blocks: [
      { t: "ol", items: [
        "Tap **Alert me**; choose the iPhone, storage and color.",
        "Tick the stores you can reach: nearest first, with miles and drive time.",
        "On an iPhone, add PickupChecker to your Home Screen and allow notifications ([how to install](/install)).",
        "When the push arrives, open apple.com from it and check out with in-store pickup.",
      ] },
      { t: "table", head: ["Plan", "Price", "Alerts"], rows: [["Plus", "$5 a month", "10"], ["Pro", "$10 a month", "20"], ["Max", "$20 a month", "50"]], caption: "One alert = one store × one exact configuration ([pricing](/pricing))", source: "PickupChecker pricing" },
      { t: "note", text: "**Our take:** set Duo alerts at 3–5 stores; for the 18 Pro and Pro Max look at the live numbers first, because most configurations are in stock at most stores." },
      { t: "img", id: "apple-store-pickup-counter" },
    ],
  },
};

export const HOME_FAQ: Faq[] = [
  { q: "How fast are the alerts?", a: "Alert stores are checked every 5 seconds, every US Apple Store every 15; a first \"available\" is re-checked within a second so an Apple glitch never becomes an alert, and the push reaches your phone about 3 seconds later. Duo restocks stay listed for a median of {{duo.medianStay}}, which is why speed matters." },
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
