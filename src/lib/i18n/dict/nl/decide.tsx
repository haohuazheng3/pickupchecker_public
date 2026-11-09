/**
 * Dutch strings of the four decision pages (seo.md §16): which configuration is easiest to get, is the shortage
 * easing, Apple vs providers vs retail chains, and the public API. Same keys, parameters and shapes as ../en/decide
 * (the type checker enforces it); labels (configuration, colour, store) arrive in Dutch through the view, the country
 * is named here (countryLabel: "in Nederland", "in België"). Neutral Dutch for the Netherlands and Flanders, je-vorm,
 * the vocabulary of views.tsx (aanvulling, voorraad om op te halen, winkel, configuratie, opslag, kleur, alert).
 * Facts that never change wording: check intervals are 15 s and 5 s; no model names, storage sizes or brands are translated.
 */
import type { Faq } from "@/lib/content/types";
import type { Country, CountryCode } from "@/lib/apple/countries";
import type { DuoSupply } from "@/lib/content/duoDecide";
import { exposureHours } from "@/lib/content/duoDecide";
import type { ApiView, ChannelsView, ConfigsView, DecideCtx, DecideDict, SupplyView } from "../en/decide";
import { SPEED } from "@/lib/plans";
import { LANG_TAG, fitTitleW, list, num, pct as pctOf } from "@/lib/i18n/format";
import { countryLabel } from "@/lib/i18n/places";

const L = "nl" as const;

/* ---------------------------------------------------------------- Dutch number, date and duration helpers */
const n = (x: number) => num(L, x);
/** 0.59 → "59%", tiny shares "<1%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : pctOf(L, Math.round(x * 100)));
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${pctOf(L, Math.round(Math.abs(x) * 100))}`;
/** "2,3": one decimal, always written. */
const dec1 = (v: number) => new Intl.NumberFormat(LANG_TAG[L], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
/** "5 november 2026". */
const longDate = (ymd: string) => new Intl.DateTimeFormat(LANG_TAG[L], { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "do 5 nov". */
const dateLabel = (ymd: string) => new Intl.DateTimeFormat(LANG_TAG[L], { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
const cnt = (k: number, one: string, many: string) => `${n(k)} ${k === 1 ? one : many}`;
/** "38,4 uur" of listing time, "41 min" under an hour. */
const uren = (sec: number) => (sec >= 3600 ? `${n(exposureHours(sec))} uur` : `${n(Math.max(1, Math.round(sec / 60)))} min`);
/** "75 seconden", "3 minuten" (from two minutes on). */
const secs = (s: number) => (s >= 120 ? cnt(Math.round(s / 60), "minuut", "minuten") : cnt(Math.round(s), "seconde", "seconden"));
/** "1,8 keer" (… zo vaak). */
const ratio = (a: number, b: number) => (b > 0 ? `${n(Math.round((a / b) * 10) / 10)} keer` : "—");
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const words = (items: string[], max = 6) => list(L, items, max, (k) => `${n(k)} andere`);
const points = (k: number) => cnt(k, "procentpunt", "procentpunten");

const aanv = (k: number) => cnt(k, "aanvulling", "aanvullingen");
const confirmed = (k: number) => cnt(k, "bevestigde aanvulling", "bevestigde aanvullingen");
const winkels = (k: number) => cnt(k, "winkel", "winkels");
const appleStores = (k: number) => cnt(k, "Apple Store", "Apple Stores");
const dagen = (k: number) => cnt(k, "dag", "dagen");

/** "in Nederland", "in België", "in de Verenigde Staten": the country is always named on the Dutch pages. */
const ARTICLE: Partial<Record<CountryCode, string>> = { us: "de ", uk: "het ", ae: "de " };
const land = (cc: CountryCode) => countryLabel(cc, L);
const inC = (c: Country) => `in ${ARTICLE[c.cc] ?? ""}${land(c.cc)}`;
/** "de enige Apple Store in België" / "alle 3 Apple Stores in Nederland". */
const storesPhrase = (x: DecideCtx) => (x.one ? `de enige Apple Store ${inC(x.c)}` : `alle ${n(x.stores)} Apple Stores ${inC(x.c)}`);
/** "meer" / "minder" / "ongeveer evenveel" (… aanvullingen). */
const trendWord = (d: DuoSupply) => (d.trend === "up" ? "meer" : d.trend === "down" ? "minder" : "ongeveer evenveel");
/** "meer aanvullingen deze week dan vorige week" / "ongeveer evenveel aanvullingen deze week als vorige week". */
const vsLast = (d: DuoSupply) => `${trendWord(d)} aanvullingen deze week ${d.trend === "up" || d.trend === "down" ? "dan" : "als"} vorige week`;
/** "Apples retourtermijn van 14 dagen", Hong Kong's no-returns rule, or a neutral phrase. */
const returnPhrase = (days: number | null) => (days ? `Apples retourtermijn van ${n(days)} dagen` : days === 0 ? "Apples beleid daar zonder retourrecht (alleen omruilen bij defecten)" : "Apples retourbeleid");

/** The SIM-lock sentences of channels.ts, in Dutch (the data arrives in English). */
const LOCK: Partial<Record<CountryCode, string>> = {
  us: "Simlockvrij als je hem bij Apple koopt; met financiering via AT&T, T-Mobile of Verizon blijft de iPhone aan die provider gebonden tot hij volledig is afbetaald.",
  ca: "Sinds 1 december 2017 verplicht de Wireless Code van de CRTC dat elke nieuwe telefoon die in Canada wordt verkocht, ook via een provider, simlockvrij is.",
  uk: "Ofcom verbiedt Britse netwerken sinds december 2021 om telefoons met simlock te verkopen, dus iPhones van een provider zijn simlockvrij.",
  au: "iPhones met een abonnement van Telstra, Optus en Vodafone worden simlockvrij verkocht; alleen sommige prepaidtoestellen zitten vast aan het netwerk.",
  de: "Apple en de grote Duitse netwerken (Telekom, Vodafone, O2) verkopen iPhones zonder simlock; alleen sommige prepaidbundels zijn vergrendeld.",
  fr: "Franse providers verkopen de meeste telefoons nu simlockvrij (Free Mobile vergrendelt nooit); een resterende simlock moet na 3 maanden gratis worden verwijderd.",
  it: "Apple verkoopt de iPhone in Italië zonder hem aan een provider te binden (simlockvrij); de status van toestellen die via een provider worden gefinancierd, is niet gecontroleerd.",
  es: "Apple verkoopt de iPhone in Spanje ‘libre’ (simlockvrij); de status van toestellen die via een provider worden gefinancierd, is niet gecontroleerd.",
  jp: "Sinds oktober 2021 verbieden de richtlijnen van het Japanse ministerie (MIC) providers om nieuw verkochte telefoons te vergrendelen, dus iPhones van een provider zijn simlockvrij.",
  kr: "Apple verkoopt niet-geactiveerde iPhones in Korea simlockvrij; de status van toestellen die providers verkopen, is niet gecontroleerd.",
  hk: "Apple verkoopt de iPhone in Hongkong simlockvrij; de status van toestellen die providers verkopen, is niet gecontroleerd.",
  sg: "Het ‘No SIM-Lock’-beleid van IMDA verbiedt providers om telefoons die in Singapore worden verkocht te vergrendelen.",
  ae: "Apple verkoopt de iPhone in de Verenigde Arabische Emiraten simlockvrij; de status van toestellen die providers verkopen, is niet gecontroleerd.",
  ch: "Apple verkoopt de iPhone in Zwitserland zonder simlock; de status van toestellen die providers verkopen, is niet gecontroleerd.",
  nl: "Apple verkoopt de iPhone in Nederland simlockvrij; de status van toestellen die providers verkopen, is niet gecontroleerd.",
  se: "Apple verkoopt de iPhone in Zweden simlockvrij; de status van toestellen die providers verkopen, is niet gecontroleerd.",
  tw: "Apple verkoopt de iPhone in Taiwan simlockvrij; de status van toestellen die providers verkopen, is niet gecontroleerd.",
  at: "Apple verkoopt de iPhone in Oostenrijk zonder simlock; de status van toestellen die providers verkopen, is niet gecontroleerd.",
  be: "Apple verkoopt de iPhone in België simlockvrij; de status van toestellen die providers verkopen, is niet gecontroleerd.",
};
const lock = (x: ChannelsView) => (x.ch.carrierLock ? LOCK[x.c.cc] : undefined);

/* ================================================================== which configuration is easiest to get */
const configs: DecideDict["configs"] = {
  crumb: "Welke configuratie?",
  title: (c: Country) => fitTitleW([
    `Welke iPhone Duo komt ${inC(c)} het vaakst terug?`,
    `Welke iPhone Duo is ${inC(c)} het makkelijkst?`,
    "Welke iPhone Duo komt het vaakst terug?",
  ], 49),
  metaDescription: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    return e && h
      ? fitTitleW([
        `${x.cfg(e)} is de iPhone Duo die ${inC(x.c)} het makkelijkst te krijgen is: ${n(e.restocks)} van ${n(d.n)} bevestigde aanvullingen bij ${appleStores(x.stores)} en ${uren(e.exposureSec)} beschikbaar sinds ${longDate(d.since)}; ${x.cfg(h)} is het moeilijkst (${n(h.restocks)}). Elke configuratie gerangschikt op opslag en kleur, bijgewerkt bij elke aanvulling.`,
        `${x.cfg(e)} is ${inC(x.c)} de makkelijkst te krijgen iPhone Duo (${n(e.restocks)} van ${n(d.n)} aanvullingen sinds ${longDate(d.since)}); ${x.cfg(h)} de moeilijkste. Elke configuratie gerangschikt op opslag en kleur.`,
      ], 160)
      : `Elke iPhone Duo-configuratie gerangschikt op bevestigde aanvullingen in Apple Stores ${inC(x.c)} sinds ${longDate(d.since)}: opslag, kleur, hoe lang hij beschikbaar blijft en wat er nu te koop staat.`;
  },
  h1: (x: ConfigsView) => `Welke iPhone Duo-configuratie wordt ${inC(x.c)} het vaakst aangevuld, en welke is het makkelijkst te krijgen?`,
  intro: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    if (!e) return `PickupChecker heeft sinds ${longDate(d.since)} ${cnt(d.n, "aanvulling van de iPhone Duo", "aanvullingen van de iPhone Duo")} bevestigd bij ${storesPhrase(x)} — te weinig om de configuraties al te rangschikken. De tabel hieronder vult zich bij elke aanvulling; de pagina voor de VS toont het patroon al.`;
    const st = d.byStorage, co = d.byColor;
    const last = st[st.length - 1];
    return `${x.cfg(e)} is ${inC(x.c)} de iPhone Duo-configuratie die het langst te koop stond: ${uren(e.exposureSec)} in totaal over ${n(e.restocks)} van de ${n(d.n)} aanvullingen die PickupChecker sinds ${longDate(d.since)} bij ${storesPhrase(x)} bevestigde, in ${winkels(e.stores)}${e.lifetimes ? `, met een mediaan van ${secs(e.lifetimes.medianSec)} per aanvulling` : ""}. ${h ? `${x.cfg(h)} stond het kortst te koop: ${aanv(h.restocks)} en ${uren(h.exposureSec)}.` : ""}${st.length > 1 ? ` Opslag verdeelt de telling sterker dan kleur: ${last.restocks > 0 ? `${st[0].key}-modellen werden ${ratio(st[0].restocks, last.restocks)} zo vaak aangevuld als ${last.key}` : `${st[0].key}-modellen waren goed voor ${pct(st[0].share)} van de aanvullingen, terwijl ${last.key} nog helemaal niet is aangevuld`}${co.length > 1 ? `, en ${x.colour(co[0].key)} lag maar ${points(Math.abs(Math.round((co[0].share - co[1].share) * 100)))} voor op ${x.colour(co[1].key)}` : ""}.` : ""} Welke je uiteindelijk weet te kopen, kan niemand zeggen; wat je kunt meten, zijn eerdere ophaalvensters, en die rangschikt deze pagina.`;
  },
  updated: (x: ConfigsView, stamp: string) => `Bijgewerkt ${stamp} · data sinds ${longDate(x.d.since)} · ${appleStores(x.stores)} · elke ${SPEED.checkSec} seconden gecheckt (winkels met alerts elke ${SPEED.fastSec} seconden)`,
  nav: { easiest: "Langst te koop", storage: "Opslag", colour: "Kleur", shelf: "Tijd om te kopen", week: "Deze week", alerts: "Waarop letten", method: "Zo tellen we" },
  h2: (x: ConfigsView) => ({
    easiest: `Welke iPhone Duo-configuratie stond ${inC(x.c)} het langst te koop?`,
    storage: "Maakt de opslaggrootte uit voor hoe vaak hij terugkomt?",
    colour: `${x.d.byColor.length > 1 ? `${x.colour(x.d.byColor[0].key)} of ${x.colour(x.d.byColor[1].key)}` : "Welke kleur"}: welke kleur komt vaker terug?`,
    shelf: "Welke configuratie geeft je de meeste tijd om toe te slaan?",
    week: "Wat is er de afgelopen zeven dagen veranderd?",
    alerts: "Voor welke configuraties stel ik alerts in?",
    method: "Zo tellen we een aanvulling en hoe lang die beschikbaar blijft",
  }),
  hero: {
    restocks: (label: string) => `bevestigde aanvullingen van ${label}`,
    exposure: "uur beschikbaar, alle winkels opgeteld",
    now: (one: boolean) => (one ? "heeft hem nu te koop" : "winkels hebben hem nu te koop"),
    median: "mediaan seconden beschikbaar",
    total: "aanvullingen van alle configuraties",
  },
  easiestLead: (x: ConfigsView) => {
    const e = x.d.easiest!;
    return `${x.cfg(e)} staat voor op beide punten die we kunnen meten: hij kwam het vaakst terug (${aanv(e.restocks)}, ${pct(e.restocks / x.d.n)} van het totaal) en stond in totaal het langst te koop (${uren(e.exposureSec)}): de tijd waarin een afhaling gereserveerd kon worden. ${e.nowStores > 0 ? `${cap(winkels(e.nowStores))} ${e.nowStores === 1 ? "heeft" : "hebben"} hem op dit moment te koop.` : "Geen enkele winkel heeft hem op dit moment te koop; de volgende aanvulling staat hier binnen enkele seconden."}`;
  },
  easiestKeys: (x: ConfigsView) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      `Top drie op beschikbare tijd: ${words(top3.map((r) => `${x.cfg(r)} (${uren(r.exposureSec)})`))}.`,
      d.never.length ? `Nooit aangevuld ${inC(x.c)} sinds ${longDate(d.since)}: ${words(d.never.map((r) => x.cfg(r)))}.` : `Elke configuratie is sinds ${longDate(d.since)} minstens één keer aangevuld.`,
      d.lifetimes ? `Over alle configuraties bleef een aanvulling een mediaan van ${secs(d.lifetimes.medianSec)} beschikbaar; ${pct(d.lifetimes.within2min)} was binnen 2 minuten weg.` : "Hoe lang een aanvulling beschikbaar blijft, verschijnt hier zodra van tien aanvullingen het einde bekend is.",
    ];
  },
  rankCaption: (x: ConfigsView) => `Elke iPhone Duo-configuratie ${inC(x.c)}, meeste beschikbare tijd eerst · ${longDate(x.d.since)} tot vandaag`,
  rankHead: ["Configuratie", "Aanvullingen", "Winkels", "Totaal beschikbaar", "Mediaan beschikbaar", "Nu te koop", "Laatste aanvulling"],
  none: "nog geen",
  storageLead: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return "Opslaggroottes worden vergeleken zodra er aanvullingen binnenkomen; de tabel hieronder is live.";
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return `Ja, meer dan wat ook: ${st[0].key} was goed voor ${pct(st[0].share)} van de aanvullingen en ${st[1].key} voor ${pct(st[1].share)}${big ? `, terwijl de 1TB- en 2TB-modellen samen ${pct(big / x.d.n)} uitmaakten` : ""}. Apple levert vooral de opslaggroottes die de meeste mensen bestellen; van die groottes krijgt een winkel er ook meerdere in één levering.`;
  },
  groupCaption: (what: "storage" | "colour") => `Aanvullingen per ${what === "storage" ? "opslaggrootte" : "kleur"}, alle winkels opgeteld`,
  groupHead: (what: "Storage" | "Colour") => [what === "Storage" ? "Opslag" : "Kleur", "Aanvullingen", "Aandeel", "Winkels", "Totaal beschikbaar", "Mediaan beschikbaar", "Nu te koop"],
  storageSwaps: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: `Alleen een alert op ${last}`, yes: `Eerst ${top}, en ${last} erbij`, why: `${last} was goed voor ${pct(st[st.length - 1].share)} van de aanvullingen; ${top} voor ${pct(st[0].share)}. Beide alerts kosten elk één plek.` },
      { no: "Wachten op precies de juiste grootte", yes: `Neem ${top} of ${second} als die komt`, why: `Samen waren ze goed voor ${pct(st[0].share + st[1].share)} van alle aanvullingen ${inC(x.c)}; met een hoesje en iCloud maakt de grootte minder uit dan het wachten.` },
    ];
  },
  colourLead: (x: ConfigsView) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return "Kleuren worden vergeleken zodra er aanvullingen binnenkomen.";
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return `${x.colour(co[0].key)}, maar niet met veel: ${pct(co[0].share)} van de aanvullingen tegenover ${pct(co[1].share)} voor ${x.colour(co[1].key)}, een verschil van ${points(gap)}${co[0].medianSec && co[1].medianSec ? `; ze bleven een mediaan van ${secs(co[0].medianSec)} en ${secs(co[1].medianSec)} beschikbaar` : ""}. Kleur verschuift de telling minder dan opslag. Wie een tweede kleur meevolgt, krijgt de ophaalvensters van die kleur erbij: ${co[1].restocks > 0 ? `${x.colour(co[1].key)} voegde ${inC(x.c)} sinds ${longDate(x.d.since)} ${aanv(co[1].restocks)} en ${uren(co[1].exposureSec)} beschikbare tijd toe, bovenop ${aanv(co[0].restocks)} en ${uren(co[0].exposureSec)} voor ${x.colour(co[0].key)} (alle groottes)` : `${x.colour(co[1].key)} is ${inC(x.c)} sinds ${longDate(x.d.since)} niet aangevuld, dus die had tot nu toe niets toegevoegd`}.`;
  },
  colourKeys: (x: ConfigsView) => x.d.byColor.map((g) => `${x.colour(g.key)}: ${aanv(g.restocks)} in ${winkels(g.stores)}, ${uren(g.exposureSec)} totaal beschikbaar${g.nowStores ? `, ${winkels(g.nowStores)} ${g.nowStores === 1 ? "heeft" : "hebben"} hem nu te koop` : ""}.`),
  shelfLead: (x: ConfigsView) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return "Hoe lang een aanvulling beschikbaar blijft, meten we van de aanvulling tot de volgende check die ‘uitverkocht’ toont; de eerste cijfers verschijnen zodra tien aanvullingen van een configuratie voorbij zijn.";
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return `${x.cfg(slow)} geeft je de meeste tijd: een mediaan van ${secs(slow.lifetimes!.medianSec)} beschikbaar voordat hij uitverkocht was, tegenover ${secs(fast.lifetimes!.medianSec)} voor ${x.cfg(fast)}. De tragere verkopers zijn de dure groottes — minder kopers willen ze — dus “de meeste tijd om toe te slaan” en “de meeste aanvullingen” wijzen naar verschillende configuraties; de rangschikking hierboven weegt beide.`;
  },
  shelfCaption: "Hoe lang elke configuratie beschikbaar bleef (aanvulling → volgende uitverkocht-check)",
  shelfHead: ["Configuratie", "Aanvullingen met bekend einde", "Mediaan", "Binnen 2 min weg", "Binnen 20 min weg", "Snelst"],
  shelfKeys: (x: ConfigsView) => [
    `De helft van alle aanvullingen was binnen ${x.d.lifetimes ? secs(x.d.lifetimes.medianSec) : "ongeveer een minuut"} weg; onze alert gaat zo'n ${SPEED.alertSec} seconden na onze bevestiging de deur uit, en wat er dan nog over is, hangt af van je telefoon en een klaargezette checkout.`,
    `De tijd is een bovengrens: we zien de uitverkochte status bij de volgende check, tot ${SPEED.checkSec} seconden later (${SPEED.fastSec} seconden bij winkels met alerts).`,
    "“Uitverkocht” betekent hier dat Apples ophaalpagina de configuratie in die winkel niet meer toonde; hoeveel toestellen dat waren, zegt Apple niet.",
  ],
  weekLead: (x: ConfigsView) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return `Geen aanvullingen ${inC(x.c)} in de afgelopen veertien dagen; de tabel per week begint bij de volgende.`;
    const lead = rows[0];
    return `${cap(aanv(tot7))} in de afgelopen zeven dagen${totP ? ` tegenover ${n(totP)} de week ervoor (${signed(tot7 / totP - 1)})` : ""}, met ${x.cfg(lead)} voorop (${n(lead.last7)}). ${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `Dat is een andere configuratie dan de koploper over de hele periode (${x.cfg(x.d.easiest)}): de mix verschuift met elke levering, dus kijk in deze tabel voordat je kiest waarvoor je een alert instelt.` : "De koploper over de hele periode staat ook deze week bovenaan."}`;
  },
  weekCaption: "Aanvullingen per configuratie: afgelopen 7 dagen tegenover de 7 daarvoor",
  weekHead: ["Configuratie", "Afgelopen 7 dagen", "Vorige 7 dagen", "Verschil"],
  alertsLead: (x: ConfigsView) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? `Stel alerts in op ${words(top.map((r) => x.cfg(r)))} bij de twee of drie winkels die je het snelst bereikt; dat dekt ${pct(top.reduce((a, r) => a + r.restocks, 0) / x.d.n)} van de aanvullingen ${inC(x.c)} tot nu toe. Voeg de exacte configuratie die je wilt toe als vierde alert, en neem wat het eerst komt.`
      : `Tot er ${inC(x.c)} aanvullingen binnenkomen: stel alerts in op de opslaggrootte die je wilt, in beide kleuren, bij je dichtstbijzijnde winkels.`;
  },
  alertsKeys: (x: ConfigsView) => [
    `Alerts gelden per winkel × configuratie, dus drie winkels × drie configuraties is ${cnt(9, "alert", "alerts")}.`,
    `We checken winkels met alerts elke ${SPEED.fastSec} seconden en bevestigen een aanvulling voordat we pushen; de push gaat zo'n ${SPEED.alertSec} seconden later de deur uit, en wanneer de melding op je telefoon verschijnt, hangt af van het toestel en de verbinding — dat meten we niet.`,
    x.one ? "De drukste winkel is ook de winkel waar de meeste mensen op letten." : "Kies winkels op afstand, niet op aantal aanvullingen: de drukste winkel is ook de winkel waar de meeste mensen op letten.",
  ],
  methodLead: "Een aanvulling is een configuratie die in één winkel van uitverkocht naar beschikbaar gaat, bevestigd door twee overeenkomende checks; de eerste waarneming na een onderbreking in het volgen telt niet mee. Hoe lang een aanvulling beschikbaar blijft, loopt van de aanvulling tot de eerste check die weer uitverkocht toont, en is dus een bovengrens. “Totaal beschikbaar” telt die tijden op over elke aanvulling van de configuratie — de eenvoudigste maat voor hoe lang een afhaling gereserveerd kon worden. Het is een registratie van eerdere beschikbaarheid, geen koopkans en geen aantal verkochte toestellen: Apple publiceert geen van beide.",
  methodKeys: (x: ConfigsView) => [
    `Bron: Apples eigen beschikbaarheid voor ophalen bij ${storesPhrase(x)}, elke ${SPEED.checkSec} seconden per winkel gelezen (${SPEED.fastSec} seconden bij winkels met alerts) sinds ${longDate(x.d.since)}.`,
    "Het aantal winkels dat hem nu te koop heeft en de tijden van de laatste aanvulling zijn live; al het andere wordt binnen vijf minuten herberekend.",
    "Citeer gerust met een link: de cijfers veranderen, dus vermeld de datum waarop je ze las.",
  ],
  faq: (x: ConfigsView): Faq[] => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor;
    return [
      { q: `Welke iPhone Duo is ${inC(x.c)} het makkelijkst te krijgen?`, a: e ? `Niemand kan zeggen welke jij te pakken krijgt: Apple publiceert zijn toewijzingen niet, en ook niet hoeveel mensen het proberen. Wat je wel kunt meten, zijn eerdere ophaalvensters. Sinds ${longDate(d.since)} stond ${x.cfg(e)} in totaal het langst beschikbaar (${uren(e.exposureSec)} over ${aanv(e.restocks)} bij ${appleStores(e.stores)})${h ? `, ${x.cfg(h)} het kortst (${uren(h.exposureSec)} over ${aanv(h.restocks)})` : ""}, van ${confirmed(d.n)} bij ${storesPhrase(x)}. Dat is een overzicht van eerdere beschikbaarheid, geen voorspelling voor jou; welke wijziging voor je eigen keuze de meeste vensters oplevert — een andere kleur, een andere winkel — zie je in de alert-editor onder ‘Wat levert de meeste ophaalvensters op?’.` : `Nog te weinig bevestigde aanvullingen ${inC(x.c)} om het te zeggen; deze pagina rangschikt elke configuratie zodra ze binnenkomen.` },
      { q: `Is ${co.length > 1 ? x.colour(co[1].key) : "de ene kleur"} moeilijker te vinden dan ${co.length > 1 ? x.colour(co[0].key) : "de andere"}?`, a: co.length > 1 && d.n ? `Een beetje: ${x.colour(co[0].key)} was goed voor ${pct(co[0].share)} van de aanvullingen en ${x.colour(co[1].key)} voor ${pct(co[1].share)}. Het verschil tussen opslaggroottes is veel groter, dus kies eerst de grootte en stel alerts in op beide kleuren daarvan.` : "Kleuren worden vergeleken zodra er aanvullingen binnenkomen." },
      { q: `Is de iPhone Duo met 1TB of 2TB ${inC(x.c)} ooit op voorraad?`, a: (() => { const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage)); const bn = big.reduce((a, r) => a + r.restocks, 0); return bn ? `Ja, maar zelden: ${aanv(bn)} van de 1TB- en 2TB-modellen op ${n(d.n)} (${pct(bn / d.n)}), ${new Set(big.flatMap((r) => (r.stores ? [r.partNumber] : []))).size ? `in hoogstens ${winkels(Math.max(...big.map((r) => r.stores)))}` : "in geen enkele winkel"}. Als er een verschijnt, blijft hij langer beschikbaar (minder kopers), dus een alert erop is een plek waard, ook al gaat hij zelden af.` : `Nog niet in onze data ${inC(x.c)}: geen bevestigde aanvulling van een 1TB- of 2TB-model sinds ${longDate(d.since)}.`; })() },
      { q: "Stel ik alerts in op één configuratie of op meerdere?", a: `Op meerdere, bij weinig winkels: de top drie configuraties waren goed voor ${d.n ? pct(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n) : "het merendeel"} van de aanvullingen ${inC(x.c)}. Drie configuraties bij drie winkels in de buurt zijn negen alerts, en dat past in een Plus-abonnement; voeg de exacte die je wilt toe als vierde.` },
      { q: "Is de mix in andere landen hetzelfde?", a: `Niet altijd: elk land krijgt zijn eigen toewijzing, en de rangschikking op de pagina van dat land kan afwijken. De links onder “Andere landen” openen dezelfde pagina voor de 18 andere landen die PickupChecker volgt; de pagina voor de VS heeft de langste reeks (sinds ${longDate("2026-10-29")}).` },
    ];
  },
  sources: { apple: "Apple – iPhone Duo-configuraties en prijzen", pickup: "Apple – Ophalen in de winkel", log: "PickupChecker – het voorraadlogboek waaruit deze pagina wordt berekend" },
  ld: (x: ConfigsView) => ({
    datasetName: `Aanvullingen van de iPhone Duo per configuratie, Apple Stores ${inC(x.c)}`,
    description: `Bevestigde aanvullingen van de iPhone Duo bij ${storesPhrase(x)} sinds ${longDate(x.d.since)}, per configuratie (opslag × kleur): aantal, winkels, totale beschikbare tijd, mediane beschikbaarheid, winkels die hem nu te koop hebben.`,
    measured: ["aanvullingen per configuratie", "winkels met een aanvulling", "beschikbare tijd in seconden", "mediane beschikbaarheid", "winkels die hem nu te koop hebben"],
  }),
  related: "Lees verder",
  sameData: "Dezelfde data, andere vragen",
  otherCountries: "Andere landen",
  questions: { restockTimes: "Wanneer vult Apple de iPhone Duo aan?", sellOut: "Hoe snel is een aanvulling uitverkocht?", shortage: "Neemt het tekort af?", channels: "Apple, provider of winkelketen?", alerts: "Snelste manier om een melding te krijgen", api: "De gratis voorraad-API" },
  setUpAlert: "Alerts instellen",
  logLive: "Voorraadlogboek, live",
  faqTitle: "Vragen die mensen stellen",
  onThisPage: "Op deze pagina",
};

/* ================================================================== is the shortage easing */
const supply: DecideDict["supply"] = {
  crumb: "Neemt het tekort af?",
  title: (c: Country) => fitTitleW([
    `Neemt het iPhone Duo-tekort ${inC(c)} af? Weektrend`,
    `Neemt het iPhone Duo-tekort ${inC(c)} af?`,
    `Neemt het iPhone Duo-tekort af? (${land(c.cc)})`,
    "Neemt het iPhone Duo-tekort af?",
  ], 49),
  metaDescription: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    return d.trend !== "insufficient"
      ? fitTitleW([
        `${cap(trendWord(d))} aanvullingen van de iPhone Duo ${inC(x.c)} deze week: ${n(w.restocks)} bij ${appleStores(w.stores)} in 7 dagen (${signed(d.change!)} tegenover de week ervoor)${w.medianSec ? `, elk binnen een mediaan van ${secs(w.medianSec)} weg` : ""}. Het aanbod per dag, hoe “afnemen” eruit zou zien, en of je moet wachten.`,
        `${cap(aanv(w.restocks))} van de iPhone Duo ${inC(x.c)} in de afgelopen 7 dagen (${signed(d.change!)} ten opzichte van vorige week). Het aanbod per dag en of het tekort afneemt.`,
      ], 160)
      : `Neemt het iPhone Duo-tekort ${inC(x.c)} af? ${confirmed(d.n)} in Apple Stores sinds ${longDate(d.since)}, per dag, met hoe een afname eruit zou zien en of je beter wacht of nu koopt.`;
  },
  h1: (x: SupplyView) => `Wordt het iPhone Duo-tekort ${inC(x.c)} minder, en hoe lang duurt het nog?`,
  intro: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    if (d.trend === "insufficient") {
      return `Te vroeg om te zeggen ${inC(x.c)}: PickupChecker begon op ${longDate(d.since)} met volgen, ${dagen(d.days)} geleden, dus de eerste volledige vergelijking week op week verschijnt op ${longDate(d.comparableFrom)}. Tot nu toe ${confirmed(d.n)} bij ${n(d.storesEver)} van ${appleStores(x.stores)}${d.lifetimes ? `, elk een mediaan van ${secs(d.lifetimes.medianSec)} beschikbaar voordat hij uitverkocht was` : ""}; ${n(d.storesNow)} ${d.storesNow === 1 ? "winkel heeft" : "winkels hebben"} nu een Duo te koop. Niemand kan het einde van het tekort voorspellen; deze pagina toont de twee cijfers die het als eerste laten zien — aanvullingen per week en seconden beschikbaar — bijgewerkt bij elke aanvulling.`;
    }
    const verdict = d.trend === "up" ? "Het aanbod verbetert" : d.trend === "down" ? "Het aanbod wordt krapper" : "Het aanbod is stabiel";
    const demand = w.medianSec ? (w.medianSec <= 120 ? `maar de vraag slokt het nog steeds op: een aanvulling bleef deze week een mediaan van ${secs(w.medianSec)} beschikbaar${d.prev7.medianSec ? ` (vorige week ${secs(d.prev7.medianSec)})` : ""}, dus met de hand kopen is nog niet makkelijker` : `en aanvullingen blijven langer beschikbaar: een mediaan van ${secs(w.medianSec)} deze week${d.prev7.medianSec ? ` tegenover ${secs(d.prev7.medianSec)} vorige week` : ""}, het eerste teken dat het tekort afneemt`) : "";
    return `${verdict} ${inC(x.c)}: Apple Stores vulden de iPhone Duo de afgelopen zeven dagen ${n(w.restocks)} keer aan, ${signed(d.change!)} ten opzichte van de week ervoor (${n(d.prev7.restocks)}), in ${winkels(w.stores)} van de ${n(x.stores)}${demand ? ` — ${demand}` : ""}. ${n(d.storesNow)} ${d.storesNow === 1 ? "winkel heeft" : "winkels hebben"} er nu een te koop. Niemand kan het einde voorspellen; de twee cijfers die het als eerste laten zien, staan op deze pagina en worden bij elke aanvulling bijgewerkt.`;
  },
  updated: (x: SupplyView, stamp: string) => `Bijgewerkt ${stamp} · data sinds ${longDate(x.d.since)} · ${appleStores(x.stores)} · elke ${SPEED.checkSec} seconden gecheckt`,
  nav: { trend: "Deze week", easier: "Makkelijker kopen?", stores: "Hoeveel winkels", howlong: "Hoe lang nog", christmas: "Wachten of kopen", world: "Andere landen", method: "Zo tellen we" },
  h2: (x: SupplyView) => ({
    trend: `Gaan de aanvullingen van de iPhone Duo ${inC(x.c)} omhoog of omlaag?`,
    easier: "Wordt het makkelijker om er echt een te kopen?",
    stores: `Hoeveel Apple Stores ${inC(x.c)} hebben überhaupt een iPhone Duo gehad?`,
    howlong: "Hoe lang duurt het iPhone Duo-tekort nog?",
    christmas: "Blijf ik wachten op een aanvulling, of koop ik op een andere manier?",
    world: `Neemt het tekort in andere landen sneller af${x.us ? "" : ` dan ${inC(x.c)}`}?`,
    method: "Zo tellen we",
  }),
  weekBefore: "week ervoor",
  goneIn2: "binnen 2 minuten weg",
  storesEverLabel: (one: boolean) => (one ? "bevestigde aanvullingen tot nu toe" : "winkels met minstens één aanvulling"),
  hero: { last7: "aanvullingen, afgelopen 7 dagen", change: "tegenover de 7 dagen ervoor", stores: (one: boolean) => (one ? "dagen met een aanvulling" : "winkels met een aanvulling, afgelopen 7 dagen"), median: "mediaan seconden beschikbaar, afgelopen 7 dagen", now: (one: boolean) => (one ? "heeft er nu een te koop" : "winkels hebben er nu een te koop"), sinceLast: "uur sinds de laatste aanvulling" },
  trendLead: (x: SupplyView) => {
    const { d } = x;
    if (d.trend === "insufficient") return `De tabel per dag is de hele reeks tot nu toe: ${aanv(d.n)} in ${dagen(d.days)}. Een vergelijking week op week verschijnt op ${longDate(d.comparableFrom)}; lees tot dan de richting per dag af.`;
    const w = d.last7, p = d.prev7;
    const gap = w.longestGapHours != null ? ` Het langste gat tussen twee aanvullingen was deze week ${n(w.longestGapHours)} uur${p.longestGapHours != null ? ` (vorige week ${n(p.longestGapHours)} uur)` : ""}.` : "";
    return `${cap(trendWord(d))} deze week: ${aanv(w.restocks)} (${dec1(w.perStoreDay * 7)} per winkel) tegenover ${n(p.restocks)} de week ervoor, ${signed(d.change!)}.${gap} Aanvullingen komen in golven die aan leveringen vastzitten, dus één rustige dag zegt weinig; let op de totalen over zeven dagen.`;
  },
  dailyCaption: (x: SupplyView) => `Bevestigde aanvullingen per lokale dag ${inC(x.c)}, nieuwste eerst (afgelopen 14 dagen)`,
  dailyHead: ["Dag", "Aanvullingen", "Winkels", "Mediaan beschikbaar"],
  trendKeys: (x: SupplyView) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? `Drukste dag tot nu toe: ${dateLabel(best.date)} met ${aanv(best.restocks)} in ${winkels(best.stores)}.` : "Nog geen aanvulling; de drukste dag verschijnt hier.",
      x.d.sinceLastHours != null && x.d.latest ? `Laatste aanvulling ${x.d.sinceLastHours < 1 ? "minder dan een uur" : `${n(x.d.sinceLastHours)} uur`} geleden: ${x.storeName(x.d.latest.storeNumber)}, ${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}.` : "Nog geen aanvulling geregistreerd.",
      `“Omhoog” betekent minstens ${pctOf(L, 15)} meer aanvullingen dan de week ervoor; “omlaag” minstens ${pctOf(L, 15)} minder; alles daartussen telt als stabiel.`,
    ];
  },
  easierLead: (x: SupplyView) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return "Makkelijker betekent twee dingen tegelijk: meer aanvullingen, en elke aanvulling die langer beschikbaar blijft. Hoe lang aanvullingen beschikbaar blijven, verschijnt zodra tien aanvullingen in de periode een bekend einde hebben.";
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return `${longer ? "Een beetje, ja" : shorter ? "Nee — eerder het omgekeerde" : "Nog niet"}: een aanvulling bleef deze week een mediaan van ${secs(w.medianSec)} beschikbaar${p.medianSec ? ` tegenover ${secs(p.medianSec)} vorige week` : ""}, en ${pct(w.within2min!)} was binnen twee minuten weg${p.within2min != null ? ` (vorige week ${pct(p.within2min)})` : ""}. Een afnemend tekort zie je aan twee cijfers die samen bewegen — meer aanvullingen en langere beschikbaarheid; alleen meer aanvullingen betekent dat Apple meer levert terwijl er net zoveel mensen wachten.`;
  },
  easierKeys: (x: SupplyView) => [
    "Zo ziet “afnemen” er hier uit: een mediane beschikbaarheid van meer dan 20 minuten, de meeste winkels die er tegelijk een te koop hebben, en levertijden op apple.com binnen een week.",
    `Tot dan koop je er een met een alert: we bevestigen een aanvulling en versturen de push zo'n ${SPEED.alertSec} seconden later, ruim binnen de mediane beschikbaarheid.`,
    x.d.lifetimes ? `Over de hele periode ${inC(x.c)}: ${aanv(x.d.lifetimes.n)} met een bekend einde, mediaan ${secs(x.d.lifetimes.medianSec)}, ${pct(x.d.lifetimes.within2min)} binnen 2 minuten weg.` : "Cijfers over de hele periode verschijnen na tien afgelopen aanvullingen.",
  ],
  storesLead: (x: SupplyView) => {
    const { d } = x;
    const never = x.stores - d.storesEver;
    return x.one
      ? `${d.storesEver ? `Ja: de enige Apple Store ${inC(x.c)} heeft sinds ${longDate(d.since)} ${confirmed(d.n)} gehad` : `Nog niet: geen bevestigde aanvulling bij de enige Apple Store ${inC(x.c)} sinds ${longDate(d.since)}`}${d.storesNow ? ", en er staat nu een Duo te koop" : ""}.`
      : `${n(d.storesEver)} van ${appleStores(x.stores)} ${inC(x.c)} (${pct(d.storesEver / x.stores)}) ${d.storesEver === 1 ? "heeft" : "hebben"} sinds ${longDate(d.since)} minstens één bevestigde aanvulling van de iPhone Duo gehad${never ? `; ${winkels(never)} nog niet` : ""}. ${n(d.storesNow)} ${d.storesNow === 1 ? "heeft" : "hebben"} er nu een te koop. Het aanbod is ongelijk verdeeld: vlaggenschipwinkels en winkels in winkelcentra worden het vaakst aangevuld, en daarom doet de winkel die je voor alerts kiest er net zoveel toe als de configuratie.`;
  },
  storesKeys: (x: SupplyView) => [
    `Winkels op aantal aanvullingen, met lokale tijden: het “waar”-deel van de pagina met aanvultijden ${inC(x.c)}.`,
    "Een winkel die nog nooit is aangevuld, is geen winkel die Apple overslaat: toewijzingen komen per levering, en verschillende winkels kregen pas in de tweede week hun eerste Duo.",
  ],
  howlongLead: (x: SupplyView) => `Niemand buiten Apple weet het, en wij voorspellen niets. Wat de reeks ${inC(x.c)} laat zien: ${aanv(x.d.n)} in ${dagen(x.d.days)}, ${x.d.trend === "insufficient" ? `een trend week op week vanaf ${longDate(x.d.comparableFrom)}` : vsLast(x.d)}, en een beschikbaarheid ${x.d.last7.medianSec ? `rond ${secs(x.d.last7.medianSec)}` : "van hooguit een paar minuten"}. Een tekort eindigt in een volgorde die je hier kunt volgen: het aantal aanvullingen per week stijgt, de beschikbaarheid rekt op van seconden naar uren, daarna hebben de meeste winkels er tegelijk een te koop en zakt de levertijd op apple.com naar dagen.`,
  howlongKeys: () => [
    "Signaal 1 — het aantal aanvullingen per week blijft twee of drie weken stijgen (de tabel hierboven).",
    "Signaal 2 — de mediane beschikbaarheid komt boven 20 minuten: aanvullingen duren langer dan de mensen die verversen.",
    "Signaal 3 — de levertijd op apple.com valt binnen een week en de meeste winkels hebben er tegelijk een te koop.",
    "Nieuwe kleuren of groottes zetten de klok terug; laat de alert aan tot signaal 3.",
  ],
  christmasLead: (x: SupplyView) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Laat de alert aan en houd een leverbestelling in de wachtrij — allebei, niet een van de twee. In het huidige tempo (${perDay >= 1 ? `zo'n ${n(Math.round(perDay))} aanvullingen per dag ${inC(x.c)}` : `minder dan één aanvulling per dag ${inC(x.c)}`}${w.medianSec ? `, elk een mediaan van ${secs(w.medianSec)} beschikbaar` : ""}) is een gevolgde winkel bij jou in de buurt binnen enkele dagen aan de beurt, en de push voor een bevestigde aanvulling gaat zo'n ${SPEED.alertSec} seconden nadat we hem zien de deur uit. Ergens anders een meerprijs betalen loont alleen als het wachten zelf je meer kost dan de toeslag; de vergelijking van verkoopkanalen weegt dat eerlijk af.`;
  },
  christmasKeys: () => [
    "Bestel eerst een levering op apple.com: die houdt je plek vast en kun je annuleren als het ophalen lukt.",
    "Alerts op de twee of drie vaakst aangevulde configuraties bij je dichtstbijzijnde winkels (de configuratiepagina zegt welke).",
    "Zorg dat je in de Apple Store-app bent ingelogd, met de Duo in je mandje en een opgeslagen kaart: de mediane aanvulling blijft zo'n minuut beschikbaar.",
  ],
  worldLead: (x: SupplyView) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return "De wekelijkse aanvullingen per winkel van elk land worden hier vergeleken zodra elk land een volledige week data heeft.";
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return `${top.name} had de afgelopen zeven dagen de meeste aanvullingen per winkel (${dec1(top.perStoreDay * 7)} per winkel), ${bottom.name} de minste (${dec1(bottom.perStoreDay * 7)})${mine ? `; ${land(x.c.cc)} zit op ${dec1(mine.perStoreDay * 7)}` : ""}. Toewijzingen verschillen per land en lanceringsdatum, dus een afnemend tekort is niet overal tegelijk te zien; de reeks van de VS is de langste.`;
  },
  worldCaption: "Afgelopen 7 dagen per land: aanvullingen, aanvullingen per winkel, mediane beschikbaarheid, winkels die er nu een te koop hebben",
  worldHead: ["Land", "Winkels", "Aanvullingen (7 d)", "Per winkel", "Mediaan beschikbaar", "Nu te koop"],
  methodLead: `Een aanvulling is een configuratie die in één winkel van uitverkocht naar beschikbaar gaat, bevestigd door twee overeenkomende checks met ${SPEED.checkSec} seconden ertussen (${SPEED.fastSec} seconden bij winkels met alerts); de eerste waarneming na een onderbreking in het volgen telt niet mee. Dagen zijn de lokale dagen van de winkel. De beschikbaarheid loopt van de aanvulling tot de eerste check die weer uitverkocht toont — een bovengrens, tot de volgende check. Weken zijn de afgelopen zeven lokale dagen tegenover de zeven daarvoor; voor een vergelijking moeten beide compleet zijn.`,
  methodKeys: (x: SupplyView) => [
    `Bron: Apples beschikbaarheid voor ophalen bij ${storesPhrase(x)}, sinds ${longDate(x.d.since)}.`,
    "Alles op deze pagina wordt binnen vijf minuten na een aanvulling herberekend; het aantal winkels dat er nu een te koop heeft, is live.",
    "Citeer met een link en de datum: dit zijn bewegende cijfers.",
  ],
  faq: (x: SupplyView): Faq[] => {
    const { d } = x;
    const w = d.last7;
    return [
      { q: `Vult Apple de iPhone Duo ${inC(x.c)} nog aan?`, a: d.n ? `Ja: ${confirmed(w.restocks)} in de afgelopen zeven dagen bij ${appleStores(w.stores)} ${inC(x.c)}, ${aanv(d.n)} sinds ${longDate(d.since)}. De laatste was ${d.sinceLastHours != null && d.sinceLastHours < 1 ? "minder dan een uur geleden" : d.sinceLastHours != null ? `${n(d.sinceLastHours)} uur geleden` : "nog niet geregistreerd"}.` : `Nog geen bevestigde aanvulling ${inC(x.c)} sinds het volgen begon op ${longDate(d.since)}; deze pagina wordt binnen vijf minuten na de eerste bijgewerkt.` },
      { q: `Wordt het iPhone Duo-tekort ${inC(x.c)} minder?`, a: d.trend === "insufficient" ? `Te vroeg om te zeggen: de eerste volledige vergelijking week op week verschijnt op ${longDate(d.comparableFrom)}. Let op twee cijfers — aanvullingen per week en seconden beschikbaar; een afnemend tekort betekent dat beide stijgen.` : `${cap(vsLast(d))} (${signed(d.change!)})${w.medianSec ? `, en een aanvulling bleef een mediaan van ${secs(w.medianSec)} beschikbaar` : ""}. Een afnemend tekort betekent meer aanvullingen en langere beschikbaarheid tegelijk; tot nu toe ${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "bewegen beide de goede kant op" : "gebeurt daarvan maar een deel"}.` },
      { q: "Wanneer is de iPhone Duo makkelijk te koop?", a: "Niemand buiten Apple kan dat zeggen, en PickupChecker voorspelt niets. De volgorde om op te letten: het aantal aanvullingen per week stijgt twee of drie weken, de mediane beschikbaarheid komt boven 20 minuten, daarna hebben de meeste winkels er tegelijk een te koop en zakt de levertijd op apple.com tot binnen een week." },
      { q: "Moet ik een meerprijs betalen in plaats van te wachten?", a: `Alleen als het wachten je meer kost dan de toeslag: in het huidige tempo is een gevolgde winkel in de buurt binnen enkele dagen aan de beurt, en een alert gaat zo'n ${SPEED.alertSec} seconden na een bevestigde aanvulling de deur uit. Doorverkoop betekent ook geen retourtermijn en de gebruikelijke risico's; de pagina die de verkoopkanalen vergelijkt, weegt ze af.` },
      { q: "Veranderen de feestdagen je kansen?", a: "De vraag stijgt richting december terwijl de leveringen hun ritme houden, dus aanvullingen blijven eerder korter dan langer beschikbaar. Houd een leverbestelling als vangnet en laat alerts het ophalen opvangen; annuleer wat je niet nodig hebt." },
    ];
  },
  sources: { newsroom: "Apple Newsroom – iPhone Duo arriveert in Apple Stores", pickup: "Apple – Ophalen in de winkel", log: "PickupChecker – het voorraadlogboek waaruit deze pagina wordt berekend", restockTimes: "PickupChecker – wanneer Apple de iPhone Duo aanvult" },
  ld: (x: SupplyView) => ({
    datasetName: `Aanbodtrend van de iPhone Duo, Apple Stores ${inC(x.c)}`,
    description: `Bevestigde aanvullingen van de iPhone Duo per dag bij ${storesPhrase(x)} sinds ${longDate(x.d.since)}: aanvullingen, winkels, mediane beschikbaarheid, verandering week op week.`,
    measured: ["aanvullingen per dag", "winkels met een aanvulling", "mediane beschikbaarheid", "verandering week op week", "winkels die er nu een te koop hebben"],
  }),
  related: "Lees verder",
  sameData: "Dezelfde data, andere vragen",
  otherCountries: "Deze pagina voor andere landen",
  questions: { restockTimes: "Wanneer vult Apple de iPhone Duo aan?", configs: "Welke configuratie is het makkelijkst te krijgen?", channels: "Apple, provider of winkelketen?", sellOut: "Hoe snel is een aanvulling uitverkocht?", howToGet: "Zo krijg je een iPhone Duo", alerts: "Snelste manier om een melding te krijgen" },
  setUpAlert: "Alerts instellen",
  logLive: "Voorraadlogboek, live",
  faqTitle: "Vragen die mensen stellen",
  onThisPage: "Op deze pagina",
};

/* ================================================================== Apple vs providers vs retail chains */
const channels: DecideDict["channels"] = {
  crumb: "Apple, provider of winkelketen?",
  title: (c: Country) => fitTitleW([
    `iPhone Duo ${inC(c)}: Apple, provider of winkelketen?`,
    `iPhone Duo ${inC(c)}: Apple, provider of winkel?`,
    `iPhone Duo ${inC(c)}: Apple, provider, winkel?`,
    `iPhone Duo: Apple, provider of winkel? (${c.iso})`,
  ], 49),
  metaDescription: (x: ChannelsView) => fitTitleW([
    `Waar je ${inC(x.c)} echt een iPhone Duo krijgt: ophalen in de Apple Store (${confirmed(x.sup.n)} in ${winkels(x.stores)} sinds ${longDate(x.sup.since)}), levering via apple.com, ${words(x.ch.carriers.slice(0, 3))}, ${words(x.ch.retailers.slice(0, 2))} en doorverkoop — wat elk kanaal je wel en niet kan vertellen, en welk je moet volgen.`,
    `Ophalen in de Apple Store, levering via apple.com, ${words(x.ch.carriers.slice(0, 2))}, ${x.ch.retailers[0] ?? "winkelketens"} of doorverkoop voor de iPhone Duo ${inC(x.c)}: wat elk kanaal je kan vertellen en welk je moet volgen.`,
  ], 160),
  h1: (x: ChannelsView) => `Apple Store, provider of winkelketen: waar krijg je ${inC(x.c)} echt een iPhone Duo?`,
  intro: (x: ChannelsView) => `Ophalen in de Apple Store is ${inC(x.c)} het enige kanaal voor de iPhone Duo waarvan iemand het aanbod kan meten: PickupChecker heeft sinds ${longDate(x.sup.since)} ${aanv(x.sup.n)} bevestigd bij ${storesPhrase(x)}, waarvan ${n(x.sup.last7.restocks)} in de afgelopen zeven dagen, elk afgelezen van Apples eigen ophaalpagina, elke ${SPEED.checkSec} seconden. De providers (${words(x.ch.carriers)}) en de winkelketens (${words(x.ch.retailers)}) krijgen hun eigen toewijzing en publiceren geen voorraadfeed, dus niemand — wij niet en ook niemand anders — kan je eerlijk hun aanvultijden geven. Hieronder: wat elk kanaal je wel en niet kan vertellen, de afwegingen, en in welke volgorde je ze volgt.`,
  updated: (x: ChannelsView, stamp: string) => `Bijgewerkt ${stamp} · Apple Store-data sinds ${longDate(x.sup.since)} · ${appleStores(x.stores)} · elke ${SPEED.checkSec} seconden gecheckt`,
  nav: { compare: "Per kanaal", pickup: "Ophalen of levering", carriers: "Providers", retailers: "Winkelketens", resale: "Doorverkoop", abroad: "Kopen in het buitenland", method: "Hoe we het weten" },
  h2: (x: ChannelsView) => ({
    compare: `Welk kanaal vult de iPhone Duo ${inC(x.c)} het vaakst aan?`,
    pickup: "Is ophalen in de Apple Store sneller dan een levering bestellen op apple.com?",
    carriers: `Moet ik de iPhone Duo liever bij ${x.ch.carriers.length ? words(x.ch.carriers.slice(0, 3), 3) : "een provider"} kopen?`,
    retailers: `Zijn ${x.ch.retailers.length ? words(x.ch.retailers.slice(0, 2), 2) : "winkelketens"} het bekijken waard?`,
    resale: `Is een meerprijs betalen op ${x.ch.resale[0] ?? "een doorverkoopsite"} het waard?`,
    abroad: "Kan ik een iPhone Duo in het buitenland kopen en thuis gebruiken?",
    method: "Hoe we weten wat we weten",
  }),
  hero: { restocks: "bevestigde aanvullingen in de Apple Store", last7: "in de afgelopen 7 dagen", now: (one: boolean) => (one ? "Apple Store heeft er nu een te koop" : "Apple Stores hebben er nu een te koop"), channels: "andere kanalen, geen openbare voorraadfeed" },
  compareLead: (x: ChannelsView) => `Ophalen in de Apple Store, volgens de enige maat die er is: ${confirmed(x.sup.last7.restocks)} in de afgelopen zeven dagen in ${winkels(x.sup.last7.stores)} ${inC(x.c)}${x.sup.last7.medianSec ? `, elk een mediaan van ${secs(x.sup.last7.medianSec)} beschikbaar` : ""}. Providers en winkelketens vullen vrijwel zeker ook aan — ze krijgen toewijzingen uit dezelfde zendingen van Apple — maar ze tonen een ja/nee op een productpagina, geen feed, dus de vergelijking hieronder gaat over wat je kunt volgen, niet over wie meer krijgt.`,
  compareCaption: "De kanalen voor de iPhone Duo, eerlijk vergeleken",
  compareHead: ["Kanaal", "Wat er over de voorraad bekend is", "Zo volg je het", "Het addertje"],
  compareRows: (x: ChannelsView) => {
    const r = x.ch;
    return [
      { channel: "Ophalen in de Apple Store", known: `${cap(confirmed(x.sup.n))} sinds ${longDate(x.sup.since)}; elke aanvulling, elke winkel, met tijdstip.`, watch: `Een alert hier (verstuurd zo'n ${SPEED.alertSec} seconden na bevestiging), of de ophaalkeuze in de Apple Store-app.`, catch: "Een aanvulling blijft zo'n minuut beschikbaar; je hebt de app open en een opgeslagen kaart nodig." },
      { channel: "Levering via apple.com", known: "Apple toont bij het afrekenen een verwachte levertijd; die verschuift dagelijks en is nooit een voorraadaantal.", watch: "Plaats de bestelling; de schatting op je bestelpagina wordt bijgewerkt zodra Apple verzendt.", catch: "Weken, geen minuten — maar je plek in de rij blijft behouden." },
      { channel: `Providers (${words(r.carriers)})`, known: "Eigen toewijzing; online voorraad per configuratie als beschikbaar / in nabestelling. Geen geschiedenis, geen feed.", watch: "Hun apps en winkelzoekers; een winkel bellen werkt nog steeds.", catch: lock(x) ?? "Abonnementen, financiering en activeringsregels gelden; de voorraad verschilt per winkel." },
      { channel: `Winkelketens (${words(r.retailers)})`, known: "Eigen toewijzing, bij een lanceringsproduct vaak alleen online; per configuratie getoond op de productpagina.", watch: "Hun productpagina en app; een paar sturen een e-mail als iets weer op voorraad is.", catch: "Toewijzingen zijn kleiner dan die van Apple en zijn ook binnen minuten uitverkocht." },
      { channel: `Doorverkoop (${words(r.resale)})`, known: "Altijd beschikbaar, voor een prijs.", watch: "—", catch: `Een meerprijs, geen aankoopbewijs van de fabrikant, ${r.returnDays ? `en niets van ${returnPhrase(r.returnDays)}` : "en helemaal geen retourtermijn"}.` },
    ];
  },
  compareKeys: (x: ChannelsView) => [
    `${n(x.ch.carriers.length + x.ch.retailers.length)} andere verkopers ${inC(x.c)} en geen enkele openbare voorraadgeschiedenis: elke site die beweert de aanvultijden van een provider te kennen, gokt.`,
    "Ons standpunt: volg het ophalen in de Apple Store met een alert, houd een leverbestelling op apple.com als vangnet, en kijk op de pagina van een winkelketen als je daar toch al bent.",
  ],
  pickupLead: (x: ChannelsView) => `Voor snelheid: ophalen. Een configuratie die op de ophaalpagina verschijnt, kun je die minuut nog reserveren en dezelfde dag ophalen, terwijl een leverbestelling wacht op Apples schatting. Voor zekerheid: levering. De bestelling houdt je plek vast, wat er ook in de winkels gebeurt. ${x.sup.lifetimes ? `Ophaalaanbod ${inC(x.c)} bleef een mediaan van ${secs(x.sup.lifetimes.medianSec)} beschikbaar en ${pct(x.sup.lifetimes.within2min)} was binnen twee minuten weg — daarom bestaat de alert.` : ""} Het juiste antwoord is allebei: bestel vandaag een levering, stel de ophaalalert in, en annuleer wat je niet nodig hebt.`,
  pickupSwaps: () => [
    { no: "De leverbestelling annuleren om “opnieuw te beginnen”", yes: "Houd hem tot je de opgehaalde telefoon in handen hebt", why: "Apple publiceert geen plaats in de rij; een nieuwe bestelling krijgt gewoon de schatting van vandaag, en die is zelden eerder dan de schatting die je al hebt." },
    { no: "De ophaalpagina met de hand verversen", yes: "Laat de alert het volgen", why: `We checken winkels met alerts elke ${SPEED.fastSec} seconden en versturen de push zo'n ${SPEED.alertSec} seconden na bevestiging; wie met de hand ververst, ziet de meeste aanvullingen pas als ze al weg zijn.` },
    { no: "De bestelling later bij het afrekenen omzetten naar ophalen", yes: "Reserveer ophalen als nieuwe bestelling zodra de alert afgaat", why: "Ophaalreserveringen komen uit de winkelvoorraad, leverbestellingen uit het magazijn: het zijn twee rijen, en de ophaalrij is de snelle." },
  ],
  pickupKeys: (x: ChannelsView) => [
    `Apples eigen pagina legt de opties voor ophalen en levering uit${x.ch.returnDays ? `, en de retourtermijn van ${n(x.ch.returnDays)} dagen voor beide` : x.ch.returnDays === 0 ? "; let op: Apple in Hongkong neemt niets terug omdat je je bedacht hebt, alleen omruilen bij defecten" : ""} (bronnen hieronder).`,
    "Een ophaalreservering is een bestelling voor die winkel; Apple houdt hem apart en laat weten wanneer je kunt komen.",
  ],
  carriersLead: (x: ChannelsView) => `Als je financiering wilt, een inruil gekoppeld aan een abonnement, of je staat al in een winkel van ${x.ch.carriers[0] ?? "een provider"} waar er een op de plank ligt — ja. Als je de telefoon zo snel mogelijk wilt, zijn providers een tweede loterij met kleinere kansen en zonder manier om die te volgen. ${lock(x) ?? "Controleer de simlock en de abonnementsvoorwaarden voordat je koopt."} Hun webwinkels tonen de beschikbaarheid per configuratie, dus even kijken kost niets; verwacht alleen geen geschiedenis of melding.`,
  carriersKeys: (x: ChannelsView) => [
    `Providers ${inC(x.c)}: ${words(x.ch.carriers)}.`,
    "De voorraad van een provider geldt per winkel; een winkel die er online een toont, heeft hem misschien alleen om in de winkel op te halen.",
    "Een iPhone van een provider is dezelfde hardware; het verschil is het contract dat eraan vastzit.",
  ],
  retailersLead: (x: ChannelsView) => `Het bekijken waard als je daar toch al winkelt, niet het volgen waard: ${words(x.ch.retailers)} tonen de iPhone Duo per configuratie en verkopen hun toewijzing online binnen minuten, zonder feed om je op te abonneren. Hun voordeel zijn betaalvoorwaarden en spaarpunten; hun nadeel een kleinere toewijzing dan Apples eigen winkels.`,
  retailersKeys: (x: ChannelsView) => [
    `Winkelketens ${inC(x.c)}: ${words(x.ch.retailers)}.`,
    "Kijk naar de configuratiekeuze op de productpagina: grijs betekent online uitverkocht, en dat zegt niets over hun winkels.",
  ],
  resaleLead: (x: ChannelsView) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Zelden. Weeg de meerprijs af tegen het wachten dat je ermee overslaat: Apple Stores ${inC(x.c)} vulden deze week ${perDay >= 1 ? `zo'n ${n(Math.round(perDay))} keer per dag` : "minder dan één keer per dag"} aan, en een alert gaat zo'n ${SPEED.alertSec} seconden na een bevestigde aanvulling de deur uit, dus een gevolgde winkel bij jou in de buurt komt meestal binnen enkele dagen door. Daartegenover bieden ${words(x.ch.resale)} geen aankoopbewijs van de fabrikant, ${x.ch.returnDays ? `niets van ${returnPhrase(x.ch.returnDays)}` : "helemaal geen retourtermijn"}, en de gebruikelijke risico's — een toestel met activeringsslot, een verwisselde doos, een “verzegelde” retour.`;
  },
  resaleKeys: () => [
    "Koop je toch via doorverkoop: spreek persoonlijk af, zet het toestel aan, zoek het serienummer op in Instellingen → Algemeen → Info, en log in voordat je betaalt.",
    "Apples garantie volgt het toestel, niet de bon — maar er kan om een aankoopbewijs worden gevraagd; een particuliere verkoop kan je dat van Apple niet geven.",
    "Een meerprijs die hoger is dan een week wachten, is een meerprijs voor ongeduld; beslis met dat in je achterhoofd.",
  ],
  abroadLead: (x: ChannelsView) => `Vaak wel, met controles: een iPhone die je bij Apple koopt, wordt in de meeste landen simlockvrij verkocht, Apples garantieservice is internationaal beschikbaar met uitzonderingen, en het model moet de frequentiebanden van je provider thuis ondersteunen — en diens eSIM, want Apples koop-pagina's vermelden de iPhone Duo in elk land als alleen-eSIM. Belastingen zijn de echte kosten: ${x.c.pricesIncludeTax ? "de prijs die je in het buitenland betaalt, bevat lokale belasting die je mogelijk niet kunt terugvorderen" : "de omzetbelasting komt er aan de kassa nog bij"}, en de douane thuis kan bij terugkomst invoerrechten heffen. PickupChecker volgt ${x.us ? "18 andere landen" : "de VS en 17 andere landen"}, dus de voorraadvraag zelf is via de landenpagina's te beantwoorden.`,
  abroadKeys: () => [
    "Voor je koopt: Apples garantiepagina voor waar service wordt geboden, de lijst met banden en simkaarten van het model, en of je provider thuis eSIM ondersteunt.",
    "Bewaar de bon: service en een eventuele retour lopen via de regels van het land van aankoop.",
    "Een telefoon die je koopt voor iemand thuis, is nog steeds in het buitenland gekocht; dezelfde controles gelden.",
  ],
  methodLead: (x: ChannelsView) => `De Apple Store-cijfers op deze pagina komen uit de eigen checks van PickupChecker bij ${storesPhrase(x)}, elke ${SPEED.checkSec} seconden sinds ${longDate(x.sup.since)}; een aanvulling telt pas na twee overeenkomende waarnemingen. De lijsten met providers en winkelketens zijn de verkopers die Apple zelf voor het land noemt plus de grootste wederverkopers, met hun eigen pagina's als bron; wat we over hun voorraad zeggen, is wat hun pagina's tonen, en dat is een momentopname, geen geschiedenis. We scrapen ze niet en beweren niets over hun aanvultijden.`,
  methodKeys: () => ["Correcties welkom: verkoopt een verkoper op deze pagina de iPhone Duo niet meer, laat het ons weten en hij gaat eraf.", "Citeer met een link en de datum."],
  faq: (x: ChannelsView): Faq[] => [
    { q: `Welk kanaal vult de iPhone Duo ${inC(x.c)} het snelst aan?`, a: `Het enige kanaal met een meetbare reeks is ophalen in de Apple Store: ${confirmed(x.sup.last7.restocks)} in de afgelopen zeven dagen ${inC(x.c)}${x.sup.last7.medianSec ? `, elk een mediaan van ${secs(x.sup.last7.medianSec)} beschikbaar` : ""}. Providers en winkelketens vullen ook aan, maar publiceren geen feed, dus niemand kan ze eerlijk rangschikken.` },
    { q: "Verlies ik mijn plek als ik mijn bestelling op apple.com annuleer en opnieuw bestel?", a: "Je krijgt een nieuwe bestelling met de levertijd van vandaag; Apple publiceert geen plaats in de rij. Vergelijk de schatting bij het afrekenen met die op je bestaande bestelling voordat je annuleert — de nieuwe is zelden eerder." },
    { q: "Is een iPhone Duo van een provider anders dan die van Apple?", a: `Dezelfde hardware. ${lock(x) ?? "Het verschil zit in het abonnement en eventuele simlock- of financieringsvoorwaarden."} De voorraad van providers staat los van die van Apple en wordt per winkel getoond.` },
    { q: "Krijg ik Apples retourtermijn als ik bij een winkelketen koop?", a: x.ch.returnDays ? `Nee — het eigen beleid van de winkelketen geldt. Apples termijn van ${n(x.ch.returnDays)} dagen geldt voor aankopen bij Apple (apple.com en Apple Stores).` : x.ch.returnDays === 0 ? "Apple in Hongkong neemt zelf niets terug omdat je je bedacht hebt (alleen omruilen bij defecten), dus vergelijk het eigen beleid van de winkelketen — sommige zijn daar ruimer dan Apple." : "Nee — het eigen beleid van de winkelketen geldt; Apples retourtermijn dekt alleen aankopen bij Apple." },
    { q: "Welke providers noemt Apple voor de iPhone Duo?", a: x.c.cc === "us" || x.c.cc === "jp" ? `Apples koop-pagina ${inC(x.c)} noemt ${words(x.ch.carriers)}; de pagina van elk ander land verkoopt hem simlockvrij, zonder stap voor een provider.` : `Apples koop-pagina ${inC(x.c)} verkoopt de iPhone Duo simlockvrij en noemt geen provider; ${words(x.ch.carriers)} zijn de netwerken die Apple daar vermeldt als geschikt voor de iPhone, en zij verkopen hem op hun eigen voorwaarden.` },
    { q: "Kan ik een iPhone Duo die ik in het buitenland kocht thuis bij mijn provider gebruiken?", a: "Meestal wel, als het model de banden van je provider ondersteunt, je provider eSIM aanbiedt (de iPhone Duo is overal alleen-eSIM) en het toestel simlockvrij is, wat Apples eigen verkoop in de meeste landen is. Garantieservice is internationaal met uitzonderingen; belastingen en invoerrechten zijn de echte extra kosten." },
  ],
  sources: { buy: "Apple – iPhone Duo kopen", pickup: "Apple – Ophalen in de winkel en levering", returns: "Apple – Retourneren en de retourtermijn", warranty: "Apple – Garantieservice per land", log: "PickupChecker – het voorraadlogboek waaruit deze pagina wordt berekend" },
  ld: (x: ChannelsView) => ({
    description: `Ophalen in de Apple Store, levering via apple.com, providers, winkelketens of doorverkoop voor de iPhone Duo ${inC(x.c)}: gemeten aanvullingen in de Apple Store, en wat de andere kanalen je wel en niet kunnen vertellen.`,
  }),
  related: "Lees verder",
  sameData: "Dezelfde data, andere vragen",
  otherCountries: "Deze pagina voor andere landen",
  questions: { howToGet: "Zo krijg je een iPhone Duo", whereToBuy: "Waar je er vandaag een koopt", shortage: "Neemt het tekort af?", configs: "Welke configuratie is het makkelijkst te krijgen?", restockTimes: "Wanneer vult Apple de iPhone Duo aan?", alerts: "Snelste manier om een melding te krijgen" },
  setUpAlert: "Alerts instellen",
  logLive: "Voorraadlogboek, live",
  faqTitle: "Vragen die mensen stellen",
  onThisPage: "Op deze pagina",
};

/* ================================================================== the public API */
const api: DecideDict["api"] = {
  crumb: "Voorraad-API",
  title: (c: Country) => fitTitleW([
    `iPhone Duo voorraad-API ${inC(c)}: live Apple Store-data`,
    `Gratis voorraad-API voor de iPhone Duo ${inC(c)}`,
    `Gratis voorraad-API voor iPhone Duo ${inC(c)}`,
    `Gratis voorraad-API voor de iPhone Duo (${c.iso})`,
  ], 49),
  metaDescription: (x: ApiView) => fitTitleW([
    `Een gratis, alleen-lezen JSON-API voor de ophaalvoorraad van de iPhone Duo in ${appleStores(x.stores)} ${inC(x.c)} (${n(x.worldStores)} in ${n(x.countries)} landen): actuele beschikbaarheid per winkel en configuratie, bevestigde aanvullingen van de afgelopen 24 uur, geen sleutel, 30 seconden gecachet. Endpoints, voorbeelden in curl/Python/JavaScript, limieten, en wanneer een script beter is dan een alert.`,
    `Gratis JSON-API voor de voorraad van de iPhone Duo in ${appleStores(x.stores)} ${inC(x.c)}: beschikbaarheid per winkel, aanvullingen van de afgelopen 24 uur, geen sleutel. Endpoints, voorbeelden en limieten.`,
  ], 160),
  h1: (x: ApiView) => `Is er een API of script om de voorraad van de iPhone Duo in Apple Stores ${inC(x.c)} te volgen?`,
  intro: (x: ApiView) => `Ja: PickupChecker publiceert een gratis, alleen-lezen JSON-API voor ${storesPhrase(x)} (${n(x.worldStores)} winkels in ${n(x.countries)} landen in totaal), gebouwd op checks elke ${SPEED.checkSec} seconden per winkel en 30 seconden gecachet aan de edge, zonder sleutel en zonder aanmelding. Eén request geeft voor elke winkel de actuele ophaalbeschikbaarheid van de iPhone Duo per configuratie; een tweede geeft de bevestigde aanvullingen van de afgelopen 24 uur. Op dit moment ${x.storesNow === 1 ? "heeft" : "hebben"} ${n(x.storesNow)} van ${winkels(x.stores)} ${inC(x.c)} er een te koop en ${x.restocks24 === 1 ? "is" : "zijn"} er ${aanv(x.restocks24)} bevestigd in de afgelopen 24 uur. Hieronder: de endpoints, werkende voorbeelden in curl, Python en JavaScript, de veldenlijst, de limieten — en waarom een script dat met het cache-interval van 30 seconden pollt nog steeds trager is dan een pushalert.`,
  updated: (x: ApiView, stamp: string) => `Bijgewerkt ${stamp} · ${appleStores(x.stores)} ${inC(x.c)} · elke ${SPEED.checkSec} seconden gecheckt · API 30 seconden gecachet`,
  nav: { endpoints: "Endpoints", examples: "Voorbeelden", fields: "Velden", limits: "Limieten & voorwaarden", script: "Script of alert?", apple: "apple.com scrapen", method: "Herkomst van de data" },
  h2: (x: ApiView) => ({
    endpoints: `Wat geeft de voorraad-API voor de iPhone Duo ${inC(x.c)} terug?`,
    examples: "Hoe roep ik hem aan vanuit curl, Python of JavaScript?",
    fields: "Wat betekenen de velden?",
    limits: "Hoe vaak mag ik pollen, en wat zijn de voorwaarden?",
    script: "Schrijf ik zelf een script, of gebruik ik gewoon alerts?",
    apple: "Kan ik apple.com niet gewoon zelf pollen?",
    method: "Waar de data vandaan komt",
  }),
  hero: { stores: (one: boolean) => (one ? "Apple Store gedekt" : "Apple Stores gedekt"), now: "hebben nu een iPhone Duo te koop", restocks24: "bevestigde aanvullingen, afgelopen 24 u", cache: "seconden dat de API gecachet wordt" },
  perMinute: "requests per minuut per adres",
  keysNeeded: "API-sleutels nodig",
  endpointsLead: (x: ApiView) => `Drie GET-endpoints, allemaal JSON, allemaal onder https://pickupchecker.com/api/v1: \`stock\` geeft elke Apple Store ${inC(x.c)} met de configuraties die hij nu te koop heeft om op te halen en wanneer hij voor het laatst is gecheckt; \`restocks\` geeft bevestigde aanvullingen van de afgelopen 1–168 uur, nieuwste eerst, met of elke aanvulling nog te koop staat; \`iphone-duo\` is een snelkoppeling naar \`stock?model=duo\`. De landcode staat in het pad (${x.c.cc}${x.c.cc === "uk" ? ", gb wordt ook geaccepteerd" : ""}); de modellen zijn duo, 18-pro en 18-pro-max.`,
  endpointsCaption: "Endpoints (vervang {country} door us, ca, uk, au, de, fr, it, es, jp, kr, hk, sg, ae, ch, nl, se, tw, at of be)",
  endpointsHead: ["Endpoint", "Geeft terug", "Parameters"],
  endpointsRows: (x: ApiView) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: "Elke winkel: in_stock, de beschikbare configuraties, last_checked_at, last_in_stock_at; een samenvatting met stores_in_stock.", params: "model (duo | 18-pro | 18-pro-max), storage (bijv. 512GB), color (bijv. night-sky)" },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: "Bevestigde aanvullingen, nieuwste eerst: at, store, configuratie, still_listed.", params: "model, hours (1–168, standaard 24), limit (1–200, standaard 100)" },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: "Stuurt door naar stock?model=duo.", params: "—" },
    { path: "/api/v1", returns: "Deze lijst, de landen en modellen, de limieten.", params: "—" },
  ],
  examplesLead: "Kopieer er een; elk voorbeeld toont de winkels die nu een iPhone Duo te koop hebben. Geen sleutel, geen header behalve een User-Agent die je script noemt (zodat we je kunnen mailen als het zich misdraagt).",
  exampleTitles: { curl: "curl (elke shell)", python: "Python 3, alleen de standaardbibliotheek", node: "JavaScript (Node 18+ of een browser)" },
  fieldsLead: "Elk veld is snake_case en elke tijd is ISO 8601 in UTC. Winkel-id's zijn die van Apple zelf (R-nummers), dus ze komen overeen met Apples winkelpagina's en de URL's op deze site.",
  fieldsCaption: "Veldenlijst",
  fieldsHead: ["Veld", "Type", "Betekenis"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "Wanneer dit antwoord is berekend; het CDN kan het tot 30 seconden blijven serveren." },
    { f: "country.code / name / currency", t: "string", m: "Het land van de winkels." },
    { f: "configurations[]", t: "object", m: "De onderdeelnummers die de query dekt, met opslag en kleur zoals Apple ze schrijft." },
    { f: "summary.stores_in_stock", t: "integer", m: "Winkels die nu minstens één gedekte configuratie te koop hebben om op te halen." },
    { f: "stores[].store_number", t: "string", m: "Apples winkel-id, bijv. R085." },
    { f: "stores[].in_stock", t: "boolean", m: "Minstens één gedekte configuratie staat te koop om op te halen." },
    { f: "stores[].available[]", t: "object", m: "De beschikbare configuraties: part_number, storage, color." },
    { f: "stores[].last_checked_at", t: "string | null", m: `Wanneer we Apples ophaalpagina voor deze winkel voor het laatst lazen (normaal minder dan ${SPEED.checkSec} seconden geleden).` },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "Het laatste moment waarop deze winkel een gedekte configuratie te koop had." },
    { f: "restocks[].at", t: "string", m: "Wanneer de configuratie van uitverkocht naar beschikbaar ging (bevestigd door twee checks)." },
    { f: "restocks[].still_listed", t: "boolean | null", m: "Of die winkel hem op het moment van het antwoord nog te koop heeft." },
    { f: "attribution", t: "object", m: "De bron, de licentieregel en deze pagina." },
  ],
  limitsLead: "Poll met een interval van 30 seconden of langer per endpoint — antwoorden worden zo lang aan de edge gecachet, dus een korter interval geeft dezelfde JSON — en blijf onder 60 requests per minuut vanaf één adres; dat is de limiet die onze servers bereikt. De data is gratis te gebruiken, ook commercieel, op één voorwaarde: toon “Bron: PickupChecker” met een link naar pickupchecker.com (of naar de winkel- of landpagina) overal waar de cijfers verschijnen. Geen sleutel, geen aanmelding, CORS open, dus een browserpagina kan hem direct aanroepen.",
  limitsKeys: () => [
    "Een 429-antwoord betekent meer dan 60 requests in een minuut vanaf je adres; wacht het aantal seconden uit Retry-After af.",
    "Wijzigingen die iets breken krijgen een nieuw versiepad (/api/v2); onder v1 worden velden toegevoegd, nooit hernoemd.",
    "Zet een User-Agent met de naam van je project en een contactadres; we hebben nog nooit een beleefd script geblokkeerd.",
  ],
  scriptLead: (x: ApiView) => `Wil je een dashboard, een Discord-bot, een spreadsheet of onderzoek, schrijf dan het script — daar is de API voor. Wil je echt een iPhone Duo kopen, dan is een script het tragere gereedschap: het ziet een aanvulling bij de volgende poll, tot 30 seconden later, en moet het je daarna nog laten weten; onze pushalert leest dezelfde winkels elke ${SPEED.fastSec} seconden, bevestigt de aanvulling en gaat zo'n ${SPEED.alertSec} seconden later de deur uit — ${x.storesNow !== undefined ? "binnen de mediane beschikbaarheid van zo'n minuut" : "binnen de mediane beschikbaarheid"}. Veel mensen doen allebei: de alert om te kopen, de API om te volgen.`,
  scriptCaption: "Een pollend script tegenover een pushalert",
  scriptHead: ["", "Je script op deze API", "Alert van PickupChecker"],
  scriptRows: () => [
    { k: "Ziet een aanvulling na", a: "tot 30 seconden (cache) + je interval", b: `push verstuurd zo'n ${SPEED.alertSec} seconden nadat onze check hem ziet` },
    { k: "Bereikt je telefoon", a: "via wat je zelf bouwt (e-mail, bot, sms)", b: "een melding van de app op je beginscherm" },
    { k: "Gevolgde winkels", a: "allemaal, bij elke aanroep", b: `je gekozen winkels elke ${SPEED.fastSec} seconden, alle winkels elke ${SPEED.checkSec} seconden` },
    { k: "Kosten", a: "gratis", b: "een abonnement voor de alerts; deze site lezen is gratis" },
  ],
  appleLead: "Dat kan, binnen grenzen: de ophaalpagina van apple.com antwoordt per winkel en configuratie, en dat is precies wat wij lezen. Wat een eenmalig script mist, is de zorg — IPv6-rotatie zodat Apple blijft antwoorden, een regel van twee waarnemingen zodat een flikkerend “niet beschikbaar” geen valse aanvulling wordt, tijdzones voor elke winkel, en een reeks die sinds de lanceringsdag wordt bijgehouden. Wil je alleen het antwoord, dan is de API dat werk al gedaan; wil je het leren, dan legt onze methodepagina elk onderdeel uit.",
  appleKeys: () => [
    "Apples pagina is een momentopname: die vertelt je hoe het nu is, nooit hoe lang een aanvulling beschikbaar bleef of wanneer de vorige was.",
    `Onze checks liggen per winkel ${SPEED.checkSec} seconden uit elkaar en nooit dichter op elkaar dan ${SPEED.fastSec} seconden; een script dat apple.com harder pollt, wordt geblokkeerd en leert niets.`,
  ],
  methodLead: (x: ApiView) => `Elk cijfer komt van PickupChecker, dat Apples eigen beschikbaarheid voor ophalen in de winkel leest voor ${storesPhrase(x)}, elke ${SPEED.checkSec} seconden (elke ${SPEED.fastSec} seconden bij winkels met alerts). Een wijziging wordt pas vastgelegd na twee overeenkomende waarnemingen; de eerste waarneming na een onderbreking is geen aanvulling. De API serveert dezelfde tabellen die de pagina's op deze site lezen; niets is gesampled of geschat.`,
  methodKeys: () => ["De volledige methode: de pagina over hoe het werkt.", "Bronvermelding is de hele prijs; een link terug houdt dit gratis."],
  faq: (x: ApiView): Faq[] => [
    { q: `Is er een gratis API voor de voorraad van de iPhone Duo in Apple Stores ${inC(x.c)}?`, a: `Ja — die van PickupChecker, op https://pickupchecker.com/api/v1/${x.c.cc}/stock: elke Apple Store ${inC(x.c)} met de configuraties die hij nu te koop heeft om op te halen, JSON, geen sleutel, 30 seconden gecachet. Een tweede endpoint geeft de bevestigde aanvullingen van de afgelopen 24 uur.` },
    { q: "Heeft Apple een officiële voorraad-API?", a: "Geen openbare. De ophaalpagina van apple.com is per winkel en configuratie te lezen, en dat doet deze site met zorg (rotatie, bevestiging, tijdzones); de API hier is dat werk als JSON." },
    { q: "Hoe actueel is de data?", a: `Elke winkel wordt elke ${SPEED.checkSec} seconden gecheckt (elke ${SPEED.fastSec} seconden bij winkels met alerts) en het API-antwoord wordt 30 seconden gecachet, dus een cijfer is hooguit zo'n 45 seconden oud; last_checked_at vertelt het je precies.` },
    { q: "Mag ik hem in een commercieel product gebruiken?", a: "Ja, met bronvermelding: “Bron: PickupChecker” met een link naar pickupchecker.com overal waar de data wordt getoond, en een pollinterval van 30 seconden of langer. Er is geen sleutel nodig." },
    { q: "Krijg ik met een script sneller een iPhone Duo dan met een alert?", a: `Nee: een script ziet een aanvulling bij de volgende poll, tot 30 seconden later; de alert bevestigt hem en gaat zo'n ${SPEED.alertSec} seconden nadat we hem zien de deur uit. Gebruik het script om te volgen en de alert om te kopen.` },
  ],
  sources: { pickup: "Apple – Ophalen in de winkel", method: "PickupChecker – zo werken de checks", log: "PickupChecker – het voorraadlogboek" },
  ld: (x: ApiView) => ({
    description: `Gratis JSON-API voor de ophaalbeschikbaarheid van de iPhone Duo bij ${storesPhrase(x)}: actuele voorraad per winkel en configuratie, bevestigde aanvullingen van de afgelopen 24 uur.`,
  }),
  related: "Lees verder",
  sameData: "Dezelfde data, andere vragen",
  otherCountries: "Deze pagina voor andere landen",
  questions: { alerts: "Snelste manier om een melding te krijgen", howItWorks: "Zo werken de checks", restockTimes: "Wanneer vult Apple de iPhone Duo aan?", shortage: "Neemt het tekort af?", configs: "Welke configuratie is het makkelijkst te krijgen?", stockChecker: "iPhone Duo-voorraadchecker" },
  setUpAlert: "Alerts instellen",
  tryIt: "Open de live JSON",
  faqTitle: "Vragen die mensen stellen",
  onThisPage: "Op deze pagina",
};

export const decide: DecideDict = { configs, supply, channels, api };
