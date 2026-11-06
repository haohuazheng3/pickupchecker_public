/**
 * Who else sells the iPhone Duo in each country (the channel comparison page, seo.md §16): the carriers Apple names
 * for the country (its buy page names them only in the US and Japan; elsewhere Apple's own "wireless carrier support"
 * pages list the networks), the largest Apple Authorised Resellers with an iPhone Duo page of their own, the resale
 * marketplaces people there use, and Apple's standard change-of-mind return window. Facts only, each with its source,
 * verified 2026-11-06 (scratchpad channels-research.md). Stock levels of these sellers are not tracked anywhere on
 * this site. The iPhone Duo is eSIM-only in every country (Apple's buy pages).
 */
import type { CountryCode } from "@/lib/apple/countries";

export interface CountryChannels {
  carriers: string[];
  retailers: string[];
  resale: string[];
  /** Apple's standard change-of-mind return window in days; 0 = Apple accepts no change-of-mind returns there (Hong Kong); null = not confirmed. */
  returnDays: number | null;
  /** One sentence on carrier locking in that market, sourced. */
  carrierLock?: string;
  sources: { label: string; url: string }[];
}

export const CHANNELS: Record<CountryCode, CountryChannels> = {
  us: {
    carriers: ["Verizon", "AT&T", "T-Mobile"],
    retailers: ["Best Buy", "Walmart", "Target", "Costco"],
    resale: ["eBay", "Swappa", "Facebook Marketplace"],
    returnDays: 14,
    carrierLock: "Unlocked when bought from Apple; with AT&T, T-Mobile or Verizon carrier financing the iPhone stays locked to that carrier until paid in full.",
    sources: [
      { label: "Apple – Buy iPhone Duo (US)", url: "https://www.apple.com/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Returns & Refunds (US)", url: "https://www.apple.com/shop/help/returns_refund" },
      { label: "Best Buy – iPhone Duo", url: "https://www.bestbuy.com/site/searchpage.jsp?st=iphone+duo" },
      { label: "Target – iPhone Duo", url: "https://www.target.com/p/iphone-duo/-/A-1013575130" },
    ],
  },
  ca: {
    carriers: ["Rogers", "Bell", "TELUS", "Freedom Mobile"],
    retailers: ["Best Buy", "Costco"],
    resale: ["Kijiji", "Facebook Marketplace"],
    returnDays: 15,
    carrierLock: "Since 1 December 2017 the CRTC Wireless Code requires every new phone sold in Canada, carrier-bought included, to be unlocked.",
    sources: [
      { label: "Apple – Buy iPhone Duo (CA)", url: "https://www.apple.com/ca/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Returns & Refunds (CA)", url: "https://www.apple.com/ca/shop/help/returns_refund" },
      { label: "Best Buy Canada – iPhone Duo", url: "https://www.bestbuy.ca/en-ca/brand/apple/iphone/iphone-duo" },
      { label: "CRTC – End to locked cellphones", url: "https://www.canada.ca/en/radio-television-telecommunications/news/2017/06/crtc_puts_an_endtolockedcellphonesandunlockingfees.html" },
    ],
  },
  uk: {
    carriers: ["EE", "O2", "Vodafone", "Three"],
    retailers: ["Currys", "John Lewis", "Argos"],
    resale: ["eBay", "Facebook Marketplace"],
    returnDays: 14,
    carrierLock: "Ofcom banned UK networks from selling locked handsets from December 2021, so carrier-bought iPhones come unlocked.",
    sources: [
      { label: "Apple – Buy iPhone Duo (UK)", url: "https://www.apple.com/uk/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Returns & Refunds (UK)", url: "https://www.apple.com/uk/shop/help/returns_refund" },
      { label: "Currys – iPhone Duo", url: "https://www.currys.co.uk/deals-on-phones/iphone-duo" },
      { label: "Which? – Ofcom locked-phone ban", url: "https://www.which.co.uk/news/2020/10/mobile-providers-to-be-banned-from-selling-locked-phones" },
    ],
  },
  au: {
    carriers: ["Telstra", "Optus", "Vodafone"],
    retailers: ["JB Hi-Fi", "Harvey Norman", "Officeworks"],
    resale: ["Gumtree", "Facebook Marketplace"],
    returnDays: 14,
    carrierLock: "Postpaid iPhones from Telstra, Optus and Vodafone are sold unlocked; only some prepaid handsets are network-locked.",
    sources: [
      { label: "Apple – Buy iPhone Duo (AU)", url: "https://www.apple.com/au/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Returns & Refunds (AU)", url: "https://www.apple.com/au/shop/help/returns_refund" },
      { label: "JB Hi-Fi – iPhone Duo", url: "https://www.jbhifi.com.au/collections/mobile-phones/iphone-duo" },
      { label: "WhistleOut – Is my phone unlocked?", url: "https://www.whistleout.com.au/MobilePhones/Guides/is-my-phone-unlocked" },
    ],
  },
  de: {
    carriers: ["Telekom", "Vodafone", "O2", "1&1"],
    retailers: ["MediaMarkt", "Saturn", "Cyberport"],
    resale: ["Kleinanzeigen", "eBay"],
    returnDays: 14,
    carrierLock: "Apple and the main German networks (Telekom, Vodafone, O2) sell iPhones without SIM lock; only some prepaid bundles are locked.",
    sources: [
      { label: "Apple – iPhone Duo kaufen (DE)", url: "https://www.apple.com/de/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Rückgabe & Erstattung (DE)", url: "https://www.apple.com/de/shop/help/returns_refund" },
      { label: "Saturn – Apple iPhone Duo", url: "https://www.saturn.de/de/promo-list/apple_iphone_duo" },
      { label: "teltarif – SIM-Lock", url: "https://www.teltarif.de/handy/simlock.html" },
    ],
  },
  fr: {
    carriers: ["Orange", "SFR", "Bouygues Telecom", "Free Mobile"],
    retailers: ["Fnac", "Darty", "Boulanger"],
    resale: ["Leboncoin", "Facebook Marketplace"],
    returnDays: 14,
    carrierLock: "French operators now sell most phones unlocked (Free Mobile never SIM-locks); any remaining lock must be removed free after 3 months.",
    sources: [
      { label: "Apple – Acheter l'iPhone Duo (FR)", url: "https://www.apple.com/fr/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Retours et remboursements (FR)", url: "https://www.apple.com/fr/shop/help/returns_refund" },
      { label: "Boulanger – iPhone Duo", url: "https://www.boulanger.com/ref/1243118" },
      { label: "Selectra – Débloquer un téléphone", url: "https://selectra.info/telecom/aide/debloquer-telephone" },
    ],
  },
  it: {
    carriers: ["TIM", "Vodafone", "WindTre", "Iliad"],
    retailers: ["MediaWorld", "Unieuro"],
    resale: ["Subito", "eBay"],
    returnDays: 14,
    carrierLock: "Apple sells the iPhone in Italy without tying it to any carrier (unlocked); lock status of carrier-financed units not verified.",
    sources: [
      { label: "Apple – Acquista iPhone Duo (IT)", url: "https://www.apple.com/it/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Resi e rimborsi (IT)", url: "https://www.apple.com/it/shop/help/returns_refund" },
      { label: "MediaWorld – iPhone Duo 256GB", url: "https://www.mediaworld.it/it/product/_apple-iphone-duo-8256gb-256-gb-bianco-185369766.html" },
      { label: "Unieuro – iPhone Duo 256GB", url: "https://www.unieuro.it/online/iPhone/iPhone-Duo-256GB-Cielo-notturno-pidAPLIPHONEDUO256" },
    ],
  },
  es: {
    carriers: ["Movistar", "Orange", "Vodafone", "Yoigo"],
    retailers: ["El Corte Inglés", "MediaMarkt", "Carrefour"],
    resale: ["Wallapop", "Milanuncios"],
    returnDays: 14,
    carrierLock: "Apple sells the iPhone 'libre' (unlocked) in Spain; lock status of carrier-financed units not verified.",
    sources: [
      { label: "Apple – Comprar iPhone Duo (ES)", url: "https://www.apple.com/es/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Devoluciones y reembolsos (ES)", url: "https://www.apple.com/es/shop/help/returns_refund" },
      { label: "El Corte Inglés – Móviles y smartphones", url: "https://www.elcorteingles.es/electronica/moviles-y-smartphones/" },
      { label: "comprasmartphone – Dónde comprar iPhone Duo", url: "https://comprasmartphone.com/donde-comprar/apple-iphone-duo" },
    ],
  },
  jp: {
    carriers: ["NTT docomo", "au", "SoftBank", "Rakuten Mobile"],
    retailers: ["Yodobashi Camera", "Bic Camera", "Yamada Denki"],
    resale: ["Mercari", "Yahoo! Auctions"],
    returnDays: 14,
    carrierLock: "Since October 2021 Japan's MIC guidelines prohibit carriers from SIM-locking newly sold phones, so carrier iPhones come unlocked.",
    sources: [
      { label: "Apple – iPhone Duoを購入 (JP)", url: "https://www.apple.com/jp/shop/buy-iphone/iphone-duo" },
      { label: "Apple – 返品・返金 (JP)", url: "https://www.apple.com/jp/shop/help/returns_refund" },
      { label: "iPhone Mania – Duo 在庫情報 (家電量販店)", url: "https://iphone-mania.jp/?p=608231" },
      { label: "MIC – SIM lock guidelines", url: "https://www.soumu.go.jp/main_sosiki/joho_tsusin/eng/pressrelease/2022/5/02_01.html" },
    ],
  },
  kr: {
    carriers: ["SK Telecom", "KT", "LG U+"],
    retailers: ["Coupang", "Costco Korea", "Frisbee"],
    resale: ["Bunjang", "Danggeun Market"],
    returnDays: 14,
    carrierLock: "Apple sells unactivated iPhones in Korea unlocked; lock status of carrier-sold units not verified.",
    sources: [
      { label: "Apple – iPhone Duo 구입하기 (KR)", url: "https://www.apple.com/kr/shop/buy-iphone/iphone-duo" },
      { label: "Apple – 반품 및 환불 (KR)", url: "https://www.apple.com/kr/shop/help/returns_refund" },
      { label: "Coupang – Apple 브랜드관", url: "https://shop.coupang.com/apple/349642" },
      { label: "Costco Korea – iPhone Duo 256GB", url: "https://www.costco.co.kr/ElectronicsComputers/Apple/iPhone/Apple-iPhone-Duo-256GB/p/699523" },
    ],
  },
  hk: {
    carriers: ["csl", "SmarTone", "3 Hong Kong", "China Mobile Hong Kong"],
    retailers: ["Fortress", "Broadway"],
    resale: ["Carousell", "Facebook Marketplace"],
    returnDays: 0,
    carrierLock: "Apple sells the iPhone unlocked in Hong Kong; lock status of carrier-sold units not verified.",
    sources: [
      { label: "Apple – Buy iPhone Duo (HK)", url: "https://www.apple.com/hk/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Return and exchange policy (HK)", url: "https://www.apple.com/hk/shop/help/returns_refund" },
      { label: "Apple – Retail sales policy (HK)", url: "https://www.apple.com/hk/en/legal/sales_policies/retail.html" },
      { label: "Fortress – Apple iPhone", url: "https://www.fortress.com.hk/en/promotion/apple-iphone-18-pro" },
    ],
  },
  sg: {
    carriers: ["Singtel", "StarHub", "M1"],
    retailers: ["Harvey Norman", "Courts", "iStudio"],
    resale: ["Carousell", "Facebook Marketplace"],
    returnDays: 14,
    carrierLock: "Singapore's IMDA 'No SIM-Lock' policy bars operators from SIM-locking phones sold in Singapore.",
    sources: [
      { label: "Apple – Buy iPhone Duo (SG)", url: "https://www.apple.com/sg/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Returns & Refunds (SG)", url: "https://www.apple.com/sg/shop/help/returns_refund" },
      { label: "Harvey Norman Singapore – iPhone Duo", url: "https://www.harveynorman.com.sg/promotions/apple-iphone-duo.html" },
      { label: "Mothership – iPhone Duo Singapore launch", url: "https://mothership.sg/2026/10/iphone-duo-singapore-launch/" },
    ],
  },
  ae: {
    carriers: ["e& (Etisalat)", "du", "Virgin Mobile"],
    retailers: ["Sharaf DG", "Jumbo Electronics", "Virgin Megastore", "Emax"],
    resale: ["dubizzle", "Facebook Marketplace"],
    returnDays: 14,
    carrierLock: "Apple sells the iPhone unlocked in the UAE; lock status of carrier-sold units not verified.",
    sources: [
      { label: "Apple – Buy iPhone Duo (AE)", url: "https://www.apple.com/ae/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Returns & Refunds (AE)", url: "https://www.apple.com/ae/shop/help/returns_refund" },
      { label: "Jumbo Electronics – iPhone Duo", url: "https://www.jumbo.ae/apple-iphone-duo-smartphone-night-sky-2-tb.html" },
      { label: "Sharaf DG – iPhone Duo", url: "https://uae.sharafdg.com/ar/?p=6070215" },
    ],
  },
  ch: {
    carriers: ["Swisscom", "Sunrise", "Salt"],
    retailers: ["Digitec Galaxus", "MediaMarkt", "Interdiscount"],
    resale: ["Ricardo", "tutti.ch"],
    returnDays: 14,
    carrierLock: "Apple sells the iPhone without SIM lock in Switzerland; lock status of carrier-sold units not verified.",
    sources: [
      { label: "Apple – iPhone Duo kaufen (CH)", url: "https://www.apple.com/ch-de/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Rückgabe & Erstattung (CH)", url: "https://www.apple.com/ch-de/shop/help/returns_refund" },
      { label: "Digitec – iPhone Duo", url: "https://www.digitec.ch/en/page/buy-now-here-you-can-find-the-new-iphone-duo-models-44036" },
      { label: "MediaMarkt Schweiz – iPhone Duo", url: "https://www.mediamarkt.ch/de/category/iphone-duo-20260909064901.html" },
    ],
  },
  nl: {
    carriers: ["KPN", "Odido", "Vodafone"],
    retailers: ["Coolblue", "MediaMarkt", "Amac"],
    resale: ["Marktplaats", "Facebook Marketplace"],
    returnDays: 14,
    carrierLock: "Apple sells the iPhone simlock-free in the Netherlands; lock status of carrier-sold units not verified.",
    sources: [
      { label: "Apple – iPhone Duo kopen (NL)", url: "https://www.apple.com/nl/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Retourneren en terugbetalen (NL)", url: "https://www.apple.com/nl/shop/help/returns_refund" },
      { label: "Coolblue – iPhone Duo prijs", url: "https://www.coolblue.nl/en/advice/what-is-the-iphone-duo-price.html" },
      { label: "iCulture – Verkoop iPhone Duo gestart", url: "https://www.iculture.nl/nieuws/iphone-duo-verkoop-gestart/" },
    ],
  },
  se: {
    carriers: ["Telia", "Tele2", "Telenor", "Tre"],
    retailers: ["Elgiganten", "NetOnNet", "Power"],
    resale: ["Blocket", "Tradera"],
    returnDays: 14,
    carrierLock: "Apple sells the iPhone unlocked in Sweden; lock status of carrier-sold units not verified.",
    sources: [
      { label: "Apple – Köp iPhone Duo (SE)", url: "https://www.apple.com/se/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Returer och återbetalning (SE)", url: "https://www.apple.com/se/shop/help/returns_refund" },
      { label: "Elgiganten – iPhone Duo 256GB", url: "https://www.elgiganten.se/product/mobiler-tablets-smartklockor/mobiltelefon/apple-iphone-duo-smarttelefon-256gb-star-white/1141309" },
      { label: "PriceRunner – iPhone Duo", url: "https://www.pricerunner.se/sp/iphone-duo.html" },
    ],
  },
  tw: {
    carriers: ["Chunghwa Telecom", "Taiwan Mobile", "Far EasTone"],
    retailers: ["PChome 24h", "Tsann Kuen 3C", "Studio A", "Dei"],
    resale: ["Ruten", "Shopee"],
    returnDays: 14,
    carrierLock: "Apple sells the iPhone unlocked in Taiwan; lock status of carrier-sold units not verified.",
    sources: [
      { label: "Apple – 購買 iPhone Duo (TW)", url: "https://www.apple.com/tw/shop/buy-iphone/iphone-duo" },
      { label: "Apple – 退貨與退款 (TW)", url: "https://www.apple.com/tw/shop/help/returns_refund" },
      { label: "民報 – iPhone Duo 哪裡買 (PChome、燦坤)", url: "https://www.peoplenews.tw/?p=63165" },
      { label: "經濟日報 – 台灣大、遠傳預購", url: "https://money.udn.com/money/story/5607/9819868" },
    ],
  },
  at: {
    carriers: ["A1", "Magenta", "Drei"],
    retailers: ["MediaMarkt", "McShark", "Alza"],
    resale: ["willhaben", "Shpock"],
    returnDays: 14,
    carrierLock: "Apple sells the iPhone without SIM lock in Austria; lock status of carrier-sold units not verified.",
    sources: [
      { label: "Apple – iPhone Duo kaufen (AT)", url: "https://www.apple.com/at/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Rückgabe & Erstattung (AT)", url: "https://www.apple.com/at/shop/help/returns_refund" },
      { label: "MediaMarkt Österreich – iPhone Duo", url: "https://www.mediamarkt.at/de/brand/apple/iphone/duo" },
      { label: "durchblicker – iPhone 18 Pro in Österreich", url: "https://durchblicker.at/b/iphone-18-pro-oesterreich" },
    ],
  },
  be: {
    carriers: ["Proximus", "Orange", "Telenet", "BASE"],
    retailers: ["Coolblue", "Vanden Borre", "MediaMarkt"],
    resale: ["2dehands / 2ememain", "Facebook Marketplace"],
    returnDays: 14,
    carrierLock: "Apple sells the iPhone unlocked in Belgium; lock status of carrier-sold units not verified.",
    sources: [
      { label: "Apple – Acheter l'iPhone Duo (BE)", url: "https://www.apple.com/be-fr/shop/buy-iphone/iphone-duo" },
      { label: "Apple – Retours et remboursements (BE)", url: "https://www.apple.com/be-fr/shop/help/returns_refund" },
      { label: "Vanden Borre – iPhone Duo", url: "https://www.vandenborre.be/gsm-smartphone/apple-iphone/iphone-duo" },
      { label: "Coolblue België – iPhone Duo prijs", url: "https://www.coolblue.be/en/advice/what-is-the-iphone-duo-price.html" },
    ],
  },
};

export const channelsOf = (cc: CountryCode): CountryChannels => CHANNELS[cc];
