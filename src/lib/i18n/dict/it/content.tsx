/**
 * Italian strings: content — SEO building blocks, the enrich helpers (hours, durations, FAQ answers, titles),
 * live {{tokens}}, the restock-pattern sentence and photo alt text. Arguments arrive already in Italian.
 */
import type { ReactNode } from "react";
import type { Forms } from "@/lib/i18n/format";
import type { Dict } from "../en";
import { ad, aLuogo, cap, inNome, nounForms, tuttiPlural } from "./util";

const f = (x: Forms): Forms => x;
type Kind = "state" | "city" | "store" | "model";
/** "il martedì" / "la domenica". */
const ilDay = (d: string) => (/^domenic/i.test(d) ? `la ${d}` : `il ${d}`);

export const content: Dict["content"] = {
  hours: {
    closed: "Chiuso",
    everyDay: (hours: string) => `Tutti i giorni ${hours}`,
    tomorrow: "domani",
    dayAt: (day: string, time: string) => `${day} alle ${time}`,
    closedTodayOpens: (next: string) => `Chiuso oggi · apre ${next}`,
    closedToday: "Chiuso oggi",
    opensAt: (time: string) => `Apre alle ${time}`,
    openNow: (closes: string) => `Aperto ora · chiude alle ${closes}`,
    closedNowOpens: (next: string) => `Chiuso ora · apre ${next}`,
    closedNow: "Chiuso ora",
  },

  duration: {
    underAMinute: "meno di un minuto",
    pair: (a: string, b: string) => `${a} ${b}`,
  },
  listMore: (n: string) => `altri ${n}`,
  nearLine: (place: string, distance: string) => `${place} (${distance})`,

  faq: {
    where: (kind: Kind, place: string) => (kind === "store" ? `da ${place}` : kind === "model" ? `per l'${place}` : aLuogo(place)),
    nRestocks: f({ one: "# rifornimento", other: "# rifornimenti" }),
    restockA: ({ count, where, days, week, peak }: { count: string | null; where: string; days: string; week: string; peak: { hour: string; day: string | null } | null }) =>
      `${count == null ? `Nessun rifornimento registrato ${where} negli ultimi ${days} giorni` : `${count} ${where} negli ultimi ${days} giorni, ${week} questa settimana`}${peak ? `, per lo più verso le ${peak.hour} (ora locale)${peak.day ? ` e soprattutto ${ilDay(peak.day)}` : ""}` : ""}; Apple non pubblica alcun calendario.`,
    lastsNone: (where: string) => `Ancora troppo poche coppie rifornimento-esaurimento ${where} per misurarlo.`,
    lasts: (days: string, duration: string) => `Negli ultimi ${days} giorni una configurazione rifornita è rimasta disponibile circa ${duration} (mediana) prima di esaurirsi di nuovo.`,
    storeIn: (store: string, line: string) => `${store} ${ad(line)}`,
    nearestA: (stores: string) => `${stores}.`,

    modelStockQ: (model: string) => `Quali Apple Store hanno l'${model} disponibile in questo momento?`,
    modelStockNone: (model: string) => `Nessuno all'ultimo controllo; l'elenco di questa pagina si aggiorna appena un Apple Store degli Stati Uniti rende disponibile l'${model} per il ritiro.`,
    nUsStores: f({ one: "# Apple Store degli Stati Uniti", other: "# Apple Store degli Stati Uniti" }),
    modelStockSome: (count: string) => `${count} all'ultimo controllo, ognuno indicato in questa pagina con le configurazioni che ha.`,
    priceQ: (model: string) => `Quanto costa l'${model}?`,
    priceA: (low: string, high: string, storages: string, colors: string) => `Da ${low} a ${high} sbloccato, a seconda della capacità (${storages}), nei colori ${colors}.`,
    modelRestockQ: (model: string) => `Ogni quanto torna disponibile l'${model}?`,
    modelLastsQ: (model: string) => `Quanto dura la disponibilità dell'${model} quando compare?`,
    reserveQ: (model: string) => `Posso prenotare l'${model} per il ritiro?`,
    reserveA: "No: quando un negozio rende disponibile una configurazione la acquisti su apple.com scegliendo il Ritiro in negozio, e da quel momento è tenuta da parte per la tua fascia oraria.",

    storeStockQ: (store: string, model: string) => `${store} ha l'${model} disponibile?`,
    nConfigs: f({ one: "# configurazione", other: "# configurazioni" }),
    storeStockYes: (count: string) => `Sì, ${count} all'ultimo controllo; la tabella di questa pagina indica capacità e colore.`,
    storeStockNo: (other: { pro: string; proMax: string } | null) => `Non all'ultimo controllo${other ? `, anche se ha disponibili ${other.pro} configurazioni di iPhone 18 Pro e ${other.proMax} di 18 Pro Max` : ", e nemmeno configurazioni di 18 Pro o 18 Pro Max"}.`,
    hoursQ: (store: string) => `Quali sono gli orari di ${store}?`,
    hoursA: ({ hours, today, address, phone }: { hours: string | null; today: string | null; address: string; phone: string | null }) =>
      `${hours ? cap(hours) : "Gli orari sono indicati in questa pagina"}${today ? `; oggi ${today}` : ""}; ${address}${phone ? `, tel. ${phone}` : ""}.`,
    storeRestockQ: (store: string) => `Ogni quanto tornano disponibili gli iPhone da ${store}?`,
    storeLastsQ: (store: string) => `Quanto dura la disponibilità da ${store}?`,
    storeNearestQ: (store: string) => `Qual è l'Apple Store più vicino ${ad(store)}?`,

    placeStockQ: (place: string, model: string) => `Quali Apple Store ${aLuogo(place)} hanno l'${model} disponibile in questo momento?`,
    placeStockNone: (place: string, model: string) => `Nessuno all'ultimo controllo; questa pagina si aggiorna nell'istante in cui un negozio ${aLuogo(place)} rende disponibile l'${model} per il ritiro.`,
    nStores: f({ one: "# negozio", other: "# negozi" }),
    placeStockSome: (count: string, stores: string) => `${count} all'ultimo controllo: ${stores}.`,
    countQ: (place: string) => `Quanti Apple Store ci sono ${aLuogo(place)}?`,
    nAppleStores: f({ one: "# Apple Store", other: "# Apple Store" }),
    countMany: (count: string, stores: string) => `${count}, tra cui ${stores}.`,
    countOne: (count: string, store: string) => `${count}: ${store}.`,
    placeRestockQ: (place: string) => `Ogni quanto tornano disponibili gli iPhone negli Apple Store ${aLuogo(place)}?`,
    placeLastsQ: (place: string) => `Quanto dura la disponibilità ${aLuogo(place)}?`,
    placeNearestQ: (place: string) => `Qual è l'Apple Store più vicino fuori da ${place}?`,
  },

  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? `da ${place}` : kind === "model" ? "in ogni Apple Store degli Stati Uniti" : `negli Apple Store ${aLuogo(place)}`;
    return [
      "La disponibilità per il ritiro si acquista su apple.com: scegli una configurazione e un negozio al momento del pagamento, paghi online e ritiri in negozio, spesso in giornata. È separata dalla merce sugli scaffali e dai negozi degli operatori.",
      `PickupChecker controlla ogni configurazione monitorata ${at} ogni 15 secondi, e ogni 5 quando un avviso la riguarda; un cambiamento conta solo dopo un secondo controllo di conferma, così un errore non diventa mai un falso rifornimento o un falso esaurito.`,
      "Ogni cambiamento confermato viene registrato; quel registro alimenta il grafico e lo storico dei rifornimenti di questa pagina.",
    ];
  },
  alertRule: "Un avviso = un negozio, un modello, una capacità, un colore; una notifica push (o un'email) parte pochi secondi dopo che apple.com passa a «disponibile».",

  titles: {
    state: (name: string, duoNow: string, stores: string) => [
      `Apple Store ${name}: ${duoNow} su ${stores} ${duoNow === "1" ? "ha" : "hanno"} l'iPhone Duo ora`,
      `Apple Store ${name}: disponibilità iPhone Duo per il ritiro`,
      `Apple Store ${name}: disponibilità iPhone Duo`,
      `Apple Store ${name}: disponibilità iPhone`,
    ],
    city: (city: string, code: string, duoNow: string, stores: string) => [
      `Apple Store ${city} (${code}): ${duoNow} su ${stores} ${duoNow === "1" ? "ha" : "hanno"} l'iPhone Duo`,
      `Apple Store ${city} (${code}): disponibilità iPhone Duo per il ritiro`,
      `Apple Store ${city} (${code}): disponibilità iPhone Duo`,
      `Apple Store ${city}: disponibilità iPhone`,
    ],
    store: (name: string, region: string | null) => {
      const r = region ? ` (${region})` : "";
      return [
        `${name}${r}: disponibilità iPhone oggi, ritiro e orari`,
        `${name}${r}: disponibilità iPhone oggi e orari`,
        `${name}${r}: disponibilità iPhone e orari`,
        `${name}: disponibilità iPhone oggi, ritiro e orari`,
        `${name}: disponibilità iPhone e orari`,
        `${name}: disponibilità iPhone`,
        `${name} – disponibilità`,
      ];
    },
    model: (name: string, storesNow: string) => [
      `${name}: disponibile ora in ${storesNow} Apple Store`,
      `Disponibilità ${name} per il ritiro: ${storesNow} Apple Store`,
      `Disponibilità ${name} per il ritiro in tempo reale`,
    ],
  },

  tokens: {
    tooFewToMeasure: "ancora troppo pochi per misurarlo",
    noneLoggedYet: "ancora nessuno registrato",
    noneYet: "ancora nessuno",
  },

  pattern: {
    none: (days: string) => `Nessun rifornimento confermato negli ultimi ${days} giorni.`,
    nConfirmed: f({ one: "# rifornimento confermato", other: "# rifornimenti confermati" }),
    countIn: (count: string, days: string) => `${count} negli ultimi ${days} giorni`,
    stay: (minutes: string) => `; di solito resta disponibile ~${minutes} min prima di esaurirsi`,
    nDays: f({ one: "# giorno", other: "# giorni" }),
    tooFew: (count: string, onDays: string | null, stay: string) => `${count}${onDays ? ` in ${onDays}` : ""}: ancora troppo pochi per parlare di una tendenza${stay}.`,
    usual: (hour: string, weekday: string | null, count: string, stay: string) => `Di solito torna disponibile verso le ${hour} (ora locale)${weekday ? `, soprattutto ${ilDay(weekday)}` : ""}; ${count}${stay}.`,
  },

  regionNouns: Object.fromEntries(Object.entries(nounForms).map(([k, v]) => [k, { one: v.one, other: v.other }])) as Record<string, Forms>,

  measured: "Come lo misuriamo",

  faqTitle: "Domande frequenti",
  breadcrumb: "Percorso di navigazione",
  keepExploring: "Continua a esplorare",
  browse: {
    storesByState: "Negozi per stato",
    allStatesCities: "Tutti gli stati e le città →",
    liveByModel: "Disponibilità per modello in tempo reale",
    modelStock: (model: string) => `Disponibilità ${model}`,
    thisPage: "questa pagina",
    restockLog: (short: string) => `Registro rifornimenti ${short}`,
    liveMap: "Mappa in tempo reale",
    mostStores: "Più negozi",
    allStates: "Tutti gli stati",
    bigCities: "Grandi città",
    cities: "Città",
    storesBy: (region: string) => `Negozi per ${region}`,
    allStoresIn: ({ country }: { inName: string; country: string }) => <>Tutti gli Apple Store {inNome(country)} →</>,
    allRegions: (regions: string) => tuttiPlural(regions),
  },
  modelCards: "Per iPhone",
  narrative: {
    lastRestock: (config: ReactNode, at: ReactNode, ago: ReactNode) => <>{" "}Ultimo rifornimento: {config}{at}, {ago}.</>,
    at: (store: ReactNode) => <> da {store}</>,
  },
  statStrip: {
    inStockNow: "Disponibili ora",
    ofStores: (n: string) => `su ${n} negozi`,
    stores: "Negozi",
    nCities: f({ one: "# città", other: "# città" }),
    tracked: "monitorati",
    modelNow: (short: string) => `${short} ora`,
    configsInStock: "configurazioni disponibili",
    storesWithStock: f({ one: "negozio con disponibilità", other: "negozi con disponibilità" }),
    restocks24h: "Rifornimenti 24 h",
    scoped: (label: string, model: string) => `${label} · ${model}`,
    restocksHint: (week: string, month: string, days: string) => `${week} in 7 g · ${month} in ${days} g`,
    sellOuts: (days: string) => `Esauriti ${days} g`,
    stays: (duration: string) => `dura ~${duration}`,
    noPairs: "ancora nessuna coppia",
    lastRestock: "Ultimo rifornimento",
    noneYet: "ancora nessuno",
    inLastDays: (days: string) => `negli ultimi ${days} giorni`,
  },
  product: {
    chooseIphone: "Scegli l'iPhone",
    storage: "Capacità",
    color: "Colore",
    all: "Tutti",
    numbersAre: (unit: ReactNode) => <>Numeri = {unit} con disponibilità ora.</>,
    seen: (ago: ReactNode) => <>visto {ago}</>,
    last: (ago: ReactNode) => <>ultimo {ago}</>,
    notSeenYet: "non ancora visto",
    firstCheckPending: "primo controllo in arrivo",
    inStock: "Disponibile",
    inStockLower: "disponibile",
    none: "nessuno",
    here: "qui",
    notAvailable: "Non disponibile",
    notCheckedYet: "Non ancora controllato",
    availableForPickup: "Disponibile per il ritiro",
    since: (ago: ReactNode) => <> · apparso {ago}</>,
    lastInStock: (ago: ReactNode) => <>Ultima volta disponibile {ago}</>,
    neverSeen: "Mai visto disponibile qui finora",
    firstCheckSoon: "Primo controllo entro un minuto",
    buy: "Acquista su apple.com",
    checked: (checked: ReactNode, note: ReactNode) => <>Controllato {checked} · {note}</>,
    checkNote: "ogni 15 s, 5 s con un avviso",
  },

  source: (source: ReactNode) => <>Fonte: {source}</>,
  photoCredit: (link: ReactNode) => <>Foto: {link}</>,
  sources: "Fonti",
  allUsStores: "tutti i 269 Apple Store degli Stati Uniti",
  trackerSource: (where: ReactNode, since: ReactNode, asOf: ReactNode) => <>Monitoraggio in tempo reale di PickupChecker ({where}): ogni configurazione di iPhone Duo, 18 Pro e 18 Pro Max controllata ogni 15 secondi (ogni 5 nei negozi con avvisi) dal {since}; numeri di questa pagina aggiornati al {asOf}.</>,
  live: {
    configsCaption: (stores: ReactNode, model: ReactNode) => <>Apple Store (su {stores}) con ogni configurazione di {model} disponibile per il ritiro ora · in tempo reale</>,
    storage: "Capacità",
    pricesCaption: (model: ReactNode) => <>Prezzi di {model} su apple.com (sbloccato, tasse escluse) e disponibilità per il ritiro in tempo reale</>,
    price: "Prezzo",
    bestColor: "Colore migliore, negozi ora",
    noRestock: (model: string) => `Ancora nessun rifornimento di ${model} registrato.`,
    clockLabel: (model: string) => `per l'${model} in tutto il paese`,
    storesWithIt: "Negozi che ce l'hanno ora",
    pairsInStock: "Coppie negozio × configurazione disponibili",
    restocksLogged: "Rifornimenti registrati",
    medianTime: "Tempo mediano di disponibilità",
    underOneMin: (min: string) => `< ${min}`,
  },

  /** Italian alt text and captions for the generic photos and Italy's place photos; other ids fall back to English. */
  photos: {
    "apple-store-crowd-inside": { alt: "Una folla in coda dentro un Apple Store affollato in un centro commerciale", caption: "La settimana del lancio dentro un Apple Store: la merce che arriva sugli scaffali sparisce in pochi minuti." },
    "apple-store-glass-canopy": { alt: "Apple Store con facciata in vetro e pensilina in legno di sera", caption: "Un Apple Store con la vetrata illuminata, dopo il tramonto." },
    "apple-store-night-vancouver": { alt: "Un Apple Store illuminato di notte a Vancouver", caption: "Apple Store di notte: la disponibilità per il ritiro può comparire a qualsiasi ora, ma arriva molto più spesso di mattina." },
    "apple-store-pickup-counter": { alt: "Bancone in legno con il cartello Ritiro dentro un Apple Store", caption: "Gli ordini con ritiro vengono consegnati a un bancone come questo." },
    "city-map-phone": { alt: "Due persone guardano la mappa della città su uno smartphone", caption: "Pianificare il percorso fino al negozio." },
    "phone-card-payment": { alt: "Una donna con un iPhone e una carta di credito mentre paga online", caption: "Pagare online per il Ritiro in negozio." },
    "phone-hand-camera": { alt: "Una persona tiene in mano un iPhone con tripla fotocamera", caption: "I modelli Pro sono quelli per cui si fa la fila." },
    "phone-map": { alt: "Mani che usano un'app di mappe su uno smartphone all'aperto", caption: "Quando un rifornimento dura un minuto, la distanza conta più di quanto si pensi." },
    "phone-notification": { alt: "Mano che tiene un telefono con le notifiche sulla schermata di blocco", caption: "Un avviso arriva sulla schermata di blocco." },
    "phone-on-box": { alt: "Uno smartphone nuovo appoggiato sulla sua scatola bianca", caption: "Un telefono nuovo, appena uscito dalla scatola." },
    "place-it-florence": { alt: "Il panorama di Firenze con la cupola del Brunelleschi e il campanile di Giotto", caption: "Firenze e il suo Duomo." },
    "place-it-italy": { alt: "Il Ponte di Rialto sul Canal Grande a Venezia con le gondole, di giorno", caption: "Il Ponte di Rialto, Venezia." },
    "place-it-milan": { alt: "La facciata gotica del Duomo di Milano su piazza del Duomo", caption: "Il Duomo di Milano e la sua piazza." },
    "place-it-rome": { alt: "Castel Sant'Angelo e Ponte Sant'Angelo riflessi nel Tevere, di giorno", caption: "Castel Sant'Angelo sul Tevere, Roma." },
    "place-it-rome-region": { alt: "Il Colosseo incorniciato dagli alberi al tramonto", caption: "Il Colosseo, Roma, al tramonto." },
    "place-it-turin": { alt: "I tetti di Torino e la Mole Antonelliana con le Alpi innevate sullo sfondo", caption: "Torino, la Mole Antonelliana e le Alpi." },
  },
};
