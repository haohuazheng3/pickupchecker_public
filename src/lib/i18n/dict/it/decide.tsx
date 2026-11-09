/**
 * Italian strings of the four decision pages (seo.md §16): which configuration is easiest to get, is the shortage
 * easing, Apple vs carriers vs retailers, and the public API. Same keys, parameters and shapes as ../en/decide.tsx
 * (the type checker enforces it); one answer-first sentence under every question, every number from
 * lib/content/duoDecide.ts (and channels.ts). Labels (configuration, colour, store) arrive already in Italian through
 * the view; country names come from countryLabel via ./util. Model names, storage sizes, brands, URLs and JSON field
 * names stay as they are; check intervals are only ever 15 s and 5 s (tests/i18n-copy.test.ts).
 */
import type { Country, CountryCode } from "@/lib/apple/countries";
import type { DuoSupply } from "@/lib/content/duoDecide";
import { exposureHours } from "@/lib/content/duoDecide";
import { fitTitleW, list, num, pct } from "@/lib/i18n/format";
import { SPEED } from "@/lib/plans";
import type { ChannelsView, DecideCtx, DecideDict, WorldRow } from "../en/decide";
import { cap, dei, giorno, giornoLungo, il, ilData, inPaese, paese, pl } from "./util";

const L = "it" as const;

/* ---------------------------------------------------------------- numbers, dates, durations */

const n = (x: number) => num(L, x);
/** Whole-percent share of 0–1; under half a percent "<1%", never a misleading "0%". */
const pc = (x: number) => (x > 0 && x < 0.005 ? "<1%" : pct(L, Math.round(x * 100)));
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.round(Math.abs(x) * 100)}%`;
/** "29 ottobre 2026". */
const longDate = giornoLungo;
/** "gio 29 ott". */
const dateLabel = (ymd: string) => giorno(ymd);
/** "dal 29 ottobre 2026" / "dall'8 novembre 2026". */
const dal = (ymd: string) => { const s = longDate(ymd); return /^(1|8|11) /.test(s) ? `dall'${s}` : `dal ${s}`; };
/** "38,4 h" of listing time, "41 min" under an hour. */
const hours = (sec: number) => (sec >= 3600 ? `${n(exposureHours(sec))} h` : `${Math.max(1, Math.round(sec / 60))} min`);
const secs = (s: number) => (s >= 120 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`);
const ratio = (a: number, b: number) => (b > 0 ? `${n(Math.round((a / b) * 10) / 10)}×` : "—");
/** "a, b e c"; beyond `max` the first `max` and "altri N". */
const words = (items: string[], max = 6) => list(L, items, max, (k) => `altri ${n(k)}`);
/** Weekly restocks per store, one decimal, Italian comma. */
const perStore7 = (r: { perStoreDay: number }) => n(Math.round(r.perStoreDay * 70) / 10);

/** Singular/plural label pair. en/decide.tsx infers its English literals as the return type, so an Italian pair
 *  is passed through `never` (the shape, (one: boolean) => string, is what the views rely on). */
const byOne = (one1: string, many: string) => ((one: boolean) => (one ? one1 : many)) as never;

/* ---------------------------------------------------------------- counts with their nouns */

const stores = (k: number) => pl(k, "negozio", "negozi");
const restocks = (k: number) => pl(k, "rifornimento", "rifornimenti");
const confirmed = (k: number) => pl(k, "rifornimento confermato", "rifornimenti confermati");
const days = (k: number) => pl(k, "giorno", "giorni");
const alerts = (k: number) => pl(k, "avviso", "avvisi");
/** "1 Apple Store" / "17 Apple Store" (invariable in Italian). */
const appleStores = (k: number) => `${n(k)} Apple Store`;
/** "lo ha" / "lo hanno" after a store count. */
const loHa = (k: number) => (k === 1 ? "lo ha" : "lo hanno");

/* ---------------------------------------------------------------- places and articles */

const where = (c: Country) => ` ${inPaese(c.cc)}`;
/** "l'unico Apple Store in Italia" / "tutti i 17 Apple Store in Italia" (noun phrase, after "per", "di", "su"). */
const storesPhrase = (x: DecideCtx) => (x.one ? `l'unico Apple Store ${inPaese(x.c.cc)}` : `tutti i ${n(x.stores)} Apple Store ${inPaese(x.c.cc)}`);
/** "nell'unico Apple Store in Italia" / "in tutti i 17 Apple Store in Italia". */
const inStores = (x: DecideCtx) => (x.one ? `nell'unico Apple Store ${inPaese(x.c.cc)}` : `in tutti i ${n(x.stores)} Apple Store ${inPaese(x.c.cc)}`);
/** Storage keys with their article: "il 512GB", "l'1TB". */
const ilCap = (key: string) => `${/^1\D/.test(key) ? "l'" : "il "}${key}`;
const sul = (key: string) => (/^1\D/.test(key) ? `sull'${key}` : `sul ${key}`);
/** A configuration as a sentence subject: "il 512GB Cielo notturno", "l'1TB Cielo notturno". */
const ilCfg = (x: DecideCtx, r: { storage: string; color: string }) => `${/^1\D/.test(r.storage) ? "l'" : "il "}${x.cfg(r)}`;
const IlCfg = (x: DecideCtx, r: { storage: string; color: string }) => cap(ilCfg(x, r));
/** A country as the subject of a sentence, with its article; `plural` where the verb must agree ("gli Stati Uniti hanno"). */
const SOGGETTO: Record<CountryCode, { name: string; plural?: boolean }> = {
  us: { name: "gli Stati Uniti", plural: true }, ca: { name: "il Canada" }, au: { name: "l'Australia" }, uk: { name: "il Regno Unito" },
  de: { name: "la Germania" }, fr: { name: "la Francia" }, it: { name: "l'Italia" }, es: { name: "la Spagna" }, jp: { name: "il Giappone" },
  sg: { name: "Singapore" }, hk: { name: "Hong Kong" }, ae: { name: "gli Emirati Arabi Uniti", plural: true }, ch: { name: "la Svizzera" },
  nl: { name: "i Paesi Bassi", plural: true }, se: { name: "la Svezia" }, at: { name: "l'Austria" }, be: { name: "il Belgio" },
  kr: { name: "la Corea del Sud" }, tw: { name: "Taiwan" },
};
const soggetto = (r: Pick<WorldRow, "cc" | "name">) => SOGGETTO[r.cc as CountryCode]?.name ?? r.name;
const haAvuto = (cc: string) => (SOGGETTO[cc as CountryCode]?.plural ? "hanno avuto" : "ha avuto");
const sta = (cc: string) => (SOGGETTO[cc as CountryCode]?.plural ? "sono" : "è");

/* ---------------------------------------------------------------- supply words */

/** "più" / "meno" / "circa altrettanti" (before "rifornimenti"). */
const trendWord = (d: DuoSupply) => (d.trend === "up" ? "più" : d.trend === "down" ? "meno" : "circa altrettanti");
/** The week's verdict as a label: "In aumento" / "In calo" / "Stabili". */
const trendLabel = (d: DuoSupply) => (d.trend === "up" ? "In aumento" : d.trend === "down" ? "In calo" : "Stabili");
/** "1 negozio ne ha" / "3 negozi ne hanno" (one listed right now). */
const neHa = (k: number) => (k === 1 ? "1 negozio ne ha" : `${n(k)} negozi ne hanno`);

/* ---------------------------------------------------------------- channels: returns and carrier locks */

/** What resale lacks: "nessun diritto di reso (da Apple hai 14 giorni)", Hong Kong's no-returns rule, or the neutral phrase. */
const noReturn = (days: number | null) =>
  days ? `nessun diritto di reso (da Apple hai ${n(days)} giorni)`
    : days === 0 ? "nessun diritto di reso (e lì nemmeno Apple accetta resi per cambio di idea: solo sostituzioni per difetti)"
      : "nessun diritto di reso";
/** channels.ts carrierLock, sentence by sentence in Italian (the data file keeps the sourced English). */
const LOCK_IT: Partial<Record<CountryCode, string>> = {
  us: "Sbloccato se acquistato da Apple; con il finanziamento di AT&T, T-Mobile o Verizon l'iPhone resta vincolato a quell'operatore finché non è pagato per intero.",
  ca: "Dal 1º dicembre 2017 il Wireless Code del CRTC impone che ogni telefono nuovo venduto in Canada, anche dagli operatori, sia sbloccato.",
  uk: "Dal dicembre 2021 Ofcom vieta agli operatori britannici di vendere telefoni bloccati, quindi anche gli iPhone presi dall'operatore arrivano sbloccati.",
  au: "Gli iPhone in abbonamento di Telstra, Optus e Vodafone sono venduti sbloccati; solo alcuni telefoni prepagati sono vincolati alla rete.",
  de: "Apple e i principali operatori tedeschi (Telekom, Vodafone, O2) vendono gli iPhone senza blocco SIM; solo alcune offerte prepagate sono bloccate.",
  fr: "Gli operatori francesi vendono ormai quasi tutti i telefoni sbloccati (Free Mobile non applica mai il blocco SIM); un eventuale blocco va rimosso gratis dopo 3 mesi.",
  it: "Apple vende l'iPhone in Italia senza vincolarlo ad alcun operatore (sbloccato); lo stato di blocco degli esemplari finanziati dagli operatori non è verificato.",
  es: "Apple vende l'iPhone «libre» (sbloccato) in Spagna; lo stato di blocco degli esemplari finanziati dagli operatori non è verificato.",
  jp: "Dall'ottobre 2021 le linee guida del MIC giapponese vietano agli operatori il blocco SIM sui telefoni nuovi, quindi gli iPhone degli operatori arrivano sbloccati.",
  kr: "Apple vende in Corea del Sud iPhone non attivati e sbloccati; lo stato di blocco degli esemplari venduti dagli operatori non è verificato.",
  hk: "Apple vende l'iPhone sbloccato a Hong Kong; lo stato di blocco degli esemplari venduti dagli operatori non è verificato.",
  sg: "La politica «No SIM-Lock» dell'IMDA vieta agli operatori di bloccare la SIM dei telefoni venduti a Singapore.",
  ae: "Apple vende l'iPhone sbloccato negli Emirati Arabi Uniti; lo stato di blocco degli esemplari venduti dagli operatori non è verificato.",
  ch: "Apple vende l'iPhone senza blocco SIM in Svizzera; lo stato di blocco degli esemplari venduti dagli operatori non è verificato.",
  nl: "Apple vende l'iPhone senza simlock nei Paesi Bassi; lo stato di blocco degli esemplari venduti dagli operatori non è verificato.",
  se: "Apple vende l'iPhone sbloccato in Svezia; lo stato di blocco degli esemplari venduti dagli operatori non è verificato.",
  tw: "Apple vende l'iPhone sbloccato a Taiwan; lo stato di blocco degli esemplari venduti dagli operatori non è verificato.",
  at: "Apple vende l'iPhone senza blocco SIM in Austria; lo stato di blocco degli esemplari venduti dagli operatori non è verificato.",
  be: "Apple vende l'iPhone sbloccato in Belgio; lo stato di blocco degli esemplari venduti dagli operatori non è verificato.",
};
/** The country's carrier-lock sentence in Italian, else the given fallback (English only if a country has no translation yet). */
const lock = (x: ChannelsView, fallback: string) => (x.ch.carrierLock ? LOCK_IT[x.c.cc] ?? x.ch.carrierLock : fallback);

/* ================================================================== which configuration is easiest to get */
const configs: DecideDict["configs"] = {
  crumb: "Quale configurazione?",
  title: (c) => fitTitleW([
    `Quale iPhone Duo torna disponibile più spesso ${inPaese(c.cc)}? Capacità e colore`,
    `Quale iPhone Duo torna disponibile più spesso ${inPaese(c.cc)}?`,
    "Quale iPhone Duo torna disponibile più spesso?",
  ], 49),
  metaDescription: (x) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    return e && h
      ? fitTitleW([
        `${IlCfg(x, e)} è l'iPhone Duo rimasto in vendita più a lungo${where(x.c)}: ${n(e.restocks)} ${dei(d.n)} rifornimenti confermati in ${appleStores(x.stores)} e ${hours(e.exposureSec)} di disponibilità complessiva ${dal(d.since)}; ${ilCfg(x, h)} meno di tutti (${n(h.restocks)}). Tutte le configurazioni in classifica, per capacità e colore, aggiornate a ogni rifornimento.`,
        `${IlCfg(x, e)} è l'iPhone Duo rimasto in vendita più a lungo${where(x.c)} (${n(e.restocks)} rifornimenti su ${n(d.n)} ${dal(d.since)}); ${ilCfg(x, h)} meno di tutti. Tutte le configurazioni in classifica per capacità e colore.`,
      ], 160)
      : `Tutte le configurazioni di iPhone Duo in classifica per rifornimenti confermati negli Apple Store${where(x.c)} ${dal(d.since)}: capacità, colore, durata della disponibilità e cosa c'è adesso.`;
  },
  h1: (x) => `Quale configurazione di iPhone Duo torna disponibile più spesso${where(x.c)}, e quale resta in vendita più a lungo?`,
  intro: (x) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    if (!e) return `PickupChecker ha confermato ${pl(d.n, "rifornimento di iPhone Duo", "rifornimenti di iPhone Duo")} ${inStores(x)} ${dal(d.since)}: troppo pochi per mettere in classifica le configurazioni. La tabella qui sotto si riempie a ogni rifornimento; la pagina degli Stati Uniti mostra già lo schema.`;
    const st = d.byStorage, co = d.byColor;
    const last = st[st.length - 1];
    const storage = st.length > 1
      ? ` La capacità divide il conteggio più del colore: ${last.restocks > 0 ? `i modelli da ${st[0].key} hanno avuto ${ratio(st[0].restocks, last.restocks)} i rifornimenti di quelli da ${last.key}` : `i modelli da ${st[0].key} hanno raccolto ${il(pc(st[0].share))} dei rifornimenti, mentre ${ilCap(last.key)} non è mai stato rifornito`}${co.length > 1 ? `, mentre ${x.colour(co[0].key)} ha superato ${x.colour(co[1].key)} di appena ${Math.abs(Math.round((co[0].share - co[1].share) * 100))} punti` : ""}.`
      : "";
    return `${IlCfg(x, e)} è la configurazione di iPhone Duo rimasta disponibile più a lungo${where(x.c)}: ${hours(e.exposureSec)} in totale su ${n(e.restocks)} ${dei(d.n)} rifornimenti che PickupChecker ha confermato ${inStores(x)} ${dal(d.since)}, in ${stores(e.stores)}${e.lifetimes ? `, con una mediana di ${secs(e.lifetimes.medianSec)} ciascuno` : ""}. ${h ? `${IlCfg(x, h)} è quella rimasta disponibile meno: ${restocks(h.restocks)} e ${hours(h.exposureSec)} di disponibilità.` : ""}${storage} Nessuno può dire quale riuscirai a comprare; si possono misurare le finestre di ritiro passate, ed è quello che questa pagina mette in classifica.`;
  },
  updated: (x, stamp) => `Aggiornato ${stamp} · dati ${dal(x.d.since)} · ${appleStores(x.stores)} · controllo ogni ${SPEED.checkSec} s (negozi con avvisi ogni ${SPEED.fastSec} s)`,
  nav: { easiest: "Disponibile più a lungo", storage: "Capacità", colour: "Colore", shelf: "Tempo per prenderlo", week: "Questa settimana", alerts: "Cosa monitorare", method: "Come contiamo" },
  h2: (x) => ({
    easiest: `Quale configurazione di iPhone Duo è rimasta disponibile più a lungo${where(x.c)}?`,
    storage: "La capacità cambia quanto spesso torna disponibile?",
    colour: `${x.d.byColor.length > 1 ? `${x.colour(x.d.byColor[0].key)} o ${x.colour(x.d.byColor[1].key)}` : "Quale colore"}: quale colore torna disponibile più spesso?`,
    shelf: "Quale configurazione ti lascia più tempo per prenderla?",
    week: "Cosa è cambiato negli ultimi sette giorni?",
    alerts: "Per quali configurazioni impostare gli avvisi?",
    method: "Come contiamo un rifornimento e la durata della disponibilità",
  }),
  hero: {
    restocks: (label) => `rifornimenti confermati di ${label}`,
    exposure: "ore di disponibilità, sommando tutti i negozi",
    now: byOne("lo ha disponibile adesso", "negozi che lo hanno disponibile adesso"),
    median: "secondi di durata (mediana)",
    total: "rifornimenti di tutte le configurazioni",
  },
  easiestLead: (x) => {
    const e = x.d.easiest!;
    return `${IlCfg(x, e)} è in testa su entrambi i fronti misurabili: è tornato disponibile più spesso (${n(e.restocks)} rifornimenti, ${il(pc(e.restocks / x.d.n))} del totale) ed è rimasto disponibile più a lungo in totale (${hours(e.exposureSec)}), cioè il tempo in cui si poteva prenotare un ritiro. ${e.nowStores > 0 ? `${stores(e.nowStores)} ${loHa(e.nowStores)} disponibile mentre leggi.` : "Nessun negozio lo ha disponibile mentre leggi; il prossimo rifornimento compare qui entro pochi secondi."}`;
  },
  easiestKeys: (x) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      `Le prime tre per tempo di disponibilità: ${words(top3.map((r) => `${x.cfg(r)} (${hours(r.exposureSec)})`))}.`,
      d.never.length ? `Mai rifornite${where(x.c)} ${dal(d.since)}: ${words(d.never.map((r) => x.cfg(r)))}.` : `Ogni configurazione è stata rifornita almeno una volta ${dal(d.since)}.`,
      d.lifetimes ? `Su tutte le configurazioni un rifornimento è rimasto disponibile per una mediana di ${secs(d.lifetimes.medianSec)}; ${il(pc(d.lifetimes.within2min))} è sparito entro 2 minuti.` : "La durata della disponibilità compare quando dieci rifornimenti hanno una fine nota.",
    ];
  },
  rankCaption: (x) => `Tutte le configurazioni di iPhone Duo${where(x.c)}, prima quelle con più tempo di disponibilità · ${dal(x.d.since)} a oggi`,
  rankHead: ["Configurazione", "Rifornimenti", "Negozi", "Disponibile in totale", "Durata (mediana)", "Disponibile ora", "Ultimo rifornimento"],
  none: "ancora nessuno",
  storageLead: (x) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return "Le capacità vengono confrontate man mano che arrivano i rifornimenti; la tabella qui sotto è in tempo reale.";
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return `Sì, più di qualsiasi altra cosa: ${ilCap(st[0].key)} ha raccolto ${il(pc(st[0].share))} dei rifornimenti e ${ilCap(st[1].key)} ${il(pc(st[1].share))}${big ? `, mentre i modelli da 1TB e 2TB insieme ${il(pc(big / x.d.n))}` : ""}. Apple spedisce soprattutto le capacità che la maggior parte delle persone ordina; sono anche quelle di cui un negozio riceve più pezzi in una sola consegna.`;
  },
  groupCaption: (what) => `Rifornimenti per ${what === "storage" ? "capacità" : "colore"}, sommando tutti i negozi`,
  groupHead: (what) => [what === "Storage" ? "Capacità" : "Colore", "Rifornimenti", "Quota", "Negozi", "Disponibile in totale", "Durata (mediana)", "Disponibile ora"],
  storageSwaps: (x) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: `Un avviso solo ${sul(last)}`, yes: `Prima ${ilCap(top)}, e anche ${ilCap(last)}`, why: `${cap(ilCap(last))} è stato rifornito ${il(pc(st[st.length - 1].share))} delle volte; ${ilCap(top)} ${il(pc(st[0].share))}. I due avvisi costano uno slot ciascuno.` },
      { no: "Aspettare la capacità esatta", yes: `Prendere ${ilCap(top)} o ${ilCap(second)} quando arriva`, why: `Insieme hanno raccolto ${il(pc(st[0].share + st[1].share))} di tutti i rifornimenti${where(x.c)}; con una custodia e iCloud la capacità conta meno dell'attesa.` },
    ];
  },
  colourLead: (x) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return "I colori vengono confrontati man mano che arrivano i rifornimenti.";
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return `${x.colour(co[0].key)}, ma di poco: ${il(pc(co[0].share))} dei rifornimenti contro ${il(pc(co[1].share))} per ${x.colour(co[1].key)}, uno scarto di ${n(gap)} punti${co[0].medianSec && co[1].medianSec ? `; sono rimasti disponibili per una mediana di ${secs(co[0].medianSec)} e ${secs(co[1].medianSec)}` : ""}. Il colore sposta il conteggio meno della capacità. Seguire anche un secondo colore aggiunge le sue finestre di ritiro alle tue: ${co[1].restocks > 0 ? `${x.colour(co[1].key)} ha aggiunto ${restocks(co[1].restocks)} e ${hours(co[1].exposureSec)} di disponibilità${where(x.c)} ${dal(x.d.since)}, in aggiunta a ${restocks(co[0].restocks)} (${hours(co[0].exposureSec)}) di ${x.colour(co[0].key)} (tutte le capacità)` : `${x.colour(co[1].key)} non è tornato disponibile${where(x.c)} ${dal(x.d.since)}, quindi finora non avrebbe aggiunto nulla`}.`;
  },
  colourKeys: (x) => x.d.byColor.map((g) => `${x.colour(g.key)}: ${n(g.restocks)} rifornimenti in ${stores(g.stores)}, ${hours(g.exposureSec)} di disponibilità in totale${g.nowStores ? `, ${stores(g.nowStores)} ${loHa(g.nowStores)} disponibile adesso` : ""}.`),
  shelfLead: (x) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return "La durata di un rifornimento si misura dal rifornimento al controllo successivo che lo vede esaurito; i primi dati compaiono quando dieci rifornimenti di una configurazione si sono conclusi.";
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return `${IlCfg(x, slow)} ti lascia più tempo: una mediana di ${secs(slow.lifetimes!.medianSec)} di disponibilità prima di esaurirsi, contro ${secs(fast.lifetimes!.medianSec)} per ${ilCfg(x, fast)}. A vendersi più lentamente sono le capacità costose, perché le vogliono in meno, quindi «più tempo per prenderlo» e «più rifornimenti» indicano configurazioni diverse, e la classifica qui sopra pesa entrambe le cose.`;
  },
  shelfCaption: "Durata della disponibilità per configurazione (dal rifornimento al controllo successivo che lo vede esaurito)",
  shelfHead: ["Configurazione", "Rifornimenti con fine nota", "Mediana", "Spariti entro 2 min", "Spariti entro 20 min", "Il più rapido"],
  shelfKeys: (x) => [
    `Metà dei rifornimenti era già esaurita entro ${x.d.lifetimes ? secs(x.d.lifetimes.medianSec) : "circa un minuto"}; il nostro avviso parte circa ${SPEED.alertSec} s dopo la nostra conferma, e quanto resta della disponibilità dipende poi dal tuo telefono e da un checkout già pronto.`,
    `La durata è un limite superiore: vediamo l'esaurimento al controllo successivo, fino a ${SPEED.checkSec} s dopo (${SPEED.fastSec} s nei negozi con avvisi).`,
    "«Esaurito» qui significa che la pagina di ritiro di Apple ha smesso di mostrare la configurazione in quel negozio; quanti pezzi fossero, Apple non lo dice.",
  ],
  weekLead: (x) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return `Nessun rifornimento negli ultimi quattordici giorni${where(x.c)}; la tabella settimana per settimana parte dal prossimo.`;
    const lead = rows[0];
    return `${cap(restocks(tot7))} negli ultimi sette giorni${totP ? ` contro ${n(totP)} della settimana prima (${signed(tot7 / totP - 1)})` : ""}, in testa ${ilCfg(x, lead)} con ${n(lead.last7)}. ${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `È una configurazione diversa dalla prima in classifica assoluta (${x.cfg(x.d.easiest)}): il mix cambia a ogni consegna, quindi guarda questa tabella prima di scegliere su cosa impostare gli avvisi.` : "La prima in classifica assoluta è in testa anche questa settimana."}`;
  },
  weekCaption: "Rifornimenti per configurazione: ultimi 7 giorni contro i 7 precedenti",
  weekHead: ["Configurazione", "Ultimi 7 giorni", "7 giorni precedenti", "Variazione"],
  alertsLead: (x) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? `Imposta gli avvisi su ${words(top.map((r) => x.cfg(r)))} nei due o tre negozi che raggiungi più in fretta: coprono ${il(pc(top.reduce((a, r) => a + r.restocks, 0) / x.d.n))} dei rifornimenti finora${where(x.c)}. Aggiungi come quarto avviso la configurazione esatta che vuoi, e prendi quella che arriva prima.`
      : `Finché non arrivano rifornimenti${where(x.c)}, imposta gli avvisi sulla capacità che vuoi in entrambi i colori nei negozi più vicini a te.`;
  },
  alertsKeys: (x) => [
    `Gli avvisi sono per negozio × configurazione, quindi tre negozi × tre configurazioni fanno ${alerts(9)}.`,
    `Controlliamo i negozi con avvisi ogni ${SPEED.fastSec} s e confermiamo il rifornimento prima di inviare la notifica; la notifica parte circa ${SPEED.alertSec} s dopo, e quando il banner compare sul tuo telefono dipende dal dispositivo e dalla sua connessione: questo non lo misuriamo.`,
    x.one ? "Il negozio più attivo è anche quello che più persone tengono d'occhio." : "Scegli i negozi per distanza, non per numero di rifornimenti: il negozio più attivo è anche quello che più persone tengono d'occhio.",
  ],
  methodLead: "Un rifornimento è una configurazione che passa da esaurita a disponibile in un negozio, confermato da due controlli concordanti; le prime apparizioni dopo un'interruzione del monitoraggio non vengono contate. La durata della disponibilità va dal rifornimento al primo controllo che la vede di nuovo esaurita, quindi è un limite superiore. «Disponibile in totale» somma quei tempi su tutti i rifornimenti della configurazione: la misura più semplice di quanto a lungo si poteva prenotare un ritiro. È un registro delle disponibilità passate, non una probabilità di acquisto né un numero di pezzi venduti: Apple non pubblica né l'una né l'altro.",
  methodKeys: (x) => [
    `Fonte: la disponibilità per il ritiro pubblicata da Apple per ${storesPhrase(x)}, letta ogni ${SPEED.checkSec} s per negozio (${SPEED.fastSec} s nei negozi con avvisi) ${dal(x.d.since)}.`,
    "I negozi che lo hanno disponibile ora e gli orari dell'ultimo rifornimento sono in tempo reale; tutto il resto viene ricalcolato entro cinque minuti.",
    "Cita liberamente con un link: le cifre cambiano, quindi indica la data in cui le hai lette.",
  ],
  faq: (x) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor;
    return [
      { q: `Quale iPhone Duo è più facile trovare${where(x.c)}?`, a: e ? `Nessuno può dirti quale riuscirai a comprare: Apple non pubblica né le sue assegnazioni né quante persone ci stanno provando. Quello che si può misurare sono le finestre di ritiro passate. ${cap(dal(d.since))} ${ilCfg(x, e)} è rimasto disponibile più a lungo in totale (${hours(e.exposureSec)} su ${restocks(e.restocks)} in ${appleStores(e.stores)})${h ? `, ${ilCfg(x, h)} meno di tutti (${hours(h.exposureSec)} su ${restocks(h.restocks)})` : ""}, su ${confirmed(d.n)} in ${storesPhrase(x)}. È un registro delle disponibilità passate, non una previsione per te; per vedere quale modifica aggiunge più finestre alle tue scelte — un altro colore, un altro negozio — apri «Cosa aggiunge più finestre di ritiro?» nell'editor degli avvisi.` : `Troppo pochi rifornimenti confermati${where(x.c)} per dirlo; questa pagina mette in classifica ogni configurazione appena arrivano.` },
      { q: `${co.length > 1 ? x.colour(co[1].key) : "Un colore"} è più difficile da trovare ${co.length > 1 ? `di ${x.colour(co[0].key)}` : "dell'altro"}?`, a: co.length > 1 && d.n ? `Leggermente: ${x.colour(co[0].key)} ha fatto ${il(pc(co[0].share))} dei rifornimenti e ${x.colour(co[1].key)} ${il(pc(co[1].share))}. La differenza tra le capacità è molto più grande, quindi scegli prima la capacità e imposta gli avvisi su entrambi i suoi colori.` : "I colori vengono confrontati man mano che arrivano i rifornimenti." },
      { q: `L'iPhone Duo da 1TB o 2TB è mai disponibile${where(x.c)}?`, a: (() => { const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage)); const bn = big.reduce((a, r) => a + r.restocks, 0); const most = Math.max(0, ...big.map((r) => r.stores)); return bn ? `Sì, ma di rado: ${restocks(bn)} dei modelli da 1TB e 2TB su ${n(d.n)} (${pc(bn / d.n)}), ${most ? `in al massimo ${stores(most)}` : "in nessun negozio"}. Quando compare resta disponibile più a lungo (meno acquirenti), quindi un avviso vale uno slot anche se scatta di rado.` : `Non ancora nei nostri dati${where(x.c)}: nessun rifornimento confermato di un modello da 1TB o 2TB ${dal(d.since)}.`; })() },
      { q: "Conviene impostare gli avvisi su una configurazione o su più d'una?", a: `Su più d'una, in pochi negozi: le prime tre configurazioni hanno raccolto ${d.n ? il(pc(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n)) : "la maggior parte"} dei rifornimenti${where(x.c)}. Tre configurazioni in tre negozi vicini fanno nove avvisi, che rientrano in un piano Plus; aggiungi come quarto quella esatta che vuoi.` },
      { q: "Il mix è lo stesso negli altri paesi?", a: `Non sempre: ogni paese riceve la sua quota e la classifica della sua pagina può essere diversa. I link sotto «Altri paesi» aprono la stessa pagina per gli altri 18 paesi seguiti da PickupChecker; la pagina degli Stati Uniti ha la serie più lunga (${dal("2026-10-29")}).` },
    ];
  },
  sources: { apple: "Apple – Configurazioni e prezzi dell'iPhone Duo", pickup: "Apple – Ritiro in negozio", log: "PickupChecker – il registro dei rifornimenti da cui è calcolata questa pagina" },
  ld: (x) => ({
    datasetName: `Rifornimenti di iPhone Duo per configurazione, Apple Store${where(x.c)}`,
    description: `Rifornimenti confermati di iPhone Duo ${inStores(x)} ${dal(x.d.since)}, per configurazione (capacità × colore): numero, negozi, tempo di disponibilità complessivo, durata mediana, negozi che lo hanno disponibile ora.`,
    measured: ["rifornimenti per configurazione", "negozi con almeno un rifornimento", "tempo di disponibilità in secondi", "durata mediana della disponibilità", "negozi che lo hanno disponibile ora"],
  }),
  related: "Continua a leggere",
  sameData: "Stessi dati, altre domande",
  otherCountries: "Altri paesi",
  questions: { restockTimes: "Quando torna disponibile l'iPhone Duo?", sellOut: "In quanto tempo si esaurisce un rifornimento?", shortage: "La carenza si sta attenuando?", channels: "Apple, operatore o rivenditore?", alerts: "Il modo più rapido per ricevere una notifica", api: "L'API gratuita della disponibilità" },
  setUpAlert: "Imposta gli avvisi",
  logLive: "Registro dei rifornimenti, in tempo reale",
  faqTitle: "Le domande più frequenti",
  onThisPage: "In questa pagina",
};

/* ================================================================== is the shortage easing */
const supply: DecideDict["supply"] = {
  crumb: "La carenza si sta attenuando?",
  title: (c) => fitTitleW([
    `La carenza di iPhone Duo si sta attenuando ${inPaese(c.cc)}? Trend settimanale`,
    `La carenza di iPhone Duo si sta attenuando ${inPaese(c.cc)}?`,
    `Carenza iPhone Duo ${inPaese(c.cc)}: si sta attenuando?`,
    "La carenza di iPhone Duo si sta attenuando?",
  ], 49),
  metaDescription: (x) => {
    const { d } = x;
    const w = d.last7;
    return d.trend !== "insufficient"
      ? fitTitleW([
        `${cap(trendWord(d))} rifornimenti di iPhone Duo${where(x.c)} questa settimana: ${n(w.restocks)} in ${appleStores(w.stores)} in 7 giorni (${signed(d.change!)} rispetto alla settimana prima)${w.medianSec ? `, ognuno sparito in una mediana di ${secs(w.medianSec)}` : ""}. Offerta giorno per giorno, come si riconosce un'attenuazione e se conviene aspettare.`,
        `${n(w.restocks)} rifornimenti di iPhone Duo${where(x.c)} negli ultimi 7 giorni (${signed(d.change!)} settimana su settimana). Offerta giorno per giorno e se la carenza si sta attenuando.`,
      ], 160)
      : `La carenza di iPhone Duo si sta attenuando${where(x.c)}? ${n(d.n)} rifornimenti confermati negli Apple Store ${dal(d.since)}, giorno per giorno, con come si riconosce un'attenuazione e se conviene aspettare o comprare subito.`;
  },
  h1: (x) => `La carenza di iPhone Duo${where(x.c)} si sta attenuando, e quanto durerà?`,
  intro: (x) => {
    const { d } = x;
    const w = d.last7;
    if (d.trend === "insufficient") {
      return `Troppo presto per dirlo${where(x.c)}: PickupChecker ha iniziato il monitoraggio ${ilData(longDate(d.since))}, ${days(d.days)} fa, quindi il primo confronto completo settimana su settimana compare ${ilData(longDate(d.comparableFrom))}. Finora ${confirmed(d.n)} in ${n(d.storesEver)} Apple Store su ${n(x.stores)}${d.lifetimes ? `, ognuno disponibile per una mediana di ${secs(d.lifetimes.medianSec)} prima di esaurirsi` : ""}; ${neHa(d.storesNow)} uno disponibile adesso. Nessuno può prevedere la fine della carenza; questa pagina mostra i due numeri che lo diranno per primi, rifornimenti a settimana e secondi di disponibilità, aggiornati a ogni rifornimento.`;
    }
    const verdict = d.trend === "up" ? "L'offerta sta migliorando" : d.trend === "down" ? "L'offerta si sta restringendo" : "L'offerta è stabile";
    const demand = w.medianSec ? (w.medianSec <= 120 ? `ma la domanda la assorbe ancora tutta: un rifornimento è durato una mediana di ${secs(w.medianSec)} questa settimana${d.prev7.medianSec ? ` (${secs(d.prev7.medianSec)} la settimana scorsa)` : ""}, quindi comprarne uno a mano non è ancora più facile` : `e la disponibilità dura più a lungo: una mediana di ${secs(w.medianSec)} questa settimana${d.prev7.medianSec ? ` contro ${secs(d.prev7.medianSec)} la settimana scorsa` : ""}, il primo segno di un'attenuazione`) : "";
    return `${verdict}${where(x.c)}: gli Apple Store hanno rifornito l'iPhone Duo ${n(w.restocks)} volte negli ultimi sette giorni, ${signed(d.change!)} rispetto alla settimana prima (${n(d.prev7.restocks)}), in ${stores(w.stores)} su ${n(x.stores)}${demand ? `, ${demand}` : ""}. ${cap(neHa(d.storesNow))} uno disponibile adesso. Nessuno può prevedere la fine; i due numeri che lo diranno per primi sono in questa pagina e si aggiornano a ogni rifornimento.`;
  },
  updated: (x, stamp) => `Aggiornato ${stamp} · dati ${dal(x.d.since)} · ${appleStores(x.stores)} · controllo ogni ${SPEED.checkSec} s`,
  nav: { trend: "Questa settimana", easier: "Più facile comprarlo?", stores: "Quanti negozi", howlong: "Quanto durerà", christmas: "Aspettare o comprare", world: "Altri paesi", method: "Come contiamo" },
  h2: (x) => ({
    trend: `I rifornimenti di iPhone Duo${where(x.c)} stanno aumentando o diminuendo?`,
    easier: "Sta diventando davvero più facile comprarne uno?",
    stores: `Quanti Apple Store${where(x.c)} hanno avuto almeno un iPhone Duo?`,
    howlong: "Quanto durerà la carenza di iPhone Duo?",
    christmas: "Continuo ad aspettare un rifornimento o compro in un altro modo?",
    world: `La carenza si sta attenuando più in fretta in altri paesi${x.us ? "" : ` che${where(x.c)}`}?`,
    method: "Come contiamo",
  }),
  weekBefore: "settimana prima",
  goneIn2: "spariti entro 2 minuti",
  storesEverLabel: byOne("rifornimenti confermati finora", "negozi con almeno un rifornimento"),
  hero: { last7: "rifornimenti, ultimi 7 giorni", change: "rispetto ai 7 giorni precedenti", stores: byOne("giorni con un rifornimento", "negozi riforniti, ultimi 7 giorni"), median: "secondi di durata (mediana), ultimi 7 giorni", now: byOne("ne ha uno disponibile adesso", "negozi che ne hanno uno disponibile adesso"), sinceLast: "ore dall'ultimo rifornimento" },
  trendLead: (x) => {
    const { d } = x;
    if (d.trend === "insufficient") return `La tabella giornaliera è tutta la serie finora: ${restocks(d.n)} in ${days(d.days)}. Una riga settimana su settimana compare ${ilData(longDate(d.comparableFrom))}; fino ad allora leggi la direzione giorno per giorno.`;
    const w = d.last7, p = d.prev7;
    const gap = w.longestGapHours != null ? ` L'intervallo più lungo tra due rifornimenti questa settimana è stato di ${n(w.longestGapHours)} ore${p.longestGapHours != null ? ` (${n(p.longestGapHours)} la settimana scorsa)` : ""}.` : "";
    return `${trendLabel(d)} questa settimana: ${n(w.restocks)} rifornimenti (${perStore7(w)} per negozio) contro ${n(p.restocks)} della settimana prima, ${signed(d.change!)}.${gap} I rifornimenti arrivano a ondate legate alle consegne, quindi un singolo giorno tranquillo dice poco; i totali su sette giorni sono quelli da guardare.`;
  },
  dailyCaption: (x) => `Rifornimenti confermati per giorno locale${where(x.c)}, dal più recente (ultimi 14 giorni)`,
  dailyHead: ["Giorno", "Rifornimenti", "Negozi", "Durata (mediana)"],
  trendKeys: (x) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? `Il giorno più intenso finora: ${dateLabel(best.date)} con ${restocks(best.restocks)} in ${stores(best.stores)}.` : "Ancora nessun rifornimento; il giorno più intenso comparirà qui.",
      x.d.sinceLastHours != null && x.d.latest ? `Ultimo rifornimento ${x.d.sinceLastHours < 1 ? "meno di un'ora" : `${n(x.d.sinceLastHours)} ore`} fa: ${x.storeName(x.d.latest.storeNumber)}, ${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}.` : "Ancora nessun rifornimento registrato.",
      `«In aumento» significa almeno il ${Math.round(0.15 * 100)}% di rifornimenti in più rispetto alla settimana prima; «in calo» almeno il ${Math.round(0.15 * 100)}% in meno; tutto quello che sta in mezzo si legge come stabile.`,
    ];
  },
  easierLead: (x) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return "Più facile vuol dire due cose insieme: più rifornimenti, e ognuno che resta disponibile più a lungo. La durata compare quando dieci rifornimenti nella finestra hanno una fine nota.";
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return `${longer ? "Leggermente, sì" : shorter ? "No, il contrario" : "Non ancora"}: un rifornimento è rimasto disponibile per una mediana di ${secs(w.medianSec)} questa settimana${p.medianSec ? ` contro ${secs(p.medianSec)} la settimana scorsa` : ""}, e ${il(pc(w.within2min!))} è sparito entro due minuti${p.within2min != null ? ` (${pc(p.within2min)} la settimana scorsa)` : ""}. Un'attenuazione si vede quando i due numeri si muovono insieme, più rifornimenti e durate più lunghe; più rifornimenti da soli significano che Apple spedisce di più mentre ad aspettare sono sempre in tanti.`;
  },
  easierKeys: (x) => [
    "Come si vedrà qui l'attenuazione: durata mediana oltre i 20 minuti, la maggior parte dei negozi con un Duo disponibile nello stesso momento, tempi di consegna su apple.com entro una settimana.",
    `Fino ad allora il modo per comprarne uno resta un avviso: confermiamo il rifornimento e inviamo la notifica circa ${SPEED.alertSec} s dopo, ben dentro la durata mediana.`,
    x.d.lifetimes ? `Dall'inizio del monitoraggio${where(x.c)}: ${n(x.d.lifetimes.n)} rifornimenti con fine nota, mediana ${secs(x.d.lifetimes.medianSec)}, ${il(pc(x.d.lifetimes.within2min))} sparito entro 2 minuti.` : "I dati complessivi sulla durata compaiono dopo dieci rifornimenti conclusi.",
  ],
  storesLead: (x) => {
    const { d } = x;
    const never = x.stores - d.storesEver;
    return x.one
      ? `${d.storesEver ? `Sì: l'unico Apple Store${where(x.c)} ha avuto ${confirmed(d.n)} ${dal(d.since)}` : `Non ancora: nessun rifornimento confermato nell'unico Apple Store${where(x.c)} ${dal(d.since)}`}${d.storesNow ? ", e ha un Duo disponibile adesso" : ""}.`
      : `${n(d.storesEver)} Apple Store su ${n(x.stores)}${where(x.c)} (${pc(d.storesEver / x.stores)}) hanno avuto almeno un rifornimento confermato di iPhone Duo ${dal(d.since)}${never ? `; ${stores(never)} ancora nessuno` : ""}. ${cap(neHa(d.storesNow))} uno disponibile adesso. L'offerta si distribuisce in modo disuguale: i negozi principali e quelli nei centri commerciali vengono riforniti di più, ed è per questo che il negozio che scegli per gli avvisi conta quanto la configurazione.`;
  },
  storesKeys: (x) => [
    `I negozi per numero di rifornimenti, con gli orari locali: la sezione «dove» della pagina sugli orari dei rifornimenti${where(x.c)}.`,
    "Un negozio che non è mai stato rifornito non è un negozio che Apple salta: le quote arrivano con le consegne, e diversi negozi hanno ricevuto il primo Duo solo nella seconda settimana.",
  ],
  howlongLead: (x) => `Nessuno fuori da Apple lo sa, e noi non facciamo previsioni. Quello che la serie mostra${where(x.c)}: ${restocks(x.d.n)} in ${days(x.d.days)}, ${x.d.trend === "insufficient" ? `un trend settimana su settimana ${dal(x.d.comparableFrom)}` : `${trendWord(x.d)} rifornimenti questa settimana rispetto alla scorsa`}, e durate ${x.d.last7.medianSec ? `intorno a ${secs(x.d.last7.medianSec)}` : "di pochi minuti al massimo"}. Una carenza finisce con una sequenza che puoi seguire qui: i rifornimenti a settimana salgono, le durate passano da secondi a ore, poi la maggior parte dei negozi ne ha uno disponibile nello stesso momento e i tempi di consegna su apple.com scendono a pochi giorni.`,
  howlongKeys: () => [
    "Segnale 1: i rifornimenti a settimana continuano a salire per due o tre settimane (la tabella qui sopra).",
    "Segnale 2: la durata mediana supera i 20 minuti, cioè i rifornimenti durano più delle persone che ricaricano la pagina.",
    "Segnale 3: i tempi di consegna su apple.com scendono entro una settimana e la maggior parte dei negozi ne ha uno disponibile nello stesso momento.",
    "Il lancio di nuovi colori o capacità azzera il conto; tieni l'avviso attivo fino al segnale 3.",
  ],
  christmasLead: (x) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Tieni l'avviso attivo e tieni in coda un ordine con consegna: entrambi, non uno solo. Al ritmo attuale (${perDay >= 1 ? `circa ${restocks(Math.round(perDay))} al giorno${where(x.c)}` : `meno di un rifornimento al giorno${where(x.c)}`}${w.medianSec ? `, ognuno disponibile per una mediana di ${secs(w.medianSec)}` : ""}) un negozio sorvegliato vicino a te arriva al suo turno entro pochi giorni, e la notifica di un rifornimento confermato parte circa ${SPEED.alertSec} s dopo che lo vediamo. Pagare un sovrapprezzo altrove ha senso solo se l'attesa in sé ti costa più della maggiorazione; il confronto tra canali lo valuta onestamente.`;
  },
  christmasKeys: () => [
    "Ordina prima la consegna su apple.com: ti tiene il posto e si può annullare quando il ritiro va a segno.",
    "Avvisi sulle due o tre configurazioni rifornite più spesso nei negozi più vicini a te (la pagina delle configurazioni dice quali).",
    "Tieni l'app Apple Store con l'accesso già fatto, il Duo nella borsa e una carta salvata: la disponibilità mediana è di circa un minuto.",
  ],
  worldLead: (x) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return "I rifornimenti settimanali per negozio di ogni paese verranno confrontati qui quando ognuno avrà una settimana completa di dati.";
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return `Negli ultimi sette giorni ${soggetto(top)} ${haAvuto(top.cc)} più rifornimenti per negozio (${perStore7(top)} per negozio), ${soggetto(bottom)} meno (${perStore7(bottom)})${mine ? `; ${soggetto({ cc: x.c.cc, name: paese(x.c.cc) })} ${sta(x.c.cc)} a ${perStore7(mine)}` : ""}. Le quote variano per paese e data di lancio, quindi un'attenuazione si vede in modo disuguale; la serie degli Stati Uniti è la più lunga.`;
  },
  worldCaption: "Ultimi 7 giorni per paese: rifornimenti, rifornimenti per negozio, durata mediana, negozi con un Duo disponibile adesso",
  worldHead: ["Paese", "Negozi", "Rifornimenti (7 g)", "Per negozio", "Durata (mediana)", "Disponibile ora"],
  methodLead: `Un rifornimento è una configurazione che passa da esaurita a disponibile in un negozio, confermato da due controlli concordanti a ${SPEED.checkSec} s di distanza (${SPEED.fastSec} s nei negozi con avvisi); le prime apparizioni dopo un'interruzione del monitoraggio non contano. I giorni sono quelli locali del negozio. La durata va dal rifornimento al primo controllo che lo vede di nuovo esaurito: un limite superiore, fino al controllo successivo. Le settimane sono gli ultimi sette giorni locali contro i sette precedenti; il confronto richiede che siano entrambe complete.`,
  methodKeys: (x) => [
    `Fonte: la disponibilità per il ritiro di Apple per ${storesPhrase(x)}, ${dal(x.d.since)}.`,
    "Tutto in questa pagina viene ricalcolato entro cinque minuti da un rifornimento; i negozi con un Duo disponibile adesso sono in tempo reale.",
    "Cita con un link e la data: sono numeri in movimento.",
  ],
  faq: (x) => {
    const { d } = x;
    const w = d.last7;
    return [
      { q: `Apple sta ancora rifornendo l'iPhone Duo${where(x.c)}?`, a: d.n ? `Sì: ${confirmed(w.restocks)} negli ultimi sette giorni in ${appleStores(w.stores)}${where(x.c)}, ${restocks(d.n)} ${dal(d.since)}. ${d.sinceLastHours != null ? `L'ultimo è stato ${d.sinceLastHours < 1 ? "meno di un'ora" : `${n(d.sinceLastHours)} ore`} fa.` : "L'ultimo non è ancora registrato."}` : `Ancora nessun rifornimento confermato${where(x.c)} dall'inizio del monitoraggio ${ilData(longDate(d.since))}; questa pagina si aggiorna entro cinque minuti dal primo.` },
      { q: `La carenza di iPhone Duo${where(x.c)} si sta attenuando?`, a: d.trend === "insufficient" ? `Troppo presto per dirlo: il primo confronto completo settimana su settimana compare ${ilData(longDate(d.comparableFrom))}. Guarda due numeri, rifornimenti a settimana e secondi di disponibilità: attenuazione vuol dire che salgono entrambi.` : `${cap(trendWord(d))} rifornimenti questa settimana rispetto alla scorsa (${signed(d.change!)})${w.medianSec ? `, e un rifornimento è durato una mediana di ${secs(w.medianSec)}` : ""}. Attenuazione vuol dire più rifornimenti e durate più lunghe insieme; finora ${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "entrambi vanno nella direzione giusta" : "succede solo in parte"}.` },
      { q: "Quando sarà facile comprare l'iPhone Duo?", a: "Nessuno fuori da Apple può dirlo, e PickupChecker non fa previsioni. La sequenza da seguire: i rifornimenti settimanali salgono per due o tre settimane, la durata mediana supera i 20 minuti, poi la maggior parte dei negozi ne ha uno disponibile nello stesso momento e i tempi di consegna su apple.com scendono entro una settimana." },
      { q: "Conviene pagare un sovrapprezzo invece di aspettare?", a: `Solo se l'attesa ti costa più della maggiorazione: al ritmo attuale un negozio sorvegliato vicino a te arriva al suo turno entro pochi giorni, e un avviso parte circa ${SPEED.alertSec} s dopo un rifornimento confermato. L'usato significa anche nessun diritto di reso e i rischi di sempre; la pagina di confronto tra canali li valuta.` },
      { q: "Le feste di fine anno cambiano le probabilità?", a: "La domanda sale verso dicembre mentre le consegne mantengono il loro ritmo, quindi le durate tendono ad accorciarsi, non ad allungarsi. Tieni un ordine con consegna come rete di sicurezza e lascia che gli avvisi catturino il ritiro; annulla quello che non ti serve." },
    ];
  },
  sources: { newsroom: "Apple Newsroom – L'iPhone Duo arriva negli Apple Store", pickup: "Apple – Ritiro in negozio", log: "PickupChecker – il registro dei rifornimenti da cui è calcolata questa pagina", restockTimes: "PickupChecker – quando Apple rifornisce l'iPhone Duo" },
  ld: (x) => ({
    datasetName: `Andamento dell'offerta di iPhone Duo, Apple Store${where(x.c)}`,
    description: `Rifornimenti confermati di iPhone Duo per giorno ${inStores(x)} ${dal(x.d.since)}: rifornimenti, negozi, durata mediana della disponibilità, variazione settimana su settimana.`,
    measured: ["rifornimenti per giorno", "negozi con almeno un rifornimento", "durata mediana della disponibilità", "variazione settimana su settimana", "negozi che lo hanno disponibile ora"],
  }),
  related: "Continua a leggere",
  sameData: "Stessi dati, altre domande",
  otherCountries: "Questa pagina per altri paesi",
  questions: { restockTimes: "Quando torna disponibile l'iPhone Duo?", configs: "Quale configurazione torna disponibile più spesso?", channels: "Apple, operatore o rivenditore?", sellOut: "In quanto tempo si esaurisce un rifornimento?", howToGet: "Come avere un iPhone Duo", alerts: "Il modo più rapido per ricevere una notifica" },
  setUpAlert: "Imposta gli avvisi",
  logLive: "Registro dei rifornimenti, in tempo reale",
  faqTitle: "Le domande più frequenti",
  onThisPage: "In questa pagina",
};

/* ================================================================== Apple vs carriers vs retailers */
const channels: DecideDict["channels"] = {
  crumb: "Apple, operatore o rivenditore?",
  title: (c, retailer) => fitTitleW([
    `iPhone Duo ${inPaese(c.cc)}: Apple, operatore o rivenditore?`,
    `iPhone Duo ${inPaese(c.cc)}: Apple, ${retailer} o operatore?`,
    `iPhone Duo: Apple, ${retailer} o operatore? (${paese(c.cc)})`,
    "iPhone Duo: Apple, operatore o rivenditore?",
  ], 49),
  metaDescription: (x) => fitTitleW([
    `Dove si trova davvero un iPhone Duo${where(x.c)}: ritiro in Apple Store (${n(x.sup.n)} rifornimenti confermati in ${stores(x.stores)} ${dal(x.sup.since)}), consegna da apple.com, ${words(x.ch.carriers.slice(0, 3))}, ${words(x.ch.retailers.slice(0, 2))} e usato: cosa può dirti ogni canale e cosa no, e quali tenere d'occhio.`,
    `Ritiro in Apple Store, consegna da apple.com, ${words(x.ch.carriers.slice(0, 2))}, ${x.ch.retailers[0] ?? "rivenditori"} o usato per l'iPhone Duo${where(x.c)}: cosa può dirti ogni canale e quali tenere d'occhio.`,
  ], 160),
  h1: (x) => `Apple Store, operatore o rivenditore: dove si trova davvero un iPhone Duo${where(x.c)}?`,
  intro: (x) => `Il ritiro in Apple Store è l'unico canale per l'iPhone Duo${where(x.c)} di cui qualcuno possa misurare l'offerta: PickupChecker ha confermato ${restocks(x.sup.n)} ${inStores(x)} ${dal(x.sup.since)}, ${n(x.sup.last7.restocks)} dei quali negli ultimi sette giorni, ognuno letto dalla pagina del ritiro di Apple ogni ${SPEED.checkSec} s. Gli operatori (${words(x.ch.carriers)}) e i rivenditori (${words(x.ch.retailers)}) ricevono le proprie quote e non pubblicano alcun feed della disponibilità, quindi nessuno, né noi né altri, può dirti onestamente i loro orari di rifornimento. Qui sotto: cosa può dirti ogni canale e cosa no, i compromessi, e in che ordine tenerli d'occhio.`,
  updated: (x, stamp) => `Aggiornato ${stamp} · dati Apple Store ${dal(x.sup.since)} · ${appleStores(x.stores)} · controllo ogni ${SPEED.checkSec} s`,
  nav: { compare: "Canale per canale", pickup: "Ritiro o consegna", carriers: "Operatori", retailers: "Rivenditori", resale: "Sovrapprezzo dell'usato", abroad: "Comprare all'estero", method: "Come lo sappiamo" },
  h2: (x) => ({
    compare: `Quale canale rifornisce l'iPhone Duo più spesso${where(x.c)}?`,
    pickup: "Il ritiro in Apple Store è più rapido dell'ordine con consegna su apple.com?",
    carriers: `Conviene comprare l'iPhone Duo da ${x.ch.carriers.length ? words(x.ch.carriers.slice(0, 3), 3) : "un operatore"}?`,
    retailers: `Vale la pena controllare ${x.ch.retailers.length ? words(x.ch.retailers.slice(0, 2), 2) : "i rivenditori"}?`,
    resale: `Vale la pena pagare un sovrapprezzo su ${x.ch.resale[0] ?? "un sito di annunci"}?`,
    abroad: "Posso comprare un iPhone Duo all'estero e usarlo a casa?",
    method: "Come sappiamo quello che sappiamo",
  }),
  hero: { restocks: "rifornimenti confermati negli Apple Store", last7: "negli ultimi 7 giorni", now: byOne("Apple Store con un Duo disponibile adesso", "Apple Store con un Duo disponibile adesso"), channels: "altri canali, senza feed pubblico della disponibilità" },
  compareLead: (x) => `Il ritiro in Apple Store, con l'unica misura disponibile: ${confirmed(x.sup.last7.restocks)} negli ultimi sette giorni in ${stores(x.sup.last7.stores)}${where(x.c)}${x.sup.last7.medianSec ? `, ognuno disponibile per una mediana di ${secs(x.sup.last7.medianSec)}` : ""}. Quasi certamente anche operatori e rivenditori vengono riforniti, ricevono quote dalle stesse spedizioni Apple, ma mostrano un sì/no sulla pagina del prodotto, non un feed, quindi il confronto qui sotto riguarda cosa puoi tenere d'occhio, non chi riceve di più.`,
  compareCaption: "I canali per l'iPhone Duo, confrontati onestamente",
  compareHead: ["Canale", "Cosa si sa della disponibilità", "Come tenerlo d'occhio", "Il rovescio della medaglia"],
  compareRows: (x) => {
    const r = x.ch;
    return [
      { channel: "Ritiro in Apple Store", known: `${confirmed(x.sup.n)} ${dal(x.sup.since)}; ogni rifornimento, ogni negozio, con l'orario.`, watch: `Un avviso qui (inviato circa ${SPEED.alertSec} s dopo la conferma), oppure il selettore del ritiro nell'app Apple Store.`, catch: "La disponibilità dura circa un minuto; servono l'app aperta e una carta salvata." },
      { channel: "Consegna da apple.com", known: "Apple mostra una stima di spedizione al pagamento; cambia ogni giorno e non è mai un conteggio delle scorte.", watch: "Fai l'ordine; la stima nella pagina dell'ordine si aggiorna man mano che Apple spedisce.", catch: "Settimane, non minuti, ma il tuo posto in coda è garantito." },
      { channel: `Operatori (${words(r.carriers)})`, known: "Quota propria; disponibilità online mostrata per configurazione come disponibile / in arrivo. Nessuna cronologia, nessun feed.", watch: "Le loro app e i loro localizzatori di negozi; una telefonata al negozio funziona ancora.", catch: lock(x, "Valgono piani, finanziamenti e regole di attivazione; la disponibilità varia da negozio a negozio.") },
      { channel: `Rivenditori (${words(r.retailers)})`, known: "Quota propria, spesso solo online per un prodotto appena lanciato; mostrata per configurazione nella pagina del prodotto.", watch: "La loro pagina del prodotto e la loro app; qualcuno manda email di riassortimento.", catch: "Le quote sono più piccole di quelle di Apple e si esauriscono anch'esse in pochi minuti." },
      { channel: `Usato e annunci (${words(r.resale)})`, known: "Sempre disponibile, a un prezzo.", watch: "—", catch: `Un sovrapprezzo, nessuna prova d'acquisto del produttore e ${noReturn(r.returnDays)}.` },
    ];
  },
  compareKeys: (x) => [
    `${n(x.ch.carriers.length + x.ch.retailers.length)} altri venditori${where(x.c)} e nemmeno una cronologia pubblica della disponibilità: qualsiasi sito che dica di conoscere gli orari di rifornimento di un operatore sta tirando a indovinare.`,
    "La nostra posizione: tieni d'occhio il ritiro in Apple Store con un avviso, tieni un ordine con consegna su apple.com come rete di sicurezza, e guarda la pagina di un rivenditore quando ci sei già.",
  ],
  pickupLead: (x) => [
    "Per la rapidità, il ritiro: una configurazione che compare nella pagina del ritiro si può prenotare in quel minuto e ritirare lo stesso giorno, mentre un ordine con consegna aspetta la stima di Apple. Per la certezza, la consegna: l'ordine ti tiene il posto qualunque cosa succeda nei negozi.",
    x.sup.lifetimes ? `Le disponibilità per il ritiro${where(x.c)} sono durate una mediana di ${secs(x.sup.lifetimes.medianSec)} e ${il(pc(x.sup.lifetimes.within2min))} è sparito entro due minuti: ecco perché esiste l'avviso.` : "",
    "La risposta giusta è entrambi: ordina la consegna oggi, imposta l'avviso per il ritiro, annulla quello che non ti serve.",
  ].filter(Boolean).join(" "),
  pickupSwaps: () => [
    { no: "Annullare l'ordine con consegna per «ripartire da zero»", yes: "Tenerlo finché il ritiro non è nelle tue mani", why: "Apple non pubblica la posizione in coda; un nuovo ordine prende semplicemente la stima di oggi, che di rado è più vicina di quella che hai." },
    { no: "Ricaricare a mano la pagina del ritiro", yes: "Lasciare che la controlli l'avviso", why: `Controlliamo i negozi con avvisi ogni ${SPEED.fastSec} s e inviamo la notifica circa ${SPEED.alertSec} s dopo la conferma; chi ricarica a mano vede la maggior parte delle disponibilità quando sono già sparite.` },
    { no: "Cambiare l'ordine in ritiro al pagamento, più avanti", yes: "Prenotare il ritiro come nuovo ordine quando scatta l'avviso", why: "Le prenotazioni per il ritiro vengono dalle scorte del negozio, gli ordini con consegna dal magazzino: sono due code, e quella del ritiro è la rapida." },
  ],
  pickupKeys: (x) => [
    `La pagina di Apple spiega le opzioni di ritiro e consegna${x.ch.returnDays ? ` e il periodo di reso di ${n(x.ch.returnDays)} giorni per entrambe` : x.ch.returnDays === 0 ? "; nota che Apple a Hong Kong non accetta resi per cambio di idea, solo sostituzioni per difetti" : ""} (fonti in fondo).`,
    "Una prenotazione per il ritiro è un ordine per quel negozio; Apple lo tiene da parte e ti dice quando passare.",
  ],
  carriersLead: (x) => `Se vuoi un finanziamento, una permuta abbinata a un piano, o sei già in un negozio ${x.ch.carriers[0] ?? "di un operatore"} con uno sullo scaffale: sì. Se vuoi il telefono il prima possibile, gli operatori sono una seconda lotteria con probabilità più basse e nessun modo di seguirla. ${lock(x, "Controlla il blocco e le condizioni del piano prima di comprare.")} I loro negozi online mostrano la disponibilità per configurazione, quindi un'occhiata non costa nulla; solo, non aspettarti una cronologia o una notifica.`,
  carriersKeys: (x) => [
    `Operatori${where(x.c)}: ${words(x.ch.carriers)}.`,
    "La disponibilità degli operatori è per singolo negozio; un negozio che lo mostra online potrebbe averlo solo per il ritiro in negozio.",
    "Un iPhone dell'operatore è lo stesso hardware; la differenza è il contratto che ci sta attaccato.",
  ],
  retailersLead: (x) => `Vale un'occhiata quando stai già facendo acquisti lì, non vale un monitoraggio: ${words(x.ch.retailers)} mostrano l'iPhone Duo per configurazione e vendono la loro quota online in pochi minuti, senza un feed a cui iscriversi. Il loro vantaggio sono le condizioni di pagamento e i punti fedeltà; lo svantaggio è una quota più piccola di quella dei negozi Apple.`,
  retailersKeys: (x) => [
    `Rivenditori${where(x.c)}: ${words(x.ch.retailers)}.`,
    "Guarda il selettore della configurazione nella pagina del prodotto: in grigio vuol dire esaurito online, il che non dice nulla sui loro negozi.",
  ],
  resaleLead: (x) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    const times = Math.round(perDay);
    return `Di rado. Metti il sovrapprezzo sulla bilancia con l'attesa che ti fa risparmiare: gli Apple Store${where(x.c)} hanno rifornito ${perDay >= 1 ? `circa ${times === 1 ? "una volta" : `${n(times)} volte`} al giorno` : "meno di una volta al giorno"} questa settimana, e un avviso parte circa ${SPEED.alertSec} s dopo un rifornimento confermato, quindi un negozio sorvegliato vicino a te di solito va a segno entro pochi giorni. Dall'altra parte, ${words(x.ch.resale)} non offrono alcuna prova d'acquisto del produttore, ${noReturn(x.ch.returnDays)}, e i rischi di sempre: un dispositivo con il blocco di attivazione, una scatola scambiata, un «sigillato» che è un reso.`;
  },
  resaleKeys: () => [
    "Se compri usato lo stesso: incontratevi di persona, accendilo, controlla il numero di serie in Impostazioni → Generali → Info, ed esegui l'accesso prima di pagare.",
    "La garanzia Apple segue il dispositivo, non lo scontrino, ma può essere richiesta la prova d'acquisto; una vendita tra privati non può darti quella di Apple.",
    "Un sovrapprezzo che supera una settimana di attesa è un sovrapprezzo per l'impazienza; decidi sapendolo.",
  ],
  abroadLead: (x) => `Spesso sì, con qualche verifica: un iPhone comprato da Apple è venduto sbloccato nella maggior parte dei paesi, l'assistenza in garanzia di Apple è disponibile a livello internazionale con eccezioni, e il modello deve supportare le bande del tuo operatore di casa, e la sua eSIM, perché le pagine d'acquisto di Apple indicano l'iPhone Duo come solo eSIM in ogni paese. Le tasse sono il costo vero: ${x.c.pricesIncludeTax ? "il prezzo che paghi all'estero include imposte locali che potresti non recuperare" : "l'imposta sulle vendite si aggiunge alla cassa"}, e la dogana di casa può aggiungere dazi al ritorno. PickupChecker segue ${x.us ? "altri 18 paesi" : "gli Stati Uniti e altri 17 paesi"}, quindi alla domanda sulla disponibilità in sé rispondono le pagine dei paesi.`,
  abroadKeys: () => [
    "Prima di comprare: la pagina Apple sulla garanzia per sapere dove è offerta l'assistenza, l'elenco di bande e SIM del modello, e il supporto eSIM del tuo operatore.",
    "Conserva lo scontrino: assistenza ed eventuale reso seguono le regole del paese d'acquisto.",
    "Un telefono comprato per qualcuno a casa resta un telefono comprato all'estero; valgono le stesse verifiche.",
  ],
  methodLead: (x) => `I numeri sugli Apple Store in questa pagina vengono dai controlli di PickupChecker su ${storesPhrase(x)} ogni ${SPEED.checkSec} s ${dal(x.sup.since)}; un rifornimento conta solo dopo due osservazioni concordanti. Gli elenchi di operatori e rivenditori sono i venditori che Apple stessa indica per il paese più i rivenditori più grandi, con le loro pagine come fonti; quello che diciamo sulla loro disponibilità è quello che mostrano le loro pagine, che è un'istantanea, non una cronologia. Non le scansioniamo e non facciamo alcuna affermazione sui loro orari di rifornimento.`,
  methodKeys: () => ["Correzioni benvenute: se un venditore in questa pagina non tratta più l'iPhone Duo, diccelo e lo togliamo.", "Cita con un link e la data."],
  faq: (x) => [
    { q: `Quale canale rifornisce l'iPhone Duo più in fretta${where(x.c)}?`, a: `L'unico canale con una serie misurabile è il ritiro in Apple Store: ${confirmed(x.sup.last7.restocks)} negli ultimi sette giorni${where(x.c)}${x.sup.last7.medianSec ? `, ognuno disponibile per una mediana di ${secs(x.sup.last7.medianSec)}` : ""}. Anche operatori e rivenditori vengono riforniti ma non pubblicano alcun feed, quindi nessuno può metterli in classifica onestamente.` },
    { q: "Se annullo l'ordine su apple.com e riordino, perdo il posto?", a: "Ottieni un nuovo ordine con la stima di spedizione di oggi; Apple non pubblica la posizione in coda. Confronta la stima mostrata al pagamento con quella del tuo ordine esistente prima di annullare: di rado è più vicina." },
    { q: "Un iPhone Duo dell'operatore è diverso da quello di Apple?", a: `Stesso hardware. ${lock(x, "La differenza sono il piano ed eventuali condizioni di blocco o finanziamento.")} La disponibilità degli operatori è separata da quella di Apple e mostrata per negozio.` },
    { q: "Comprando da un rivenditore ho il periodo di reso di Apple?", a: x.ch.returnDays ? `No: vale la politica del rivenditore. I ${n(x.ch.returnDays)} giorni di Apple valgono per gli acquisti da Apple (apple.com e Apple Store).` : x.ch.returnDays === 0 ? "Apple a Hong Kong non accetta resi per cambio di idea nemmeno lei (solo sostituzioni per difetti), quindi confronta la politica del rivenditore: lì alcuni sono più generosi di Apple." : "No: vale la politica del rivenditore; il periodo di reso di Apple copre solo gli acquisti da Apple." },
    { q: "Quali operatori indica Apple per l'iPhone Duo?", a: x.c.cc === "us" || x.c.cc === "jp" ? `La pagina d'acquisto di Apple${where(x.c)} indica ${words(x.ch.carriers)}; la pagina di ogni altro paese lo vende sbloccato senza un passaggio per l'operatore.` : `La pagina d'acquisto di Apple${where(x.c)} vende l'iPhone Duo sbloccato e non indica alcun operatore; ${words(x.ch.carriers)} sono le reti che Apple elenca come compatibili con l'iPhone lì, e lo vendono alle loro condizioni.` },
    { q: "Posso usare un iPhone Duo comprato all'estero con il mio operatore a casa?", a: "Di solito sì, se il modello supporta le bande del tuo operatore, se il tuo operatore offre l'eSIM (l'iPhone Duo è solo eSIM ovunque) e se è sbloccato, come lo sono le vendite di Apple nella maggior parte dei paesi. L'assistenza in garanzia è internazionale con eccezioni; tasse e dazi sono il vero costo aggiuntivo." },
  ],
  sources: { buy: "Apple – Acquista iPhone Duo", pickup: "Apple – Ritiro in negozio e consegna", returns: "Apple – Resi e periodo di reso", warranty: "Apple – Assistenza in garanzia per paese", log: "PickupChecker – il registro dei rifornimenti da cui è calcolata questa pagina" },
  ld: (x) => ({
    description: `Ritiro in Apple Store, consegna da apple.com, operatori, rivenditori e usato per l'iPhone Duo${where(x.c)}: rifornimenti misurati negli Apple Store, e cosa possono dirti gli altri canali e cosa no.`,
  }),
  related: "Continua a leggere",
  sameData: "Stessi dati, altre domande",
  otherCountries: "Questa pagina per altri paesi",
  questions: { howToGet: "Come avere un iPhone Duo", whereToBuy: "Dove comprarne uno oggi", shortage: "La carenza si sta attenuando?", configs: "Quale configurazione torna disponibile più spesso?", restockTimes: "Quando torna disponibile l'iPhone Duo?", alerts: "Il modo più rapido per ricevere una notifica" },
  setUpAlert: "Imposta gli avvisi",
  logLive: "Registro dei rifornimenti, in tempo reale",
  faqTitle: "Le domande più frequenti",
  onThisPage: "In questa pagina",
};

/* ================================================================== the public API */
const api: DecideDict["api"] = {
  crumb: "API disponibilità",
  title: (c) => fitTitleW([
    `API disponibilità iPhone Duo ${inPaese(c.cc)}: dati Apple Store live`,
    `API disponibilità iPhone Duo ${inPaese(c.cc)} (JSON gratis)`,
    `API iPhone Duo ${inPaese(c.cc)}: disponibilità in JSON`,
    `API disponibilità iPhone Duo (${paese(c.cc)})`,
  ], 49),
  metaDescription: (x) => fitTitleW([
    `Un'API JSON gratuita e in sola lettura per la disponibilità al ritiro dell'iPhone Duo in ${appleStores(x.stores)}${where(x.c)} (${n(x.worldStores)} in ${n(x.countries)} paesi): disponibilità attuale per negozio e configurazione, rifornimenti confermati delle ultime 24 ore, senza chiave, cache di 30 s. Endpoint, esempi in curl/Python/JavaScript, limiti, e quando uno script batte un avviso.`,
    `API JSON gratuita per la disponibilità dell'iPhone Duo in ${appleStores(x.stores)}${where(x.c)}: disponibilità per negozio, rifornimenti delle ultime 24 h, senza chiave. Endpoint, esempi e limiti.`,
  ], 160),
  h1: (x) => `Esiste un'API o uno script per monitorare la disponibilità dell'iPhone Duo negli Apple Store${where(x.c)}?`,
  intro: (x) => `Sì: PickupChecker pubblica un'API JSON gratuita e in sola lettura che copre ${storesPhrase(x)} (${n(x.worldStores)} negozi in ${n(x.countries)} paesi in tutto), costruita su controlli ogni ${SPEED.checkSec} s per negozio e con una cache di 30 s sulla CDN, senza chiave e senza registrazione. Una richiesta restituisce la disponibilità attuale al ritiro dell'iPhone Duo in ogni negozio, per configurazione; una seconda i rifornimenti confermati delle ultime 24 ore. In questo momento ${x.storesNow === 1 ? "1 negozio" : `${n(x.storesNow)} negozi`} su ${n(x.stores)}${where(x.c)} ${x.storesNow === 1 ? "ne ha" : "ne hanno"} uno disponibile e ${restocks(x.restocks24)} ${x.restocks24 === 1 ? "è stato confermato" : "sono stati confermati"} nelle ultime 24 ore. Qui sotto: gli endpoint, esempi funzionanti in curl, Python e JavaScript, il riferimento dei campi, i limiti, e perché uno script che interroga l'API all'intervallo della cache di 30 secondi è comunque più lento di una notifica push.`,
  updated: (x, stamp) => `Aggiornato ${stamp} · ${appleStores(x.stores)}${where(x.c)} · controllo ogni ${SPEED.checkSec} s · API in cache 30 s`,
  nav: { endpoints: "Endpoint", examples: "Esempi", fields: "Campi", limits: "Limiti e condizioni", script: "Script o avviso?", apple: "Interrogare apple.com", method: "Origine dei dati" },
  h2: (x) => ({
    endpoints: `Cosa restituisce l'API della disponibilità dell'iPhone Duo${where(x.c)}?`,
    examples: "Come la chiamo da curl, Python o JavaScript?",
    fields: "Cosa significano i campi?",
    limits: "Ogni quanto posso interrogarla, e quali sono le condizioni?",
    script: "Scrivo il mio script o uso semplicemente gli avvisi?",
    apple: "Posso interrogare apple.com da solo, invece?",
    method: "Da dove vengono i dati",
  }),
  hero: { stores: byOne("Apple Store coperto", "Apple Store coperti"), now: "con un iPhone Duo disponibile adesso", restocks24: "rifornimenti confermati, ultime 24 h", cache: "secondi di cache dell'API" },
  perMinute: "richieste al minuto per indirizzo",
  keysNeeded: "chiavi API necessarie",
  endpointsLead: (x) => `Tre endpoint GET, tutti JSON, tutti sotto https://pickupchecker.com/api/v1: \`stock\` restituisce ogni Apple Store${where(x.c)} con le configurazioni che ha disponibili per il ritiro adesso e quando è stato controllato l'ultima volta; \`restocks\` restituisce i rifornimenti confermati delle ultime 1–168 ore, dal più recente, indicando se ognuno è ancora disponibile; \`iphone-duo\` è una scorciatoia per \`stock?model=duo\`. Il codice del paese va nel percorso (${x.c.cc}${x.c.cc === "uk" ? ", accettato anche gb" : ""}); i modelli sono duo, 18-pro e 18-pro-max.`,
  endpointsCaption: "Endpoint (sostituisci {country} con us, ca, uk, au, de, fr, it, es, jp, kr, hk, sg, ae, ch, nl, se, tw, at o be)",
  endpointsHead: ["Endpoint", "Restituisce", "Parametri"],
  endpointsRows: (x) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: "Ogni negozio: in_stock, le configurazioni disponibili, last_checked_at, last_in_stock_at; un riepilogo con stores_in_stock.", params: "model (duo | 18-pro | 18-pro-max), storage (es. 512GB), color (es. night-sky)" },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: "Rifornimenti confermati dal più recente: at, store, configurazione, still_listed.", params: "model, hours (1–168, predefinito 24), limit (1–200, predefinito 100)" },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: "Reindirizza a stock?model=duo.", params: "—" },
    { path: "/api/v1", returns: "Questo elenco, i paesi e i modelli, i limiti.", params: "—" },
  ],
  examplesLead: "Copia uno di questi; ognuno stampa i negozi che hanno un iPhone Duo disponibile adesso. Nessuna chiave, nessuna intestazione oltre a uno User-Agent che identifichi il tuo script (così possiamo scriverti se si comporta male).",
  exampleTitles: { curl: "curl (qualsiasi shell)", python: "Python 3, solo libreria standard", node: "JavaScript (Node 18+ o un browser)" },
  fieldsLead: "Ogni campo è in snake_case e ogni orario è ISO 8601 in UTC. Gli identificativi dei negozi sono quelli di Apple (numeri R), quindi corrispondono alle pagine dei negozi di Apple e agli URL di questo sito.",
  fieldsCaption: "Riferimento dei campi",
  fieldsHead: ["Campo", "Tipo", "Significato"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "Quando è stata calcolata questa risposta; la CDN può servirla per un massimo di 30 s." },
    { f: "country.code / name / currency", t: "string", m: "Il paese dei negozi." },
    { f: "configurations[]", t: "object", m: "I numeri di parte coperti dalla richiesta, con capacità e colore come li scrive Apple." },
    { f: "summary.stores_in_stock", t: "integer", m: "Negozi che hanno disponibile per il ritiro almeno una configurazione coperta, adesso." },
    { f: "stores[].store_number", t: "string", m: "L'identificativo Apple del negozio, es. R085." },
    { f: "stores[].in_stock", t: "boolean", m: "Almeno una configurazione coperta è disponibile per il ritiro." },
    { f: "stores[].available[]", t: "object", m: "Le configurazioni disponibili: part_number, storage, color." },
    { f: "stores[].last_checked_at", t: "string | null", m: `Quando abbiamo letto per l'ultima volta la pagina del ritiro di Apple per questo negozio (di norma meno di ${SPEED.checkSec} s fa).` },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "L'ultimo momento in cui questo negozio ha avuto disponibile una configurazione coperta." },
    { f: "restocks[].at", t: "string", m: "Quando la configurazione è passata da esaurita a disponibile (confermato da due controlli)." },
    { f: "restocks[].still_listed", t: "boolean | null", m: "Se quel negozio ce l'ha ancora disponibile al momento della risposta." },
    { f: "attribution", t: "object", m: "La fonte, la riga di licenza e questa pagina." },
  ],
  limitsLead: "Interroga ogni endpoint a intervalli di 30 secondi o più: le risposte restano in cache sulla CDN per quel tempo, quindi un intervallo più breve restituisce lo stesso JSON; e resta sotto le 60 richieste al minuto da un indirizzo, che è il limite che arriva ai nostri server. I dati sono liberi da usare, anche commercialmente, a una condizione: mostra «Fonte: PickupChecker» con un link a pickupchecker.com (o alla pagina del negozio o del paese) ovunque compaiano i numeri. Nessuna chiave, nessuna registrazione, CORS aperto, quindi una pagina nel browser può chiamarla direttamente.",
  limitsKeys: () => [
    "Una risposta 429 significa più di 60 richieste in un minuto dal tuo indirizzo; aspetta i secondi indicati in Retry-After.",
    "Le modifiche incompatibili avranno un nuovo percorso di versione (/api/v2); sotto v1 i campi vengono aggiunti, mai rinominati.",
    "Imposta per favore uno User-Agent con il nome del progetto e un contatto; non abbiamo mai bloccato uno script educato.",
  ],
  scriptLead: (x) => `Se vuoi un cruscotto, un bot Discord, un foglio di calcolo o fare ricerca, scrivi lo script: l'API serve a questo. Se vuoi davvero comprare un iPhone Duo, lo script è lo strumento più lento: vede un rifornimento alla sua interrogazione successiva, fino a 30 s dopo, e poi deve ancora avvisarti; la nostra notifica push legge gli stessi negozi ogni ${SPEED.fastSec} s, conferma il rifornimento e parte circa ${SPEED.alertSec} s dopo, ${x.storesNow !== undefined ? "dentro la durata mediana di circa un minuto" : "dentro la durata mediana"}. Molti fanno entrambe le cose: l'avviso per comprare, l'API per osservare.`,
  scriptCaption: "Uno script che interroga l'API contro una notifica push",
  scriptHead: ["", "Il tuo script su questa API", "Avviso PickupChecker"],
  scriptRows: () => [
    { k: "Vede un rifornimento dopo", a: "fino a 30 s (cache) + il tuo intervallo", b: `notifica inviata circa ${SPEED.alertSec} s dopo che il nostro controllo lo vede` },
    { k: "Raggiunge il tuo telefono", a: "come lo costruisci tu (email, bot, SMS)", b: "una notifica dell'app nella schermata Home" },
    { k: "Negozi osservati", a: "tutti, a ogni chiamata", b: `i negozi che scegli ogni ${SPEED.fastSec} s, tutti i negozi ogni ${SPEED.checkSec} s` },
    { k: "Costi", a: "gratis", b: "un piano per gli avvisi; leggere questo sito è gratis" },
  ],
  appleLead: "Puoi, entro certi limiti: la pagina del ritiro di apple.com risponde per negozio e configurazione, che è esattamente quello che leggiamo. Quello che manca a uno script improvvisato è la cura: la rotazione IPv6 perché Apple continui a rispondere, la regola delle due osservazioni perché un «non disponibile» intermittente non diventi un falso rifornimento, la gestione dei fusi orari per ogni negozio, e una serie conservata dal giorno del lancio. Se vuoi solo la risposta, l'API è quel lavoro già fatto; se vuoi imparare, la nostra pagina sul metodo spiega ogni pezzo.",
  appleKeys: () => [
    "La pagina di Apple è un'istantanea: ti dice adesso, mai quanto è durata una disponibilità o quando c'è stata l'ultima.",
    `I nostri controlli sono a ${SPEED.checkSec} s di distanza per negozio e mai più fitti di ${SPEED.fastSec} s; uno script che interroga apple.com più spesso viene bloccato e non impara nulla.`,
  ],
  methodLead: (x) => `Ogni numero viene da PickupChecker che legge la disponibilità per il ritiro in negozio pubblicata da Apple per ${storesPhrase(x)} ogni ${SPEED.checkSec} s (ogni ${SPEED.fastSec} s nei negozi con avvisi). Un cambiamento viene registrato solo dopo due osservazioni concordanti; la prima apparizione dopo un'interruzione non è un rifornimento. L'API serve le stesse tabelle che leggono le pagine di questo sito; nulla è campionato o stimato.`,
  methodKeys: () => ["Il metodo per intero: la pagina «come funziona».", "L'attribuzione è tutto il prezzo; un link di ritorno mantiene tutto gratis."],
  faq: (x) => [
    { q: `Esiste un'API gratuita per la disponibilità dell'iPhone Duo negli Apple Store${where(x.c)}?`, a: `Sì, quella di PickupChecker, su https://pickupchecker.com/api/v1/${x.c.cc}/stock: ogni Apple Store${where(x.c)} con le configurazioni che ha disponibili per il ritiro adesso, in JSON, senza chiave, cache di 30 s. Un secondo endpoint restituisce i rifornimenti confermati delle ultime 24 ore.` },
    { q: "Apple ha un'API ufficiale della disponibilità?", a: "Nessuna pubblica. La pagina del ritiro di apple.com si può leggere per negozio e configurazione, ed è quello che fa questo sito con cura (rotazione, conferma, fusi orari); l'API qui è quel lavoro esposto in JSON." },
    { q: "Quanto sono aggiornati i dati?", a: `Ogni negozio viene controllato ogni ${SPEED.checkSec} s (ogni ${SPEED.fastSec} s nei negozi con avvisi) e la risposta dell'API resta in cache 30 s, quindi un dato ha al massimo circa 45 s; last_checked_at te lo dice con precisione.` },
    { q: "Posso usarla in un prodotto commerciale?", a: "Sì, con attribuzione: «Fonte: PickupChecker» con link a pickupchecker.com ovunque i dati vengano mostrati, e un intervallo di interrogazione di 30 s o più. Non serve alcuna chiave." },
    { q: "Uno script mi fa avere un iPhone Duo prima di un avviso?", a: `No: uno script vede un rifornimento alla sua interrogazione successiva, fino a 30 s dopo; l'avviso lo conferma e parte circa ${SPEED.alertSec} s dopo che lo vediamo. Usa lo script per osservare e l'avviso per comprare.` },
  ],
  sources: { pickup: "Apple – Ritiro in negozio", method: "PickupChecker – come funzionano i controlli", log: "PickupChecker – il registro dei rifornimenti" },
  ld: (x) => ({
    description: `API JSON gratuita per la disponibilità al ritiro dell'iPhone Duo ${inStores(x)}: disponibilità attuale per negozio e configurazione, rifornimenti confermati delle ultime 24 ore.`,
  }),
  related: "Continua a leggere",
  sameData: "Stessi dati, altre domande",
  otherCountries: "Questa pagina per altri paesi",
  questions: { alerts: "Il modo più rapido per ricevere una notifica", howItWorks: "Come funzionano i controlli", restockTimes: "Quando torna disponibile l'iPhone Duo?", shortage: "La carenza si sta attenuando?", configs: "Quale configurazione torna disponibile più spesso?", stockChecker: "Verifica disponibilità iPhone Duo" },
  setUpAlert: "Imposta gli avvisi",
  tryIt: "Apri il JSON in tempo reale",
  faqTitle: "Le domande più frequenti",
  onThisPage: "In questa pagina",
};

export const decide: DecideDict = { configs, supply, channels, api };
