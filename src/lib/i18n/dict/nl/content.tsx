/**
 * Dutch strings: content — the SEO building blocks (FAQ, browse/related rows, stat strips, product parts, sources,
 * live widgets), the enrich helpers, live {{tokens}}, the restock-pattern sentence and photo alt text.
 * Arguments arrive written for Dutch (numbers, durations, names); these functions arrange the words around them.
 */
import type { ReactNode } from "react";
import type { Forms } from "@/lib/i18n/format";
import type { Dict } from "../en";

const f = (x: Forms): Forms => x;
type Kind = "state" | "city" | "store" | "model";
const CHECK = "elke 15 sec., 5 sec. met een alert";

export const content: Dict["content"] = {
  hours: {
    closed: "Gesloten",
    everyDay: (hours: string) => `Elke dag ${hours}`,
    tomorrow: "morgen",
    dayAt: (day: string, time: string) => `${day} om ${time}`,
    closedTodayOpens: (next: string) => `Vandaag gesloten · opent ${next}`,
    closedToday: "Vandaag gesloten",
    opensAt: (time: string) => `Opent om ${time}`,
    openNow: (closes: string) => `Nu open · sluit om ${closes}`,
    closedNowOpens: (next: string) => `Nu gesloten · opent ${next}`,
    closedNow: "Nu gesloten",
  },

  duration: {
    underAMinute: "minder dan een minuut",
    pair: (a: string, b: string) => `${a} ${b}`,
  },
  listMore: (n: string) => `nog ${n}`,
  nearLine: (place: string, distance: string) => `${place} (${distance})`,

  faq: {
    where: (kind: Kind, place: string) => (kind === "store" ? `bij ${place}` : kind === "model" ? `voor de ${place}` : `in ${place}`),
    nRestocks: f({ one: "# aanvulling", other: "# aanvullingen" }),
    restockA: ({ count, where, days, week, peak }: { count: string | null; where: string; days: string; week: string; peak: { hour: string; day: string | null } | null }) =>
      `${count == null ? `Geen aanvulling gelogd ${where} in de afgelopen ${days} dagen` : `${count} ${where} in de afgelopen ${days} dagen, ${week} deze week`}${peak ? `, de meeste rond ${peak.hour} lokale tijd${peak.day ? ` en het vaakst op ${peak.day}` : ""}` : ""}; Apple publiceert geen schema.`,
    lastsNone: (where: string) => `Nog te weinig paren van aanvulling en uitverkocht ${where} om dit te meten.`,
    lasts: (days: string, duration: string) => `In de afgelopen ${days} dagen bleef een aangevulde configuratie zo'n ${duration} beschikbaar (mediaan) voordat hij weer uitverkocht was.`,
    storeIn: (store: string, line: string) => `${store} in ${line}`,
    nearestA: (stores: string) => `${stores}.`,

    modelStockQ: (model: string) => `Welke Apple Stores hebben de ${model} nu op voorraad?`,
    modelStockNone: (model: string) => `Geen bij de laatste check; de lijst op deze pagina wordt bijgewerkt zodra een Apple Store in de VS de ${model} aanbiedt om op te halen.`,
    nUsStores: f({ one: "# Apple Store in de VS", other: "# Apple Stores in de VS" }),
    modelStockSome: (count: string) => `${count} bij de laatste check, elk op deze pagina genoemd met de configuraties die ze hebben.`,
    priceQ: (model: string) => `Wat kost de ${model}?`,
    priceA: (low: string, high: string, storages: string, colors: string) => `Van ${low} tot ${high} simlockvrij, afhankelijk van de opslag (${storages}), in ${colors}.`,
    modelRestockQ: (model: string) => `Hoe vaak is de ${model} weer op voorraad?`,
    modelLastsQ: (model: string) => `Hoe lang blijft de ${model} op voorraad als hij verschijnt?`,
    reserveQ: (model: string) => `Kan ik de ${model} reserveren om op te halen?`,
    reserveA: "Nee; zodra een winkel een configuratie aanbiedt, koop je hem op apple.com met ophalen in de winkel, en dan wordt hij voor jouw tijdvak apart gelegd.",

    storeStockQ: (store: string, model: string) => `Heeft ${store} de ${model} op voorraad?`,
    nConfigs: f({ one: "# configuratie", other: "# configuraties" }),
    storeStockYes: (count: string) => `Ja, ${count} bij de laatste check; de tabel op deze pagina toont welke opslag en kleur.`,
    storeStockNo: (other: { pro: string; proMax: string } | null) => `Niet bij de laatste check${other ? `, al heeft de winkel wel configuraties van de iPhone 18 Pro (${other.pro}) en de 18 Pro Max (${other.proMax})` : ", en ook geen enkele configuratie van de 18 Pro of 18 Pro Max"}.`,
    hoursQ: (store: string) => `Wat zijn de openingstijden van ${store}?`,
    hoursA: ({ hours, today, address, phone }: { hours: string | null; today: string | null; address: string; phone: string | null }) =>
      `${hours ?? "De openingstijden staan op deze pagina"}${today ? `; vandaag ${today.replace(/\((\p{Lu})/u, (_m, c: string) => `(${c.toLowerCase()}`)}` : ""}; ${address}${phone ? `, tel. ${phone}` : ""}.`,
    storeRestockQ: (store: string) => `Hoe vaak krijgt ${store} nieuwe iPhone-voorraad?`,
    storeLastsQ: (store: string) => `Hoe lang blijft voorraad bij ${store} beschikbaar?`,
    storeNearestQ: (store: string) => `Wat is de dichtstbijzijnde andere Apple Store vanaf ${store}?`,

    placeStockQ: (place: string, model: string) => `Welke Apple Stores in ${place} hebben de ${model} nu op voorraad?`,
    placeStockNone: (place: string, model: string) => `Geen bij de laatste check; deze pagina wordt bijgewerkt zodra een winkel in ${place} de ${model} aanbiedt om op te halen.`,
    nStores: f({ one: "# winkel", other: "# winkels" }),
    placeStockSome: (count: string, stores: string) => `${count} bij de laatste check: ${stores}.`,
    countQ: (place: string) => `Hoeveel Apple Stores zijn er in ${place}?`,
    nAppleStores: f({ one: "# Apple Store", other: "# Apple Stores" }),
    countMany: (count: string, stores: string) => `${count}, waaronder ${stores}.`,
    countOne: (count: string, store: string) => `${count}: ${store}.`,
    placeRestockQ: (place: string) => `Hoe vaak krijgen de Apple Stores in ${place} nieuwe iPhone-voorraad?`,
    placeLastsQ: (place: string) => `Hoe lang blijft voorraad in ${place} beschikbaar?`,
    placeNearestQ: (place: string) => `Wat is de dichtstbijzijnde Apple Store buiten ${place}?`,
  },

  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? place : kind === "model" ? "elke Apple Store in de VS" : `de Apple Stores in ${place}`;
    return [
      "Ophaalvoorraad wordt verkocht via apple.com: je kiest bij het afrekenen een configuratie en een winkel, betaalt online en haalt op in de winkel, vaak nog dezelfde dag. Dat staat los van de voorraad in de schappen en van providerwinkels.",
      `PickupChecker checkt elke gevolgde configuratie in ${at} elke 15 seconden, en elke 5 als er een alert op staat; een wijziging telt pas na een tweede, bevestigende check, zodat een storing nooit een valse aanvulling of uitverkocht wordt.`,
      "Elke bevestigde wijziging wordt gelogd; dat logboek voedt de grafiek en de geschiedenis op deze pagina.",
    ];
  },
  alertRule: "Eén alert = één winkel, één model, één opslag, één kleur; een push gaat eruit binnen seconden nadat apple.com op beschikbaar springt.",

  titles: {
    state: (name: string, duoNow: string, stores: string) => [
      `Apple Stores in ${name}: ${duoNow} van ${stores} ${duoNow === "1" ? "heeft" : "hebben"} nu de iPhone Duo`,
      `Apple Stores in ${name} – iPhone Duo-voorraad live`,
      `Apple Stores in ${name} – iPhone Duo-voorraad`,
      `Apple Stores ${name} – iPhone-voorraad`,
    ],
    city: (city: string, code: string, duoNow: string, stores: string) => [
      `Apple Stores in ${city}, ${code}: ${duoNow} van ${stores} ${duoNow === "1" ? "heeft" : "hebben"} de iPhone Duo`,
      `Apple Stores in ${city}, ${code} – iPhone Duo-voorraad live`,
      `Apple Stores in ${city}, ${code} – iPhone Duo-voorraad`,
      `Apple Stores ${city} – iPhone-voorraad`,
    ],
    store: (name: string, region: string | null) => {
      const r = region ? ` (${region})` : "";
      return [
        `${name}${r}: iPhone-voorraad vandaag, ophalen & openingstijden`,
        `${name}${r}: iPhone-voorraad, ophalen & openingstijden`,
        `${name}${r}: iPhone-voorraad vandaag & openingstijden`,
        `${name}: iPhone-voorraad, ophalen & openingstijden`,
        `${name}: iPhone-voorraad & openingstijden`,
        `${name}: iPhone-voorraad`,
        `${name} – voorraad`,
      ];
    },
    model: (name: string, storesNow: string) => [
      `${name}-voorraad: ${storesNow} Apple Stores hebben hem nu`,
      `${name} ophalen: ${storesNow} Apple Stores hebben hem nu`,
      `${name}: ophaalvoorraad live`,
    ],
  },

  tokens: {
    tooFewToMeasure: "te weinig om al te meten",
    noneLoggedYet: "nog niets gelogd",
    noneYet: "nog geen",
  },

  pattern: {
    none: (days: string) => `Geen bevestigde aanvulling in de afgelopen ${days} dagen.`,
    nConfirmed: f({ one: "# bevestigde aanvulling", other: "# bevestigde aanvullingen" }),
    countIn: (count: string, days: string) => `${count} in de afgelopen ${days} dagen`,
    stay: (minutes: string) => `; meestal zo'n ${minutes} min te koop voordat hij uitverkocht is`,
    nDays: f({ one: "# dag", other: "# dagen" }),
    tooFew: (count: string, onDays: string | null, stay: string) => `${count}${onDays ? ` op ${onDays}` : ""} — te weinig om al een patroon te noemen${stay}.`,
    usual: (hour: string, weekday: string | null, count: string, stay: string) => `Krijgt meestal rond ${hour} lokale tijd nieuwe voorraad${weekday ? `, het drukst op ${weekday}` : ""}; ${count}${stay}.`,
  },

  regionNouns: {
    state: f({ one: "staat", other: "staten" }),
    province: f({ one: "provincie", other: "provincies" }),
    area: f({ one: "gebied", other: "gebieden" }),
    department: f({ one: "departement", other: "departementen" }),
    prefecture: f({ one: "prefectuur", other: "prefecturen" }),
    emirate: f({ one: "emiraat", other: "emiraten" }),
    canton: f({ one: "kanton", other: "kantons" }),
    region: f({ one: "gewest", other: "gewesten" }),
    county: f({ one: "provincie", other: "provincies" }),
    city: f({ one: "stad", other: "steden" }),
  } as Record<string, Forms>,

  measured: "Zo meten we dit",

  faqTitle: "Veelgestelde vragen",
  breadcrumb: "Kruimelpad",
  keepExploring: "Verder kijken",
  browse: {
    storesByState: "Winkels per staat",
    allStatesCities: "Alle staten en steden →",
    liveByModel: "Live voorraad per model",
    modelStock: (model: string) => `${model}-voorraad`,
    thisPage: "deze pagina",
    restockLog: (short: string) => `Voorraadlogboek ${short}`,
    liveMap: "Live kaart",
    mostStores: "Meeste winkels",
    allStates: "Alle staten",
    bigCities: "Grote steden",
    cities: "Steden",
    storesBy: (region: string) => `Winkels per ${region}`,
    allStoresIn: ({ country }: { inName: string; country: string }) => <>Alle Apple Stores in {country} →</>,
    allRegions: (regions: string) => `Alle ${regions}`,
  },
  modelCards: "Per iPhone",
  narrative: {
    lastRestock: (config: ReactNode, at: ReactNode, ago: ReactNode) => <>{" "}Laatste aanvulling: {config}{at}, {ago}.</>,
    at: (store: ReactNode) => <> bij {store}</>,
  },
  statStrip: {
    inStockNow: "Nu op voorraad",
    ofStores: (n: string) => `van ${n} winkels`,
    stores: "Winkels",
    nCities: f({ one: "# stad", other: "# steden" }),
    tracked: "gevolgd",
    modelNow: (short: string) => `${short} nu`,
    configsInStock: "configuraties op voorraad",
    storesWithStock: f({ one: "winkel met voorraad", other: "winkels met voorraad" }),
    restocks24h: "Aanvullingen 24 u",
    restocksHint: (week: string, month: string, days: string) => `${week} in 7 d · ${month} in ${days} d`,
    sellOuts: (days: string) => `Uitverkocht ${days} d`,
    stays: (duration: string) => `blijft ~${duration}`,
    noPairs: "nog geen paren",
    lastRestock: "Laatste aanvulling",
    noneYet: "nog geen",
    inLastDays: (days: string) => `in de afgelopen ${days} dagen`,
  },
  product: {
    chooseIphone: "Kies de iPhone",
    storage: "Opslag",
    color: "Kleur",
    all: "Alle",
    numbersAre: (unit: ReactNode) => <>Getallen = {unit} met voorraad nu.</>,
    seen: (ago: ReactNode) => <>gezien {ago}</>,
    last: (ago: ReactNode) => <>laatst {ago}</>,
    notSeenYet: "nog niet gezien",
    firstCheckPending: "eerste check volgt",
    inStock: "Op voorraad",
    inStockLower: "op voorraad",
    none: "geen",
    here: "hier",
    notAvailable: "Niet beschikbaar",
    notCheckedYet: "Nog niet gecheckt",
    availableForPickup: "Beschikbaar om op te halen",
    since: (ago: ReactNode) => <> · {ago} verschenen</>,
    lastInStock: (ago: ReactNode) => <>Laatst op voorraad {ago}</>,
    neverSeen: "Hier nog nooit op voorraad gezien",
    firstCheckSoon: "Eerste check binnen een minuut",
    buy: "Kopen op apple.com",
    checked: (checked: ReactNode, note: ReactNode) => <>Gecheckt {checked} · {note}</>,
    checkNote: CHECK,
  },

  source: (source: ReactNode) => <>Bron: {source}</>,
  photoCredit: (link: ReactNode) => <>Foto: {link}</>,
  sources: "Bronnen",
  allUsStores: "alle 269 Apple Stores in de VS",
  trackerSource: (where: ReactNode, since: ReactNode, asOf: ReactNode) => <>Live tracker van PickupChecker: elke configuratie van de iPhone Duo, 18 Pro en 18 Pro Max in {where}, elke 15 seconden gecheckt (elke 5 bij winkels met alerts) sinds {since}; cijfers op deze pagina van {asOf}.</>,
  live: {
    configsCaption: (stores: ReactNode, model: ReactNode) => <>Apple Stores (van {stores}) met elke configuratie van de {model} nu om op te halen · live</>,
    storage: "Opslag",
    pricesCaption: (model: ReactNode) => <>Prijzen van de {model} op apple.com (simlockvrij, exclusief belasting) en live ophaalvoorraad</>,
    price: "Prijs",
    bestColor: "Beste kleur, winkels nu",
    noRestock: (model: string) => `Nog geen aanvulling van de ${model} gelogd.`,
    clockLabel: (model: string) => `voor de ${model} in het hele land`,
    storesWithIt: "Winkels met voorraad nu",
    pairsInStock: "Winkel × configuratie op voorraad",
    restocksLogged: "Aanvullingen gelogd",
    medianTime: "Mediane tijd op voorraad",
    underOneMin: (min: string) => `< ${min}`,
  },

  /** Alt text and captions for the generic photos and the Dutch-speaking countries' place photos (others fall back to English). */
  photos: {
    "apple-store-pickup-counter": { alt: "Houten ophaalbalie met een bord Pickup in een Apple Store", caption: "Bestellingen om op te halen krijg je mee aan een balie als deze." },
    "phone-map": { alt: "Handen die op straat navigeren met een kaartapp op een smartphone", caption: "Afstand telt zwaarder dan je denkt als nieuwe voorraad maar een minuut blijft staan." },
    "phone-card-payment": { alt: "Een vrouw met een iPhone en een bankpas die online betaalt", caption: "Online betalen, ophalen in de winkel." },
    "phone-on-box": { alt: "Een nieuwe smartphone op zijn witte doos", caption: "Een nieuwe telefoon, net uit de doos." },
    "city-map-phone": { alt: "Twee mensen die een stadsplattegrond bekijken op een telefoon", caption: "De route naar de winkel plannen." },
    "phone-notification": { alt: "Hand met een telefoon die meldingen toont op het toegangsscherm", caption: "Een alert komt binnen op het toegangsscherm." },
    "apple-store-crowd-inside": { alt: "Een menigte in de rij in een drukke Apple Store in een winkelcentrum", caption: "Drukte in de lanceringsweek: de voorraad die het schap haalt, is in minuten weg." },
    "apple-store-glass-canopy": { alt: "Apple Store met een glazen gevel en een houten luifel 's avonds", caption: "Een Apple Store met glazen pui na zonsondergang." },
    "apple-store-night-vancouver": { alt: "Een verlichte Apple Store 's avonds in Vancouver", caption: "Apple Store bij avond: ophaalvoorraad kan op elk uur verschijnen, maar komt veel vaker 's ochtends." },
    "phone-hand-camera": { alt: "Iemand houdt een iPhone met drie camera's vast", caption: "Voor de Pro-modellen staan mensen in de rij." },
    "place-nl-netherlands": { alt: "Grachtenpanden met puntgevels in Amsterdam, weerspiegeld in het water onder een heldere lucht", caption: "Grachtenpanden in Amsterdam." },
    "place-nl-north-holland": { alt: "Molen De Adriaan aan het Spaarne in Haarlem", caption: "Molen De Adriaan aan het Spaarne, Haarlem." },
    "place-be-belgium": { alt: "Het Brusselse stadhuis en de gildehuizen op de Grote Markt bij zonsondergang", caption: "De Grote Markt in Brussel bij zonsondergang." },
  },
};
