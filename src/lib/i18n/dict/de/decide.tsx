/**
 * German strings of the four decision pages (seo.md §16): which configuration is easiest to get, is the shortage
 * easing, Apple vs carriers vs retailers, and the public API. Same keys, parameters and shapes as ../en/decide
 * (the type checker enforces it); labels (configuration, colour, store) arrive in German through the view, the
 * country is named here (util.land / inLand). Standard German with ß (Swiss pages derive ß → ss); Sie-Form;
 * the vocabulary of views.tsx (Restock / wieder verfügbar, Bestand, Abholung im Store, Konfiguration, Speicher, Farbe).
 * Facts that never change wording: check intervals are 15 s and 5 s; no model names, storage sizes or brands are translated.
 */
import type { Faq } from "@/lib/content/types";
import type { Country, CountryCode } from "@/lib/apple/countries";
import type { ApiView, ChannelsView, ConfigsView, DecideCtx, DecideDict, SupplyView } from "../en/decide";
import type { DuoSupply } from "@/lib/content/duoDecide";
import { exposureHours } from "@/lib/content/duoDecide";
import { LANG_TAG, list } from "@/lib/i18n/format";
import { SPEED } from "@/lib/plans";
import { cap, fitDe, inLand, land, n, pct, plural } from "./util";

const L = "de" as const;

/* ---------------------------------------------------------------- German number, date and duration helpers */
/** 0.59 → "59 %", tiny shares "<1 %". */
const pctF = (x: number) => (x > 0 && x < 0.005 ? "<1 %" : pct(Math.round(x * 100)));
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${pct(Math.round(Math.abs(x) * 100))}`;
/** "5. November 2026". */
const longDate = (ymd: string) => new Intl.DateTimeFormat(LANG_TAG[L], { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "Do., 5. Nov.". */
const dateLabel = (ymd: string) => new Intl.DateTimeFormat(LANG_TAG[L], { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "38,4 Stunden" listed, "41 Minuten" under an hour. */
const stunden = (sec: number) => {
  if (sec < 3600) return plural(Math.max(1, Math.round(sec / 60)), "Minute", "Minuten");
  const h = exposureHours(sec);
  return h === 1 ? "1 Stunde" : `${n(h)} Stunden`;
};
/** "75 Sekunden", "3 Minuten" (from two minutes on). */
const sek = (s: number) => (s >= 120 ? plural(Math.round(s / 60), "Minute", "Minuten") : plural(Math.round(s), "Sekunde", "Sekunden"));
/** "1,8-mal" (… so oft). */
const ratio = (a: number, b: number) => (b > 0 ? `${n(Math.round((a / b) * 10) / 10)}-mal` : "—");
const words = (items: string[], max = 6) => list(L, items, max, (k) => `${n(k)} weitere`);
const restocks = (k: number) => plural(k, "Restock", "Restocks");
const confirmed = (k: number) => plural(k, "bestätigter Restock", "bestätigte Restocks");
const stores = (k: number) => plural(k, "Store", "Stores");
const appleStores = (k: number) => plural(k, "Apple Store", "Apple Stores");
const alarme = (k: number) => plural(k, "Alarm", "Alarme");
/** "12 Tagen" (dative, after "in", "seit"). */
const tagen = (k: number) => plural(k, "Tag", "Tagen");

/** "in Deutschland", "in der Schweiz": the country after a place word (the US is named too — the reader is German). */
const wo = (c: Country) => inLand(c.cc);
/** Dative: "in allen 12 Apple Stores in Deutschland" / "in dem einen Apple Store in Österreich". */
const storesDat = (x: DecideCtx) => (x.one ? `dem einen Apple Store ${wo(x.c)}` : `allen ${n(x.stores)} Apple Stores ${wo(x.c)}`);
/** Accusative: "fragt alle 12 Apple Stores in Deutschland ab". */
const storesAkk = (x: DecideCtx) => (x.one ? `den einen Apple Store ${wo(x.c)}` : `alle ${n(x.stores)} Apple Stores ${wo(x.c)}`);
const trendWord = (d: DuoSupply) => (d.trend === "up" ? "mehr" : d.trend === "down" ? "weniger" : "etwa gleich viele");
/** "die 14-tägige Rückgabefrist von Apple", Hong Kong's no-returns rule, or a neutral phrase. */
const rueckgabe = (days: number | null) => (days ? `die ${days}-tägige Rückgabefrist von Apple` : days === 0 ? "Apples dortige Regel ohne Rückgaberecht (Umtausch nur bei Defekt)" : "Apples Rückgaberegelung");
/** The SIM-lock note in German for the three German-speaking markets; elsewhere a sentence that sends the reader to the terms (the data's note is English). */
const LOCK_DE: Partial<Record<CountryCode, string>> = {
  de: "Apple und die großen deutschen Netze (Telekom, Vodafone, O2) verkaufen iPhones ohne SIM-Lock; nur manche Prepaid-Bundles sind gesperrt.",
  at: "Apple verkauft das iPhone in Österreich ohne SIM-Lock; ob Geräte der Mobilfunkanbieter gesperrt sind, haben wir nicht geprüft.",
  ch: "Apple verkauft das iPhone in der Schweiz ohne SIM-Lock; ob Geräte der Mobilfunkanbieter gesperrt sind, haben wir nicht geprüft.",
};
const lockNote = (x: ChannelsView, fallback: string) => LOCK_DE[x.c.cc] ?? (x.ch.carrierLock ? "Prüfen Sie vor dem Kauf, ob das Gerät einen SIM-Lock hat und welche Vertragsbedingungen gelten." : fallback);

/* ================================================================== which configuration is easiest to get */
const configs: DecideDict["configs"] = {
  crumb: "Welche Konfiguration?",
  title: (c: Country) => fitDe([
    `Welches iPhone Duo kommt ${inLand(c.cc)} am häufigsten?`,
    `Welches iPhone Duo kommt am häufigsten? (${land(c.cc)})`,
    "Welches iPhone Duo kommt am häufigsten wieder?",
  ], 49, c.cc),
  metaDescription: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    return e && h
      ? fitDe([
        `${x.cfg(e)} ist das iPhone Duo, das ${wo(x.c)} am leichtesten zu bekommen ist: ${n(e.restocks)} von ${n(d.n)} bestätigten Restocks in ${appleStores(x.stores)} und ${stunden(e.exposureSec)} im Angebot seit dem ${longDate(d.since)}; ${x.cfg(h)} ist am schwersten (${n(h.restocks)}). Jede Konfiguration nach Speicher und Farbe gereiht, mit jedem Restock aktualisiert.`,
        `${x.cfg(e)} ist ${wo(x.c)} das am leichtesten erhältliche iPhone Duo (${n(e.restocks)} von ${n(d.n)} Restocks seit dem ${longDate(d.since)}); ${x.cfg(h)} das schwerste. Jede Konfiguration nach Speicher und Farbe gereiht.`,
      ], 160, x.c.cc)
      : `Jede iPhone-Duo-Konfiguration nach bestätigten Apple-Store-Restocks ${wo(x.c)} seit dem ${longDate(d.since)}: Speicher, Farbe, Zeit im Angebot und was gerade gelistet ist.`;
  },
  h1: (x: ConfigsView) => `Welche iPhone-Duo-Konfiguration kommt ${wo(x.c)} am häufigsten wieder – und welche bekommt man am leichtesten?`,
  intro: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    if (!e) return `PickupChecker hat seit dem ${longDate(d.since)} in ${storesDat(x)} ${plural(d.n, "iPhone-Duo-Restock", "iPhone-Duo-Restocks")} bestätigt – zu wenige, um die Konfigurationen schon zu reihen. Die Tabelle unten füllt sich mit jedem Restock; die US-Seite zeigt das Muster bereits.`;
    const st = d.byStorage, co = d.byColor;
    return `${x.cfg(e)} war ${wo(x.c)} von allen iPhone-Duo-Konfigurationen am längsten gelistet: insgesamt ${stunden(e.exposureSec)} über ${n(e.restocks)} der ${n(d.n)} Restocks, die PickupChecker seit dem ${longDate(d.since)} in ${storesDat(x)} bestätigt hat, in ${stores(e.stores)}${e.lifetimes ? `, im Median ${sek(e.lifetimes.medianSec)} pro Restock` : ""}. ${h ? `${x.cfg(h)} war am kürzesten gelistet: ${restocks(h.restocks)} und ${stunden(h.exposureSec)}.` : ""}${st.length > 1 ? ` Der Speicher teilt die Zahl stärker auf als die Farbe: ${st[st.length - 1].restocks > 0 ? `${st[0].key}-Modelle kamen ${ratio(st[0].restocks, st[st.length - 1].restocks)} so oft wieder wie ${st[st.length - 1].key}` : `${st[0].key}-Modelle stellten ${pctF(st[0].share)} der Restocks, während ${st[st.length - 1].key} noch gar nicht wieder da war`}${co.length > 1 ? `, während ${x.colour(co[0].key)} vor ${x.colour(co[1].key)} nur ${Math.abs(Math.round((co[0].share - co[1].share) * 100))} Prozentpunkte Vorsprung hat` : ""}.` : ""} Welche Sie am Ende kaufen können, kann niemand sagen; messbar sind vergangene Abholfenster, und genau die reiht diese Seite.`;
  },
  updated: (x: ConfigsView, stamp: string) => `Aktualisiert ${stamp} · Daten seit dem ${longDate(x.d.since)} · ${appleStores(x.stores)} · alle ${SPEED.checkSec} Sekunden geprüft (Stores mit Alarm alle ${SPEED.fastSec} Sekunden)`,
  nav: { easiest: "Am längsten gelistet", storage: "Speicher", colour: "Farbe", shelf: "Zeit zum Zugreifen", week: "Diese Woche", alerts: "Worauf achten", method: "So zählen wir" },
  h2: (x: ConfigsView) => ({
    easiest: `Welche iPhone-Duo-Konfiguration war ${wo(x.c)} am längsten gelistet?`,
    storage: "Verändert die Speichergröße, wie oft es wiederkommt?",
    colour: `${x.d.byColor.length > 1 ? `${x.colour(x.d.byColor[0].key)} oder ${x.colour(x.d.byColor[1].key)}` : "Welche Farbe"}: Welche Farbe kommt öfter wieder?`,
    shelf: "Bei welcher Konfiguration bleibt am meisten Zeit zum Zugreifen?",
    week: "Was hat sich in den letzten sieben Tagen geändert?",
    alerts: "Für welche Konfigurationen sollte ich Alarme einrichten?",
    method: "So zählen wir einen Restock und die Verweildauer",
  }),
  hero: {
    restocks: (label: string) => `bestätigte Restocks von ${label}`,
    exposure: "Stunden im Angebot, alle Stores zusammen",
    now: (one: boolean) => (one ? "bietet es gerade an" : "Stores, die es gerade anbieten"),
    median: "Sekunden Verweildauer im Median",
    total: "Restocks aller Konfigurationen",
  },
  easiestLead: (x: ConfigsView) => {
    const e = x.d.easiest!;
    return `${x.cfg(e)} liegt in beiden Punkten vorn, die sich messen lassen: Es kam am häufigsten wieder (${n(e.restocks)} Restocks, ${pctF(e.restocks / x.d.n)} aller) und blieb in Summe am längsten gelistet (${stunden(e.exposureSec)}) – die Zeit, in der eine Abholung reserviert werden konnte. ${e.nowStores > 0 ? `${stores(e.nowStores)} ${e.nowStores === 1 ? "bietet" : "bieten"} es an, während Sie das lesen.` : "Kein Store bietet es an, während Sie das lesen; der nächste Restock erscheint hier binnen Sekunden."}`;
  },
  easiestKeys: (x: ConfigsView) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      `Top drei nach Zeit im Angebot: ${words(top3.map((r) => `${x.cfg(r)} (${stunden(r.exposureSec)})`))}.`,
      d.never.length ? `Seit dem ${longDate(d.since)} ${wo(x.c)} nie wieder da: ${words(d.never.map((r) => x.cfg(r)))}.` : `Jede Konfiguration war seit dem ${longDate(d.since)} mindestens einmal wieder da.`,
      d.lifetimes ? `Über alle Konfigurationen blieb ein Restock im Median ${sek(d.lifetimes.medianSec)} gelistet; ${pctF(d.lifetimes.within2min)} waren binnen 2 Minuten weg.` : "Die Verweildauer erscheint, sobald zehn Restocks ein bekanntes Ende haben.",
    ];
  },
  rankCaption: (x: ConfigsView) => `Jede iPhone-Duo-Konfiguration ${wo(x.c)}, längste Zeit im Angebot zuerst · ${longDate(x.d.since)} bis heute`,
  rankHead: ["Konfiguration", "Restocks", "Stores", "Gesamt gelistet", "Median Verweildauer", "Jetzt gelistet", "Letzter Restock"],
  none: "noch keiner",
  storageLead: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return `Die Speichergrößen werden verglichen, sobald Restocks eintreffen; die Tabelle unten ist live.`;
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return `Ja, mehr als alles andere: ${st[0].key} stellte ${pctF(st[0].share)} der Restocks und ${st[1].key} ${pctF(st[1].share)}${big ? `, die 1TB- und 2TB-Modelle zusammen ${pctF(big / x.d.n)}` : ""}. Apple liefert die Speichergrößen, die die meisten bestellen; die Top-Größen sind auch die, von denen ein Store mehrere in einer Lieferung bekommt.`;
  },
  groupCaption: (what: "storage" | "colour") => `Restocks nach ${what === "storage" ? "Speicher" : "Farbe"}, alle Stores zusammen`,
  groupHead: (what: "Storage" | "Colour") => [what === "Storage" ? "Speicher" : "Farbe", "Restocks", "Anteil", "Stores", "Gesamt gelistet", "Median Verweildauer", "Jetzt gelistet"],
  storageSwaps: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: `Alarm nur für ${last}`, yes: `${top} zuerst, ${last} dazu`, why: `${last} machte ${pctF(st[st.length - 1].share)} der Restocks aus, ${top} ${pctF(st[0].share)}. Beide Alarme kosten je einen Platz.` },
      { no: "Auf die exakte Größe warten", yes: `${top} oder ${second} nehmen, wenn es kommt`, why: `Sie stellten ${pctF(st[0].share + st[1].share)} aller Restocks ${wo(x.c)}; mit Hülle und iCloud zählt die Größe weniger als das Warten.` },
    ];
  },
  colourLead: (x: ConfigsView) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return `Die Farben werden verglichen, sobald Restocks eintreffen.`;
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return `${x.colour(co[0].key)}, aber nicht deutlich: ${pctF(co[0].share)} der Restocks gegenüber ${pctF(co[1].share)} für ${x.colour(co[1].key)}, ein Abstand von ${gap} Prozentpunkten${co[0].medianSec && co[1].medianSec ? `; gelistet blieben sie im Median ${sek(co[0].medianSec)} und ${sek(co[1].medianSec)}` : ""}. Die Farbe verschiebt die Zahl weniger als der Speicher. Wer eine zweite Farbe mitbeobachtet, bekommt deren Abholfenster dazu: ${co[1].restocks > 0 ? `${x.colour(co[1].key)} brachte ${wo(x.c)} seit dem ${longDate(x.d.since)} ${restocks(co[1].restocks)} und ${stunden(co[1].exposureSec)} Listungszeit, zusätzlich zu ${n(co[0].restocks)} Restocks und ${stunden(co[0].exposureSec)} für ${x.colour(co[0].key)} (alle Größen)` : `${x.colour(co[1].key)} war ${wo(x.c)} seit dem ${longDate(x.d.since)} noch nicht wieder da und hätte bisher also nichts dazugebracht`}.`;
  },
  colourKeys: (x: ConfigsView) => x.d.byColor.map((g) => `${x.colour(g.key)}: ${n(g.restocks)} Restocks in ${stores(g.stores)}, insgesamt ${stunden(g.exposureSec)} gelistet${g.nowStores ? `, ${stores(g.nowStores)} ${g.nowStores === 1 ? "bietet" : "bieten"} es gerade an` : ""}.`),
  shelfLead: (x: ConfigsView) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return `Die Verweildauer eines Restocks wird vom Restock bis zur nächsten Prüfung mit „ausverkauft“ gemessen; die ersten Zahlen erscheinen, sobald zehn Restocks einer Konfiguration geendet haben.`;
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return `${x.cfg(slow)} lässt Ihnen am meisten Zeit: im Median ${sek(slow.lifetimes!.medianSec)} gelistet, bevor es ausverkauft war, gegenüber ${sek(fast.lifetimes!.medianSec)} bei ${x.cfg(fast)}. Die langsameren Verkäufer sind die teuren Größen – weniger Käufer wollen sie –, deshalb zeigen „am meisten Zeit zum Zugreifen“ und „am meisten Restocks“ auf verschiedene Konfigurationen, und das Ranking oben gewichtet beides.`;
  },
  shelfCaption: "Verweildauer je Konfiguration (Restock → nächste Prüfung mit „ausverkauft“)",
  shelfHead: ["Konfiguration", "Restocks mit bekanntem Ende", "Median", "Weg binnen 2 Min.", "Weg binnen 20 Min.", "Schnellster"],
  shelfKeys: (x: ConfigsView) => [
    `Die Hälfte aller Restocks war binnen ${x.d.lifetimes ? sek(x.d.lifetimes.medianSec) : "etwa einer Minute"} weg; unser Alarm geht etwa ${SPEED.alertSec} Sekunden nach unserer Bestätigung raus, und was dann von der Listung übrig ist, hängt von Ihrem Handy und einem vorbereiteten Checkout ab.`,
    `Die Zeit ist eine Obergrenze: Wir sehen den Zustand „ausverkauft“ bei der nächsten Prüfung, bis zu ${SPEED.checkSec} Sekunden später (${SPEED.fastSec} Sekunden in Stores mit Alarm).`,
    "„Ausverkauft“ heißt hier: Apples Abholseite listete die Konfiguration in diesem Store nicht mehr; wie viele Geräte das waren, sagt Apple nicht.",
  ],
  weekLead: (x: ConfigsView) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return `Keine Restocks ${wo(x.c)} in den letzten vierzehn Tagen; die Wochentabelle beginnt mit dem nächsten.`;
    const lead = rows[0];
    return `${restocks(tot7)} in den letzten sieben Tagen${totP ? ` gegenüber ${n(totP)} in der Woche davor (${signed(tot7 / totP - 1)})` : ""}, angeführt von ${x.cfg(lead)} mit ${n(lead.last7)}. ${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `Das ist eine andere Konfiguration als der Spitzenreiter seit Beginn (${x.cfg(x.d.easiest)}): Die Mischung verschiebt sich mit jeder Lieferung – sehen Sie in diese Tabelle, bevor Sie wählen, worauf Sie Alarm setzen.` : "Der Spitzenreiter seit Beginn führt auch diese Woche."}`;
  },
  weekCaption: "Restocks je Konfiguration: letzte 7 Tage gegenüber den 7 davor",
  weekHead: ["Konfiguration", "Letzte 7 Tage", "Vorige 7 Tage", "Veränderung"],
  alertsLead: (x: ConfigsView) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? `Setzen Sie Alarme auf ${words(top.map((r) => x.cfg(r)))} in den zwei oder drei Stores, die Sie am schnellsten erreichen; das deckt ${pctF(top.reduce((a, r) => a + r.restocks, 0) / x.d.n)} der bisherigen Restocks ${wo(x.c)} ab. Nehmen Sie die exakte Wunschkonfiguration als vierten Alarm dazu – und greifen Sie zu, was zuerst kommt.`
      : `Bis ${wo(x.c)} Restocks eintreffen, setzen Sie Alarme auf die gewünschte Speichergröße in beiden Farben in Ihren nächsten Stores.`;
  },
  alertsKeys: (x: ConfigsView) => [
    `Alarme gelten je Store × Konfiguration; drei Stores × drei Konfigurationen sind also ${alarme(9)}.`,
    `Wir prüfen Stores mit Alarm alle ${SPEED.fastSec} Sekunden und bestätigen einen Restock vor dem Push; der Push geht etwa ${SPEED.alertSec} Sekunden danach raus, und wann das Banner auf Ihrem Handy erscheint, hängt vom Gerät und seiner Verbindung ab – das messen wir nicht.`,
    x.one ? "Der Store mit den meisten Restocks ist auch der, auf den die meisten Leute schauen." : "Wählen Sie Stores nach Entfernung, nicht nach Restock-Zahl: Der Store mit den meisten Restocks ist auch der, auf den die meisten Leute schauen.",
  ],
  methodLead: `Ein Restock ist eine Konfiguration, die in einem Store von „ausverkauft“ auf „verfügbar“ wechselt, bestätigt durch zwei übereinstimmende Prüfungen; erste Sichtungen nach einer Erfassungslücke zählen nicht. Die Verweildauer läuft vom Restock bis zur ersten Prüfung, die wieder „ausverkauft“ zeigt, und ist deshalb eine Obergrenze. „Gesamt gelistet“ summiert diese Zeiten über jeden Restock der Konfiguration – das einfachste Maß dafür, wie lange eine Abholung reserviert werden konnte. Es ist eine Aufzeichnung vergangener Listungen, keine Kaufchance und keine verkaufte Stückzahl: Apple veröffentlicht weder das eine noch das andere.`,
  methodKeys: (x: ConfigsView) => [
    `Quelle: Apples eigene Abhol-Verfügbarkeit für ${storesAkk(x)}, je Store alle ${SPEED.checkSec} Sekunden gelesen (${SPEED.fastSec} Sekunden in Stores mit Alarm) seit dem ${longDate(x.d.since)}.`,
    "Stores, die es gerade anbieten, und die letzten Restock-Zeiten sind live; alles andere wird binnen fünf Minuten neu berechnet.",
    "Zitieren Sie gern mit Link: Die Zahlen ändern sich, nennen Sie also das Datum, an dem Sie sie gelesen haben.",
  ],
  faq: (x: ConfigsView): Faq[] => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor;
    return [
      { q: `Welches iPhone Duo ist ${wo(x.c)} am leichtesten zu bekommen?`, a: e ? `Welches Sie bekommen, kann niemand sagen: Apple veröffentlicht weder seine Zuteilungen noch, wie viele Leute es gerade versuchen. Messen lassen sich vergangene Abholfenster. Seit dem ${longDate(d.since)} war ${x.cfg(e)} insgesamt am längsten gelistet (${stunden(e.exposureSec)} über ${restocks(e.restocks)} in ${appleStores(e.stores)})${h ? `, ${x.cfg(h)} am kürzesten (${stunden(h.exposureSec)} über ${restocks(h.restocks)})` : ""}. Gezählt wurden ${confirmed(d.n)} in ${storesDat(x)}. Das ist eine Bilanz vergangener Listungen, keine Prognose für Sie; welche Änderung bei Ihrer eigenen Auswahl die meisten Fenster bringt – eine weitere Farbe, ein weiterer Store –, zeigt „Was bringt die meisten Abholfenster?“ im Alarm-Editor.` : `Zu wenige bestätigte Restocks ${wo(x.c)}, um das schon zu sagen; diese Seite reiht jede Konfiguration, sobald sie eintreffen.` },
      { q: `Ist ${co.length > 1 ? x.colour(co[1].key) : "eine Farbe"} schwerer zu finden als ${co.length > 1 ? x.colour(co[0].key) : "die andere"}?`, a: co.length > 1 && d.n ? `Ein wenig: ${x.colour(co[0].key)} machte ${pctF(co[0].share)} der Restocks aus, ${x.colour(co[1].key)} ${pctF(co[1].share)}. Der Unterschied zwischen den Speichergrößen ist weit größer – wählen Sie also zuerst die Größe und setzen Sie Alarme auf beide Farben davon.` : "Die Farben werden verglichen, sobald Restocks eintreffen." },
      { q: `Ist das iPhone Duo mit 1TB oder 2TB ${wo(x.c)} überhaupt je verfügbar?`, a: (() => { const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage)); const bn = big.reduce((a, r) => a + r.restocks, 0); return bn ? `Ja, aber selten: ${restocks(bn)} der 1TB- und 2TB-Modelle von ${n(d.n)} (${pctF(bn / d.n)}), in höchstens ${new Set(big.flatMap((r) => (r.stores ? [r.partNumber] : []))).size ? stores(Math.max(...big.map((r) => r.stores))) : "keinem Store"}. Taucht eins auf, bleibt es länger gelistet (weniger Käufer) – ein Alarm darauf ist einen Platz wert, auch wenn er selten auslöst.` : `Noch nicht in unseren Daten ${wo(x.c)}: kein bestätigter Restock eines 1TB- oder 2TB-Modells seit dem ${longDate(d.since)}.`; })() },
      { q: "Soll ich Alarme auf eine Konfiguration setzen oder auf mehrere?", a: `Auf mehrere, in wenigen Stores: Die drei häufigsten Konfigurationen stellten ${d.n ? pctF(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n) : "den Großteil"} der Restocks ${wo(x.c)}. Drei Konfigurationen in drei nahen Stores sind neun Alarme, das passt in ein Plus-Abo; nehmen Sie die exakte Wunschkonfiguration als vierte dazu.` },
      { q: `Ist die Verteilung in anderen Ländern dieselbe?`, a: `Nicht immer: Jedes Land bekommt sein eigenes Kontingent, und das Ranking auf seiner Seite kann abweichen. Die Links unter „Andere Länder“ öffnen dieselbe Seite für die anderen 18 Länder, die PickupChecker verfolgt; die US-Seite hat die längste Aufzeichnung (seit dem ${longDate("2026-10-29")}).` },
    ];
  },
  sources: { apple: "Apple – iPhone-Duo-Konfigurationen und Preise", pickup: "Apple – Abholung im Store", log: "PickupChecker – das Restock-Protokoll, aus dem diese Seite berechnet wird" },
  ld: (x: ConfigsView) => ({
    datasetName: `iPhone-Duo-Restocks nach Konfiguration, Apple Stores ${wo(x.c)}`,
    description: `Bestätigte iPhone-Duo-Restocks in ${storesDat(x)} seit dem ${longDate(x.d.since)}, je Konfiguration (Speicher × Farbe): Anzahl, Stores, Gesamtzeit im Angebot, mediane Verweildauer, Stores, die es gerade anbieten.`,
    measured: ["Restocks je Konfiguration", "Stores mit einem Restock", "Zeit im Angebot in Sekunden", "mediane Verweildauer", "Stores, die es gerade anbieten"],
  }),
  related: "Weiterlesen",
  sameData: "Dieselben Daten, andere Fragen",
  otherCountries: "Andere Länder",
  questions: { restockTimes: "Wann ist das iPhone Duo wieder verfügbar?", sellOut: "Wie schnell ist ein Restock ausverkauft?", shortage: "Lässt der Engpass nach?", channels: "Apple, Provider oder Händler?", alerts: "Am schnellsten benachrichtigt werden", api: "Die kostenlose Bestands-API" },
  setUpAlert: "Alarm einrichten",
  logLive: "Restock-Protokoll, live",
  faqTitle: "Häufige Fragen",
  onThisPage: "Auf dieser Seite",
};

/* ================================================================== is the shortage easing */
/** One decimal the German way: "2,4". */
const dec1 = (x: number) => new Intl.NumberFormat(LANG_TAG[L], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(x);
/** "vor 5 Stunden" / "vor weniger als einer Stunde". */
const vorStunden = (h: number) => (h < 1 ? "vor weniger als einer Stunde" : `vor ${plural(h, "Stunde", "Stunden")}`);

const supply: DecideDict["supply"] = {
  crumb: "Lässt der Engpass nach?",
  title: (c: Country) => fitDe([
    `Lässt der iPhone-Duo-Engpass ${inLand(c.cc)} nach?`,
    `Lässt der iPhone-Duo-Engpass nach? (${land(c.cc)})`,
    "Lässt der iPhone-Duo-Engpass nach? Wochentrend",
    "Lässt der iPhone-Duo-Engpass nach?",
  ], 49, c.cc),
  metaDescription: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    return d.trend !== "insufficient"
      ? fitDe([
        `${cap(trendWord(d))} iPhone-Duo-Restocks ${wo(x.c)} diese Woche: ${n(w.restocks)} in ${appleStores(w.stores)} in 7 Tagen (${signed(d.change!)} zur Vorwoche)${w.medianSec ? `, jeder im Median nach ${sek(w.medianSec)} weg` : ""}. Bestand Tag für Tag, woran man ein Nachlassen erkennt und ob sich Warten lohnt.`,
        `${restocks(w.restocks)} des iPhone Duo ${wo(x.c)} in den letzten 7 Tagen (${signed(d.change!)} zur Vorwoche). Bestand Tag für Tag und ob der Engpass nachlässt.`,
      ], 160, x.c.cc)
      : `Lässt der iPhone-Duo-Engpass ${wo(x.c)} nach? ${n(d.n)} bestätigte Apple-Store-Restocks seit dem ${longDate(d.since)}, Tag für Tag – mit den Zeichen eines Nachlassens und der Frage: warten oder jetzt kaufen?`;
  },
  h1: (x: SupplyView) => `Wird der iPhone-Duo-Engpass ${wo(x.c)} besser – und wie lange dauert er noch?`,
  intro: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    const nowS = `${d.storesNow} ${d.storesNow === 1 ? "Store bietet" : "Stores bieten"} gerade ein Duo an`;
    if (d.trend === "insufficient") {
      return `Noch zu früh für ein Urteil ${wo(x.c)}: PickupChecker verfolgt seit dem ${longDate(d.since)}, also seit ${tagen(d.days)}; der erste vollständige Wochenvergleich erscheint am ${longDate(d.comparableFrom)}. Bisher ${confirmed(d.n)} in ${n(d.storesEver)} von ${appleStores(x.stores)}${d.lifetimes ? `, jeder im Median ${sek(d.lifetimes.medianSec)} gelistet, bevor er ausverkauft war` : ""}; ${nowS}. Niemand kann das Ende des Engpasses vorhersagen; diese Seite zeigt die zwei Zahlen, die es zuerst verraten – Restocks pro Woche und Sekunden im Angebot –, aktualisiert mit jedem Restock.`;
    }
    const verdict = d.trend === "up" ? "Das Angebot wird besser" : d.trend === "down" ? "Das Angebot wird knapper" : "Das Angebot bleibt gleich";
    const demand = w.medianSec
      ? w.medianSec <= 120
        ? `aber die Nachfrage räumt es weiter ab: Ein Restock hielt diese Woche im Median ${sek(w.medianSec)}${d.prev7.medianSec ? ` (Vorwoche ${sek(d.prev7.medianSec)})` : ""} – von Hand ist eins also noch nicht leichter zu bekommen`
        : `und die Zeit im Angebot wird länger: im Median ${sek(w.medianSec)} diese Woche${d.prev7.medianSec ? ` gegenüber ${sek(d.prev7.medianSec)} in der Vorwoche` : ""}, das erste Zeichen eines Nachlassens`
      : "";
    return `${verdict} ${wo(x.c)}: Die Apple Stores hatten das iPhone Duo in den letzten sieben Tagen ${n(w.restocks)}-mal wieder vorrätig, ${signed(d.change!)} gegenüber der Vorwoche (${n(d.prev7.restocks)}), in ${n(w.stores)} von ${stores(x.stores)}${demand ? ` – ${demand}` : ""}. ${nowS}. Niemand kann das Ende vorhersagen; die zwei Zahlen, die es zuerst verraten, stehen auf dieser Seite und werden mit jedem Restock aktualisiert.`;
  },
  updated: (x: SupplyView, stamp: string) => `Aktualisiert ${stamp} · Daten seit dem ${longDate(x.d.since)} · ${appleStores(x.stores)} · alle ${SPEED.checkSec} Sekunden geprüft`,
  nav: { trend: "Diese Woche", easier: "Leichter zu kaufen?", stores: "Wie viele Stores", howlong: "Wie lange noch", christmas: "Warten oder kaufen", world: "Andere Länder", method: "So zählen wir" },
  h2: (x: SupplyView) => ({
    trend: `Gehen die iPhone-Duo-Restocks ${wo(x.c)} nach oben oder nach unten?`,
    easier: "Wird es leichter, tatsächlich eins zu kaufen?",
    stores: `Wie viele Apple Stores ${wo(x.c)} hatten überhaupt schon ein iPhone Duo?`,
    howlong: "Wie lange dauert der iPhone-Duo-Engpass noch?",
    christmas: "Soll ich weiter auf einen Restock warten oder anders kaufen?",
    world: `Lässt der Engpass in anderen Ländern schneller nach${x.us ? "" : ` als ${wo(x.c)}`}?`,
    method: "So zählen wir",
  }),
  weekBefore: "Vorwoche",
  goneIn2: "binnen 2 Minuten weg",
  storesEverLabel: (one: boolean) => (one ? "bestätigte Restocks bisher" : "Stores mit mindestens einem Restock"),
  hero: {
    last7: "Restocks, letzte 7 Tage",
    change: "gegenüber den 7 Tagen davor",
    stores: (one: boolean) => (one ? "Tage mit einem Restock" : "Stores mit Restock, letzte 7 Tage"),
    median: "Sekunden im Angebot (Median), letzte 7 Tage",
    now: (one: boolean) => (one ? "bietet gerade eins an" : "Stores, die gerade eins anbieten"),
    sinceLast: "Stunden seit dem letzten Restock",
  },
  trendLead: (x: SupplyView) => {
    const { d } = x;
    if (d.trend === "insufficient") return `Die Tagestabelle ist bisher die ganze Aufzeichnung: ${restocks(d.n)} in ${tagen(d.days)}. Eine Wochenlinie erscheint am ${longDate(d.comparableFrom)}; bis dahin lesen Sie die Richtung Tag für Tag ab.`;
    const w = d.last7, p = d.prev7;
    return `${cap(trendWord(d))} diese Woche: ${restocks(w.restocks)} (${dec1(w.perStoreDay * 7)} pro Store) gegenüber ${n(p.restocks)} in der Vorwoche, ${signed(d.change!)}.${w.longestGapHours != null ? ` Die längste Pause zwischen zwei Restocks betrug diese Woche ${plural(w.longestGapHours, "Stunde", "Stunden")}${p.longestGapHours != null ? ` (Vorwoche ${n(p.longestGapHours)})` : ""}.` : ""} Restocks kommen in Wellen, die an Lieferungen hängen; ein einzelner ruhiger Tag bedeutet wenig – entscheidend sind die Summen über sieben Tage.`;
  },
  dailyCaption: (x: SupplyView) => `Bestätigte Restocks je Ortstag ${wo(x.c)}, neueste zuerst (letzte 14 Tage)`,
  dailyHead: ["Tag", "Restocks", "Stores", "Median Verweildauer"],
  trendKeys: (x: SupplyView) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? `Stärkster Tag bisher: ${dateLabel(best.date)} mit ${restocks(best.restocks)} in ${stores(best.stores)}.` : "Noch kein Restock; der stärkste Tag erscheint hier.",
      x.d.sinceLastHours != null && x.d.latest ? `Letzter Restock ${vorStunden(x.d.sinceLastHours)}: ${x.storeName(x.d.latest.storeNumber)}, ${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}.` : "Noch kein Restock erfasst.",
      `„Nach oben“ heißt mindestens ${pct(Math.round(0.15 * 100))} mehr Restocks als in der Vorwoche, „nach unten“ mindestens ${pct(Math.round(0.15 * 100))} weniger; alles dazwischen gilt als gleichbleibend.`,
    ];
  },
  easierLead: (x: SupplyView) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return `Leichter heißt zweierlei zugleich: mehr Restocks, und jeder bleibt länger gelistet. Die Verweildauer erscheint, sobald zehn Restocks im Zeitraum ein bekanntes Ende haben.`;
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return `${longer ? "Ein wenig, ja" : shorter ? "Nein – im Gegenteil" : "Noch nicht"}: Ein Restock blieb diese Woche im Median ${sek(w.medianSec)} gelistet${p.medianSec ? ` gegenüber ${sek(p.medianSec)} in der Vorwoche` : ""}, und ${pctF(w.within2min!)} waren binnen zwei Minuten weg${p.within2min != null ? ` (Vorwoche ${pctF(p.within2min)})` : ""}. Ein Nachlassen sieht so aus, dass sich beide Zahlen zusammen bewegen – mehr Restocks und längere Verweildauer; mehr Restocks allein heißen nur, dass Apple mehr liefert, während genauso viele Leute warten.`;
  },
  easierKeys: (x: SupplyView) => [
    "Woran Sie ein Nachlassen hier erkennen: mediane Verweildauer über 20 Minuten, die meisten Stores bieten gleichzeitig eins an, Lieferzeiten auf apple.com unter einer Woche.",
    `Bis dahin bleibt ein Alarm der Weg zum Kauf: Wir bestätigen einen Restock und senden den Push etwa ${SPEED.alertSec} Sekunden später – deutlich innerhalb der medianen Listung.`,
    x.d.lifetimes ? `Seit Beginn ${wo(x.c)}: ${restocks(x.d.lifetimes.n)} mit bekanntem Ende, Median ${sek(x.d.lifetimes.medianSec)}, ${pctF(x.d.lifetimes.within2min)} binnen 2 Minuten weg.` : "Die Verweildauer seit Beginn erscheint nach zehn beendeten Restocks.",
  ],
  storesLead: (x: SupplyView) => {
    const { d } = x;
    const never = x.stores - d.storesEver;
    return x.one
      ? `${d.storesEver ? `Ja: Der eine Apple Store ${wo(x.c)} hatte seit dem ${longDate(d.since)} ${confirmed(d.n)}` : `Noch nicht: kein bestätigter Restock in dem einen Apple Store ${wo(x.c)} seit dem ${longDate(d.since)}`}${d.storesNow ? ", und gerade bietet er ein Duo an" : ""}.`
      : `${n(d.storesEver)} von ${appleStores(x.stores)} ${wo(x.c)} (${pctF(d.storesEver / x.stores)}) hatten seit dem ${longDate(d.since)} mindestens einen bestätigten iPhone-Duo-Restock${never ? `; ${stores(never)} noch keinen` : ""}. ${d.storesNow} ${d.storesNow === 1 ? "bietet" : "bieten"} gerade eins an. Das Angebot verteilt sich ungleich: Flagship-Stores und Stores in Einkaufszentren bekommen am häufigsten Nachschub – deshalb zählt der Store, den Sie für Alarme wählen, so viel wie die Konfiguration.`;
  },
  storesKeys: (x: SupplyView) => [
    `Stores nach Zahl der Restocks, mit Ortszeiten: der Abschnitt „Wo“ der Seite zu den Restock-Zeiten ${wo(x.c)}.`,
    "Ein Store ohne Restock ist kein Store, den Apple auslässt: Kontingente kommen mit Lieferungen, und mehrere Stores bekamen ihr erstes Duo erst in der zweiten Woche.",
  ],
  howlongLead: (x: SupplyView) => `Außerhalb von Apple weiß das niemand, und wir machen keine Prognosen. Was die Aufzeichnung ${wo(x.c)} zeigt: ${restocks(x.d.n)} in ${tagen(x.d.days)}, ${x.d.trend === "insufficient" ? `einen Wochentrend ab dem ${longDate(x.d.comparableFrom)}` : `${trendWord(x.d)} Restocks diese Woche als in der Vorwoche`}, und eine Verweildauer ${x.d.last7.medianSec ? `um ${sek(x.d.last7.medianSec)}` : "von wenigen Minuten"}. Ein Engpass endet in einer Abfolge, die Sie hier verfolgen können: Die Restocks pro Woche steigen, die Verweildauer wächst von Sekunden auf Stunden, dann bieten die meisten Stores gleichzeitig eins an und die Lieferzeit auf apple.com fällt auf wenige Tage.`,
  howlongKeys: () => [
    "Signal 1 – die Restocks pro Woche steigen zwei bis drei Wochen lang (Tabelle oben).",
    "Signal 2 – die mediane Verweildauer übersteigt 20 Minuten: Restocks halten länger, als Leute neu laden.",
    "Signal 3 – die Lieferzeit auf apple.com fällt unter eine Woche, und die meisten Stores bieten gleichzeitig eins an.",
    "Neue Farben oder Speichergrößen setzen die Uhr zurück; lassen Sie den Alarm bis Signal 3 an.",
  ],
  christmasLead: (x: SupplyView) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Lassen Sie den Alarm an und halten Sie eine Lieferbestellung in der Warteschlange – beides, nicht nur eins. Beim aktuellen Tempo (${perDay >= 1 ? `etwa ${plural(Math.round(perDay), "Restock", "Restocks")} pro Tag ${wo(x.c)}` : `weniger als ein Restock pro Tag ${wo(x.c)}`}${w.medianSec ? `, jeder im Median ${sek(w.medianSec)} gelistet` : ""}) ist ein beobachteter Store in Ihrer Nähe binnen Tagen an der Reihe, und der Push zu einem bestätigten Restock geht etwa ${SPEED.alertSec} Sekunden, nachdem wir ihn sehen, raus. Einen Aufpreis anderswo zu zahlen lohnt sich nur, wenn Sie das Warten selbst mehr kostet als der Aufschlag; der Vergleich der Kaufwege wägt das ehrlich ab.`;
  },
  christmasKeys: () => [
    "Bestellen Sie zuerst zur Lieferung auf apple.com: Das sichert Ihren Platz und lässt sich stornieren, wenn eine Abholung klappt.",
    "Alarme auf die zwei oder drei häufigsten Konfigurationen in Ihren nächsten Stores (welche das sind, steht auf der Konfigurationsseite).",
    "Halten Sie die Apple Store App angemeldet, mit dem Duo in der Einkaufstasche und hinterlegter Karte: Die mediane Listung dauert etwa eine Minute.",
  ],
  worldLead: (x: SupplyView) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return `Die wöchentlichen Restocks pro Store aller Länder werden hier verglichen, sobald jedes Land eine volle Woche Daten hat.`;
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return `${land(top.cc as CountryCode)} hatte in den letzten sieben Tagen die meisten Restocks pro Store (${dec1(top.perStoreDay * 7)} pro Store), ${land(bottom.cc as CountryCode)} die wenigsten (${dec1(bottom.perStoreDay * 7)})${mine ? `; ${land(x.c.cc)} liegt bei ${dec1(mine.perStoreDay * 7)}` : ""}. Kontingente unterscheiden sich nach Land und Starttermin, ein Nachlassen zeigt sich also ungleich; die längste Aufzeichnung haben die USA.`;
  },
  worldCaption: "Letzte 7 Tage nach Land: Restocks, Restocks pro Store, mediane Verweildauer, Stores mit Angebot jetzt",
  worldHead: ["Land", "Stores", "Restocks (7 T.)", "Pro Store", "Median Verweildauer", "Jetzt gelistet"],
  methodLead: `Ein Restock ist eine Konfiguration, die in einem Store von „ausverkauft“ auf „verfügbar“ wechselt, bestätigt durch zwei übereinstimmende Prüfungen im Abstand von ${SPEED.checkSec} Sekunden (${SPEED.fastSec} Sekunden in Stores mit Alarm); erste Sichtungen nach einer Erfassungslücke zählen nicht. Tage sind die Ortstage des Stores. Die Verweildauer läuft vom Restock bis zur ersten Prüfung, die wieder „ausverkauft“ zeigt – eine Obergrenze bis zur nächsten Prüfung. Wochen sind die letzten sieben Ortstage gegenüber den sieben davor; ein Vergleich braucht beide vollständig.`,
  methodKeys: (x: SupplyView) => [
    `Quelle: Apples Abhol-Verfügbarkeit für ${storesAkk(x)}, seit dem ${longDate(x.d.since)}.`,
    "Alles auf dieser Seite wird binnen fünf Minuten nach einem Restock neu berechnet; die Stores mit aktuellem Angebot sind live.",
    "Zitieren Sie mit Link und Datum: Diese Zahlen bewegen sich.",
  ],
  faq: (x: SupplyView): Faq[] => {
    const { d } = x;
    const w = d.last7;
    return [
      { q: `Hat Apple das iPhone Duo ${wo(x.c)} noch regelmäßig wieder vorrätig?`, a: d.n ? `Ja: ${confirmed(w.restocks)} in den letzten sieben Tagen in ${appleStores(w.stores)} ${wo(x.c)}, ${restocks(d.n)} seit dem ${longDate(d.since)}. Der letzte war ${d.sinceLastHours != null ? vorStunden(d.sinceLastHours) : "noch nicht erfasst"}.` : `Noch kein bestätigter Restock ${wo(x.c)}, seit die Erfassung am ${longDate(d.since)} begann; diese Seite aktualisiert sich binnen fünf Minuten nach dem ersten.` },
      { q: `Wird der iPhone-Duo-Engpass ${wo(x.c)} besser?`, a: d.trend === "insufficient" ? `Noch zu früh: Der erste vollständige Wochenvergleich erscheint am ${longDate(d.comparableFrom)}. Achten Sie auf zwei Zahlen – Restocks pro Woche und Sekunden im Angebot; ein Nachlassen heißt, beide steigen.` : `${cap(trendWord(d))} Restocks diese Woche als in der Vorwoche (${signed(d.change!)})${w.medianSec ? `, und ein Restock hielt im Median ${sek(w.medianSec)}` : ""}. Ein Nachlassen heißt mehr Restocks und längere Verweildauer zugleich; bisher ${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "bewegen sich beide in die richtige Richtung" : "geschieht nur ein Teil davon"}.` },
      { q: "Wann ist das iPhone Duo leicht zu bekommen?", a: "Außerhalb von Apple kann das niemand sagen, und PickupChecker macht keine Prognosen. Die Abfolge, auf die Sie achten sollten: Die wöchentlichen Restocks steigen zwei bis drei Wochen lang, die mediane Verweildauer übersteigt 20 Minuten, dann bieten die meisten Stores gleichzeitig eins an und die Lieferzeit auf apple.com fällt unter eine Woche." },
      { q: "Soll ich lieber einen Aufpreis zahlen, statt zu warten?", a: `Nur wenn Sie das Warten mehr kostet als der Aufschlag: Beim aktuellen Tempo ist ein beobachteter Store in Ihrer Nähe binnen Tagen an der Reihe, und ein Alarm geht etwa ${SPEED.alertSec} Sekunden nach einem bestätigten Restock raus. Weiterverkauf bedeutet außerdem kein Rückgaberecht und die üblichen Risiken; die Seite zum Vergleich der Kaufwege wägt sie ab.` },
      { q: "Verändert die Weihnachtszeit die Chancen?", a: "Die Nachfrage steigt bis Dezember, während die Lieferungen ihrem Rhythmus folgen – die Verweildauer wird also eher kürzer als länger. Halten Sie eine Lieferbestellung als Rückhalt und lassen Sie Alarme die Abholung erwischen; stornieren Sie, was Sie nicht brauchen." },
    ];
  },
  sources: { newsroom: "Apple Newsroom – das iPhone Duo kommt in die Apple Stores", pickup: "Apple – Abholung im Store", log: "PickupChecker – das Restock-Protokoll, aus dem diese Seite berechnet wird", restockTimes: "PickupChecker – wann das iPhone Duo wieder verfügbar ist" },
  ld: (x: SupplyView) => ({
    datasetName: `iPhone-Duo-Angebotstrend, Apple Stores ${wo(x.c)}`,
    description: `Bestätigte iPhone-Duo-Restocks pro Tag in ${storesDat(x)} seit dem ${longDate(x.d.since)}: Restocks, Stores, mediane Verweildauer, Veränderung zur Vorwoche.`,
    measured: ["Restocks pro Tag", "Stores mit einem Restock", "mediane Verweildauer", "Veränderung zur Vorwoche", "Stores mit aktuellem Angebot"],
  }),
  related: "Weiterlesen",
  sameData: "Dieselben Daten, andere Fragen",
  otherCountries: "Diese Seite für andere Länder",
  questions: { restockTimes: "Wann ist das iPhone Duo wieder verfügbar?", configs: "Welche Konfiguration bekommt man am leichtesten?", channels: "Apple, Provider oder Händler?", sellOut: "Wie schnell ist ein Restock ausverkauft?", howToGet: "So bekommen Sie ein iPhone Duo", alerts: "Am schnellsten benachrichtigt werden" },
  setUpAlert: "Alarm einrichten",
  logLive: "Restock-Protokoll, live",
  faqTitle: "Häufige Fragen",
  onThisPage: "Auf dieser Seite",
};

/* ================================================================== Apple vs carriers vs retailers */
const channels: DecideDict["channels"] = {
  crumb: "Apple, Provider oder Händler?",
  title: (c: Country, retailer: string) => (c.cc === "us"
    ? fitDe([`iPhone Duo: Apple, ${retailer} oder Provider?`, "iPhone Duo: Apple, Provider oder Händler?"], 49, c.cc)
    : fitDe([
      `iPhone Duo ${inLand(c.cc)}: Apple, Provider oder Händler?`,
      `iPhone Duo: Apple, Provider oder Händler? (${land(c.cc)})`,
      `iPhone Duo: Apple, Provider oder Händler? (${c.iso})`,
      "iPhone Duo: Apple, Provider oder Händler?",
    ], 49, c.cc)),
  metaDescription: (x: ChannelsView) => fitDe([
    `Wo Sie ${wo(x.c)} wirklich ein iPhone Duo bekommen: Abholung im Apple Store (${n(x.sup.n)} bestätigte Restocks in ${stores(x.stores)} seit dem ${longDate(x.sup.since)}), Lieferung über apple.com, ${words(x.ch.carriers.slice(0, 3))}, ${words(x.ch.retailers.slice(0, 2))} und Weiterverkauf – was jeder Kaufweg verrät und was nicht, und welchen Sie beobachten sollten.`,
    `Abholung im Apple Store, Lieferung über apple.com, ${words(x.ch.carriers.slice(0, 2))}, ${x.ch.retailers[0] ?? "Händler"} oder Weiterverkauf für das iPhone Duo ${wo(x.c)}: was jeder Kaufweg verrät und welchen Sie beobachten sollten.`,
  ], 160, x.c.cc),
  h1: (x: ChannelsView) => `Apple Store, Mobilfunkanbieter oder Händler: Wo bekommen Sie ${wo(x.c)} tatsächlich ein iPhone Duo?`,
  intro: (x: ChannelsView) => `Die Abholung im Apple Store ist ${wo(x.c)} der einzige Kaufweg für das iPhone Duo, dessen Angebot sich überhaupt messen lässt: PickupChecker hat seit dem ${longDate(x.sup.since)} ${restocks(x.sup.n)} in ${storesDat(x)} bestätigt, ${n(x.sup.last7.restocks)} davon in den letzten sieben Tagen, jeweils alle ${SPEED.checkSec} Sekunden von Apples eigener Abholseite gelesen. Die Mobilfunkanbieter (${words(x.ch.carriers)}) und die Händler (${words(x.ch.retailers)}) bekommen eigene Kontingente und veröffentlichen keinen Bestands-Feed – deshalb kann Ihnen niemand, weder wir noch sonst jemand, ehrlich deren Restock-Zeiten nennen. Unten steht, was jeder Kaufweg verrät und was nicht, die Abwägungen und die Reihenfolge, in der Sie sie beobachten sollten.`,
  updated: (x: ChannelsView, stamp: string) => `Aktualisiert ${stamp} · Apple-Store-Daten seit dem ${longDate(x.sup.since)} · ${appleStores(x.stores)} · alle ${SPEED.checkSec} Sekunden geprüft`,
  nav: { compare: "Alle Kaufwege", pickup: "Abholung vs. Lieferung", carriers: "Provider", retailers: "Händler", resale: "Aufpreise", abroad: "Kauf im Ausland", method: "Woher wir es wissen" },
  h2: (x: ChannelsView) => ({
    compare: `Über welchen Kaufweg ist das iPhone Duo ${wo(x.c)} am häufigsten wieder verfügbar?`,
    pickup: "Ist die Abholung im Apple Store schneller als eine Lieferung über apple.com?",
    carriers: `Soll ich das iPhone Duo lieber bei ${x.ch.carriers.length ? words(x.ch.carriers.slice(0, 3), 3) : "einem Mobilfunkanbieter"} kaufen?`,
    retailers: `Lohnt sich ein Blick zu ${x.ch.retailers.length ? words(x.ch.retailers.slice(0, 2), 2) : "Händlern"}?`,
    resale: `Lohnt sich ein Aufpreis bei ${x.ch.resale[0] ?? "einer Wiederverkaufsplattform"}?`,
    abroad: "Kann ich ein iPhone Duo im Ausland kaufen und zu Hause nutzen?",
    method: "Woher wir wissen, was wir wissen",
  }),
  hero: {
    restocks: "bestätigte Apple-Store-Restocks",
    last7: "in den letzten 7 Tagen",
    now: (one: boolean) => (one ? "Apple Store bietet gerade eins an" : "Apple Stores bieten gerade eins an"),
    channels: "andere Kaufwege, kein öffentlicher Bestands-Feed",
  },
  compareLead: (x: ChannelsView) => `Die Abholung im Apple Store, gemessen am einzigen verfügbaren Maß: ${confirmed(x.sup.last7.restocks)} in den letzten sieben Tagen in ${stores(x.sup.last7.stores)} ${wo(x.c)}${x.sup.last7.medianSec ? `, jeder im Median ${sek(x.sup.last7.medianSec)} gelistet` : ""}. Mobilfunkanbieter und Händler bekommen mit ziemlicher Sicherheit ebenfalls Nachschub – aus denselben Apple-Lieferungen –, zeigen aber nur ein Ja/Nein auf einer Produktseite statt eines Feeds. Der Vergleich unten handelt also davon, was Sie beobachten können, nicht davon, wer mehr bekommt.`,
  compareCaption: "Die Kaufwege für das iPhone Duo, ehrlich verglichen",
  compareHead: ["Kaufweg", "Was über den Bestand bekannt ist", "So beobachten Sie ihn", "Der Haken"],
  compareRows: (x: ChannelsView) => {
    const r = x.ch;
    return [
      { channel: "Abholung im Apple Store", known: `${confirmed(x.sup.n)} seit dem ${longDate(x.sup.since)}; jeder Restock, jeder Store, mit Zeitpunkt.`, watch: `Ein Alarm hier (gesendet etwa ${SPEED.alertSec} Sekunden nach der Bestätigung) oder die Abholauswahl in der Apple Store App.`, catch: "Listungen halten etwa eine Minute; Sie brauchen die App offen und eine hinterlegte Karte." },
      { channel: "Lieferung über apple.com", known: "Apple zeigt beim Bezahlen eine Lieferschätzung; sie ändert sich täglich und ist nie eine Bestandszahl.", watch: "Bestellen Sie; die Schätzung auf Ihrer Bestellseite aktualisiert sich, sobald Apple versendet.", catch: "Wochen statt Minuten – dafür ist Ihr Platz in der Schlange gesichert." },
      { channel: `Mobilfunkanbieter (${words(r.carriers)})`, known: "Eigenes Kontingent; Online-Bestand je Konfiguration als verfügbar / nachbestellt angezeigt. Keine Historie, kein Feed.", watch: "Ihre Apps und Shop-Finder; ein Anruf im Shop funktioniert noch immer.", catch: lockNote(x, "Tarife, Finanzierung und Aktivierungsregeln gelten; der Bestand schwankt je Shop.") },
      { channel: `Händler (${words(r.retailers)})`, known: "Eigenes Kontingent, bei einem neuen Produkt oft nur online; je Konfiguration auf der Produktseite angezeigt.", watch: "Ihre Produktseite und App; einige verschicken Restock-E-Mails.", catch: "Die Kontingente sind kleiner als Apples und ebenfalls in Minuten ausverkauft." },
      { channel: `Weiterverkauf (${words(r.resale)})`, known: "Immer verfügbar – zu einem Preis.", watch: "—", catch: `Ein Aufpreis, kein Kaufnachweis vom Hersteller, ${r.returnDays ? `und nichts von ${rueckgabe(r.returnDays)}` : "und überhaupt kein Rückgaberecht"}.` },
    ];
  },
  compareKeys: (x: ChannelsView) => [
    `${n(x.ch.carriers.length + x.ch.retailers.length)} weitere Verkäufer ${wo(x.c)} und keine einzige öffentliche Bestandshistorie: Jede Website, die behauptet, die Restock-Zeiten eines Mobilfunkanbieters zu kennen, rät.`,
    "Unsere Haltung: die Abholung im Apple Store mit einem Alarm beobachten, eine Lieferbestellung auf apple.com als Rückhalt behalten und die Seite eines Händlers prüfen, wenn Sie ohnehin dort sind.",
  ],
  pickupLead: (x: ChannelsView) => `Für Tempo die Abholung: Eine Konfiguration, die auf der Abholseite erscheint, lässt sich in derselben Minute reservieren und am selben Tag abholen, während eine Lieferbestellung auf Apples Schätzung wartet. Für Sicherheit die Lieferung: Die Bestellung hält Ihren Platz, egal was in den Regalen passiert.${x.sup.lifetimes ? ` Abhol-Listungen ${wo(x.c)} hielten im Median ${sek(x.sup.lifetimes.medianSec)}, und ${pctF(x.sup.lifetimes.within2min)} waren binnen zwei Minuten weg – genau dafür gibt es den Alarm.` : ""} Die richtige Antwort ist beides: heute zur Lieferung bestellen, den Abholalarm einrichten, stornieren, was Sie nicht brauchen.`,
  pickupSwaps: () => [
    { no: "Die Lieferbestellung stornieren, um „neu anzufangen“", yes: "Sie behalten, bis die Abholung in Ihrer Hand ist", why: "Apple veröffentlicht keine Warteschlangenpositionen; eine neue Bestellung bekommt einfach die heutige Schätzung, und die ist selten früher als die, die Sie haben." },
    { no: "Die Abholseite von Hand neu laden", yes: "Den Alarm aufpassen lassen", why: `Wir prüfen Stores mit Alarm alle ${SPEED.fastSec} Sekunden und senden den Push etwa ${SPEED.alertSec} Sekunden nach der Bestätigung; wer von Hand neu lädt, sieht die meisten Listungen erst, wenn sie weg sind.` },
    { no: "Die Bestellung später beim Bezahlen auf Abholung umstellen", yes: "Die Abholung als neue Bestellung reservieren, wenn der Alarm kommt", why: "Abholreservierungen kommen aus dem Store-Bestand, Lieferbestellungen aus dem Lager: Das sind zwei Warteschlangen, und die der Abholung ist die schnelle." },
  ],
  pickupKeys: (x: ChannelsView) => [
    `Apples eigene Seite erklärt Abholung und Lieferung${x.ch.returnDays ? ` sowie die ${x.ch.returnDays}-tägige Rückgabefrist für beides` : x.ch.returnDays === 0 ? "; beachten Sie, dass Apple in Hongkong keine Rückgabe ohne Grund annimmt, nur Umtausch bei Defekt" : ""} (Quellen unten).`,
    "Eine Abholreservierung ist eine Bestellung für diesen Store; Apple legt das Gerät zurück und sagt Ihnen, wann Sie kommen können.",
  ],
  carriersLead: (x: ChannelsView) => `Wenn Sie eine Finanzierung oder eine Inzahlungnahme samt Tarif möchten oder ohnehin in einem ${x.ch.carriers[0] ?? "Provider"}-Shop stehen, in dem eins im Regal liegt – ja. Wenn Sie das Handy so schnell wie möglich wollen, sind Mobilfunkanbieter eine zweite Lotterie mit kleineren Chancen und ohne Möglichkeit, sie zu beobachten. ${lockNote(x, "Prüfen Sie SIM-Lock und Vertragsbedingungen vor dem Kauf.")} Ihre Online-Shops zeigen die Verfügbarkeit je Konfiguration, ein kurzer Blick kostet also nichts; erwarten Sie nur keine Historie und keine Benachrichtigung.`,
  carriersKeys: (x: ChannelsView) => [
    `Mobilfunkanbieter ${wo(x.c)}: ${words(x.ch.carriers)}.`,
    "Der Bestand der Mobilfunkanbieter gilt je Shop; ein Shop, der online eins zeigt, hat es eventuell nur zur Abholung vor Ort.",
    "Ein Gerät vom Mobilfunkanbieter ist dieselbe Hardware; der Unterschied ist der Vertrag, der daran hängt.",
  ],
  retailersLead: (x: ChannelsView) => `Einen Blick wert, wenn Sie ohnehin dort einkaufen, aber nicht wert, beobachtet zu werden: ${words(x.ch.retailers)} führen das iPhone Duo je Konfiguration und verkaufen ihr Kontingent online in Minuten, ohne einen Feed zum Abonnieren. Ihr Vorteil sind Zahlungsbedingungen und Treuepunkte; ihr Nachteil ein kleineres Kontingent als das der Apple Stores.`,
  retailersKeys: (x: ChannelsView) => [
    `Händler ${wo(x.c)}: ${words(x.ch.retailers)}.`,
    "Prüfen Sie die Konfigurationsauswahl auf der Produktseite: Ausgegraut heißt online ausverkauft – über ihre Filialen sagt das nichts.",
  ],
  resaleLead: (x: ChannelsView) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Selten. Wägen Sie den Aufpreis gegen die Wartezeit ab, die er Ihnen erspart: Die Apple Stores ${wo(x.c)} hatten das Duo diese Woche ${perDay >= 1 ? `etwa ${n(Math.round(perDay))}-mal pro Tag` : "seltener als einmal pro Tag"} wieder vorrätig, und ein Alarm geht etwa ${SPEED.alertSec} Sekunden nach einem bestätigten Restock raus – ein beobachteter Store in Ihrer Nähe klappt also meist binnen Tagen. Dagegen bieten ${words(x.ch.resale)} keinen Kaufnachweis vom Hersteller, ${x.ch.returnDays ? `nichts von ${rueckgabe(x.ch.returnDays)}` : "überhaupt kein Rückgaberecht"} und die üblichen Risiken – ein Gerät mit Aktivierungssperre, eine vertauschte Verpackung, eine „versiegelte“ Rücksendung.`;
  },
  resaleKeys: () => [
    "Wenn Sie doch gebraucht kaufen: persönlich treffen, einschalten, unter Einstellungen → Allgemein → Info die Seriennummer prüfen und sich vor dem Bezahlen anmelden.",
    "Apples Garantie hängt am Gerät, nicht am Kassenbon – ein Kaufnachweis kann aber verlangt werden, und ein Privatverkauf kann Ihnen Apples nicht geben.",
    "Ein Aufpreis, der mehr als eine Woche Warten kostet, ist ein Aufpreis für Ungeduld; entscheiden Sie im Wissen darum.",
  ],
  abroadLead: (x: ChannelsView) => `Oft ja, mit Prüfungen: Ein bei Apple gekauftes iPhone wird in den meisten Ländern ohne SIM-Lock verkauft, Apples Garantieservice gilt international mit Ausnahmen, und das Modell muss die Frequenzbänder Ihres Mobilfunkanbieters zu Hause unterstützen – und dessen eSIM, denn Apples Kaufseiten führen das iPhone Duo in jedem Land nur mit eSIM. Die echten Kosten sind Steuern: ${x.c.pricesIncludeTax ? "Der Preis im Ausland enthält die dortige Steuer, die Sie eventuell nicht zurückbekommen" : "Die Sales Tax kommt an der Kasse dazu"}, und Ihr heimischer Zoll kann bei der Rückkehr Abgaben erheben. PickupChecker verfolgt ${x.us ? "18 weitere Länder" : "die USA und 17 weitere Länder"}, die Bestandsfrage selbst lässt sich also über die Länderseiten beantworten.`,
  abroadKeys: () => [
    "Vor dem Kauf: Apples Garantieseite dazu, wo Service angeboten wird, die Band- und SIM-Liste des Modells und die eSIM-Unterstützung Ihres Mobilfunkanbieters zu Hause.",
    "Bewahren Sie den Kassenbon auf: Service und eine etwaige Rückgabe laufen nach den Regeln des Kauflandes.",
    "Ein Handy, das Sie für jemanden zu Hause kaufen, ist trotzdem im Ausland gekauft; es gelten dieselben Prüfungen.",
  ],
  methodLead: (x: ChannelsView) => `Die Apple-Store-Zahlen auf dieser Seite stammen aus PickupCheckers eigenen Prüfungen: ${x.one ? `Der eine Apple Store ${wo(x.c)} wird` : `Sämtliche ${n(x.stores)} Apple Stores ${wo(x.c)} werden`} seit dem ${longDate(x.sup.since)} alle ${SPEED.checkSec} Sekunden abgefragt; ein Restock zählt erst nach zwei übereinstimmenden Beobachtungen. Die Listen der Mobilfunkanbieter und Händler sind die Verkäufer, die Apple selbst für das Land nennt, plus die größten Wiederverkäufer, mit deren eigenen Seiten als Quellen; was wir über ihren Bestand sagen, ist das, was ihre Seiten zeigen – eine Momentaufnahme, keine Historie. Wir lesen sie nicht automatisiert aus und behaupten nichts über ihre Restock-Zeiten.`,
  methodKeys: () => ["Korrekturen willkommen: Führt ein Verkäufer auf dieser Seite das iPhone Duo nicht mehr, sagen Sie es uns, und er wird entfernt.", "Zitieren Sie mit Link und Datum."],
  faq: (x: ChannelsView): Faq[] => [
    { q: `Über welchen Kaufweg ist das iPhone Duo ${wo(x.c)} am schnellsten wieder verfügbar?`, a: `Der einzige Kaufweg mit messbarer Aufzeichnung ist die Abholung im Apple Store: ${confirmed(x.sup.last7.restocks)} in den letzten sieben Tagen ${wo(x.c)}${x.sup.last7.medianSec ? `, jeder im Median ${sek(x.sup.last7.medianSec)} gelistet` : ""}. Mobilfunkanbieter und Händler bekommen auch Nachschub, veröffentlichen aber keinen Feed – niemand kann sie also ehrlich reihen.` },
    { q: "Verliere ich meinen Platz, wenn ich meine apple.com-Bestellung storniere und neu bestelle?", a: "Sie bekommen eine neue Bestellung mit der heutigen Lieferschätzung; Apple veröffentlicht keine Warteschlangenposition. Vergleichen Sie vor dem Stornieren die Schätzung beim Bezahlen mit der Ihrer bestehenden Bestellung – sie ist selten früher." },
    { q: "Ist ein iPhone Duo vom Mobilfunkanbieter anders als eins von Apple?", a: `Dieselbe Hardware. ${lockNote(x, "Der Unterschied sind der Tarif und etwaige Sperr- oder Finanzierungsbedingungen.")} Der Bestand der Mobilfunkanbieter ist von Apples getrennt und wird je Shop angezeigt.` },
    { q: "Gilt beim Kauf bei einem Händler Apples Rückgabefrist?", a: x.ch.returnDays ? `Nein – es gilt die Regelung des Händlers. Apples ${x.ch.returnDays}-tägige Frist gilt für Käufe bei Apple (apple.com und Apple Stores).` : x.ch.returnDays === 0 ? "Apple selbst nimmt in Hongkong keine Rückgabe ohne Grund an (nur Umtausch bei Defekt); vergleichen Sie also die Regelung des Händlers – manche sind dort großzügiger als Apple." : "Nein – es gilt die Regelung des Händlers; Apples Rückgabefrist deckt nur Käufe bei Apple ab." },
    { q: "Welche Mobilfunkanbieter nennt Apple für das iPhone Duo?", a: x.c.cc === "us" || x.c.cc === "jp" ? `Apples Kaufseite ${wo(x.c)} nennt ${words(x.ch.carriers)}; die Seiten aller anderen Länder verkaufen es ohne SIM-Lock und ohne Anbieterauswahl.` : `Apples Kaufseite ${wo(x.c)} verkauft das iPhone Duo ohne SIM-Lock und nennt keinen Anbieter; ${words(x.ch.carriers)} sind die Netze, die Apple dort als iPhone-kompatibel aufführt, und sie verkaufen es zu ihren eigenen Bedingungen.` },
    { q: "Kann ich ein im Ausland gekauftes iPhone Duo zu Hause mit meinem Mobilfunkanbieter nutzen?", a: "Meist ja, wenn das Modell die Bänder Ihres Anbieters unterstützt, Ihr Anbieter eSIM anbietet (das iPhone Duo hat überall nur eSIM) und es ohne SIM-Lock ist – was Apples eigene Verkäufe in den meisten Ländern sind. Der Garantieservice gilt international mit Ausnahmen; Steuern und Zoll sind die echten Zusatzkosten." },
  ],
  sources: { buy: "Apple – iPhone Duo kaufen", pickup: "Apple – Abholung im Store und Lieferung", returns: "Apple – Rückgabe und Rückgabefrist", warranty: "Apple – Garantieservice nach Land", log: "PickupChecker – das Restock-Protokoll, aus dem diese Seite berechnet wird" },
  ld: (x: ChannelsView) => ({
    description: `Abholung im Apple Store, Lieferung über apple.com, Mobilfunkanbieter, Händler und Weiterverkauf für das iPhone Duo ${wo(x.c)}: gemessene Apple-Store-Restocks und was die anderen Kaufwege verraten und was nicht.`,
  }),
  related: "Weiterlesen",
  sameData: "Dieselben Daten, andere Fragen",
  otherCountries: "Diese Seite für andere Länder",
  questions: { howToGet: "So bekommen Sie ein iPhone Duo", whereToBuy: "Wo Sie heute eins kaufen", shortage: "Lässt der Engpass nach?", configs: "Welche Konfiguration bekommt man am leichtesten?", restockTimes: "Wann ist das iPhone Duo wieder verfügbar?", alerts: "Am schnellsten benachrichtigt werden" },
  setUpAlert: "Alarm einrichten",
  logLive: "Restock-Protokoll, live",
  faqTitle: "Häufige Fragen",
  onThisPage: "Auf dieser Seite",
};

/* ================================================================== the public API */
const api: DecideDict["api"] = {
  crumb: "Bestands-API",
  title: (c: Country) => (c.cc === "us"
    ? fitDe(["iPhone-Duo-Bestands-API: Live-Daten der Apple Stores", "iPhone-Duo-Bestands-API: Live-Daten (kostenlos)"], 49, c.cc)
    : fitDe([
      `iPhone-Duo-Bestands-API ${inLand(c.cc)}: Live-Daten`,
      `iPhone-Duo-Bestands-API ${inLand(c.cc)} (kostenlos)`,
      `iPhone-Duo-Bestands-API ${inLand(c.cc)}`,
      `iPhone-Duo-Bestands-API (${land(c.cc)})`,
    ], 49, c.cc)),
  metaDescription: (x: ApiView) => fitDe([
    `Eine kostenlose, schreibgeschützte JSON-API für den iPhone-Duo-Abholbestand in ${appleStores(x.stores)} ${wo(x.c)} (${n(x.worldStores)} in ${n(x.countries)} Ländern): aktuelle Verfügbarkeit je Store und Konfiguration, bestätigte Restocks der letzten 24 Stunden, ohne Schlüssel, 30 Sekunden gecacht. Endpunkte, Beispiele, Limits.`,
    `Kostenlose JSON-API für den iPhone-Duo-Bestand in ${appleStores(x.stores)} ${wo(x.c)}: Verfügbarkeit je Store, Restocks der letzten 24 Stunden, ohne Schlüssel. Endpunkte, Beispiele und Limits.`,
  ], 160, x.c.cc),
  h1: (x: ApiView) => `Gibt es eine API oder ein Skript, um den iPhone-Duo-Bestand in den Apple Stores ${wo(x.c)} zu überwachen?`,
  intro: (x: ApiView) => `Ja: PickupChecker veröffentlicht eine kostenlose, schreibgeschützte JSON-API für ${storesAkk(x)} (insgesamt ${n(x.worldStores)} Stores in ${n(x.countries)} Ländern), gespeist aus Prüfungen alle ${SPEED.checkSec} Sekunden je Store und 30 Sekunden am Edge gecacht, ohne Schlüssel und ohne Anmeldung. Eine Anfrage liefert die aktuelle Abhol-Verfügbarkeit des iPhone Duo in jedem Store nach Konfiguration; eine zweite die bestätigten Restocks der letzten 24 Stunden. Gerade ${n(x.storesNow)} von ${stores(x.stores)} ${wo(x.c)} ${x.storesNow === 1 ? "bietet" : "bieten"} eins an, und in den letzten 24 Stunden wurden ${restocks(x.restocks24)} bestätigt. Unten: die Endpunkte, funktionierende Beispiele in curl, Python und JavaScript, die Feldreferenz, die Limits – und warum ein Skript, das im Cache-Intervall von 30 Sekunden abfragt, trotzdem langsamer ist als ein Push-Alarm.`,
  updated: (x: ApiView, stamp: string) => `Aktualisiert ${stamp} · ${appleStores(x.stores)} ${wo(x.c)} · alle ${SPEED.checkSec} Sekunden geprüft · API 30 Sekunden gecacht`,
  nav: { endpoints: "Endpunkte", examples: "Beispiele", fields: "Felder", limits: "Limits & Bedingungen", script: "Skript oder Alarm?", apple: "apple.com auslesen", method: "Datenquelle" },
  h2: (x: ApiView) => ({
    endpoints: `Was liefert die iPhone-Duo-Bestands-API ${wo(x.c)}?`,
    examples: "Wie rufe ich sie mit curl, Python oder JavaScript auf?",
    fields: "Was bedeuten die Felder?",
    limits: "Wie oft darf ich abfragen, und was sind die Bedingungen?",
    script: "Soll ich ein eigenes Skript schreiben oder einfach Alarme nutzen?",
    apple: "Kann ich stattdessen apple.com selbst abfragen?",
    method: "Woher die Daten kommen",
  }),
  hero: {
    stores: (one: boolean) => (one ? "Apple Store abgedeckt" : "Apple Stores abgedeckt"),
    now: "bieten gerade ein iPhone Duo an",
    restocks24: "bestätigte Restocks, letzte 24 Std.",
    cache: "Sekunden Cache der API",
  },
  perMinute: "Anfragen pro Minute und Adresse",
  keysNeeded: "API-Schlüssel nötig",
  endpointsLead: (x: ApiView) => `Drei GET-Endpunkte, alle JSON, alle unter https://pickupchecker.com/api/v1: \`stock\` liefert jeden Apple Store ${wo(x.c)} mit den Konfigurationen, die er gerade zur Abholung anbietet, und dem Zeitpunkt der letzten Prüfung; \`restocks\` liefert bestätigte Restocks der letzten 1–168 Stunden, neueste zuerst, jeweils mit der Angabe, ob noch gelistet; \`iphone-duo\` ist eine Abkürzung für \`stock?model=duo\`. Der Ländercode steht im Pfad (${x.c.cc}${x.c.cc === "uk" ? ", gb wird ebenfalls akzeptiert" : ""}); die Modelle sind duo, 18-pro und 18-pro-max.`,
  endpointsCaption: "Endpunkte ({country} ersetzen durch us, ca, uk, au, de, fr, it, es, jp, kr, hk, sg, ae, ch, nl, se, tw, at oder be)",
  endpointsHead: ["Endpunkt", "Liefert", "Parameter"],
  endpointsRows: (x: ApiView) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: "Jeden Store: in_stock, die verfügbaren Konfigurationen, last_checked_at, last_in_stock_at; eine Zusammenfassung mit stores_in_stock.", params: "model (duo | 18-pro | 18-pro-max), storage (z. B. 512GB), color (z. B. night-sky)" },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: "Bestätigte Restocks, neueste zuerst: at, store, configuration, still_listed.", params: "model, hours (1–168, Standard 24), limit (1–200, Standard 100)" },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: "Leitet weiter auf stock?model=duo.", params: "—" },
    { path: "/api/v1", returns: "Diese Liste, die Länder und Modelle, die Limits.", params: "—" },
  ],
  examplesLead: "Kopieren Sie eins davon; jedes gibt die Stores aus, die gerade ein iPhone Duo anbieten. Kein Schlüssel, kein Header außer einem User-Agent, der Ihr Skript benennt (damit wir Ihnen schreiben können, falls es aus dem Ruder läuft).",
  exampleTitles: { curl: "curl (jede Shell)", python: "Python 3, nur Standardbibliothek", node: "JavaScript (Node 18+ oder ein Browser)" },
  fieldsLead: "Jedes Feld ist snake_case, jede Zeit ISO 8601 in UTC. Store-Kennungen sind Apples eigene (R-Nummern) und passen daher zu Apples Store-Seiten und den URLs dieser Website.",
  fieldsCaption: "Feldreferenz",
  fieldsHead: ["Feld", "Typ", "Bedeutung"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "Wann diese Antwort berechnet wurde; das CDN kann sie bis zu 30 Sekunden ausliefern." },
    { f: "country.code / name / currency", t: "string", m: "Das Land der Stores." },
    { f: "configurations[]", t: "object", m: "Die Teilenummern, die die Abfrage abdeckt, mit Speicher und Farbe in Apples Schreibweise." },
    { f: "summary.stores_in_stock", t: "integer", m: "Stores, die gerade mindestens eine abgedeckte Konfiguration zur Abholung anbieten." },
    { f: "stores[].store_number", t: "string", m: "Apples Store-ID, z. B. R085." },
    { f: "stores[].in_stock", t: "boolean", m: "Mindestens eine abgedeckte Konfiguration wird zur Abholung angeboten." },
    { f: "stores[].available[]", t: "object", m: "Die angebotenen Konfigurationen: part_number, storage, color." },
    { f: "stores[].last_checked_at", t: "string | null", m: `Wann wir Apples Abholseite für diesen Store zuletzt gelesen haben (normalerweise vor weniger als ${SPEED.checkSec} Sekunden).` },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "Der letzte Moment, in dem dieser Store eine abgedeckte Konfiguration anbot." },
    { f: "restocks[].at", t: "string", m: "Wann die Konfiguration von „ausverkauft“ auf „verfügbar“ wechselte (bestätigt durch zwei Prüfungen)." },
    { f: "restocks[].still_listed", t: "boolean | null", m: "Ob dieser Store sie zum Zeitpunkt der Antwort noch anbietet." },
    { f: "attribution", t: "object", m: "Die Quelle, die Lizenzzeile und diese Seite." },
  ],
  limitsLead: `Fragen Sie je Endpunkt in einem Intervall von 30 Sekunden oder länger ab – so lange sind die Antworten am Edge gecacht, ein kürzeres Intervall liefert dasselbe JSON – und bleiben Sie unter 60 Anfragen pro Minute von einer Adresse; das ist das Limit, das unsere Server erreicht. Die Daten sind kostenlos nutzbar, auch kommerziell, unter einer Bedingung: Zeigen Sie „Quelle: PickupChecker“ mit einem Link auf pickupchecker.com (oder die Store- bzw. Länderseite) überall dort, wo die Zahlen erscheinen. Kein Schlüssel, keine Anmeldung, CORS offen – eine Browserseite kann die API also direkt aufrufen.`,
  limitsKeys: () => [
    "Eine 429-Antwort heißt: mehr als 60 Anfragen in einer Minute von Ihrer Adresse; warten Sie die Sekunden aus Retry-After ab.",
    "Inkompatible Änderungen bekommen einen neuen Versionspfad (/api/v2); unter v1 kommen Felder hinzu, werden aber nie umbenannt.",
    "Bitte setzen Sie einen User-Agent mit Ihrem Projektnamen und einem Kontakt; ein höfliches Skript haben wir noch nie blockiert.",
  ],
  scriptLead: (x: ApiView) => `Wenn Sie ein Dashboard, einen Discord-Bot, eine Tabelle oder Recherche wollen, schreiben Sie das Skript – dafür ist die API da. Wenn Sie tatsächlich ein iPhone Duo kaufen wollen, ist ein Skript das langsamere Werkzeug: Es sieht einen Restock bei seiner nächsten Abfrage, bis zu 30 Sekunden später, und muss es Ihnen dann noch mitteilen; unser Push-Alarm liest dieselben Stores alle ${SPEED.fastSec} Sekunden, bestätigt den Restock und sendet den Push etwa ${SPEED.alertSec} Sekunden danach – ${x.storesNow !== undefined ? "innerhalb der medianen Listungsdauer von etwa einer Minute" : "innerhalb der medianen Listungsdauer"}. Viele machen beides: den Alarm zum Kaufen, die API zum Beobachten.`,
  scriptCaption: "Ein Abfrage-Skript im Vergleich zum Push-Alarm",
  scriptHead: ["", "Ihr Skript mit dieser API", "PickupChecker-Alarm"],
  scriptRows: () => [
    { k: "Sieht einen Restock nach", a: "bis zu 30 Sekunden (Cache) + Ihr Intervall", b: `Push gesendet etwa ${SPEED.alertSec} Sekunden, nachdem unsere Prüfung ihn sieht` },
    { k: "Erreicht Ihr Handy", a: "wie immer Sie es bauen (E-Mail, Bot, SMS)", b: "als Mitteilung der Home-Bildschirm-App" },
    { k: "Beobachtete Stores", a: "alle, bei jedem Aufruf", b: `Ihre gewählten Stores alle ${SPEED.fastSec} Sekunden, alle Stores alle ${SPEED.checkSec} Sekunden` },
    { k: "Kosten", a: "kostenlos", b: "ein Abo für die Alarme; das Lesen dieser Website ist kostenlos" },
  ],
  appleLead: `Ja, in Grenzen: Die Abholseite von apple.com antwortet je Store und Konfiguration – genau das lesen wir. Was einem schnell geschriebenen Skript fehlt, ist die Sorgfalt: IPv6-Rotation, damit Apple weiter antwortet, eine Regel mit zwei Beobachtungen, damit ein flackerndes „nicht verfügbar“ keinen falschen Restock erzeugt, die Zeitzone jedes Stores und eine Aufzeichnung seit dem Verkaufsstart. Wenn Sie nur die Antwort wollen, ist die API genau diese erledigte Arbeit; wenn Sie lernen wollen, erklärt unsere Methodenseite jedes Teil.`,
  appleKeys: () => [
    "Apples Seite ist eine Momentaufnahme: Sie sagt Ihnen, was jetzt ist – nie, wie lange eine Listung hielt oder wann die letzte war.",
    `Unsere Prüfungen liegen je Store ${SPEED.checkSec} Sekunden auseinander und nie enger als ${SPEED.fastSec} Sekunden; ein Skript, das apple.com häufiger abfragt, wird blockiert und lernt nichts.`,
  ],
  methodLead: (x: ApiView) => `Jede Zahl stammt daraus, dass PickupChecker Apples eigene Verfügbarkeit zur Abholung im Store für ${storesAkk(x)} alle ${SPEED.checkSec} Sekunden liest (in Stores mit Alarm alle ${SPEED.fastSec} Sekunden). Eine Änderung wird erst nach zwei übereinstimmenden Beobachtungen übernommen; die erste Sichtung nach einer Lücke ist kein Restock. Die API liefert dieselben Tabellen, die die Seiten dieser Website lesen; nichts ist hochgerechnet oder geschätzt.`,
  methodKeys: () => ["Die vollständige Methode: die Seite „So funktioniert’s“.", "Die Quellenangabe ist der ganze Preis; ein Link zurück hält das hier kostenlos."],
  faq: (x: ApiView): Faq[] => [
    { q: `Gibt es eine kostenlose API für den iPhone-Duo-Bestand in den Apple Stores ${wo(x.c)}?`, a: `Ja – die von PickupChecker, unter https://pickupchecker.com/api/v1/${x.c.cc}/stock: jeder Apple Store ${wo(x.c)} mit den Konfigurationen, die er gerade zur Abholung anbietet, als JSON, ohne Schlüssel, 30 Sekunden gecacht. Ein zweiter Endpunkt liefert die bestätigten Restocks der letzten 24 Stunden.` },
    { q: "Hat Apple eine offizielle Bestands-API?", a: "Keine öffentliche. Die Abholseite von apple.com lässt sich je Store und Konfiguration lesen – das macht diese Website mit Sorgfalt (Rotation, Bestätigung, Zeitzonen); die API hier ist diese Arbeit als JSON." },
    { q: "Wie aktuell sind die Daten?", a: `Jeder Store wird alle ${SPEED.checkSec} Sekunden geprüft (in Stores mit Alarm alle ${SPEED.fastSec} Sekunden), und die API-Antwort ist 30 Sekunden gecacht – ein Wert ist also höchstens etwa 45 Sekunden alt; last_checked_at sagt es Ihnen genau.` },
    { q: "Darf ich sie in einem kommerziellen Produkt verwenden?", a: "Ja, mit Quellenangabe: „Quelle: PickupChecker“, verlinkt auf pickupchecker.com, überall dort, wo die Daten erscheinen, und ein Abfrageintervall von mindestens 30 Sekunden. Ein Schlüssel ist nicht nötig." },
    { q: "Bekomme ich mit einem Skript schneller ein iPhone Duo als mit einem Alarm?", a: `Nein: Ein Skript sieht einen Restock bei seiner nächsten Abfrage, bis zu 30 Sekunden später; der Alarm bestätigt ihn und geht etwa ${SPEED.alertSec} Sekunden, nachdem wir ihn sehen, raus. Nutzen Sie das Skript zum Beobachten und den Alarm zum Kaufen.` },
  ],
  sources: { pickup: "Apple – Abholung im Store", method: "PickupChecker – so funktionieren die Prüfungen", log: "PickupChecker – das Restock-Protokoll" },
  ld: (x: ApiView) => ({
    description: `Kostenlose JSON-API für die iPhone-Duo-Abhol-Verfügbarkeit in ${storesDat(x)}: aktueller Bestand je Store und Konfiguration, bestätigte Restocks der letzten 24 Stunden.`,
  }),
  related: "Weiterlesen",
  sameData: "Dieselben Daten, andere Fragen",
  otherCountries: "Diese Seite für andere Länder",
  questions: { alerts: "Am schnellsten benachrichtigt werden", howItWorks: "So funktionieren die Prüfungen", restockTimes: "Wann ist das iPhone Duo wieder verfügbar?", shortage: "Lässt der Engpass nach?", configs: "Welche Konfiguration bekommt man am leichtesten?", stockChecker: "iPhone-Duo-Bestandsprüfung" },
  setUpAlert: "Alarm einrichten",
  tryIt: "Live-JSON öffnen",
  faqTitle: "Häufige Fragen",
  onThisPage: "Auf dieser Seite",
};

export const decide: DecideDict = { configs, supply, channels, api };
