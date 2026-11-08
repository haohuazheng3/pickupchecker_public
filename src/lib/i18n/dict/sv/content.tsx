/**
 * Swedish strings: content — FAQ, browse rows, stat strips, product parts, sources, live widgets, the enrich
 * helpers (opening hours, durations, FAQ answers, titles), live tokens, the restock-pattern sentence and photo alt
 * text. Arguments arrive formatted ("31 påfyllningar", "kl. 9", "natthimmel"); the words go around them.
 */
import type { ReactNode } from "react";
import type { Forms } from "@/lib/i18n/format";
import type { Dict } from "../en";
import { NOUNS } from "./util";

const f = (x: Forms): Forms => x;

type Kind = "state" | "city" | "store" | "model";

/** The number at the start of a formatted count ("3 Apple Store-butiker" → 3). */
const lead = (count: string) => Number(count.replace(/^\D*(\d[\d\s ]*).*$/, "$1").replace(/\D/g, "")) || 0;

export const content: Dict["content"] = {
  hours: {
    closed: "Stängt",
    everyDay: (hours: string) => `Alla dagar ${hours}`,
    tomorrow: "i morgon",
    dayAt: (day: string, time: string) => `${day} kl. ${time}`,
    closedTodayOpens: (next: string) => `Stängt idag · öppnar ${next}`,
    closedToday: "Stängt idag",
    opensAt: (time: string) => `Öppnar kl. ${time}`,
    openNow: (closes: string) => `Öppet nu · stänger kl. ${closes}`,
    closedNowOpens: (next: string) => `Stängt nu · öppnar ${next}`,
    closedNow: "Stängt nu",
  },

  duration: {
    underAMinute: "under en minut",
    pair: (a: string, b: string) => `${a} ${b}`,
  },
  listMore: (k: string) => `${k} till`,
  nearLine: (place: string, distance: string) => `${place} (${distance})`,

  faq: {
    where: (kind: Kind, place: string) => (kind === "store" ? `på ${place}` : kind === "model" ? `för ${place}` : `i ${place}`),
    nRestocks: f({ one: "# påfyllning", other: "# påfyllningar" }),
    restockA: ({ count, where, days, week, peak }: { count: string | null; where: string; days: string; week: string; peak: { hour: string; day: string | null } | null }) =>
      `${count == null ? `Ingen påfyllning loggad ${where} de senaste ${days} dagarna` : `${count} ${where} de senaste ${days} dagarna, ${week} den här veckan`}${peak ? `, de flesta runt ${peak.hour} lokal tid${peak.day ? ` och oftast på ${peak.day}ar` : ""}` : ""}; Apple publicerar inget schema.`,
    lastsNone: (where: string) => `För få par av påfyllning och slutsålt ${where} för att mäta ännu.`,
    lasts: (days: string, duration: string) => `De senaste ${days} dagarna låg en påfylld konfiguration ute i ungefär ${duration} (median) innan den tog slut igen.`,
    storeIn: (store: string, line: string) => `${store} i ${line}`,
    nearestA: (stores: string) => `${stores}.`,

    modelStockQ: (model: string) => `Vilka Apple Store-butiker har ${model} i lager just nu?`,
    modelStockNone: (model: string) => `Inga vid senaste kontrollen; listan på sidan uppdateras så fort en Apple Store i USA listar ${model} för hämtning.`,
    nUsStores: f({ one: "# Apple Store i USA", other: "# Apple Store-butiker i USA" }),
    modelStockSome: (count: string) => `${count} vid senaste kontrollen, var och en med sina konfigurationer på den här sidan.`,
    priceQ: (model: string) => `Vad kostar ${model}?`,
    priceA: (low: string, high: string, storages: string, colors: string) => `Från ${low} till ${high} olåst beroende på lagring (${storages}), i ${colors}.`,
    modelRestockQ: (model: string) => `Hur ofta fylls ${model} på?`,
    modelLastsQ: (model: string) => `Hur länge finns ${model} kvar i lager när den väl dyker upp?`,
    reserveQ: (model: string) => `Kan jag reservera ${model} för hämtning?`,
    reserveA: "Nej; när en butik listar en konfiguration köper du den på apple.com och väljer Hämta i butik, och då hålls den åt dig till din tid.",

    storeStockQ: (store: string, model: string) => `Har ${store} ${model} i lager?`,
    nConfigs: f({ one: "# konfiguration", other: "# konfigurationer" }),
    storeStockYes: (count: string) => `Ja, ${count} vid senaste kontrollen; tabellen på sidan visar vilken lagring och färg.`,
    storeStockNo: (other: { pro: string; proMax: string } | null) => `Inte vid senaste kontrollen${other ? `, men den har ${other.pro} konfigurationer av iPhone 18 Pro och ${other.proMax} av 18 Pro Max` : ", och inte heller någon konfiguration av 18 Pro eller 18 Pro Max"}.`,
    hoursQ: (store: string) => `Vilka öppettider har ${store}?`,
    hoursA: ({ hours, today, address, phone }: { hours: string | null; today: string | null; address: string; phone: string | null }) =>
      `${hours ?? "Öppettiderna står på den här sidan"}${today ? `; idag ${today}` : ""}; ${address}${phone ? `, tel. ${phone}` : ""}.`,
    storeRestockQ: (store: string) => `Hur ofta fyller ${store} på iPhone?`,
    storeLastsQ: (store: string) => `Hur länge finns lagret kvar på ${store}?`,
    storeNearestQ: (store: string) => `Vilken Apple Store ligger närmast ${store}?`,

    placeStockQ: (place: string, model: string) => `Vilka Apple Store-butiker i ${place} har ${model} i lager just nu?`,
    placeStockNone: (place: string, model: string) => `Inga vid senaste kontrollen; sidan uppdateras i samma ögonblick som en butik i ${place} listar ${model} för hämtning.`,
    nStores: f({ one: "# butik", other: "# butiker" }),
    placeStockSome: (count: string, stores: string) => `${count} vid senaste kontrollen: ${stores}.`,
    countQ: (place: string) => `Hur många Apple Store finns det i ${place}?`,
    nAppleStores: f({ one: "# Apple Store", other: "# Apple Store-butiker" }),
    countMany: (count: string, stores: string) => (lead(count) > 3 ? `${count}, bland annat ${stores}.` : `${count}: ${stores}.`),
    countOne: (count: string, store: string) => `${count}: ${store}.`,
    placeRestockQ: (place: string) => `Hur ofta fyller Apple Store-butikerna i ${place} på iPhone?`,
    placeLastsQ: (place: string) => `Hur länge finns lagret kvar i ${place}?`,
    placeNearestQ: (place: string) => `Vilken Apple Store utanför ${place} ligger närmast?`,
  },

  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? `på ${place}` : kind === "model" ? "i alla Apple Store-butiker i USA" : `i Apple Store-butikerna i ${place}`;
    return [
      "Lager för hämtning säljs på apple.com: du väljer konfiguration och butik i kassan, betalar online och hämtar i butiken, ofta samma dag. Det är skilt från lagret på hyllorna och från operatörernas butiker.",
      `PickupChecker kollar varje bevakad konfiguration ${at} var 15:e sekund, och var 5:e när en bevakning pekar dit; en ändring räknas först efter en andra, bekräftande kontroll, så ett fel blir aldrig en falsk påfyllning eller ett falskt slutsålt.`,
      "Varje bekräftad ändring loggas; den loggen matar påfyllningsdiagrammet och historiken på den här sidan.",
    ];
  },
  alertRule: "En bevakning = en butik, en modell, en lagringsstorlek, en färg; en notis (eller ett mejl) går ut inom några sekunder från att apple.com slår om till tillgänglig.",

  titles: {
    state: (name: string, duoNow: string, stores: string) => [
      `Apple Store i ${name}: ${duoNow} av ${stores} har iPhone Duo nu`,
      `Apple Store i ${name} – iPhone Duo att hämta, live`,
      `Apple Store i ${name} – iPhone Duo i lager`,
      `Apple Store ${name} – iPhone i lager`,
    ],
    city: (city: string, code: string, duoNow: string, stores: string) => [
      `Apple Store i ${city}, ${code}: ${duoNow} av ${stores} har iPhone Duo`,
      `Apple Store i ${city}, ${code} – iPhone Duo att hämta`,
      `Apple Store i ${city}, ${code} – iPhone Duo i lager`,
      `Apple Store ${city} – iPhone i lager`,
    ],
    store: (name: string, region: string | null) => {
      const r = region ? ` (${region})` : "";
      return [
        `${name}${r}: iPhone i lager idag, hämtning & öppettider`,
        `${name}${r}: iPhone i lager idag & öppettider`,
        `${name}${r}: iPhone i lager & öppettider`,
        `${name}: iPhone i lager idag, hämtning & öppettider`,
        `${name}: iPhone i lager & öppettider`,
        `${name}: iPhone i lager`,
        `${name} – lager`,
      ];
    },
    model: (name: string, storesNow: string) => [
      `${name} att hämta: ${storesNow} Apple Store-butiker har den just nu`,
      `${name} att hämta: ${storesNow} butiker har den nu`,
      `${name} – lager för hämtning i butik, live`,
    ],
  },

  tokens: {
    tooFewToMeasure: "för få för att mäta ännu",
    noneLoggedYet: "ingen loggad ännu",
    noneYet: "ingen ännu",
  },

  pattern: {
    none: (days: string) => `Ingen bekräftad påfyllning de senaste ${days} dagarna.`,
    nConfirmed: f({ one: "# bekräftad påfyllning", other: "# bekräftade påfyllningar" }),
    countIn: (count: string, days: string) => `${count} de senaste ${days} dagarna`,
    stay: (minutes: string) => `; ligger normalt ute ~${minutes} min innan den tar slut`,
    nDays: f({ one: "# dag", other: "# dagar" }),
    tooFew: (count: string, onDays: string | null, stay: string) => `${count}${onDays ? ` på ${onDays}` : ""} – för få för att se ett mönster ännu${stay}.`,
    usual: (hour: string, weekday: string | null, count: string, stay: string) => `Fyller oftast på runt ${hour} lokal tid${weekday ? `, flest på ${weekday}ar` : ""}; ${count}${stay}.`,
  },

  regionNouns: Object.fromEntries(Object.entries(NOUNS).map(([k, [one, other]]) => [k, f({ one, other })])) as Record<string, Forms>,

  measured: "Så mäts det",

  faqTitle: "Vanliga frågor",
  breadcrumb: "Sökväg",
  keepExploring: "Utforska vidare",
  browse: {
    storesByState: "Butiker per delstat",
    allStatesCities: "Alla delstater och städer →",
    liveByModel: "Lager live per modell",
    modelStock: (model: string) => `${model} i lager`,
    thisPage: "den här sidan",
    restockLog: (short: string) => `Påfyllningslogg: ${short}`,
    liveMap: "Livekarta",
    mostStores: "Flest butiker",
    allStates: "Alla delstater",
    bigCities: "Storstäder",
    cities: "Städer",
    storesBy: (region: string) => `Butiker per ${region}`,
    allStoresIn: ({ country }: { inName: string; country: string }) => <>Alla Apple Store-butiker i {country} →</>,
    allRegions: (regions: string) => `Alla ${regions}`,
  },
  modelCards: "Per iPhone",
  narrative: {
    lastRestock: (config: ReactNode, at: ReactNode, ago: ReactNode) => <>{" "}Senaste påfyllning: {config}{at}, {ago}.</>,
    at: (store: ReactNode) => <> på {store}</>,
  },
  statStrip: {
    inStockNow: "I lager nu",
    ofStores: (k: string) => `av ${k} butiker`,
    stores: "Butiker",
    nCities: f({ one: "# stad", other: "# städer" }),
    tracked: "bevakade",
    modelNow: (short: string) => `${short} nu`,
    configsInStock: "konfig. i lager",
    storesWithStock: f({ one: "butik med lager", other: "butiker med lager" }),
    restocks24h: "Påfyllningar 24 tim",
    scoped: (label: string, model: string) => `${label} · ${model}`,
    restocksHint: (week: string, month: string, days: string) => `${week} på 7 d · ${month} på ${days} d`,
    sellOuts: (days: string) => `Slutsålda ${days} d`,
    stays: (duration: string) => `ligger ute ~${duration}`,
    noPairs: "inga par ännu",
    lastRestock: "Senaste påfyllning",
    noneYet: "ingen ännu",
    inLastDays: (days: string) => `de senaste ${days} dagarna`,
  },
  product: {
    chooseIphone: "Välj iPhone",
    storage: "Lagring",
    color: "Färg",
    all: "Alla",
    numbersAre: (u: ReactNode) => <>Siffror = {u} med lager nu.</>,
    seen: (ago: ReactNode) => <>sedd {ago}</>,
    last: (ago: ReactNode) => <>senast {ago}</>,
    notSeenYet: "inte sedd än",
    firstCheckPending: "första kontrollen väntar",
    inStock: "I lager",
    inStockLower: "i lager",
    none: "inga",
    here: "här",
    notAvailable: "Inte tillgänglig",
    notCheckedYet: "Inte kollad än",
    availableForPickup: "Tillgänglig för hämtning",
    since: (ago: ReactNode) => <> · sedan {ago}</>,
    lastInStock: (ago: ReactNode) => <>Senast i lager {ago}</>,
    neverSeen: "Aldrig sedd i lager här än",
    firstCheckSoon: "Första kontrollen inom en minut",
    buy: "Köp på apple.com",
    checked: (checked: ReactNode, note: ReactNode) => <>Kollad {checked} · {note}</>,
    checkNote: "var 15:e sekund, var 5:e med bevakning",
  },

  source: (s: ReactNode) => <>Källa: {s}</>,
  photoCredit: (link: ReactNode) => <>Foto: {link}</>,
  sources: "Källor",
  allUsStores: "alla 269 Apple Store-butiker i USA",
  trackerSource: (where: ReactNode, since: ReactNode, asOf: ReactNode) => <>PickupCheckers livebevakning: varje konfiguration av iPhone Duo, 18 Pro och 18 Pro Max i {where}, kollad var 15:e sekund (var 5:e för butiker med bevakning) sedan {since}; siffrorna på sidan per {asOf}.</>,
  live: {
    configsCaption: (stores: ReactNode, model: ReactNode) => <>Apple Store-butiker (av {stores}) med varje konfiguration av {model} att hämta nu · live</>,
    storage: "Lagring",
    pricesCaption: (model: ReactNode) => <>Priser för {model} på apple.com (olåst, före skatt) och lager för hämtning live</>,
    price: "Pris",
    bestColor: "Bästa färgen, butiker nu",
    noRestock: (model: string) => `Ingen påfyllning av ${model} loggad ännu.`,
    clockLabel: (model: string) => `för ${model} i hela landet`,
    storesWithIt: "Butiker med den nu",
    pairsInStock: "Butik × konfig. i lager",
    restocksLogged: "Loggade påfyllningar",
    medianTime: "Mediantid i lager",
    underOneMin: (min: string) => `< ${min}`,
  },

  photos: {
    "apple-store-pickup-counter": { alt: "Disk av trä med en skylt för hämtning inne i en Apple Store", caption: "Beställningar för hämtning lämnas ut vid en disk som den här." },
    "phone-map": { alt: "Händer som navigerar med en kartapp i mobilen utomhus", caption: "Avståndet spelar större roll än man tror när en påfyllning varar en minut." },
    "phone-card-payment": { alt: "En kvinna med en iPhone och ett betalkort som betalar online", caption: "Betalning online för hämtning i butik." },
    "phone-on-box": { alt: "En ny mobiltelefon som ligger på sin vita kartong", caption: "En ny telefon, direkt ur kartongen." },
    "city-map-phone": { alt: "Två personer som tittar på en stadskarta i mobilen", caption: "Vägen till butiken planeras." },
    "phone-notification": { alt: "En hand som håller en mobil med notiser på låsskärmen", caption: "En notis landar på låsskärmen." },
    "apple-store-crowd-inside": { alt: "Folk som köar inne i en välbesökt Apple Store i ett köpcentrum", caption: "Trängsel i en Apple Store under lanseringsveckan: lagret som når hyllorna tar slut på minuter." },
    "apple-store-glass-canopy": { alt: "Apple Store med glasfasad och tak av trä på kvällen", caption: "En Apple Store med glasfasad efter mörkrets inbrott." },
    "apple-store-night-vancouver": { alt: "En upplyst Apple Store en kväll i Vancouver", caption: "Apple Store på kvällen: lager för hämtning kan dyka upp när som helst, men kommer betydligt oftare på morgonen." },
    "phone-hand-camera": { alt: "En person som håller en iPhone med trippelkamera", caption: "Det är Pro-modellerna folk köar för." },
    "place-se-sweden": { alt: "Riddarholmskyrkan och kajen vid Gamla stan i Stockholm", caption: "Riddarholmen vid Gamla stan i Stockholm." },
  },
};
