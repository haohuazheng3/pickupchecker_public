/**
 * Dutch strings: pages — the home board and the region, city and store pages of the Dutch versions (/nl-nl, /nl-be).
 * Place names arrive in Dutch. Labels handed to the restock modules ("in Noord-Holland", "bij Apple Haarlem", "hier")
 * fit the Dutch module sentences (modules.tsx).
 */
import type { CountryCode } from "@/lib/apple/countries";
import { COUNTRIES } from "@/lib/apple/countries";
import { num } from "@/lib/i18n/format";
import { countryLabel } from "@/lib/i18n/places";
import type { Dict } from "../en";

const L = "nl" as const;
const n$ = (v: number) => num(L, v);
const ARTICLE: Partial<Record<CountryCode, string>> = { us: "de ", uk: "het ", ae: "de " };
/** "in Nederland", "in de Verenigde Staten". */
const inC = (cc: CountryCode) => `in ${ARTICLE[cc] ?? ""}${countryLabel(cc, L)}`;
const NOUN: Record<string, string> = { state: "staat", province: "provincie", area: "gebied", department: "departement", prefecture: "prefectuur", emirate: "emiraat", canton: "kanton", region: "gewest", county: "provincie", city: "stad" };
const NOUNS: Record<string, string> = { state: "staten", province: "provincies", area: "gebieden", department: "departementen", prefecture: "prefecturen", emirate: "emiraten", canton: "kantons", region: "gewesten", county: "provincies", city: "steden" };
/** The cadence note, as CHECK_NOTE says it in English. */
const CHECK = "elke 15 sec., 5 sec. met een alert";
/** The store as Dutch speakers name a store called after its city ("Brussels" → "Brussel"). */
const SAID: Record<string, string> = { Brussels: "Brussel", "The Hague": "Den Haag" };

export const pages: Dict["pages"] = {
  common: {
    checkNote: CHECK,
    appleStores: "Apple Stores",
    showOnMap: "Op de kaart",
    restockLogs: "Voorraadlogboeken",
    fullLog: "Volledig logboek →",
    restocksBy: "Aanvullingen per configuratie",
    lastDays: (days: number) => `Laatste ${n$(days)} dagen, per dag`,
    nearbyCities: "Steden in de buurt met een Apple Store",
    neighboringStates: "Aangrenzende staten",
    acrossStateLine: "Over de staatsgrens",
    allUsRestocks: "Alle aanvullingen in de VS",
    allRestocksIn: (cc: CountryCode) => `Alle aanvullingen ${inC(cc)}`,
    regionRestocks: (place: string) => `Aanvullingen in ${place}`,
    onTheMap: (place: string) => `${place} op de kaart`,
    allOf: (place: string) => `Heel ${place}`,
    allOfArrow: (place: string) => `Heel ${place} →`,
    storeAndCity: (store: string, city: string) => `${store} · ${city}`,
    appleStorePage: (store: string) => `Apple: pagina van ${/^apple\b/i.test(store) ? store : `Apple ${store}`}`,
    sourcesWhere: (n: number, cc: CountryCode) => (n === 1 ? `de Apple Store ${inC(cc)}` : `de ${n$(n)} Apple Stores ${inC(cc)}`),
    inPlace: (place: string) => `in ${place}`,
    atPlace: (place: string) => `bij ${place}`,
    here: "hier",
    storesWithIt: "winkels met voorraad",
    whenRestock: (place: string) => `Wanneer krijgen de winkels in ${place} nieuwe voorraad?`,
    /** The Duo-only clock on place pages (2026-11-08). */
    whenDuoRestocks: (place: string) => `Wanneer krijgen de winkels in ${place} de iPhone Duo weer op voorraad?`,
    howFast: (place: string) => `Hoe snel is nieuwe voorraad in ${place} uitverkocht?`,
    latestIn: (place: string) => `Laatste aanvullingen in ${place}`,
    noneIn: (place: string) => `Nog geen aanvulling gelogd in ${place}.`,
    faqTitle: (place: string) => `Apple Stores in ${place}: veelgestelde vragen`,
    itemList: (place: string) => `Apple Stores in ${place}`,
    alertIn: (place: string) => `Waarschuw me in ${place}`,
    panelPick: (place: string) => `Kies de iPhones en vink de winkels in ${place} aan waar je kunt komen`,
    matrixH2: "Voorraad per winkel en model",
    matrixHint: "Nu op voorraad / gevolgd, per model.",
    matrixLabel: "Voorraad per winkel",
    cityPage: "Stadspagina →",
    storePage: "Winkelpagina →",
    since: "2 november 2026",
  },
  home: {
    storesWith: (short: string) => `winkels met de ${short}`,
    restocks24: "aanvullingen 24 u",
    week: (n: number) => ` · ${n$(n)} deze week`,
    lastCheck: "laatste check",
    more: (n: number) => `+${n$(n)} meer`,
    latest: (short: string) => `Laatste ${short}-aanvullingen`,
    none: (short: string) => `Nog geen aanvullingen van de ${short}.`,
    allRestocks: "Alle aanvullingen",
    modelMap: (short: string) => `${short}-kaart`,
    buy: "Kopen op apple.com",
    liveStock: (short: string) => `${short}-voorraad live`,
    live: "Live",
    alsoTracking: "Ook gevolgd:",
    liveMap: "Live kaart",
    allStores: "Alle winkels",
    questions: "Vragen",
  },
  region: {
    counts: (stores: number, cities: number) => `${n$(stores)} winkels · ${n$(cities)} ${cities === 1 ? "stad" : "steden"} · gecheckt ${CHECK}`,
    nearbyOutside: (place: string) => `Dichtstbijzijnde Apple Stores buiten ${place}`,
    nearbyHint: (place: string) => `Afstand vanaf het midden van de winkels in ${place}.`,
    beyond: (place: string) => `Buiten ${place}`,
    everyStore: (place: string) => `Elke winkel in ${place}`,
    nearestRegions: (cc: CountryCode) => `Dichtstbijzijnde ${NOUNS[COUNTRIES[cc].regionNoun ?? "area"] ?? "gebieden"} ${inC(cc)}`,
  },
  city: {
    counts: (stores: number) => `${n$(stores)} winkels · gecheckt ${CHECK}`,
    storeHeading: (name: string) => `Apple ${name}`,
    details: "Winkelgegevens",
    outside: (place: string) => `Dichtstbijzijnde winkels buiten ${place}`,
    outsideRegion: (region: string) => `Dichtstbij buiten ${region}`,
    around: (place: string) => `Rond ${place}`,
    otherCities: (region: string) => `Andere steden in ${region}`,
  },
  store: {
    description: (a: { place: string; street: string; city: string; where: string; duo: number; pro: number; pm: number }) => [
      `${a.place}, ${a.street}, ${a.city}: live voorraad om op te halen (iPhone Duo ${n$(a.duo)}, 18 Pro ${n$(a.pro)}, Pro Max ${n$(a.pm)} configuraties), openingstijden van vandaag, aanvultijden en winkels in de buurt.`,
      `${a.place}, ${a.where}: welke iPhones nu klaarliggen om op te halen (Duo ${n$(a.duo)}, 18 Pro ${n$(a.pro)}, Pro Max ${n$(a.pm)}), openingstijden en aanvultijden.`,
      `${a.place}, ${a.city}: live voorraad (Duo ${n$(a.duo)}, 18 Pro ${n$(a.pro)}, Pro Max ${n$(a.pm)}), openingstijden en aanvullingen.`,
    ],
    where: (city: string, cc: CountryCode) => `${city}, ${countryLabel(cc, L)}`,
    taxQ: (place: string) => `Wat kost de iPhone Duo met belasting bij ${place}?`,
    pickupQ: (place: string) => `Kan ik een bestelling van apple.com ophalen bij ${place}?`,
    pickupA: (place: string) => `Ja. Kies bij het afrekenen "Ik haal het op" en ${place}, wacht op Apples bericht dat je bestelling klaarligt en neem dan het bestelnummer, een geldig identiteitsbewijs met foto en de QR-code of Wallet-pas mee; screenshots worden niet geaccepteerd.`,
    storeWord: (name: string) => {
      const bare = name.replace(/^apple\s*/i, "");
      return `Apple Store ${SAID[bare] ?? bare}`;
    },
    hoursH2: (storeWord: string) => `${storeWord}: openingstijden, adres en ophalen`,
    hoursLead: (place: string, address: string, phone: string | undefined, today: string, week: string) => `Adres van ${place}: ${address}${phone ? `, tel. ${phone}` : ""}. Vandaag open: ${today}; de hele week: ${week}.`,
    pickupRules: (helpUrl: string) => [
      `**Wacht op Apples bericht dat je bestelling klaarligt** en kom dan langs ([Apples regels voor ophalen](${helpUrl}))`,
      "**Meenemen:** bestelnummer · geldig identiteitsbewijs met foto · de QR-code of Wallet-pas",
      "**Niet geaccepteerd:** een screenshot van de code",
      "**Haalt iemand anders op?** Alleen de persoon die je bij het afrekenen hebt opgegeven",
    ],
    directions: (place: string, dirUrl: string, appleUrl?: string) => `[Route naar ${place}](${dirUrl})${appleUrl ? ` · [Apples pagina van deze winkel](${appleUrl})` : ""}`,
    onlyH2: (where: string, place: string) => `Apple Store ${where}: ${place} is de enige`,
    onlyInCountry: (place: string, cc: CountryCode) => `${place} is de enige Apple Store ${inC(cc)}, dus elke bestelling om op te halen ${inC(cc)} wordt hier opgehaald. Biedt de winkel een configuratie aan, dan is er geen tweede winkel om het te proberen: een alert is je hele strategie.${cc === "be" ? " Vanuit Antwerpen (hemelsbreed zo'n 45 km) en Gent (zo'n 50 km) is dit ook de dichtstbijzijnde." : ""}`,
    onlyInCity: (city: string, place: string, backups: string) => `${city} heeft één Apple Store: ${place}.${backups ? ` Dichtstbijzijnde alternatieven: ${backups}.` : ""}`,
    backup: (apple: string, city: string, dist: string) => `${apple} in ${city} (${dist})`,
    onlyBlockCountry: (place: string) => `Eén alert dekt één winkel en één exacte configuratie, en de push komt seconden nadat ${place} hem aanbiedt om op te halen.`,
    onlyBlock: (place: string) => `Heeft ${place} jouw configuratie niet, dan zijn dat de reservewinkels die je ook in de gaten wilt houden: één alert dekt één winkel en één exacte configuratie, en de push komt seconden nadat de winkel hem aanbiedt.`,
    intro: (a: { place: string; street: string; duo: number; duoOf: number; pro: number; proOf: number; pm: number; pmOf: number; peak: string | null }) => (
      <>Bij {a.place}{a.street ? ` (${a.street})` : ""} liggen nu klaar om op te halen: <b className="text-ink">{n$(a.duo)} van de {n$(a.duoOf)}</b> configuraties van de iPhone Duo, <b className="text-ink">{n$(a.pro)} van de {n$(a.proOf)}</b> van de iPhone 18 Pro en <b className="text-ink">{n$(a.pm)} van de {n$(a.pmOf)}</b> van de iPhone 18 Pro Max.{a.peak ? <> Nieuwe voorraad komt hier meestal rond <b className="text-ink">{a.peak}</b> lokale tijd.</> : null}</>
    ),
    restocks30: (n: number) => `${n$(n)} aanvullingen · laatste 30 dagen`,
    lookupOff: "Apple biedt in deze winkel nu geen voorraadcheck voor ophalen aan. We vragen het elke 30 minuten opnieuw en tonen de voorraad zodra Apple antwoordt.",
    checked: "Gecheckt",
    alertHere: (short: string) => `Waarschuw me hier voor de ${short}`,
    panel: (name: string) => `Voor Apple ${SAID[name] ?? name}: kies de iPhones, vink deze winkel aan en eventueel winkels in de buurt`,
    configsInStock: "configuraties op voorraad",
    stockNowH2: "Nu klaar om op te halen",
    whenRestock: (name: string) => `Wanneer krijgt ${name} nieuwe voorraad?`,
    whenDuoRestocks: (name: string) => `Wanneer heeft ${name} de iPhone Duo weer op voorraad?`,
    howFast: (name: string) => `Hoe snel is nieuwe voorraad bij ${name} uitverkocht?`,
    history: "Voorraadgeschiedenis",
    historyEmpty: "Hier is nog geen aanvulling of uitverkocht gelogd.",
    nearby: "Winkels in de buurt",
    elsewhereIn: (region: string) => `Elders in ${region}`,
    faqTitle: (place: string) => `${place}: veelgestelde vragen`,
    applePage: (place: string) => `Apple: winkelpagina van ${place} (openingstijden, sessies)`,
    sourcesWhere: (n: number, cc: CountryCode) => (n === 1 ? `de Apple Store ${inC(cc)}` : `de ${n$(n)} Apple Stores ${inC(cc)}`),
    around: (place: string) => `Rond ${place}`,
    otherInCity: (city: string) => `Andere Apple Stores in ${city}`,
    cityPage: (city: string) => `Pagina van ${city}`,
    moreIn: (region: string) => `Meer Apple Stores in ${region}`,
    everyIn: (cc: CountryCode) => `Elke Apple Store ${inC(cc)}`,
    allIn: (cc: CountryCode) => `Alle Apple Stores ${inC(cc)}`,
    countryHome: (cc: CountryCode) => `Home ${countryLabel(cc, L)}`,
    footnote: "Beschikbaarheid zoals apple.com die toont voor ophalen in de winkel, bij de laatste check.",
    footnoteIntl: (cc: CountryCode, regionWord: string) => ` Prijzen in ${COUNTRIES[cc].currency === "EUR" ? "euro" : COUNTRIES[cc].currency}; afstanden in kilometers. Geen officiële site van een ${NOUN[regionWord] ?? regionWord} of winkelketen.`,
  },
};
