/**
 * German strings: content — SEO building blocks, the enrich helpers (opening hours, durations, FAQ answers,
 * titles), live {{tokens}}, the restock-pattern sentence and photo alt text. Arguments arrive written for German
 * (numbers formatted, names in Apple's German form, counts with their noun).
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import type { Forms } from "@/lib/i18n/format";
import { inOrt } from "./util";

const f = (x: Forms): Forms => x;
type Kind = "state" | "city" | "store" | "model";

export const content: Dict["content"] = {
  hours: {
    closed: "Geschlossen",
    everyDay: (hours: string) => `Täglich ${hours}`,
    tomorrow: "morgen",
    dayAt: (day: string, time: string) => `${day} um ${time}`,
    closedTodayOpens: (next: string) => `Heute geschlossen · öffnet ${next}`,
    closedToday: "Heute geschlossen",
    opensAt: (time: string) => `Öffnet um ${time}`,
    openNow: (closes: string) => `Jetzt geöffnet · schließt um ${closes}`,
    closedNowOpens: (next: string) => `Jetzt geschlossen · öffnet ${next}`,
    closedNow: "Jetzt geschlossen",
  },

  duration: {
    underAMinute: "unter einer Minute",
    pair: (a: string, b: string) => `${a} ${b}`,
  },
  listMore: (n: string) => `${n} weitere`,
  nearLine: (place: string, distance: string) => `${place} (${distance})`,

  faq: {
    where: (kind: Kind, place: string) => (kind === "store" ? `bei ${place}` : kind === "model" ? `für das ${place}` : inOrt(place)),
    nRestocks: f({ one: "# Restock", other: "# Restocks" }),
    restockA: ({ count, where, days, week, peak }: { count: string | null; where: string; days: string; week: string; peak: { hour: string; day: string | null } | null }) =>
      `${count == null ? `Kein Restock ${where} in den letzten ${days} Tagen` : `${count} ${where} in den letzten ${days} Tagen, ${week} davon diese Woche`}${peak ? `, die meisten gegen ${peak.hour} Ortszeit${peak.day ? ` und am häufigsten am ${peak.day}` : ""}` : ""}; einen Zeitplan veröffentlicht Apple nicht.`,
    lastsNone: (where: string) => `Noch zu wenige Restocks mit anschließendem Ausverkauf ${where}, um das zu messen.`,
    lasts: (days: string, duration: string) => `In den letzten ${days} Tagen blieb eine wieder verfügbare Konfiguration im Median etwa ${duration} gelistet, bevor sie wieder ausverkauft war.`,
    storeIn: (store: string, line: string) => `${store} in ${line}`,
    nearestA: (stores: string) => `${stores}.`,

    modelStockQ: (model: string) => `Welche Apple Stores haben das ${model} gerade vorrätig?`,
    modelStockNone: (model: string) => `Bei der letzten Prüfung keiner; die Liste auf dieser Seite aktualisiert sich, sobald ein Apple Store in den USA das ${model} zur Abholung anbietet.`,
    nUsStores: f({ one: "# Apple Store in den USA", other: "# Apple Stores in den USA" }),
    modelStockSome: (count: string) => `${count} bei der letzten Prüfung, jeder auf dieser Seite mit den Konfigurationen, die er hat.`,
    priceQ: (model: string) => `Was kostet das ${model}?`,
    priceA: (low: string, high: string, storages: string, colors: string) => `Ohne Vertrag ${low} bis ${high}, je nach Speicher (${storages}), in ${colors}.`,
    modelRestockQ: (model: string) => `Wie oft ist das ${model} wieder vorrätig?`,
    modelLastsQ: (model: string) => `Wie lange bleibt das ${model} verfügbar, wenn es auftaucht?`,
    reserveQ: (model: string) => `Kann ich das ${model} zur Abholung reservieren?`,
    reserveA: "Nein. Sobald ein Store eine Konfiguration anbietet, kaufen Sie sie auf apple.com mit Abholung im Store; dann wird sie für Ihr Zeitfenster zurückgelegt.",

    storeStockQ: (store: string, model: string) => `Hat ${store} das ${model} vorrätig?`,
    nConfigs: f({ one: "# Konfiguration", other: "# Konfigurationen" }),
    storeStockYes: (count: string) => `Ja, ${count} bei der letzten Prüfung; die Tabelle auf dieser Seite zeigt Speicher und Farbe.`,
    storeStockNo: (other: { pro: string; proMax: string } | null) => `Bei der letzten Prüfung nicht${other ? `, dafür ${other.pro} Konfigurationen des iPhone 18 Pro und ${other.proMax} des 18 Pro Max` : ", und auch keine Konfiguration des 18 Pro oder 18 Pro Max"}.`,
    hoursQ: (store: string) => `Wie sind die Öffnungszeiten von ${store}?`,
    hoursA: ({ hours, today, address, phone }: { hours: string | null; today: string | null; address: string; phone: string | null }) =>
      `${hours ?? "Die Öffnungszeiten stehen auf dieser Seite"}${today ? `; heute ${today}` : ""}; ${address}${phone ? `, Tel. ${phone}` : ""}.`,
    storeRestockQ: (store: string) => `Wie oft ist das iPhone bei ${store} wieder vorrätig?`,
    storeLastsQ: (store: string) => `Wie lange bleibt die Ware bei ${store} verfügbar?`,
    storeNearestQ: (store: string) => `Welcher andere Apple Store liegt ${store} am nächsten?`,

    placeStockQ: (place: string, model: string) => `Welche Apple Stores ${inOrt(place)} haben das ${model} gerade vorrätig?`,
    placeStockNone: (place: string, model: string) => `Bei der letzten Prüfung keiner; diese Seite aktualisiert sich, sobald ein Store ${inOrt(place)} das ${model} zur Abholung anbietet.`,
    nStores: f({ one: "# Store", other: "# Stores" }),
    placeStockSome: (count: string, stores: string) => `${count} bei der letzten Prüfung: ${stores}.`,
    countQ: (place: string) => `Wie viele Apple Stores gibt es ${inOrt(place)}?`,
    nAppleStores: f({ one: "# Apple Store", other: "# Apple Stores" }),
    countMany: (count: string, stores: string) => `${count}, darunter ${stores}.`,
    countOne: (count: string, store: string) => `${count}: ${store}.`,
    placeRestockQ: (place: string) => `Wie oft sind iPhones in den Apple Stores ${inOrt(place)} wieder vorrätig?`,
    placeLastsQ: (place: string) => `Wie lange bleibt die Ware ${inOrt(place)} verfügbar?`,
    placeNearestQ: (place: string) => `Welcher Apple Store außerhalb von ${place} liegt am nächsten?`,
  },

  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? `bei ${place}` : kind === "model" ? "in jedem Apple Store in den USA" : `in den Apple Stores ${inOrt(place)}`;
    return [
      "Abhol-Ware wird auf apple.com verkauft: Konfiguration und Store im Checkout wählen, online bezahlen, im Store abholen – oft noch am selben Tag. Das ist getrennt vom Regal im Laden und von Mobilfunk-Shops.",
      `PickupChecker prüft jede erfasste Konfiguration ${at} alle 15 Sekunden, mit Alarm alle 5; eine Änderung zählt erst nach einer zweiten, bestätigenden Prüfung, damit ein Aussetzer nie als falscher Restock oder Ausverkauf erscheint.`,
      "Jede bestätigte Änderung wird protokolliert; dieses Protokoll speist das Restock-Diagramm und den Verlauf auf dieser Seite.",
    ];
  },
  alertRule: "Ein Alarm = ein Store, ein Modell, eine Speichergröße, eine Farbe; ein Push geht Sekunden nach dem Sprung auf „verfügbar“ bei apple.com raus.",

  titles: {
    state: (name: string, duoNow: string, stores: string) => [
      `Apple Stores ${inOrt(name)}: ${duoNow} von ${stores} haben das iPhone Duo`,
      `Apple Stores ${inOrt(name)}: iPhone-Duo-Verfügbarkeit live`,
      `Apple Stores ${inOrt(name)}: iPhone-Duo-Verfügbarkeit`,
      `Apple Store ${name}: iPhone-Verfügbarkeit`,
    ],
    city: (city: string, code: string, duoNow: string, stores: string) => [
      `Apple Stores in ${city}, ${code}: ${duoNow} von ${stores} haben das iPhone Duo`,
      `Apple Stores in ${city}, ${code}: iPhone-Duo-Verfügbarkeit`,
      `Apple Stores in ${city}: iPhone-Duo-Verfügbarkeit`,
      `Apple Store ${city}: iPhone-Verfügbarkeit`,
    ],
    store: (name: string, region: string | null) => {
      const r = region ? ` (${region})` : "";
      return [
        `${name}${r}: iPhone-Verfügbarkeit heute & Öffnungszeiten`,
        `${name}${r}: iPhone-Verfügbarkeit & Öffnungszeiten`,
        `${name}${r}: iPhone-Bestand & Öffnungszeiten`,
        `${name}${r}: iPhone-Verfügbarkeit heute`,
        `${name}${r}: iPhone-Bestand heute`,
        `${name}${r}: iPhone-Bestand`,
        `${name}: iPhone-Verfügbarkeit & Öffnungszeiten`,
        `${name}: iPhone-Verfügbarkeit heute`,
        `${name}: iPhone-Verfügbarkeit`,
        `${name} – Verfügbarkeit`,
      ];
    },
    model: (name: string, storesNow: string) => [
      `${name} zur Abholung: ${storesNow} Apple Stores haben es gerade`,
      `${name}: in ${storesNow} Apple Stores gerade verfügbar`,
      `${name}: Abhol-Verfügbarkeit live`,
    ],
  },

  tokens: {
    tooFewToMeasure: "noch zu wenige Daten",
    noneLoggedYet: "noch keiner erfasst",
    noneYet: "noch keiner",
  },

  pattern: {
    none: (days: string) => `Kein bestätigter Restock in den letzten ${days} Tagen.`,
    nConfirmed: f({ one: "# bestätigter Restock", other: "# bestätigte Restocks" }),
    countIn: (count: string, days: string) => `${count} in den letzten ${days} Tagen`,
    stay: (minutes: string) => `; meist ~${minutes} Min. gelistet, bevor ausverkauft`,
    nDays: f({ one: "# Tag", other: "# Tagen" }),
    tooFew: (count: string, onDays: string | null, stay: string) => `${count}${onDays ? ` an ${onDays}` : ""} – noch zu wenige für ein Muster${stay}.`,
    usual: (hour: string, weekday: string | null, count: string, stay: string) => `Restocks meist gegen ${hour} Ortszeit${weekday ? `, am häufigsten am ${weekday}` : ""}; ${count}${stay}.`,
  },

  regionNouns: {
    state: f({ one: "Bundesland", other: "Bundesländer" }),
    province: f({ one: "Provinz", other: "Provinzen" }),
    area: f({ one: "Region", other: "Regionen" }),
    department: f({ one: "Département", other: "Départements" }),
    prefecture: f({ one: "Präfektur", other: "Präfekturen" }),
    emirate: f({ one: "Emirat", other: "Emirate" }),
    canton: f({ one: "Kanton", other: "Kantone" }),
    region: f({ one: "Region", other: "Regionen" }),
    county: f({ one: "Provinz", other: "Provinzen" }),
    city: f({ one: "Stadt", other: "Städte" }),
  } as Record<string, Forms>,

  measured: "So wird gemessen",

  faqTitle: "Häufige Fragen",
  breadcrumb: "Navigationspfad",
  keepExploring: "Weiter stöbern",
  browse: {
    storesByState: "Stores nach Bundesstaat",
    allStatesCities: "Alle Bundesstaaten & Städte →",
    liveByModel: "Live-Verfügbarkeit nach Modell",
    modelStock: (model: string) => `${model}: Verfügbarkeit`,
    thisPage: "diese Seite",
    restockLog: (short: string) => `${short}: Restock-Protokoll`,
    liveMap: "Live-Karte",
    mostStores: "Meiste Stores",
    allStates: "Alle Bundesstaaten",
    bigCities: "Großstädte",
    cities: "Städte",
    storesBy: (region: string) => `Stores nach ${region}`,
    allStoresIn: ({ country }: { inName: string; country: string }) => <>Alle Apple Stores {inOrt(country)} →</>,
    allRegions: (regions: string) => `Alle ${regions}`,
  },
  modelCards: "Nach iPhone",
  narrative: {
    lastRestock: (config: ReactNode, at: ReactNode, ago: ReactNode) => <>{" "}Letzter Restock: {config}{at}, {ago}.</>,
    at: (store: ReactNode) => <> bei {store}</>,
  },
  statStrip: {
    inStockNow: "Jetzt vorrätig",
    ofStores: (n: string) => `von ${n} Stores`,
    stores: "Stores",
    nCities: f({ one: "# Stadt", other: "# Städte" }),
    tracked: "erfasst",
    modelNow: (short: string) => `${short} jetzt`,
    configsInStock: "Konfig. vorrätig",
    storesWithStock: f({ one: "Store mit Bestand", other: "Stores mit Bestand" }),
    restocks24h: "Restocks 24 Std.",
    restocksHint: (week: string, month: string, days: string) => `${week} in 7 Tg. · ${month} in ${days} Tg.`,
    sellOuts: (days: string) => `Ausverkäufe ${days} Tg.`,
    stays: (duration: string) => `bleibt ~${duration}`,
    noPairs: "noch keine Paare",
    lastRestock: "Letzter Restock",
    noneYet: "noch keiner",
    inLastDays: (days: string) => `in den letzten ${days} Tagen`,
  },
  product: {
    chooseIphone: "iPhone wählen",
    storage: "Speicher",
    color: "Farbe",
    all: "Alle",
    numbersAre: (unit: ReactNode) => <>Zahlen = {unit} mit Bestand jetzt.</>,
    seen: (ago: ReactNode) => <>gesehen {ago}</>,
    last: (ago: ReactNode) => <>zuletzt {ago}</>,
    notSeenYet: "noch nicht gesehen",
    firstCheckPending: "erste Prüfung läuft",
    inStock: "Vorrätig",
    inStockLower: "vorrätig",
    none: "keine",
    here: "hier",
    notAvailable: "Nicht verfügbar",
    notCheckedYet: "Noch nicht geprüft",
    availableForPickup: "Zur Abholung verfügbar",
    since: (ago: ReactNode) => <> · aufgetaucht {ago}</>,
    lastInStock: (ago: ReactNode) => <>Zuletzt vorrätig {ago}</>,
    neverSeen: "Hier noch nie vorrätig gesehen",
    firstCheckSoon: "Erste Prüfung innerhalb einer Minute",
    buy: "Auf apple.com kaufen",
    checked: (checked: ReactNode, note: ReactNode) => <>Geprüft {checked} · {note}</>,
    checkNote: "alle 15 Sek., 5 Sek. mit Alarm",
  },

  source: (source: ReactNode) => <>Quelle: {source}</>,
  photoCredit: (link: ReactNode) => <>Foto: {link}</>,
  sources: "Quellen",
  allUsStores: "alle 269 Apple Stores in den USA",
  trackerSource: (where: ReactNode, since: ReactNode, asOf: ReactNode) => <>PickupChecker-Live-Tracker: jede Konfiguration von iPhone Duo, 18 Pro und 18 Pro Max – {where}, alle 15 Sekunden geprüft (Stores mit Alarm alle 5), seit {since}; Zahlen auf dieser Seite Stand {asOf}.</>,
  live: {
    configsCaption: (stores: ReactNode, model: ReactNode) => <>Apple Stores (von {stores}), die jede {model}-Konfiguration jetzt zur Abholung haben · live</>,
    storage: "Speicher",
    pricesCaption: (model: ReactNode) => <>{model}: Preise auf apple.com (ohne Vertrag, vor Steuern) und Live-Verfügbarkeit</>,
    price: "Preis",
    bestColor: "Beste Farbe, Stores jetzt",
    noRestock: (model: string) => `Noch kein Restock des ${model} erfasst.`,
    clockLabel: (model: string) => `für das ${model} landesweit`,
    storesWithIt: "Stores mit Bestand jetzt",
    pairsInStock: "Store × Konfig. vorrätig",
    restocksLogged: "Erfasste Restocks",
    medianTime: "Median-Dauer vorrätig",
    underOneMin: (min: string) => `< ${min}`,
  },

  photos: {
    "apple-store-pickup-counter": { alt: "Holztheke mit Abhol-Schild in einem Apple Store", caption: "Abholbestellungen werden an einer Theke wie dieser übergeben." },
    "phone-map": { alt: "Hände navigieren draußen mit einer Karten-App auf dem Smartphone", caption: "Die Entfernung zählt mehr, als man denkt, wenn ein Restock eine Minute dauert." },
    "phone-card-payment": { alt: "Eine Frau hält ein iPhone und eine Kreditkarte, um online zu bezahlen", caption: "Online bezahlen, im Store abholen." },
    "phone-on-box": { alt: "Ein neues Smartphone auf seinem weißen Karton", caption: "Ein neues iPhone, frisch aus dem Karton." },
    "city-map-phone": { alt: "Zwei Personen sehen sich einen Stadtplan auf dem Handy an", caption: "Den Weg zum Store planen." },
    "phone-notification": { alt: "Hand hält ein Handy mit Mitteilungen auf dem Sperrbildschirm", caption: "Ein Alarm kommt auf dem Sperrbildschirm an." },
    "apple-store-crowd-inside": { alt: "Menschenmenge in einem vollen Apple Store in einem Einkaufszentrum", caption: "Andrang in der Launch-Woche: Was ins Regal kommt, ist in Minuten weg." },
    "apple-store-glass-canopy": { alt: "Apple Store mit Glasfassade und Holzvordach bei Nacht", caption: "Ein Apple Store mit Glasfront nach Einbruch der Dunkelheit." },
    "apple-store-night-vancouver": { alt: "Ein beleuchteter Apple Store bei Nacht in Vancouver", caption: "Apple Store bei Nacht: Abhol-Ware kann zu jeder Stunde auftauchen, morgens aber weit häufiger." },
    "phone-hand-camera": { alt: "Person hält ein iPhone mit Dreifach-Kamera", caption: "Für die Pro-Modelle stehen die Leute Schlange." },
    "place-at-vienna": { alt: "Der Stephansdom über den Dächern Wiens unter blauem Himmel", caption: "Der Stephansdom über der Wiener Altstadt." },
    "place-ch-geneva": { alt: "Luftaufnahme der Fontäne Jet d’Eau im Genfersee mit der Stadt und den Bergen dahinter", caption: "Der Jet d’Eau im Genfersee." },
    "place-ch-zurich": { alt: "Die Doppeltürme des Grossmünsters über der Limmat in der Zürcher Altstadt", caption: "Grossmünster und Limmat, Zürich." },
    "place-de-bavaria": { alt: "Schloss Neuschwanstein über grünem Wald im bayerischen Allgäu", caption: "Schloss Neuschwanstein, Schwangau, Bayern." },
    "place-de-berlin": { alt: "Der Berliner Dom mit dem Fernsehturm dahinter", caption: "Berliner Dom und Fernsehturm." },
    "place-de-brandenburg-gate": { alt: "Das Brandenburger Tor in Berlin an einem klaren Tag", caption: "Das Brandenburger Tor, Berlin." },
    "place-de-cologne": { alt: "Der Kölner Dom hinter der Hohenzollernbrücke über den Rhein an einem sonnigen Tag", caption: "Kölner Dom und Hohenzollernbrücke." },
    "place-de-hamburg": { alt: "Die Elbphilharmonie über dem Hamburger Hafen mit einer Hafenfähre davor", caption: "Die Elbphilharmonie am Hamburger Hafen." },
    "place-de-hesse": { alt: "Frankfurts Hochhäuser am Main unter dramatischen Wolken", caption: "Frankfurt am Main, Hessen." },
    "place-de-munich": { alt: "Luftaufnahme von Marienplatz, Neuem Rathaus und Frauenkirche in München", caption: "Marienplatz und Frauenkirche, München." },
    "place-de-north-rhine-westphalia": { alt: "Rheinturm und die Gebäude des MedienHafens am Rhein in Düsseldorf", caption: "MedienHafen und Rheinturm in Düsseldorf, Nordrhein-Westfalen." },
  },
};
