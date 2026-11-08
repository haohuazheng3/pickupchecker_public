/**
 * Italian strings: pages — the home board and the region, city and store pages of the Italian page tree.
 * Place names arrive already in Italian. Labels handed to the restock modules read "a Roma" / "da Apple Via del Corso" / "qui".
 */
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import type { Dict } from "../en";
import { inPaese, n as N, paese, regione } from "./util";

const CHECK_NOTE = "ogni 15 s, 5 s con un avviso";
/** "a Roma", "ad Arezzo". */
const a = (place: string) => (/^[aA]/.test(place) ? `ad ${place}` : `a ${place}`);

export const pages: Dict["pages"] = {
  common: {
    checkNote: CHECK_NOTE,
    appleStores: "Apple Store",
    showOnMap: "Mostra sulla mappa",
    restockLogs: "Registri dei rifornimenti",
    fullLog: "Registro completo →",
    restocksBy: "Rifornimenti per configurazione",
    lastDays: (days: number) => `Ultimi ${N(days)} giorni, giorno per giorno`,
    nearbyCities: "Città vicine con un Apple Store",
    neighboringStates: "Stati confinanti",
    acrossStateLine: "Oltre il confine dello stato",
    allUsRestocks: "Tutti i rifornimenti negli Stati Uniti",
    allRestocksIn: (cc: CountryCode) => `Tutti i rifornimenti ${inPaese(cc)}`,
    /** These five name a region: in Italy a province ("provincia di Roma"). */
    regionRestocks: (place: string) => `Rifornimenti in provincia di ${place}`,
    onTheMap: (place: string) => `Provincia di ${place} sulla mappa`,
    allOf: (place: string) => `Tutta la provincia di ${place}`,
    allOfArrow: (place: string) => `Tutta la provincia di ${place} →`,
    storeAndCity: (store: string, city: string) => `${store} · ${city}`,
    appleStorePage: (store: string) => `Apple: pagina del negozio ${store}`,
    sourcesWhere: (n: number, cc: CountryCode) => `i ${N(n)} Apple Store ${inPaese(cc)}`,
    inPlace: (place: string) => a(place),
    atPlace: (place: string) => `da ${place}`,
    here: "qui",
    storesWithIt: "negozi che ce l'hanno",
    whenRestock: (place: string) => `Quando tornano disponibili gli iPhone negli Apple Store di ${place}?`,
    /** The Duo-only clock on place pages (2026-11-08). */
    whenDuoRestocks: (place: string) => `Quando torna disponibile l'iPhone Duo negli Apple Store di ${place}?`,
    howFast: (place: string) => `In quanto tempo si esauriscono i rifornimenti ${a(place)}?`,
    latestIn: (place: string) => `Ultimi rifornimenti ${a(place)}`,
    noneIn: (place: string) => `Ancora nessun rifornimento registrato ${a(place)}.`,
    faqTitle: (place: string) => `Apple Store ${place}: domande frequenti`,
    itemList: (place: string) => `Apple Store ${a(place)}`,
    alertIn: (place: string) => `Avvisami ${a(place)}`,
    panelPick: (place: string) => `Scegli gli iPhone e seleziona i negozi ${a(place)} che puoi raggiungere`,
    matrixH2: "Disponibilità per negozio e modello",
    matrixHint: "Disponibili ora / monitorate, per modello.",
    matrixLabel: "Disponibilità per negozio",
    cityPage: "Pagina della città →",
    storePage: "Pagina del negozio →",
    since: "2 novembre 2026",
  },
  home: {
    storesWith: (short: string) => `negozi con il ${short}`,
    restocks24: "rifornimenti 24 h",
    week: (n: number) => ` · ${N(n)} in 7 g`,
    lastCheck: "ultimo controllo",
    more: (n: number) => `+${N(n)} altri`,
    latest: (short: string) => `Ultimi rifornimenti ${short}`,
    none: (short: string) => `Ancora nessun rifornimento ${short}.`,
    allRestocks: "Tutti i rifornimenti",
    modelMap: (short: string) => `Mappa ${short}`,
    buy: "Acquista su apple.com",
    liveStock: (short: string) => `Disponibilità ${short} in tempo reale`,
    live: "Live",
    alsoTracking: "Monitoriamo anche:",
    liveMap: "Mappa in tempo reale",
    allStores: "Tutti i negozi",
    questions: "Domande",
  },
  region: {
    counts: (stores: number, cities: number) => `${N(stores)} negozi · ${N(cities)} città · controllati ${CHECK_NOTE}`,
    nearbyOutside: (place: string) => `Gli Apple Store più vicini fuori dalla provincia di ${place}`,
    nearbyHint: (place: string) => `Distanza dal punto medio dei negozi della provincia di ${place}.`,
    beyond: (place: string) => `Oltre la provincia di ${place}`,
    everyStore: (place: string) => `Tutti i negozi della provincia di ${place}`,
    nearestRegions: (cc: CountryCode) => {
      const c = COUNTRIES[cc];
      const pl = regione(c, true);
      const m = ["stati", "dipartimenti", "emirati", "cantoni"].includes(pl);
      return `${m ? "Gli" : "Le"} ${pl} più ${m ? "vicini" : "vicine"} ${inPaese(cc)}`;
    },
  },
  city: {
    counts: (stores: number) => `${N(stores)} negozi · controllati ${CHECK_NOTE}`,
    storeHeading: (name: string) => `Apple ${name}`,
    details: "Dettagli del negozio",
    outside: (place: string) => `I negozi più vicini fuori da ${place}`,
    outsideRegion: (region: string) => `I più vicini fuori dalla provincia di ${region}`,
    around: (place: string) => `Dintorni di ${place}`,
    otherCities: (region: string) => `Altre città in provincia di ${region}`,
  },
  store: {
    description: (x: { place: string; street: string; city: string; where: string; duo: number; pro: number; pm: number }) => [
      `${x.place}, ${x.street}, ${x.city}: disponibilità per il ritiro di iPhone Duo (${N(x.duo)} configurazioni), 18 Pro (${N(x.pro)}) e Pro Max (${N(x.pm)}), orari di oggi, rifornimenti e negozi vicini.`,
      `${x.place}, ${x.where}: disponibilità per il ritiro di iPhone Duo (${N(x.duo)} configurazioni), 18 Pro (${N(x.pro)}) e Pro Max (${N(x.pm)}), orari di oggi e rifornimenti.`,
      `${x.place}, ${x.city}: disponibilità di Duo (${N(x.duo)}), 18 Pro (${N(x.pro)}), Pro Max (${N(x.pm)}), orari e rifornimenti.`,
    ],
    where: (city: string, cc: CountryCode) => `${city}, ${paese(cc)}`,
    taxQ: (place: string) => `Quanto costa l'iPhone Duo con le tasse da ${place}?`,
    pickupQ: (place: string) => `Posso ritirare un ordine di apple.com da ${place}?`,
    pickupA: (place: string) => `Sì. Al pagamento scegli «Ritiro» e ${place}, aspetta la notifica di Apple che l'ordine è pronto, poi porta il numero d'ordine, un documento d'identità con foto e il codice QR o il pass in Wallet; gli screenshot non sono accettati.`,
    storeWord: (name: string) => (/^apple\b/i.test(name) ? name.replace(/^apple\s*/i, "Apple Store ") : `Apple Store ${name}`),
    hoursH2: (storeWord: string) => `${storeWord}: orari, indirizzo e ritiro`,
    hoursLead: (place: string, address: string, phone: string | undefined, today: string, week: string) => `${place} si trova in ${address}${phone ? `, tel. ${phone}` : ""}. Orari di oggi: ${today}; tutta la settimana: ${week}.`,
    pickupRules: (helpUrl: string) => [
      `**Aspetta la notifica di Apple che l'ordine è pronto**, poi vai in negozio ([regole Apple per il ritiro](${helpUrl}))`,
      "**Porta:** numero d'ordine · documento d'identità con foto · codice QR o pass in Wallet",
      "**Non accettato:** uno screenshot del codice",
      "**Ritira qualcun altro?** Solo la persona indicata al momento dell'acquisto",
    ],
    directions: (place: string, dirUrl: string, appleUrl?: string) => `[Indicazioni per ${place}](${dirUrl})${appleUrl ? ` · [Pagina Apple di questo negozio](${appleUrl})` : ""}`,
    onlyH2: (where: string, place: string) => `Apple Store ${where}: ${place} è l'unico`,
    onlyInCountry: (place: string, cc: CountryCode) => `${place} è l'unico Apple Store ${inPaese(cc)}, quindi ogni Ritiro in negozio ${inPaese(cc)} passa da qui. Quando rende disponibile una configurazione non c'è un secondo negozio da provare: un avviso è tutta la strategia.`,
    onlyInCity: (city: string, place: string, backups: string) => `${a(city).replace(/^a/, "A")} c'è un solo Apple Store, ${place}.${backups ? ` I più vicini dopo questo sono ${backups}.` : ""}`,
    backup: (apple: string, city: string, dist: string) => `${apple} ${a(city)} (${dist})`,
    onlyBlockCountry: (place: string) => `Un avviso copre un negozio e una configurazione esatta, e la notifica arriva pochi secondi dopo che ${place} la rende disponibile per il ritiro.`,
    onlyBlock: (place: string) => `Se ${place} non ha la configurazione che cerchi, vale la pena tenere d'occhio anche quei negozi: un avviso copre un negozio e una configurazione esatta, e la notifica arriva pochi secondi dopo che il negozio la rende disponibile.`,
    intro: (x: { place: string; street: string; duo: number; duoOf: number; pro: number; proOf: number; pm: number; pmOf: number; peak: string | null }) => (
      <>{x.place}{x.street ? ` (${x.street})` : ""} ha disponibili per il ritiro adesso <b className="text-ink">{N(x.duo)} configurazioni su {N(x.duoOf)}</b> di iPhone Duo, <b className="text-ink">{N(x.pro)} su {N(x.proOf)}</b> di iPhone 18 Pro e <b className="text-ink">{N(x.pm)} su {N(x.pmOf)}</b> di iPhone 18 Pro Max.{x.peak ? <> Qui i rifornimenti arrivano di solito verso <b className="text-ink">le {x.peak}</b>, ora locale.</> : null}</>
    ),
    restocks30: (n: number) => `${N(n)} rifornimenti · ultimi 30 giorni`,
    lookupOff: "Al momento Apple non offre la verifica del Ritiro in negozio per questo negozio. Riproviamo ogni 30 minuti e mostriamo la disponibilità appena Apple risponde.",
    checked: "Controllato",
    alertHere: (short: string) => `Avvisami per il ${short} qui`,
    panel: (name: string) => `Per Apple ${name}: scegli gli iPhone, seleziona questo negozio e quelli vicini`,
    configsInStock: "configurazioni disponibili",
    stockNowH2: "Disponibilità per il ritiro adesso",
    whenRestock: (name: string) => `Quando torna disponibile l'iPhone da Apple ${name}?`,
    whenDuoRestocks: (name: string) => `Quando torna disponibile l'iPhone Duo da Apple ${name}?`,
    howFast: (name: string) => `In quanto tempo si esauriscono i rifornimenti da Apple ${name}?`,
    history: "Storico dei rifornimenti",
    historyEmpty: "Ancora nessun rifornimento o esaurimento registrato qui.",
    nearby: "Negozi vicini",
    elsewhereIn: (region: string) => `Altri negozi in provincia di ${region}`,
    faqTitle: (place: string) => `${place}: domande frequenti`,
    applePage: (place: string) => `Apple: pagina del negozio ${place} (orari, eventi)`,
    sourcesWhere: (n: number, cc: CountryCode) => (n === 1 ? `l'Apple Store ${inPaese(cc)}` : `i ${N(n)} Apple Store ${inPaese(cc)}`),
    around: (place: string) => `Dintorni di ${place}`,
    otherInCity: (city: string) => `Altri Apple Store ${a(city)}`,
    cityPage: (city: string) => `Pagina di ${city}`,
    moreIn: (region: string) => `Altri Apple Store in provincia di ${region}`,
    everyIn: (cc: CountryCode) => `Tutti gli Apple Store ${inPaese(cc)}`,
    allIn: (cc: CountryCode) => `Tutti gli Apple Store ${inPaese(cc)}`,
    countryHome: (cc: CountryCode) => `Home ${paese(cc)}`,
    footnote: "Disponibilità come appare su apple.com per il Ritiro in negozio, all'ultimo controllo.",
    /** `regionWord` (the country's region level, English key) is not needed in Italian: "not an official or retailer site". */
    footnoteIntl: (cc: CountryCode) => ` Prezzi in ${COUNTRIES[cc].currency === "EUR" ? "euro" : COUNTRIES[cc].currency}; distanze in chilometri. Non è un sito istituzionale né di un rivenditore.`,
  },
};
