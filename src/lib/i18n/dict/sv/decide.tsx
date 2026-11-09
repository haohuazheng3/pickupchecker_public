/**
 * Swedish strings of the four decision pages (seo.md §16): which configuration is easiest to get, is the shortage
 * easing, Apple vs operators vs retailers, and the public API. Same keys, parameters and shapes as ../en/decide (the
 * type checker enforces it); labels (configuration, colour, store) arrive in Swedish through the view, the country is
 * named here with countryLabel ("Sverige", "USA"). Du-form and the vocabulary of views.tsx (påfyllning, bevakning,
 * Apple Store-butik, hämtning i butik, slutsåld, lagring, färg, konfiguration).
 * Facts that never change wording: check intervals are 15 s and 5 s (the API cache is written "med 30 sekunders
 * intervall", never "var 30"); no model names, storage sizes or brands are translated; Apple's return window is
 * "returrätt", never money back.
 */
import type { Country, CountryCode } from "@/lib/apple/countries";
import type { ChannelsView, DecideCtx, DecideDict } from "../en/decide";
import type { DuoSupply } from "@/lib/content/duoDecide";
import { exposureHours } from "@/lib/content/duoDecide";
import { LANG_TAG, fitTitleW } from "@/lib/i18n/format";
import { countryLabel } from "@/lib/i18n/places";
import { SPEED } from "@/lib/plans";
import { cap, n, pl, share as pct, words } from "./util";

const L = "sv" as const;

/* ---------------------------------------------------------------- Swedish number, date and duration helpers */
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.round(Math.abs(x) * 100)} %`;
/** "2,3": one decimal, always written. */
const dec1 = (v: number) => new Intl.NumberFormat(LANG_TAG[L], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
/** "5 november 2026". */
const longDate = (ymd: string) => new Intl.DateTimeFormat(LANG_TAG[L], { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "tors 5 nov.". */
const dateLabel = (ymd: string) => new Intl.DateTimeFormat(LANG_TAG[L], { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "38,4 timmar" in stock in total, "41 minuter" under an hour. */
const tim = (sec: number) => {
  if (sec < 3600) return pl(Math.max(1, Math.round(sec / 60)), "minut", "minuter");
  const h = exposureHours(sec);
  return h === 1 ? "1 timme" : `${n(h)} timmar`;
};
/** "75 s", "3 min" (from two minutes on). */
const sek = (s: number) => (s >= 120 ? `${n(Math.round(s / 60))} min` : `${n(Math.round(s))} s`);
/** "1,8 gånger" (… så ofta). */
const ratio = (a: number, b: number) => (b > 0 ? `${n(Math.round((a / b) * 10) / 10)} gånger` : "—");

const restocksN = (k: number) => pl(k, "påfyllning", "påfyllningar");
const confirmedN = (k: number) => pl(k, "bekräftad påfyllning", "bekräftade påfyllningar");
const storesN = (k: number) => pl(k, "butik", "butiker");
const appleStoresN = (k: number) => pl(k, "Apple Store-butik", "Apple Store-butiker");
const daysN = (k: number) => pl(k, "dag", "dagar");
const alertsN = (k: number) => pl(k, "bevakning", "bevakningar");
/** "Sverige", "USA". */
const land = (c: Country) => countryLabel(c.cc, L);

/** " i Sverige", " i USA": the country is always named on Swedish pages (the reader is not American). */
const where = (c: Country) => ` i ${land(c)}`;
const storesPhrase = (x: DecideCtx) => (x.one ? `den enda Apple Store-butiken i ${land(x.c)}` : `alla ${n(x.stores)} Apple Store-butiker i ${land(x.c)}`);
/** "fler" / "färre" / "ungefär lika många" (… påfyllningar). */
const trendWord = (d: DuoSupply) => (d.trend === "up" ? "fler" : d.trend === "down" ? "färre" : "ungefär lika många");
/** "Apples returrätt på 14 dagar", Hong Kong's no-returns rule, or a neutral phrase. */
const returnPhrase = (days: number | null) => (days ? `Apples returrätt på ${days} dagar` : days === 0 ? "Apples regel där om att inga returer tas emot (byte bara vid fel)" : "Apples returregler");

/** channels.ts's SIM-lock notes in Swedish (the data arrives in English). */
const LOCK: Partial<Record<CountryCode, string>> = {
  us: "Olåst när den köps av Apple; med avbetalning via AT&T, T-Mobile eller Verizon förblir iPhone låst till den operatören tills den är fullt betald.",
  ca: "Sedan 1 december 2017 kräver CRTC:s Wireless Code att varje ny telefon som säljs i Kanada, även via operatör, är olåst.",
  uk: "Ofcom förbjöd brittiska nät att sälja låsta telefoner från december 2021, så iPhone köpta via operatör är olåsta.",
  au: "iPhone med abonnemang från Telstra, Optus och Vodafone säljs olåsta; bara vissa kontantkortstelefoner är låsta till nätet.",
  de: "Apple och de stora tyska näten (Telekom, Vodafone, O2) säljer iPhone utan simlås; bara vissa kontantkortspaket är låsta.",
  fr: "Franska operatörer säljer nu de flesta telefoner olåsta (Free Mobile simlåser aldrig); ett kvarvarande lås ska tas bort gratis efter 3 månader.",
  it: "Apple säljer iPhone i Italien utan koppling till någon operatör (olåst); om operatörsfinansierade exemplar är låsta har vi inte kontrollerat.",
  es: "Apple säljer iPhone ”libre” (olåst) i Spanien; om operatörsfinansierade exemplar är låsta har vi inte kontrollerat.",
  jp: "Sedan oktober 2021 förbjuder det japanska kommunikationsministeriets riktlinjer operatörer att simlåsa nya telefoner, så operatörs-iPhone är olåsta.",
  kr: "Apple säljer oaktiverade iPhone olåsta i Korea; om exemplar som säljs av operatörer är låsta har vi inte kontrollerat.",
  hk: "Apple säljer iPhone olåst i Hongkong; om exemplar som säljs av operatörer är låsta har vi inte kontrollerat.",
  sg: "Singapores IMDA har en ”No SIM-Lock”-policy som förbjuder operatörer att simlåsa telefoner som säljs i Singapore.",
  ae: "Apple säljer iPhone olåst i Förenade Arabemiraten; om exemplar som säljs av operatörer är låsta har vi inte kontrollerat.",
  ch: "Apple säljer iPhone utan simlås i Schweiz; om exemplar som säljs av operatörer är låsta har vi inte kontrollerat.",
  nl: "Apple säljer iPhone utan simlås i Nederländerna; om exemplar som säljs av operatörer är låsta har vi inte kontrollerat.",
  se: "Apple säljer iPhone olåst i Sverige; om exemplar som säljs av operatörer är låsta har vi inte kontrollerat.",
  tw: "Apple säljer iPhone olåst i Taiwan; om exemplar som säljs av operatörer är låsta har vi inte kontrollerat.",
  at: "Apple säljer iPhone utan simlås i Österrike; om exemplar som säljs av operatörer är låsta har vi inte kontrollerat.",
  be: "Apple säljer iPhone olåst i Belgien; om exemplar som säljs av operatörer är låsta har vi inte kontrollerat.",
};
const lock = (x: ChannelsView) => (x.ch.carrierLock ? LOCK[x.c.cc] : undefined);

/* ================================================================== which configuration is easiest to get */
const configs: DecideDict["configs"] = {
  crumb: "Vilken konfiguration?",
  title: (c) => fitTitleW([`Vilken iPhone Duo fylls på oftast i ${land(c)}?`, `Vilken iPhone Duo fylls på oftast? (${land(c)})`, "Vilken iPhone Duo fylls på oftast?"], 49),
  metaDescription: (x) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    return e && h
      ? fitTitleW([
        `${x.cfg(e)} är den iPhone Duo som har varit till salu längst${where(x.c)}: ${n(e.restocks)} av ${n(d.n)} bekräftade påfyllningar i ${appleStoresN(x.stores)} och ${tim(e.exposureSec)} i lager sedan ${longDate(d.since)}; ${x.cfg(h)} kortast (${n(h.restocks)}). Varje konfiguration rankad efter lagring och färg, uppdaterad vid varje påfyllning.`,
        `${x.cfg(e)} har varit till salu längst${where(x.c)} (${n(e.restocks)} av ${n(d.n)} påfyllningar sedan ${longDate(d.since)}); ${x.cfg(h)} kortast. Varje konfiguration rankad efter lagring och färg.`,
      ], 160)
      : `Varje konfiguration av iPhone Duo rankad efter bekräftade påfyllningar i Apple Store-butikerna${where(x.c)} sedan ${longDate(d.since)}: lagring, färg, tid i lager och vad som finns just nu.`;
  },
  h1: (x) => `Vilken konfiguration av iPhone Duo fylls på oftast${where(x.c)}, och vilken är till salu längst?`,
  intro: (x) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    if (!e) return `PickupChecker har bekräftat ${pl(d.n, "påfyllning av iPhone Duo", "påfyllningar av iPhone Duo")} i ${storesPhrase(x)} sedan ${longDate(d.since)} – för få för att ranka konfigurationerna än. Tabellen nedan fylls på vid varje påfyllning; sidan för USA visar redan mönstret.`;
    const st = d.byStorage, co = d.byColor;
    return `${x.cfg(e)} är den konfiguration av iPhone Duo som legat ute längst${where(x.c)}: ${tim(e.exposureSec)} sammanlagt över ${n(e.restocks)} av de ${n(d.n)} påfyllningar som PickupChecker bekräftat i ${storesPhrase(x)} sedan ${longDate(d.since)}, i ${storesN(e.stores)}${e.lifetimes ? `, med en median på ${sek(e.lifetimes.medianSec)} per påfyllning` : ""}. ${h ? `${x.cfg(h)} låg ute kortast: ${restocksN(h.restocks)} och ${tim(h.exposureSec)}.` : ""}${st.length > 1 ? ` Lagringen delar upp antalet mer än färgen: ${st[st.length - 1].restocks > 0 ? `${st[0].key}-modellerna fylldes på ${ratio(st[0].restocks, st[st.length - 1].restocks)} så ofta som ${st[st.length - 1].key}` : `${st[0].key}-modellerna stod för ${pct(st[0].share)} av påfyllningarna medan ${st[st.length - 1].key} inte har fyllts på alls`}${co.length > 1 ? `, medan ${x.colour(co[0].key)} bara ledde över ${x.colour(co[1].key)} med ${Math.abs(Math.round((co[0].share - co[1].share) * 100))} procentenheter` : ""}.` : ""} Vilken du till slut lyckas köpa kan ingen säga; det som går att mäta är tidigare hämtfönster, och det är dem den här sidan rangordnar.`;
  },
  updated: (x, stamp) => `Uppdaterad ${stamp} · data sedan ${longDate(x.d.since)} · ${appleStoresN(x.stores)} · kollas var ${SPEED.checkSec}:e sekund (butiker med bevakning var ${SPEED.fastSec}:e)`,
  nav: { easiest: "Längst ute", storage: "Lagring", colour: "Färg", shelf: "Tid att hinna", week: "Den här veckan", alerts: "Vad du ska bevaka", method: "Så räknar vi" },
  h2: (x) => ({
    easiest: `Vilken konfiguration av iPhone Duo har legat ute längst${where(x.c)}?`,
    storage: "Påverkar lagringen hur ofta den kommer tillbaka?",
    colour: `${x.d.byColor.length > 1 ? `${cap(x.colour(x.d.byColor[0].key))} eller ${x.colour(x.d.byColor[1].key)}` : "Vilken färg"}: vilken färg kommer tillbaka oftast?`,
    shelf: "Vilken konfiguration ger dig mest tid att hinna köpa den?",
    week: "Vad har ändrats de senaste sju dagarna?",
    alerts: "Vilka konfigurationer ska jag bevaka?",
    method: "Så räknar vi en påfyllning och tiden i lager",
  }),
  hero: {
    restocks: (label) => `bekräftade påfyllningar av ${label}`,
    exposure: "timmar i lager, alla butiker sammanlagt",
    now: (one) => (one ? "har den just nu" : "butiker har den just nu"),
    median: "sekunder i lager (median)",
    total: "påfyllningar av alla konfigurationer",
  },
  easiestLead: (x) => {
    const e = x.d.easiest!;
    return `${x.cfg(e)} leder på båda måtten som går att mäta: den kom tillbaka oftast (${restocksN(e.restocks)}, ${pct(e.restocks / x.d.n)} av alla) och låg ute längst sammanlagt (${tim(e.exposureSec)}), alltså den tid då en hämtning gick att reservera. ${e.nowStores > 0 ? `${cap(storesN(e.nowStores))} har den medan du läser det här.` : "Ingen butik har den medan du läser det här; nästa påfyllning syns här inom några sekunder."}`;
  },
  easiestKeys: (x) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      `Topp tre efter tid i lager: ${words(top3.map((r) => `${x.cfg(r)} (${tim(r.exposureSec)})`))}.`,
      d.never.length ? `Aldrig påfylld${where(x.c)} sedan ${longDate(d.since)}: ${words(d.never.map((r) => x.cfg(r)))}.` : `Varje konfiguration har fyllts på minst en gång sedan ${longDate(d.since)}.`,
      d.lifetimes ? `Över alla konfigurationer låg en påfyllning ute i ${sek(d.lifetimes.medianSec)} (median); ${pct(d.lifetimes.within2min)} var borta inom 2 minuter.` : "Tiden i lager visas när tio påfyllningar har ett känt slut.",
    ];
  },
  rankCaption: (x) => `Varje konfiguration av iPhone Duo${where(x.c)}, mest tid i lager först · ${longDate(x.d.since)} till i dag`,
  rankHead: ["Konfiguration", "Påfyllningar", "Butiker", "I lager totalt", "Median i lager", "Finns nu", "Senaste påfyllning"],
  none: "inga än",
  storageLead: (x) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return "Lagringsstorlekarna jämförs när påfyllningarna kommer in; tabellen nedan uppdateras live.";
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return `Ja, mer än något annat: ${st[0].key} stod för ${pct(st[0].share)} av påfyllningarna och ${st[1].key} för ${pct(st[1].share)}${big ? `, medan 1TB- och 2TB-modellerna tillsammans stod för ${pct(big / x.d.n)}` : ""}. Apple skickar de storlekar flest beställer; de populäraste storlekarna är också de som en butik får flera av i samma leverans.`;
  },
  groupCaption: (what) => `Påfyllningar per ${what === "storage" ? "lagring" : "färg"}, alla butiker sammanlagt`,
  groupHead: (what) => [what === "Storage" ? "Lagring" : "Färg", "Påfyllningar", "Andel", "Butiker", "I lager totalt", "Median i lager", "Finns nu"],
  storageSwaps: (x) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: `Bevaka bara ${last}`, yes: `${top} först, ${last} också`, why: `${last} stod för ${pct(st[st.length - 1].share)} av påfyllningarna; ${top} för ${pct(st[0].share)}. Båda bevakningarna tar en plats var.` },
      { no: "Vänta på exakt rätt storlek", yes: `Ta ${top} eller ${second} när den kommer`, why: `De stod för ${pct(st[0].share + st[1].share)} av alla påfyllningar${where(x.c)}; med iCloud och ett skal spelar storleken mindre roll än väntan.` },
    ];
  },
  colourLead: (x) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return "Färgerna jämförs när påfyllningarna kommer in.";
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return `${cap(x.colour(co[0].key))}, men inte med mycket: ${pct(co[0].share)} av påfyllningarna mot ${pct(co[1].share)} för ${x.colour(co[1].key)}, en skillnad på ${gap} procentenheter${co[0].medianSec && co[1].medianSec ? `; i lager låg de ute i ${sek(co[0].medianSec)} och ${sek(co[1].medianSec)} (median)` : ""}. Färgen flyttar antalet mindre än lagringen. Bevakar du även en andra färg får du den färgens hämtfönster utöver dina: ${co[1].restocks > 0 ? `${x.colour(co[1].key)} lade till ${restocksN(co[1].restocks)} och ${tim(co[1].exposureSec)} i lager${where(x.c)} sedan ${longDate(x.d.since)}, utöver ${restocksN(co[0].restocks)} och ${tim(co[0].exposureSec)} för ${x.colour(co[0].key)} (alla storlekar)` : `${x.colour(co[1].key)} har inte fyllts på${where(x.c)} sedan ${longDate(x.d.since)}, så den hade hittills inte lagt till något`}.`;
  },
  colourKeys: (x) => x.d.byColor.map((g) => `${cap(x.colour(g.key))}: ${restocksN(g.restocks)} i ${storesN(g.stores)}, ${tim(g.exposureSec)} i lager totalt${g.nowStores ? `, ${storesN(g.nowStores)} har den nu` : ""}.`),
  shelfLead: (x) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return "En påfyllnings tid i lager mäts från påfyllningen till nästa kontroll som visar slutsålt; de första siffrorna visas när tio påfyllningar av en konfiguration har tagit slut.";
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return `${x.cfg(slow)} ger dig mest tid: en median på ${sek(slow.lifetimes!.medianSec)} i lager innan den tog slut, mot ${sek(fast.lifetimes!.medianSec)} för ${x.cfg(fast)}. De som säljer långsammast är de dyra storlekarna – färre köpare vill ha dem – så ”mest tid att hinna” och ”flest påfyllningar” pekar på olika konfigurationer, och rankningen ovan väger in båda.`;
  },
  shelfCaption: "Tid i lager per konfiguration (påfyllning → nästa kontroll som visar slutsålt)",
  shelfHead: ["Konfiguration", "Påfyllningar med känt slut", "Median", "Borta inom 2 min", "Borta inom 20 min", "Snabbast"],
  shelfKeys: (x) => [
    `Hälften av alla påfyllningar var borta inom ${x.d.lifetimes ? sek(x.d.lifetimes.medianSec) : "ungefär en minut"}; vår notis går iväg ungefär ${SPEED.alertSec} sekunder efter att vi bekräftat en, och hur mycket som är kvar beror sedan på din telefon och på att kassan är förberedd.`,
    `Tiden är en övre gräns: vi ser att den är slutsåld vid nästa kontroll, upp till ${SPEED.checkSec} sekunder senare (${SPEED.fastSec} sekunder i butiker med bevakning).`,
    "”Slutsåld” betyder här att Apples hämtsida slutade visa konfigurationen i den butiken; hur många exemplar det var säger Apple inte.",
  ],
  weekLead: (x) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return `Inga påfyllningar de senaste fjorton dagarna${where(x.c)}; tabellen vecka för vecka börjar med nästa.`;
    const lead = rows[0];
    return `${cap(restocksN(tot7))} de senaste sju dagarna${totP ? ` mot ${n(totP)} veckan före (${signed(tot7 / totP - 1)})` : ""}, med ${x.cfg(lead)} i topp med ${n(lead.last7)}. ${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `Det är en annan konfiguration än den som leder totalt (${x.cfg(x.d.easiest)}): fördelningen ändras med varje leverans, så titta i den här tabellen innan du väljer vad du ska bevaka.` : "Den som leder totalt leder också den här veckan."}`;
  },
  weekCaption: "Påfyllningar per konfiguration: senaste 7 dagarna mot de 7 före",
  weekHead: ["Konfiguration", "Senaste 7 dagarna", "Föregående 7 dagar", "Förändring"],
  alertsLead: (x) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? `Bevaka ${words(top.map((r) => x.cfg(r)))} i de två eller tre butiker du snabbast kan ta dig till; det täcker ${pct(top.reduce((a, r) => a + r.restocks, 0) / x.d.n)} av påfyllningarna hittills${where(x.c)}. Lägg till exakt den konfiguration du vill ha som fjärde bevakning, och ta den som kommer först.`
      : `Tills påfyllningarna kommer in${where(x.c)}: bevaka den lagring du vill ha i båda färgerna i dina närmaste butiker.`;
  },
  alertsKeys: (x) => [
    `En bevakning gäller butik × konfiguration, så tre butiker × tre konfigurationer blir ${alertsN(9)}.`,
    `Vi kollar butiker med bevakning var ${SPEED.fastSec}:e sekund och bekräftar en påfyllning innan vi skickar notisen; den skickas ungefär ${SPEED.alertSec} sekunder efter, och när den syns på din telefon beror på telefonen och dess uppkoppling – det mäter vi inte.`,
    x.one ? "Den mest besökta butiken är också den flest bevakar." : "Välj butiker efter avstånd, inte efter antal påfyllningar: den mest besökta butiken är också den flest bevakar.",
  ],
  methodLead: "En påfyllning är när en konfiguration går från slutsåld till tillgänglig i en butik, bekräftat av två samstämmiga kontroller; första observationer efter ett uppehåll i bevakningen räknas inte. Tiden i lager räknas från påfyllningen till första kontrollen som visar att den är slutsåld igen, så den är en övre gräns. ”I lager totalt” lägger ihop de tiderna över alla påfyllningar av konfigurationen – det enklaste måttet på hur länge en hämtning gick att reservera. Det är en logg över tidigare tillgänglighet, inte en köpchans och inte ett antal sålda exemplar: Apple publicerar inget av dem.",
  methodKeys: (x) => [
    `Källa: Apples egen tillgänglighet för hämtning i butik för ${storesPhrase(x)}, läst var ${SPEED.checkSec}:e sekund per butik (var ${SPEED.fastSec}:e i butiker med bevakning) sedan ${longDate(x.d.since)}.`,
    "Butiker som har den nu och tider för senaste påfyllning är live; allt annat räknas om inom fem minuter.",
    "Citera fritt med en länk: siffrorna ändras, så ange datumet du läste dem.",
  ],
  faq: (x) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor;
    return [
      { q: `Vilken iPhone Duo är lättast att få tag på${where(x.c)}?`, a: e ? `Ingen kan säga vilken just du lyckas köpa: Apple publicerar varken sina tilldelningar eller hur många som försöker. Det som går att mäta är tidigare upphämtningsfönster. Sedan ${longDate(d.since)} har ${x.cfg(e)} legat ute längst totalt (${tim(e.exposureSec)} över ${restocksN(e.restocks)} i ${appleStoresN(e.stores)})${h ? ` och ${x.cfg(h)} kortast (${tim(h.exposureSec)} över ${restocksN(h.restocks)})` : ""}, av ${confirmedN(d.n)} i ${storesPhrase(x)}. Det är en redovisning av tidigare tillgänglighet, ingen prognos för dig; vilken ändring som ger flest fönster för dina egna val – en färg till, en butik till – ser du under ”Vad ger flest upphämtningsfönster?” där du väljer dina bevakningar.` : `För få bekräftade påfyllningar${where(x.c)} för att säga det än; sidan rankar varje konfiguration så snart de kommer in.` },
      { q: `Är ${co.length > 1 ? x.colour(co[1].key) : "den ena färgen"} svårare att hitta än ${co.length > 1 ? x.colour(co[0].key) : "den andra"}?`, a: co.length > 1 && d.n ? `Lite: ${x.colour(co[0].key)} stod för ${pct(co[0].share)} av påfyllningarna och ${x.colour(co[1].key)} för ${pct(co[1].share)}. Skillnaden mellan lagringsstorlekarna är mycket större, så välj storlek först och bevaka båda färgerna av den.` : "Färgerna jämförs när påfyllningarna kommer in." },
      { q: `Finns iPhone Duo med 1TB eller 2TB någonsin i lager${where(x.c)}?`, a: (() => { const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage)); const bn = big.reduce((a, r) => a + r.restocks, 0); return bn ? `Ja, men sällan: ${restocksN(bn)} av 1TB- och 2TB-modellerna av ${n(d.n)} (${pct(bn / d.n)}), i högst ${new Set(big.flatMap((r) => (r.stores ? [r.partNumber] : []))).size ? storesN(Math.max(...big.map((r) => r.stores))) : "ingen butik"}. När en dyker upp ligger den ute längre (färre köpare), så en bevakning på den är värd en plats även om den sällan slår till.` : `Inte än i vår data${where(x.c)}: ingen bekräftad påfyllning av en 1TB- eller 2TB-modell sedan ${longDate(d.since)}.`; })() },
      { q: "Ska jag bevaka en konfiguration eller flera?", a: `Flera, i få butiker: de tre främsta konfigurationerna stod för ${d.n ? pct(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n) : "de flesta"} av påfyllningarna${where(x.c)}. Tre konfigurationer i tre närliggande butiker är nio bevakningar, vilket ryms i en Plus-plan; lägg till exakt den du vill ha som en fjärde.` },
      { q: "Är fördelningen densamma i andra länder?", a: `Inte alltid: varje land får sin egen tilldelning, och rankningen på landets sida kan skilja sig. Länkarna under ”Andra länder” öppnar samma sida för de 18 andra länder PickupChecker följer; sidan för USA har längst historik (sedan ${longDate("2026-10-29")}).` },
    ];
  },
  sources: { apple: "Apple – konfigurationer och priser för iPhone Duo", pickup: "Apple – hämtning i butik", log: "PickupChecker – påfyllningsloggen sidan räknas fram ur" },
  ld: (x) => ({
    datasetName: `Påfyllningar av iPhone Duo per konfiguration, Apple Store-butiker i ${land(x.c)}`,
    description: `Bekräftade påfyllningar av iPhone Duo i ${storesPhrase(x)} sedan ${longDate(x.d.since)}, per konfiguration (lagring × färg): antal, butiker, total tid i lager, median tid i lager, butiker som har den nu.`,
    measured: ["påfyllningar per konfiguration", "butiker med en påfyllning", "tid i lager i sekunder", "median tid i lager", "butiker som har den nu"],
  }),
  related: "Läs vidare",
  sameData: "Samma data, andra frågor",
  otherCountries: "Andra länder",
  questions: { restockTimes: "När fyller Apple på iPhone Duo?", sellOut: "Hur snabbt tar en påfyllning slut?", shortage: "Lättar bristen?", channels: "Apple, operatör eller återförsäljare?", alerts: "Snabbaste sättet att få en notis", api: "Gratis lager-API" },
  setUpAlert: "Skapa bevakningar",
  logLive: "Påfyllningslogg, live",
  faqTitle: "Vanliga frågor",
  onThisPage: "På den här sidan",
};

/* ================================================================== is the shortage easing */
const supply: DecideDict["supply"] = {
  crumb: "Lättar bristen?",
  title: (c) => fitTitleW([`Lättar bristen på iPhone Duo i ${land(c)}? Veckotrend`, `Lättar bristen på iPhone Duo i ${land(c)}?`, "Lättar bristen på iPhone Duo?"], 49),
  metaDescription: (x) => {
    const { d } = x;
    const w = d.last7;
    return d.trend !== "insufficient"
      ? fitTitleW([
        `${cap(trendWord(d))} påfyllningar av iPhone Duo${where(x.c)} den här veckan: ${n(w.restocks)} i ${appleStoresN(w.stores)} på 7 dagar (${signed(d.change!)} mot veckan före)${w.medianSec ? `, var och en borta efter ${sek(w.medianSec)} (median)` : ""}. Utbudet dag för dag, hur en lättnad skulle se ut och om det lönar sig att vänta.`,
        `${n(w.restocks)} påfyllningar av iPhone Duo${where(x.c)} de senaste 7 dagarna (${signed(d.change!)} vecka mot vecka). Utbudet dag för dag och om bristen lättar.`,
      ], 160)
      : `Lättar bristen på iPhone Duo${where(x.c)}? ${n(d.n)} bekräftade påfyllningar i Apple Store-butiker sedan ${longDate(d.since)}, dag för dag, med hur en lättnad skulle se ut och om du ska vänta eller köpa nu.`;
  },
  h1: (x) => `Blir bristen på iPhone Duo bättre${where(x.c)}, och hur länge håller den i sig?`,
  intro: (x) => {
    const { d } = x;
    const w = d.last7;
    if (d.trend === "insufficient") {
      return `För tidigt att säga${where(x.c)}: PickupChecker började bevaka den ${longDate(d.since)}, för ${daysN(d.days)} sedan, så den första hela jämförelsen vecka mot vecka visas den ${longDate(d.comparableFrom)}. Hittills ${confirmedN(d.n)} i ${d.storesEver} av ${appleStoresN(x.stores)}${d.lifetimes ? `, var och en i lager ${sek(d.lifetimes.medianSec)} (median) innan den tog slut` : ""}; ${d.storesNow} ${d.storesNow === 1 ? "butik har" : "butiker har"} en Duo just nu. Ingen kan förutsäga när bristen tar slut; sidan visar de två siffror som kommer att visa det först – påfyllningar per vecka och sekunder i lager – uppdaterade vid varje påfyllning.`;
    }
    const verdict = d.trend === "up" ? "Utbudet ökar" : d.trend === "down" ? "Utbudet minskar" : "Utbudet står still";
    const demand = w.medianSec ? (w.medianSec <= 120 ? `men efterfrågan tar fortfarande slut på det: en påfyllning låg ute i ${sek(w.medianSec)} (median) den här veckan${d.prev7.medianSec ? ` (${sek(d.prev7.medianSec)} förra veckan)` : ""}, så det är ännu inte lättare att köpa en för hand` : `och tiden i lager blir längre: ${sek(w.medianSec)} (median) den här veckan${d.prev7.medianSec ? ` mot ${sek(d.prev7.medianSec)} förra veckan` : ""}, det första tecknet på en lättnad`) : "";
    return `${verdict}${where(x.c)}: Apple Store-butikerna fyllde på iPhone Duo ${n(w.restocks)} gånger de senaste sju dagarna, ${signed(d.change!)} mot veckan före (${n(d.prev7.restocks)}), i ${storesN(w.stores)} av ${n(x.stores)} – ${demand}. ${d.storesNow} ${d.storesNow === 1 ? "butik har" : "butiker har"} en just nu. Ingen kan förutsäga slutet; de två siffror som kommer att visa det först finns på den här sidan och uppdateras vid varje påfyllning.`;
  },
  updated: (x, stamp) => `Uppdaterad ${stamp} · data sedan ${longDate(x.d.since)} · ${appleStoresN(x.stores)} · kollas var ${SPEED.checkSec}:e sekund`,
  nav: { trend: "Den här veckan", easier: "Lättare att köpa?", stores: "Hur många butiker", howlong: "Hur länge", christmas: "Vänta eller köpa", world: "Andra länder", method: "Så räknar vi" },
  h2: (x) => ({
    trend: `Ökar eller minskar påfyllningarna av iPhone Duo${where(x.c)}?`,
    easier: "Blir det lättare att faktiskt köpa en?",
    stores: `Hur många Apple Store-butiker${where(x.c)} har haft en iPhone Duo över huvud taget?`,
    howlong: "Hur länge håller bristen på iPhone Duo i sig?",
    christmas: "Ska jag fortsätta vänta på en påfyllning, eller köpa på annat sätt?",
    world: `Lättar bristen snabbare i andra länder${x.us ? "" : ` än i ${land(x.c)}`}?`,
    method: "Så räknar vi",
  }),
  weekBefore: "veckan före",
  goneIn2: "borta inom 2 minuter",
  storesEverLabel: (one) => (one ? "bekräftade påfyllningar hittills" : "butiker med minst en påfyllning"),
  hero: { last7: "påfyllningar, senaste 7 dagarna", change: "mot de föregående 7 dagarna", stores: (one) => (one ? "dagar med en påfyllning" : "butiker som fyllts på, senaste 7 dagarna"), median: "sekunder i lager (median), senaste 7 dagarna", now: (one) => (one ? "har en just nu" : "butiker har en just nu"), sinceLast: "timmar sedan senaste påfyllningen" },
  trendLead: (x) => {
    const { d } = x;
    if (d.trend === "insufficient") return `Tabellen dag för dag är hela historiken hittills: ${restocksN(d.n)} på ${daysN(d.days)}. En linje vecka mot vecka visas den ${longDate(d.comparableFrom)}; läs riktningen dag för dag tills dess.`;
    const w = d.last7, p = d.prev7;
    return `${cap(trendWord(d))} den här veckan: ${restocksN(w.restocks)} (${dec1(w.perStoreDay * 7)} per butik) mot ${n(p.restocks)} veckan före, ${signed(d.change!)}. ${w.longestGapHours != null ? `Det längsta uppehållet mellan två påfyllningar den här veckan var ${n(w.longestGapHours)} timmar` : ""}${w.longestGapHours != null && p.longestGapHours != null ? ` (${n(p.longestGapHours)} förra veckan)` : ""}${w.longestGapHours != null ? "." : ""} Påfyllningar kommer i vågor som följer leveranserna, så en enstaka lugn dag betyder lite; det är sjudagarssiffrorna du ska följa.`;
  },
  dailyCaption: (x) => `Bekräftade påfyllningar per lokal dag${where(x.c)}, nyast först (senaste 14 dagarna)`,
  dailyHead: ["Dag", "Påfyllningar", "Butiker", "Median i lager"],
  trendKeys: (x) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? `Mest händelserika dagen hittills: ${dateLabel(best.date)} med ${restocksN(best.restocks)} i ${storesN(best.stores)}.` : "Ingen påfyllning än; den mest händelserika dagen visas här.",
      x.d.sinceLastHours != null && x.d.latest ? `Senaste påfyllningen för ${x.d.sinceLastHours < 1 ? "mindre än en timme" : `${n(x.d.sinceLastHours)} timmar`} sedan: ${x.storeName(x.d.latest.storeNumber)}, ${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}.` : "Ingen påfyllning registrerad än.",
      `”Upp” betyder minst ${Math.round(0.15 * 100)} % fler påfyllningar än veckan före; ”ned” minst ${Math.round(0.15 * 100)} % färre; allt däremellan räknas som oförändrat.`,
    ];
  },
  easierLead: (x) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return "Lättare betyder två saker på en gång: fler påfyllningar, och att var och en ligger ute längre. Tiden i lager visas när tio påfyllningar i perioden har ett känt slut.";
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return `${longer ? "Lite, ja" : shorter ? "Nej – tvärtom" : "Inte än"}: en påfyllning låg ute i ${sek(w.medianSec)} (median) den här veckan${p.medianSec ? ` mot ${sek(p.medianSec)} förra veckan` : ""}, och ${pct(w.within2min!)} var borta inom två minuter${p.within2min != null ? ` (${pct(p.within2min)} förra veckan)` : ""}. En lättnad ser ut som att båda siffrorna rör sig tillsammans – fler påfyllningar och längre tid i lager; bara fler påfyllningar betyder att Apple skickar mer medan lika många väntar.`;
  },
  easierKeys: (x) => [
    "Så kommer en ”lättnad” att se ut här: median i lager över 20 minuter, de flesta butiker har en samtidigt, leveransbesked på apple.com inom en vecka.",
    `Tills dess är en bevakning fortfarande sättet att köpa en: vi bekräftar en påfyllning och skickar notisen ungefär ${SPEED.alertSec} sekunder senare, långt innanför mediantiden i lager.`,
    x.d.lifetimes ? `Totalt${where(x.c)}: ${pl(x.d.lifetimes.n, "påfyllning", "påfyllningar")} med känt slut, median ${sek(x.d.lifetimes.medianSec)}, ${pct(x.d.lifetimes.within2min)} borta inom 2 minuter.` : "Siffror för tid i lager totalt visas efter tio avslutade påfyllningar.",
  ],
  storesLead: (x) => {
    const { d } = x;
    const never = x.stores - d.storesEver;
    return x.one
      ? `${d.storesEver ? `Ja: den enda Apple Store-butiken i ${land(x.c)} har haft ${confirmedN(d.n)} sedan ${longDate(d.since)}` : `Inte än: ingen bekräftad påfyllning i den enda Apple Store-butiken i ${land(x.c)} sedan ${longDate(d.since)}`}${d.storesNow ? ", och den har en Duo just nu" : ""}.`
      : `${d.storesEver} av ${appleStoresN(x.stores)}${where(x.c)} (${pct(d.storesEver / x.stores)}) har haft minst en bekräftad påfyllning av iPhone Duo sedan ${longDate(d.since)}${never ? `; ${storesN(never)} har inte det` : ""}. ${d.storesNow} har en just nu. Utbudet sprids ojämnt: flaggskepps- och galleriabutiker fylls på oftast, och därför spelar butiken du väljer för bevakningar lika stor roll som konfigurationen.`;
  },
  storesKeys: (x) => [
    `Butiker efter antal påfyllningar, med lokala tider: avsnittet ”var” på sidan om påfyllningstider${where(x.c)}.`,
    "En butik som aldrig fyllts på är inte en butik som Apple hoppar över: tilldelningen kommer med leveranserna, och flera butiker fick sin första Duo först den andra veckan.",
  ],
  howlongLead: (x) => `Ingen utanför Apple vet, och vi gör inga prognoser. Det här visar historiken${where(x.c)}: ${restocksN(x.d.n)} på ${daysN(x.d.days)}, ${x.d.trend === "insufficient" ? `en trend vecka mot vecka från den ${longDate(x.d.comparableFrom)}` : `${trendWord(x.d)} påfyllningar den här veckan än förra`}, och tider i lager ${x.d.last7.medianSec ? `runt ${sek(x.d.last7.medianSec)}` : "under några minuter"}. En brist tar slut i en ordning du kan följa här: påfyllningarna per vecka ökar, tiden i lager sträcker sig från sekunder till timmar, sedan har de flesta butiker en samtidigt och leveransbeskedet på apple.com sjunker till dagar.`,
  howlongKeys: () => [
    "Tecken 1 – påfyllningarna per vecka fortsätter öka i två eller tre veckor (tabellen ovan).",
    "Tecken 2 – mediantiden i lager passerar 20 minuter: påfyllningarna varar längre än de som uppdaterar sidan.",
    "Tecken 3 – leveransbeskedet på apple.com hamnar inom en vecka och de flesta butiker har en samtidigt.",
    "Nya färger eller storlekar nollställer klockan; låt bevakningen vara på tills tecken 3.",
  ],
  christmasLead: (x) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Låt bevakningen vara på och ha en leveransbeställning i kön – båda, inte en av dem. I nuvarande takt (${perDay >= 1 ? `ungefär ${pl(Math.round(perDay), "påfyllning", "påfyllningar")} om dagen${where(x.c)}` : `färre än en påfyllning om dagen${where(x.c)}`}${w.medianSec ? `, var och en i lager ${sek(w.medianSec)} (median)` : ""}) får en bevakad butik nära dig sin tur inom några dagar, och notisen om en bekräftad påfyllning skickas ungefär ${SPEED.alertSec} sekunder efter att vi ser den. Att betala överpris någon annanstans är bara vettigt om själva väntan kostar dig mer än påslaget; jämförelsen av köpkanaler väger det ärligt.`;
  },
  christmasKeys: () => [
    "Beställ leverans på apple.com först: den håller din plats och kan avbeställas när en hämtning går igenom.",
    "Bevakningar på de två eller tre mest påfyllda konfigurationerna i dina närmaste butiker (sidan om konfigurationer visar vilka).",
    "Ha Apple Store-appen inloggad med Duo i kundvagnen och ett kort sparat: en påfyllning ligger ute ungefär en minut (median).",
  ],
  worldLead: (x) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return "Varje lands påfyllningar per butik och vecka jämförs här när alla har en hel veckas data.";
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return `${top.name} hade flest påfyllningar per butik de senaste sju dagarna (${dec1(top.perStoreDay * 7)} per butik), ${bottom.name} färst (${dec1(bottom.perStoreDay * 7)})${mine ? `; ${land(x.c)} ligger på ${dec1(mine.perStoreDay * 7)}` : ""}. Tilldelningen skiljer sig mellan länder och lanseringsdatum, så en lättnad syns ojämnt; historiken för USA är längst.`;
  },
  worldCaption: "Senaste 7 dagarna per land: påfyllningar, påfyllningar per butik, median i lager, butiker som har en nu",
  worldHead: ["Land", "Butiker", "Påfyllningar (7 d)", "Per butik", "Median i lager", "Finns nu"],
  methodLead: `En påfyllning är när en konfiguration går från slutsåld till tillgänglig i en butik, bekräftat av två samstämmiga kontroller med ${SPEED.checkSec} sekunders mellanrum (${SPEED.fastSec} sekunder i butiker med bevakning); första observationer efter ett uppehåll i bevakningen räknas inte. Dagarna är butikens lokala dagar. Tiden i lager räknas från påfyllningen till första kontrollen som visar att den är slutsåld igen – en övre gräns, fram till nästa kontroll. Veckorna är de senaste sju lokala dagarna mot de sju före; en jämförelse kräver att båda är kompletta.`,
  methodKeys: (x) => [
    `Källa: Apples tillgänglighet för hämtning i butik för ${storesPhrase(x)}, sedan ${longDate(x.d.since)}.`,
    "Allt på sidan räknas om inom fem minuter efter en påfyllning; butiker som har en nu är live.",
    "Citera med länk och datum: siffrorna rör sig.",
  ],
  faq: (x) => {
    const { d } = x;
    const w = d.last7;
    return [
      { q: `Fyller Apple fortfarande på iPhone Duo${where(x.c)}?`, a: d.n ? `Ja: ${confirmedN(w.restocks)} de senaste sju dagarna i ${appleStoresN(w.stores)}${where(x.c)}, ${restocksN(d.n)} sedan ${longDate(d.since)}. Den senaste var ${d.sinceLastHours != null && d.sinceLastHours < 1 ? "för mindre än en timme sedan" : d.sinceLastHours != null ? `för ${n(d.sinceLastHours)} timmar sedan` : "inte registrerad än"}.` : `Ingen bekräftad påfyllning än${where(x.c)} sedan bevakningen började den ${longDate(d.since)}; sidan uppdateras inom fem minuter efter den första.` },
      { q: `Blir bristen på iPhone Duo bättre${where(x.c)}?`, a: d.trend === "insufficient" ? `För tidigt att säga: den första hela jämförelsen vecka mot vecka visas den ${longDate(d.comparableFrom)}. Följ två siffror – påfyllningar per vecka och sekunder i lager; en lättnad betyder att båda stiger.` : `${cap(trendWord(d))} påfyllningar den här veckan än förra (${signed(d.change!)})${w.medianSec ? `, och en påfyllning låg ute i ${sek(w.medianSec)} (median)` : ""}. En lättnad betyder fler påfyllningar och längre tid i lager samtidigt; hittills ${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "rör sig båda åt rätt håll" : "händer bara en del av det"}.` },
      { q: "När blir iPhone Duo lätt att köpa?", a: "Ingen utanför Apple kan säga det, och PickupChecker gör inga prognoser. Ordningen att följa: påfyllningarna per vecka ökar i två eller tre veckor, mediantiden i lager passerar 20 minuter, sedan har de flesta butiker en samtidigt och leveransbeskedet på apple.com hamnar inom en vecka." },
      { q: "Ska jag betala överpris i stället för att vänta?", a: `Bara om väntan kostar dig mer än påslaget: i nuvarande takt får en bevakad butik nära dig sin tur inom några dagar, och notisen skickas ungefär ${SPEED.alertSec} sekunder efter en bekräftad påfyllning. Andrahandsköp betyder också ingen returrätt och de vanliga riskerna; sidan som jämför köpkanaler väger dem.` },
      { q: "Påverkar julhandeln chansen?", a: "Efterfrågan ökar fram mot december medan leveranserna behåller sin takt, så tiden i lager brukar bli kortare snarare än längre. Ha en leveransbeställning som reserv och låt bevakningarna fånga hämtningen; avbeställ den du inte behöver." },
    ];
  },
  sources: { newsroom: "Apple Newsroom – iPhone Duo kommer till Apple Store-butikerna", pickup: "Apple – hämtning i butik", log: "PickupChecker – påfyllningsloggen sidan räknas fram ur", restockTimes: "PickupChecker – när Apple fyller på iPhone Duo" },
  ld: (x) => ({
    datasetName: `Utbudstrend för iPhone Duo, Apple Store-butiker i ${land(x.c)}`,
    description: `Bekräftade påfyllningar av iPhone Duo per dag i ${storesPhrase(x)} sedan ${longDate(x.d.since)}: påfyllningar, butiker, median tid i lager, förändring vecka mot vecka.`,
    measured: ["påfyllningar per dag", "butiker med en påfyllning", "median tid i lager", "förändring vecka mot vecka", "butiker som har en nu"],
  }),
  related: "Läs vidare",
  sameData: "Samma data, andra frågor",
  otherCountries: "Den här sidan för andra länder",
  questions: { restockTimes: "När fyller Apple på iPhone Duo?", configs: "Vilken konfiguration fylls på oftast?", channels: "Apple, operatör eller återförsäljare?", sellOut: "Hur snabbt tar en påfyllning slut?", howToGet: "Så får du tag på en iPhone Duo", alerts: "Snabbaste sättet att få en notis" },
  setUpAlert: "Skapa bevakningar",
  logLive: "Påfyllningslogg, live",
  faqTitle: "Vanliga frågor",
  onThisPage: "På den här sidan",
};

/* ================================================================== Apple vs operators vs retailers */
const channels: DecideDict["channels"] = {
  crumb: "Apple, operatör eller återförsäljare?",
  title: (c, retailer) => fitTitleW([
    ...(c.cc === "us" ? [`iPhone Duo: Apple, ${retailer} eller en operatör?`] : []),
    `iPhone Duo i ${land(c)}: Apple, operatör, handlare?`,
    "iPhone Duo: Apple, operatör eller återförsäljare?",
  ], 49),
  metaDescription: (x) => fitTitleW([
    `Var du faktiskt får tag på en iPhone Duo${where(x.c)}: hämtning i Apple Store (${confirmedN(x.sup.n)} i ${storesN(x.stores)} sedan ${longDate(x.sup.since)}), leverans från apple.com, ${words(x.ch.carriers.slice(0, 3))}, ${words(x.ch.retailers.slice(0, 2))} och andrahandsmarknaden – vad varje kanal kan och inte kan berätta, och vilka du ska bevaka.`,
    `Hämtning i Apple Store, leverans från apple.com, ${words(x.ch.carriers.slice(0, 2))}, ${x.ch.retailers[0] ?? "återförsäljare"} eller andrahand för iPhone Duo${where(x.c)}: vad varje kanal kan berätta och vilka du ska bevaka.`,
  ], 160),
  h1: (x) => `Apple Store, en operatör eller en återförsäljare: var får du faktiskt tag på en iPhone Duo${where(x.c)}?`,
  intro: (x) => `Hämtning i Apple Store är den enda kanalen för iPhone Duo${where(x.c)} vars utbud någon kan mäta: PickupChecker har bekräftat ${restocksN(x.sup.n)} i ${storesPhrase(x)} sedan ${longDate(x.sup.since)}, ${n(x.sup.last7.restocks)} av dem de senaste sju dagarna, var och en läst från Apples egen sida för hämtning var ${SPEED.checkSec}:e sekund. Operatörerna (${words(x.ch.carriers)}) och återförsäljarna (${words(x.ch.retailers)}) får egna tilldelningar och publicerar inget lagerflöde, så ingen – inte vi, inte någon annan – kan ärligt ge dig deras påfyllningstider. Nedan: vad varje kanal kan och inte kan berätta, avvägningarna och i vilken ordning du ska bevaka dem.`,
  updated: (x, stamp) => `Uppdaterad ${stamp} · data från Apple Store sedan ${longDate(x.sup.since)} · ${appleStoresN(x.stores)} · kollas var ${SPEED.checkSec}:e sekund`,
  nav: { compare: "Kanal för kanal", pickup: "Hämtning eller leverans", carriers: "Operatörer", retailers: "Återförsäljare", resale: "Överpris i andrahand", abroad: "Köpa utomlands", method: "Så vet vi" },
  h2: (x) => ({
    compare: `Vilken kanal fyller på iPhone Duo oftast${where(x.c)}?`,
    pickup: "Är hämtning i Apple Store snabbare än att beställa leverans på apple.com?",
    carriers: `Ska jag köpa iPhone Duo från ${x.ch.carriers.length ? words(x.ch.carriers.slice(0, 3), 3) : "en operatör"} i stället?`,
    retailers: `Är ${x.ch.retailers.length ? words(x.ch.retailers.slice(0, 2), 2) : "återförsäljarna"} värda att kolla?`,
    resale: `Är det värt att betala överpris på ${x.ch.resale[0] ?? "en andrahandssajt"}?`,
    abroad: "Kan jag köpa en iPhone Duo utomlands och använda den hemma?",
    method: "Hur vi vet det vi vet",
  }),
  hero: { restocks: "bekräftade påfyllningar i Apple Store", last7: "de senaste 7 dagarna", now: (one) => (one ? "Apple Store-butik har en nu" : "Apple Store-butiker har en nu"), channels: "andra kanaler, inget offentligt lagerflöde" },
  compareLead: (x) => `Hämtning i Apple Store, enligt det enda mått som finns: ${confirmedN(x.sup.last7.restocks)} de senaste sju dagarna i ${storesN(x.sup.last7.stores)}${where(x.c)}${x.sup.last7.medianSec ? `, var och en i lager ${sek(x.sup.last7.medianSec)} (median)` : ""}. Operatörer och återförsäljare fyller nästan säkert också på – de får tilldelningar ur samma leveranser från Apple – men de visar ett ja/nej på en produktsida, inte ett flöde, så jämförelsen nedan handlar om vad du kan bevaka, inte om vem som får mest.`,
  compareCaption: "Kanalerna för iPhone Duo, ärligt jämförda",
  compareHead: ["Kanal", "Vad som är känt om lagret", "Så bevakar du den", "Haken"],
  compareRows: (x) => {
    const r = x.ch;
    return [
      { channel: "Hämtning i Apple Store", known: `${cap(confirmedN(x.sup.n))} sedan ${longDate(x.sup.since)}; varje påfyllning, varje butik, tidsatt.`, watch: `En bevakning här (notis skickad ungefär ${SPEED.alertSec} sekunder efter bekräftelsen), eller hämtningsväljaren i Apple Store-appen.`, catch: "En påfyllning ligger ute ungefär en minut; du behöver ha appen öppen och kortet sparat." },
      { channel: "Leverans från apple.com", known: "Apple visar ett leveransbesked i kassan; det ändras dagligen och är aldrig en lagersiffra.", watch: "Lägg beställningen; beskedet på din ordersida uppdateras när Apple skickar.", catch: "Veckor, inte minuter – men din plats i kön hålls." },
      { channel: `Operatörer (${words(r.carriers)})`, known: "Egen tilldelning; lagret på nätet visas per konfiguration som i lager / restnoterad. Ingen historik, inget flöde.", watch: "Deras appar och butikssökare; att ringa en butik fungerar fortfarande.", catch: lock(x) ?? "Abonnemang, avbetalning och aktiveringsregler gäller; lagret varierar mellan butiker." },
      { channel: `Återförsäljare (${words(r.retailers)})`, known: "Egen tilldelning, ofta bara på nätet för en nylanserad produkt; visas per konfiguration på produktsidan.", watch: "Deras produktsida och app; några skickar mejl vid påfyllning.", catch: "Tilldelningarna är mindre än Apples och tar också slut på minuter." },
      { channel: `Andrahand (${words(r.resale)})`, known: "Alltid tillgänglig, till ett pris.", watch: "—", catch: `Överpris, inget inköpsbevis från tillverkaren, ${r.returnDays ? `och ingen del av ${returnPhrase(r.returnDays)}` : "och ingen returrätt alls"}.` },
    ];
  },
  compareKeys: (x) => [
    `${n(x.ch.carriers.length + x.ch.retailers.length)} andra säljare${where(x.c)} och inte en enda offentlig lagerhistorik: en sajt som påstår sig känna till en operatörs påfyllningstider gissar.`,
    "Vår hållning: bevaka hämtning i Apple Store med en bevakning, ha en leveransbeställning på apple.com som reserv och kolla en återförsäljares sida när du ändå är där.",
  ],
  pickupLead: (x) => `För snabbhet, hämtning: en konfiguration som dyker upp på hämtningssidan kan reserveras samma minut och hämtas samma dag, medan en leveransbeställning väntar på Apples besked. För säkerhet, leverans: beställningen håller din plats vad som än händer på hyllorna. ${x.sup.lifetimes ? `Påfyllningar för hämtning${where(x.c)} låg ute i ${sek(x.sup.lifetimes.medianSec)} (median) och ${pct(x.sup.lifetimes.within2min)} var borta inom två minuter – därför finns bevakningen.` : ""} Rätt svar är båda: beställ leverans i dag, skapa bevakningen för hämtning och avbeställ den du inte behöver.`,
  pickupSwaps: () => [
    { no: "Avbeställa leveransen för att ”börja om”", yes: "Behåll den tills hämtningen är i din hand", why: "Apple publicerar inga köplatser; en ny beställning får bara dagens besked, som sällan är tidigare än det du redan har." },
    { no: "Uppdatera hämtningssidan för hand", yes: "Låt bevakningen hålla utkik", why: `Vi kollar butiker med bevakning var ${SPEED.fastSec}:e sekund och skickar notisen ungefär ${SPEED.alertSec} sekunder efter bekräftelsen; en människa som uppdaterar ser de flesta påfyllningar när de redan är borta.` },
    { no: "Ändra beställningen till hämtning senare", yes: "Reservera hämtning som en ny beställning när bevakningen slår till", why: "Hämtningsreservationer kommer från butikens lager, leveransbeställningar från lagret centralt: det är två köer, och hämtningskön är den snabba." },
  ],
  pickupKeys: (x) => [
    `Apples egen sida förklarar alternativen för hämtning och leverans${x.ch.returnDays ? ` och returrätten på ${x.ch.returnDays} dagar för båda` : x.ch.returnDays === 0 ? "; observera att Apple i Hongkong inte tar emot returer för att du ångrat dig, bara byten vid fel" : ""} (källor nedan).`,
    "En reservation för hämtning är en beställning till den butiken; Apple håller den och säger till när du kan komma.",
  ],
  carriersLead: (x) => `Om du vill ha avbetalning, en inbyteslösning kopplad till ett abonnemang, eller om du redan står i en ${x.ch.carriers[0] ?? "operatörs"}-butik med en på hyllan – ja. Om du vill ha telefonen så snart som möjligt är operatörerna ett andra lotteri med sämre odds och inget sätt att bevaka det. ${lock(x) ?? "Kolla simlås och abonnemangsvillkor innan du köper."} Deras webbutiker visar tillgänglighet per konfiguration, så en snabb titt kostar inget; räkna bara inte med historik eller notiser.`,
  carriersKeys: (x) => [
    `Operatörer${where(x.c)}: ${words(x.ch.carriers)}.`,
    "Operatörernas lager gäller per butik; en butik som visar en på nätet kan ha den bara för hämtning i butiken.",
    "En operatörstelefon är samma hårdvara; skillnaden är avtalet som följer med.",
  ],
  retailersLead: (x) => `Värda en titt när du ändå handlar där, inte värda att bevaka: ${words(x.ch.retailers)} visar iPhone Duo per konfiguration och säljer sin tilldelning på nätet på några minuter, utan något flöde att prenumerera på. Deras fördel är betalningsvillkor och bonuspoäng; nackdelen är en mindre tilldelning än Apples egna butiker.`,
  retailersKeys: (x) => [
    `Återförsäljare${where(x.c)}: ${words(x.ch.retailers)}.`,
    "Titta på konfigurationsväljaren på produktsidan: utgråat betyder slut på nätet, vilket inte säger något om deras butiker.",
  ],
  resaleLead: (x) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Sällan. Väg påslaget mot den väntan det köper bort: Apple Store-butikerna${where(x.c)} fylldes på ${perDay >= 1 ? `ungefär ${pl(Math.round(perDay), "gång", "gånger")} om dagen` : "mindre än en gång om dagen"} den här veckan, och notisen skickas ungefär ${SPEED.alertSec} sekunder efter en bekräftad påfyllning, så en bevakad butik nära dig brukar ge resultat inom några dagar. Mot det ger ${words(x.ch.resale)} inget inköpsbevis från tillverkaren, ${x.ch.returnDays ? `ingen del av ${returnPhrase(x.ch.returnDays)}` : "ingen returrätt alls"}, och de vanliga riskerna – en aktiveringslåst enhet, en utbytt kartong, en ”förseglad” retur.`;
  },
  resaleKeys: () => [
    "Köper du ändå i andrahand: träffas, starta telefonen, kolla serienumret under Inställningar → Allmänt → Om, och logga in innan du betalar.",
    "Apples garanti följer enheten, inte kvittot – men inköpsbevis kan efterfrågas; ett privat köp kan inte ge dig Apples.",
    "Ett påslag som är större än en veckas väntan är ett påslag för otålighet; bestäm dig med det i tankarna.",
  ],
  abroadLead: (x) => `Ofta ja, med kontroller: en iPhone köpt av Apple säljs olåst i de flesta länder, Apples garantiservice finns internationellt med undantag, och modellen måste stödja frekvensbanden hos din operatör hemma – och dess eSIM, eftersom Apples köpsidor anger att iPhone Duo bara har eSIM i alla länder. Skatterna är den verkliga kostnaden: ${x.c.pricesIncludeTax ? "priset du betalar utomlands innehåller lokal skatt som du kanske inte får tillbaka" : "försäljningsskatt läggs på i kassan"}, och tullen hemma kan lägga på avgifter på vägen tillbaka. PickupChecker följer ${x.us ? "18 andra länder" : "USA och 17 andra länder"}, så själva lagerfrågan går att besvara på ländernas sidor.`,
  abroadKeys: () => [
    "Innan du köper: Apples garantisida för var service erbjuds, modellens lista över band och SIM, och om din operatör hemma stöder eSIM.",
    "Spara kvittot: service och eventuell retur följer reglerna i landet där du köpte den.",
    "En telefon köpt åt någon där hemma är fortfarande köpt utomlands; samma kontroller gäller.",
  ],
  methodLead: (x) => `Apple Store-siffrorna på sidan kommer från PickupCheckers egna kontroller av ${storesPhrase(x)} var ${SPEED.checkSec}:e sekund sedan ${longDate(x.sup.since)}; en påfyllning räknas först efter två samstämmiga observationer. Listorna över operatörer och återförsäljare är de säljare som Apple själv nämner för landet plus de största återförsäljarna, med deras egna sidor som källor; det vi säger om deras lager är vad deras sidor visar, vilket är en ögonblicksbild, inte en historik. Vi skrapar dem inte och påstår inget om deras påfyllningstider.`,
  methodKeys: () => ["Rättelser välkomnas: om en säljare på sidan inte längre har iPhone Duo, säg till så tar vi bort den.", "Citera med länk och datum."],
  faq: (x) => [
    { q: `Vilken kanal fyller på iPhone Duo snabbast${where(x.c)}?`, a: `Den enda kanalen med en mätbar historik är hämtning i Apple Store: ${confirmedN(x.sup.last7.restocks)} de senaste sju dagarna${where(x.c)}${x.sup.last7.medianSec ? `, var och en i lager ${sek(x.sup.last7.medianSec)} (median)` : ""}. Operatörer och återförsäljare fyller också på men publicerar inget flöde, så ingen kan ranka dem ärligt.` },
    { q: "Förlorar jag min plats om jag avbeställer på apple.com och beställer igen?", a: "Du får en ny beställning med dagens leveransbesked; Apple publicerar inga köplatser. Jämför beskedet i kassan med det på din nuvarande beställning innan du avbeställer – det är sällan tidigare." },
    { q: "Är en iPhone Duo från en operatör annorlunda än Apples?", a: `Samma hårdvara. ${lock(x) ?? "Skillnaden är abonnemanget och eventuellt lås eller avbetalningsvillkor som följer med."} Operatörernas lager är skilt från Apples och visas per butik.` },
    { q: "Får jag Apples returrätt om jag köper från en återförsäljare?", a: x.ch.returnDays ? `Nej – återförsäljarens egna regler gäller. Apples returrätt på ${x.ch.returnDays} dagar gäller köp från Apple (apple.com och Apple Store-butiker).` : x.ch.returnDays === 0 ? "Apple i Hongkong tar själv inte emot returer för att du ångrat dig (bara byten vid fel), så jämför återförsäljarens egna regler – vissa är generösare än Apple där." : "Nej – återförsäljarens egna regler gäller; Apples returrätt gäller bara köp från Apple." },
    { q: "Vilka operatörer nämner Apple för iPhone Duo?", a: x.c.cc === "us" || x.c.cc === "jp" ? `Apples köpsida${where(x.c)} nämner ${words(x.ch.carriers)}; i alla andra länder säljs den olåst utan något operatörssteg.` : `Apples köpsida${where(x.c)} säljer iPhone Duo olåst och nämner ingen operatör; ${words(x.ch.carriers)} är de nät som Apple anger stöder iPhone där, och de säljer den på egna villkor.` },
    { q: "Kan jag använda en iPhone Duo köpt utomlands hos min operatör hemma?", a: "Oftast, om modellen stöder operatörens frekvensband, operatören erbjuder eSIM (iPhone Duo har bara eSIM överallt) och telefonen är olåst, vilket Apples egna försäljningar är i de flesta länder. Garantiservicen är internationell med undantag; skatter och tull är den verkliga extrakostnaden." },
  ],
  sources: { buy: "Apple – köp iPhone Duo", pickup: "Apple – hämtning i butik och leverans", returns: "Apple – returer och returrätt", warranty: "Apple – garantiservice per land", log: "PickupChecker – påfyllningsloggen sidan räknas fram ur" },
  ld: (x) => ({
    description: `Hämtning i Apple Store, leverans från apple.com, operatörer, återförsäljare och andrahand för iPhone Duo${where(x.c)}: uppmätta påfyllningar i Apple Store, och vad de andra kanalerna kan och inte kan berätta.`,
  }),
  related: "Läs vidare",
  sameData: "Samma data, andra frågor",
  otherCountries: "Den här sidan för andra länder",
  questions: { howToGet: "Så får du tag på en iPhone Duo", whereToBuy: "Var du kan köpa en i dag", shortage: "Lättar bristen?", configs: "Vilken konfiguration fylls på oftast?", restockTimes: "När fyller Apple på iPhone Duo?", alerts: "Snabbaste sättet att få en notis" },
  setUpAlert: "Skapa bevakningar",
  logLive: "Påfyllningslogg, live",
  faqTitle: "Vanliga frågor",
  onThisPage: "På den här sidan",
};

/* ================================================================== the public API */
const api: DecideDict["api"] = {
  crumb: "Lager-API",
  title: (c) => fitTitleW([`Gratis lager-API för iPhone Duo i ${land(c)} (JSON)`, `Gratis lager-API för iPhone Duo i ${land(c)}`, "Gratis lager-API för iPhone Duo"], 49),
  metaDescription: (x) => fitTitleW([
    `Ett gratis, skrivskyddat JSON-API för lager för hämtning av iPhone Duo i ${appleStoresN(x.stores)}${where(x.c)} (${n(x.worldStores)} i ${x.countries} länder): aktuell tillgänglighet per butik och konfiguration, bekräftade påfyllningar de senaste 24 timmarna, ingen nyckel, cachat 30 sekunder. Endpoints, exempel i curl/Python/JavaScript, gränser och när ett skript slår en bevakning.`,
    `Gratis JSON-API för lager av iPhone Duo i ${appleStoresN(x.stores)}${where(x.c)}: tillgänglighet per butik, påfyllningar senaste 24 tim, ingen nyckel. Endpoints, exempel och gränser.`,
  ], 160),
  h1: (x) => `Finns det ett API eller ett skript för att bevaka lagret av iPhone Duo i Apple Store-butiker${where(x.c)}?`,
  intro: (x) => `Ja: PickupChecker publicerar ett gratis, skrivskyddat JSON-API som täcker ${storesPhrase(x)} (${n(x.worldStores)} butiker i ${x.countries} länder totalt), byggt på kontroller var ${SPEED.checkSec}:e sekund per butik och cachat 30 sekunder i nätverkets kant, utan nyckel och utan registrering. Ett anrop ger varje butiks aktuella tillgänglighet för hämtning av iPhone Duo per konfiguration; ett andra ger de bekräftade påfyllningarna de senaste 24 timmarna. Just nu har ${x.storesNow} av ${storesN(x.stores)}${where(x.c)} en, och ${restocksN(x.restocks24)} bekräftades de senaste 24 timmarna. Nedan: endpoints, fungerande exempel i curl, Python och JavaScript, fältreferensen, gränserna – och varför ett skript som frågar med cachens intervall på 30 sekunder ändå är långsammare än en pushnotis.`,
  updated: (x, stamp) => `Uppdaterad ${stamp} · ${appleStoresN(x.stores)}${where(x.c)} · kollas var ${SPEED.checkSec}:e sekund · API:t cachas 30 sekunder`,
  nav: { endpoints: "Endpoints", examples: "Exempel", fields: "Fält", limits: "Gränser och villkor", script: "Skript eller bevakning?", apple: "Skrapa apple.com", method: "Var datan kommer ifrån" },
  h2: (x) => ({
    endpoints: `Vad returnerar lager-API:t för iPhone Duo${where(x.c)}?`,
    examples: "Hur anropar jag det från curl, Python eller JavaScript?",
    fields: "Vad betyder fälten?",
    limits: "Hur ofta får jag fråga, och vilka är villkoren?",
    script: "Ska jag skriva ett eget skript eller bara använda bevakningar?",
    apple: "Kan jag fråga apple.com själv i stället?",
    method: "Var datan kommer ifrån",
  }),
  hero: { stores: (one) => (one ? "Apple Store-butik täcks" : "Apple Store-butiker täcks"), now: "har en iPhone Duo nu", restocks24: "bekräftade påfyllningar, senaste 24 tim", cache: "sekunder API:t cachas" },
  perMinute: "anrop i minuten per adress",
  keysNeeded: "API-nycklar som behövs",
  endpointsLead: (x) => `Tre GET-endpoints, alla JSON, alla under https://pickupchecker.com/api/v1: \`stock\` ger varje Apple Store-butik${where(x.c)} med de konfigurationer den har för hämtning just nu och när den senast kollades; \`restocks\` ger bekräftade påfyllningar de senaste 1–168 timmarna, nyast först, med om var och en fortfarande finns; \`iphone-duo\` är en genväg till \`stock?model=duo\`. Landskoden står i sökvägen (${x.c.cc}${x.c.cc === "uk" ? ", gb godtas också" : ""}); modellerna är duo, 18-pro och 18-pro-max.`,
  endpointsCaption: "Endpoints (byt {country} mot us, ca, uk, au, de, fr, it, es, jp, kr, hk, sg, ae, ch, nl, se, tw, at eller be)",
  endpointsHead: ["Endpoint", "Returnerar", "Parametrar"],
  endpointsRows: (x) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: "Varje butik: in_stock, de tillgängliga konfigurationerna, last_checked_at, last_in_stock_at; en sammanfattning med stores_in_stock.", params: "model (duo | 18-pro | 18-pro-max), storage (t.ex. 512GB), color (t.ex. night-sky)" },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: "Bekräftade påfyllningar, nyast först: at, store, configuration, still_listed.", params: "model, hours (1–168, standard 24), limit (1–200, standard 100)" },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: "Omdirigerar till stock?model=duo.", params: "—" },
    { path: "/api/v1", returns: "Den här listan, länderna och modellerna, gränserna.", params: "—" },
  ],
  examplesLead: "Kopiera ett av dessa; vart och ett skriver ut de butiker som har en iPhone Duo just nu. Ingen nyckel, ingen header utöver en User-Agent som namnger ditt skript (så att vi kan höra av oss om det beter sig illa).",
  exampleTitles: { curl: "curl (vilket skal som helst)", python: "Python 3, bara standardbiblioteket", node: "JavaScript (Node 18+ eller en webbläsare)" },
  fieldsLead: "Alla fält är i snake_case och alla tider är ISO 8601 i UTC. Butiksidentiteterna är Apples egna (R-nummer), så de matchar Apples butikssidor och adresserna på den här sajten.",
  fieldsCaption: "Fältreferens",
  fieldsHead: ["Fält", "Typ", "Betydelse"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "När svaret räknades fram; CDN:et kan servera det i upp till 30 sekunder." },
    { f: "country.code / name / currency", t: "string", m: "Butikernas land." },
    { f: "configurations[]", t: "object", m: "Artikelnumren som frågan täcker, med lagring och färg som Apple skriver dem." },
    { f: "summary.stores_in_stock", t: "integer", m: "Butiker som har minst en täckt konfiguration för hämtning nu." },
    { f: "stores[].store_number", t: "string", m: "Apples butiks-id, t.ex. R085." },
    { f: "stores[].in_stock", t: "boolean", m: "Minst en täckt konfiguration finns för hämtning." },
    { f: "stores[].available[]", t: "object", m: "Konfigurationerna som finns: part_number, storage, color." },
    { f: "stores[].last_checked_at", t: "string | null", m: `När vi senast läste Apples hämtningssida för butiken (normalt för mindre än ${SPEED.checkSec} sekunder sedan).` },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "Senaste gången butiken hade en täckt konfiguration." },
    { f: "restocks[].at", t: "string", m: "När konfigurationen gick från slutsåld till tillgänglig (bekräftat av två kontroller)." },
    { f: "restocks[].still_listed", t: "boolean | null", m: "Om butiken fortfarande har den när svaret ges." },
    { f: "attribution", t: "object", m: "Källan, licensraden och den här sidan." },
  ],
  limitsLead: "Fråga med ett intervall på 30 sekunder eller längre per endpoint – svaren cachas så länge i nätverkets kant, så ett kortare intervall ger samma JSON – och håll dig under 60 anrop i minuten från en adress, vilket är gränsen som når våra servrar. Datan är gratis att använda, även kommersiellt, på ett villkor: visa ”Källa: PickupChecker” med en länk till pickupchecker.com (eller butikens eller landets sida) överallt där siffrorna visas. Ingen nyckel, ingen registrering, CORS öppet, så en webbsida kan anropa det direkt.",
  limitsKeys: () => [
    "Ett 429-svar betyder fler än 60 anrop på en minut från din adress; vänta så många sekunder som Retry-After anger.",
    "Ändringar som bryter kompatibiliteten får en ny versionssökväg (/api/v2); under v1 läggs fält till, de byter aldrig namn.",
    "Ange gärna en User-Agent som namnger ditt projekt och en kontakt; vi har aldrig blockerat ett hyfsat skript.",
  ],
  scriptLead: (x) => `Vill du ha en instrumentpanel, en Discord-bot, ett kalkylark eller forskning, skriv skriptet – det är vad API:t är till för. Vill du faktiskt köpa en iPhone Duo är ett skript det långsammare verktyget: det ser en påfyllning vid nästa anrop, upp till 30 sekunder senare, och måste sedan meddela dig; vår pushnotis läser samma butiker var ${SPEED.fastSec}:e sekund, bekräftar påfyllningen och går iväg ungefär ${SPEED.alertSec} sekunder efter – ${x.storesNow !== undefined ? "innanför mediantiden i lager på ungefär en minut" : "innanför mediantiden i lager"}. Många gör båda: bevakningen för att köpa, API:t för att följa.`,
  scriptCaption: "Ett skript som frågar mot en pushnotis",
  scriptHead: ["", "Ditt skript mot det här API:t", "Bevakning från PickupChecker"],
  scriptRows: () => [
    { k: "Ser en påfyllning efter", a: "upp till 30 s (cache) + ditt intervall", b: `notis skickad ungefär ${SPEED.alertSec} s efter att vår kontroll ser den` },
    { k: "Når din telefon", a: "det du bygger (mejl, bot, sms)", b: "en notis i appen på hemskärmen" },
    { k: "Butiker som bevakas", a: "alla, vid varje anrop", b: `dina valda butiker var ${SPEED.fastSec}:e sekund, alla butiker var ${SPEED.checkSec}:e sekund` },
    { k: "Kostnad", a: "gratis", b: "en plan för bevakningarna; sajten är gratis att läsa" },
  ],
  appleLead: "Det kan du, inom gränser: apple.com:s hämtningssida svarar per butik och konfiguration, vilket är precis vad vi läser. Det ett snabbt hopkok till skript missar är omsorgen – IPv6-rotation så att Apple fortsätter svara, en regel om två observationer så att ett fladdrande ”inte tillgänglig” inte blir en falsk påfyllning, tidszonshantering för varje butik och en historik som förts sedan lanseringsdagen. Vill du bara ha svaret är API:t det arbetet redan gjort; vill du lära dig förklarar vår metodsida varje del.",
  appleKeys: () => [
    "Apples sida är en ögonblicksbild: den visar nuet, aldrig hur länge en påfyllning varade eller när den senaste var.",
    `Våra kontroller ligger ${SPEED.checkSec} sekunder isär per butik och aldrig tätare än ${SPEED.fastSec} sekunder; ett skript som frågar apple.com hårdare än så blir blockerat och lär sig ingenting.`,
  ],
  methodLead: (x) => `Varje siffra kommer från att PickupChecker läser Apples egen tillgänglighet för hämtning i butik för ${storesPhrase(x)} var ${SPEED.checkSec}:e sekund (var ${SPEED.fastSec}:e i butiker med bevakning). En ändring sparas först efter två samstämmiga observationer; första observationen efter ett uppehåll är ingen påfyllning. API:t serverar samma tabeller som sidorna på sajten läser; inget är stickprov eller uppskattningar.`,
  methodKeys: () => ["Hela metoden: sidan om hur det fungerar.", "Källhänvisningen är hela priset; en länk tillbaka håller det här gratis."],
  faq: (x) => [
    { q: `Finns det ett gratis API för lagret av iPhone Duo i Apple Store-butiker${where(x.c)}?`, a: `Ja – PickupCheckers, på https://pickupchecker.com/api/v1/${x.c.cc}/stock: varje Apple Store-butik${where(x.c)} med de konfigurationer den har för hämtning nu, JSON, ingen nyckel, cachat 30 sekunder. En andra endpoint ger bekräftade påfyllningar de senaste 24 timmarna.` },
    { q: "Har Apple ett officiellt lager-API?", a: "Inget offentligt. apple.com:s hämtningssida kan läsas per butik och konfiguration, vilket är vad den här sajten gör med omsorg (rotation, bekräftelse, tidszoner); API:t här är det arbetet exponerat som JSON." },
    { q: "Hur aktuell är datan?", a: `Varje butik kollas var ${SPEED.checkSec}:e sekund (var ${SPEED.fastSec}:e i butiker med bevakning) och API-svaret cachas 30 sekunder, så en siffra är högst ungefär 45 sekunder gammal; last_checked_at visar exakt.` },
    { q: "Får jag använda det i en kommersiell produkt?", a: "Ja, med källhänvisning: ”Källa: PickupChecker” länkat till pickupchecker.com överallt där datan visas, och ett frågeintervall på 30 sekunder eller längre. Ingen nyckel behövs." },
    { q: "Får jag en iPhone Duo snabbare med ett skript än med en bevakning?", a: `Nej: ett skript ser en påfyllning vid nästa anrop, upp till 30 sekunder senare; bevakningen bekräftar den och notisen går iväg ungefär ${SPEED.alertSec} sekunder efter att vi ser den. Använd skriptet för att följa och bevakningen för att köpa.` },
  ],
  sources: { pickup: "Apple – hämtning i butik", method: "PickupChecker – så fungerar kontrollerna", log: "PickupChecker – påfyllningsloggen" },
  ld: (x) => ({
    description: `Gratis JSON-API för tillgänglighet för hämtning av iPhone Duo i ${storesPhrase(x)}: aktuellt lager per butik och konfiguration, bekräftade påfyllningar de senaste 24 timmarna.`,
  }),
  related: "Läs vidare",
  sameData: "Samma data, andra frågor",
  otherCountries: "Den här sidan för andra länder",
  questions: { alerts: "Snabbaste sättet att få en notis", howItWorks: "Så fungerar kontrollerna", restockTimes: "När fyller Apple på iPhone Duo?", shortage: "Lättar bristen?", configs: "Vilken konfiguration fylls på oftast?", stockChecker: "Lagerkoll för iPhone Duo" },
  setUpAlert: "Skapa bevakningar",
  tryIt: "Öppna live-JSON",
  faqTitle: "Vanliga frågor",
  onThisPage: "På den här sidan",
};

export const decide: DecideDict = { configs, supply, channels, api };

