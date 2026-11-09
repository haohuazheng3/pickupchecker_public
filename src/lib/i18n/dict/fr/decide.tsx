/**
 * Chaînes françaises : decide — les quatre pages de décision (seo.md §16) : quelle configuration est la plus facile à
 * obtenir, la pénurie s’atténue-t-elle, Apple ou opérateur ou revendeur, et l’API publique. Mêmes clés, mêmes
 * arguments et mêmes formes que l’anglais (`DecideDict`) ; une phrase-réponse sous chaque question, tous les chiffres
 * viennent de lib/content/duoDecide.ts (et channels.ts). Les libellés (configuration, coloris, magasin) arrivent déjà
 * en français par la vue ; le nom du pays passe par util.IN (« en France », « au Canada »). Espaces ordinaires avant
 * : ; ? ! % et dans « » : la typographie française est appliquée à tout le dictionnaire dans index.ts.
 * Faits dont la formulation ne change pas : vérifications toutes les 15 et 5 secondes ; ni modèles, ni capacités,
 * ni marques ne sont traduits.
 */
import type { Faq } from "@/lib/content/types";
import type { Country, CountryCode } from "@/lib/apple/countries";
import type { DuoSupply } from "@/lib/content/duoDecide";
import { exposureHours } from "@/lib/content/duoDecide";
import type { ChannelsView, DecideCtx, DecideDict } from "../en/decide";
import { SPEED } from "@/lib/plans";
import { fitTitleW, list, num, pct as pctOf, plural } from "@/lib/i18n/format";
import { countryLabel } from "@/lib/i18n/places";
import { IN, cap } from "./util";

const L = "fr" as const;
const n = (x: number) => num(L, x);
/** 0,59 → "59 %" ; sous 0,5 % → "<1 %". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1 %" : pctOf(L, Math.round(x * 100)));
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.round(Math.abs(x) * 100)} %`;
/** "2,3" : une décimale, toujours écrite. */
const dec1 = (v: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
const longDate = (ymd: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
const dateLabel = (ymd: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "38,4 h" d’affichage, "41 min" sous l’heure. */
const hours = (sec: number) => (sec >= 3600 ? `${n(exposureHours(sec))} h` : `${n(Math.max(1, Math.round(sec / 60)))} min`);
const secs = (s: number) => (s >= 120 ? `${n(Math.round(s / 60))} min` : `${n(Math.round(s))} s`);
/**
 * Les libellés à deux formes (`hero.now`, `storesEverLabel`…) sont typés en anglais par leurs littéraux ; `lit` prend
 * le type attendu par le contexte pour que la traduction française soit acceptée.
 */
const lit = <T extends string>(s: string) => s as T;
const ratio = (a: number, b: number) => (b > 0 ? `${n(Math.round((a / b) * 10) / 10)}×` : "—");

const nRestocks = (k: number) => plural(L, k, { one: "# retour en stock", other: "# retours en stock" });
const nConfirmed = (k: number) => plural(L, k, { one: "# retour en stock confirmé", other: "# retours en stock confirmés" });
const nStores = (k: number) => plural(L, k, { one: "# magasin", other: "# magasins" });
const nAppleStores = (k: number) => plural(L, k, { one: "# Apple Store", other: "# Apple Store" });
const nDays = (k: number) => plural(L, k, { one: "# jour", other: "# jours" });
const nAlerts = (k: number) => plural(L, k, { one: "# alerte", other: "# alertes" });

/** " en France", " au Canada" : le pays est toujours nommé dans la version française. */
const where = (c: Country) => ` ${IN[c.cc]}`;
const storesPhrase = (x: DecideCtx) => (x.one ? `l’unique Apple Store ${IN[x.c.cc]}` : `les ${n(x.stores)} Apple Store ${IN[x.c.cc]}`);
/** "plus de" / "moins de" / "à peu près autant de" (… retours en stock). */
const trendWord = (d: DuoSupply) => (d.trend === "up" ? "plus de" : d.trend === "down" ? "moins de" : "à peu près autant de");
/** "aucun des 14 jours de retour accordés par Apple" ; sans délai : "aucun délai de retour". */
const noReturn = (days: number | null) => (days ? `aucun des ${n(days)} jours de retour accordés par Apple` : "aucun délai de retour");

/** Les phrases de channels.ts sur le verrouillage opérateur, en français (la donnée arrive en anglais). */
const LOCK: Partial<Record<CountryCode, string>> = {
  us: "Déverrouillé quand il est acheté chez Apple ; avec un financement AT&T, T-Mobile ou Verizon, l’iPhone reste verrouillé sur cet opérateur jusqu’au paiement complet.",
  ca: "Depuis le 1er décembre 2017, le Code sur les services sans fil du CRTC impose que tout téléphone neuf vendu au Canada, y compris par un fournisseur, soit déverrouillé.",
  uk: "L’Ofcom interdit aux réseaux britanniques de vendre des téléphones verrouillés depuis décembre 2021 : les iPhone achetés chez un opérateur sont déverrouillés.",
  au: "Les iPhone avec abonnement de Telstra, Optus et Vodafone sont vendus déverrouillés ; seuls certains appareils prépayés sont verrouillés sur le réseau.",
  de: "Apple et les grands réseaux allemands (Telekom, Vodafone, O2) vendent les iPhone sans verrouillage SIM ; seules certaines offres prépayées sont verrouillées.",
  fr: "Les opérateurs français vendent désormais la plupart des téléphones déverrouillés (Free Mobile ne verrouille jamais) ; tout verrouillage restant doit être levé gratuitement après 3 mois.",
  it: "Apple vend l’iPhone en Italie sans le lier à un opérateur (déverrouillé) ; le statut des appareils financés par un opérateur n’a pas été vérifié.",
  es: "Apple vend l’iPhone « libre » (déverrouillé) en Espagne ; le statut des appareils financés par un opérateur n’a pas été vérifié.",
  jp: "Depuis octobre 2021, les règles du ministère japonais des Communications interdisent aux opérateurs de verrouiller les téléphones neufs : les iPhone d’opérateur sont déverrouillés.",
  kr: "Apple vend en Corée des iPhone non activés et déverrouillés ; le statut des appareils vendus par les opérateurs n’a pas été vérifié.",
  hk: "Apple vend l’iPhone déverrouillé à Hong Kong ; le statut des appareils vendus par les opérateurs n’a pas été vérifié.",
  sg: "La politique « No SIM-Lock » de l’IMDA interdit aux opérateurs de verrouiller les téléphones vendus à Singapour.",
  ae: "Apple vend l’iPhone déverrouillé aux Émirats arabes unis ; le statut des appareils vendus par les opérateurs n’a pas été vérifié.",
  ch: "Apple vend l’iPhone sans verrouillage SIM en Suisse ; le statut des appareils vendus par les opérateurs n’a pas été vérifié.",
  nl: "Apple vend l’iPhone sans verrouillage SIM aux Pays-Bas ; le statut des appareils vendus par les opérateurs n’a pas été vérifié.",
  se: "Apple vend l’iPhone déverrouillé en Suède ; le statut des appareils vendus par les opérateurs n’a pas été vérifié.",
  tw: "Apple vend l’iPhone déverrouillé à Taïwan ; le statut des appareils vendus par les opérateurs n’a pas été vérifié.",
  at: "Apple vend l’iPhone sans verrouillage SIM en Autriche ; le statut des appareils vendus par les opérateurs n’a pas été vérifié.",
  be: "Apple vend l’iPhone déverrouillé en Belgique ; le statut des appareils vendus par les opérateurs n’a pas été vérifié.",
};
const lock = (x: ChannelsView) => (x.ch.carrierLock ? LOCK[x.c.cc] : undefined);

/* ================================================================== quelle configuration est la plus facile à obtenir */
const configs: DecideDict["configs"] = {
  crumb: "Quelle configuration ?",
  title: (c) => fitTitleW([`Quel iPhone Duo revient le plus en stock ${IN[c.cc]} ?`, `L’iPhone Duo le plus réapprovisionné ${IN[c.cc]}`, "Quel iPhone Duo revient le plus en stock ?"], 49),
  metaDescription: (x) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    return e && h
      ? fitTitleW([
        `Le ${x.cfg(e)} est la configuration d’iPhone Duo la plus facile à obtenir${where(x.c)} : ${n(e.restocks)} des ${n(d.n)} retours en stock confirmés dans ${nAppleStores(x.stores)} et ${hours(e.exposureSec)} d’affichage cumulé depuis le ${longDate(d.since)} ; le ${x.cfg(h)} la plus difficile (${n(h.restocks)}). Toutes les configurations classées, par capacité et coloris, mises à jour à chaque retour en stock.`,
        `Le ${x.cfg(e)} est l’iPhone Duo le plus facile à obtenir${where(x.c)} (${n(e.restocks)} des ${n(d.n)} retours en stock depuis le ${longDate(d.since)}) ; le ${x.cfg(h)} le plus difficile. Toutes les configurations classées par capacité et coloris.`,
      ], 160)
      : `Toutes les configurations d’iPhone Duo classées par retours en stock confirmés dans les Apple Store${where(x.c)} depuis le ${longDate(d.since)} : capacité, coloris, durée d’affichage et ce qui est affiché en ce moment.`;
  },
  h1: (x) => `Quelle configuration d’iPhone Duo revient le plus en stock${where(x.c)}, et laquelle est la plus facile à obtenir ?`,
  intro: (x) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    if (!e) return `PickupChecker a confirmé ${nRestocks(d.n)} d’iPhone Duo dans ${storesPhrase(x)} depuis le ${longDate(d.since)} : trop peu pour classer les configurations. Le tableau ci-dessous se remplit à chaque retour en stock ; la page des États-Unis montre déjà la tendance.`;
    const st = d.byStorage, co = d.byColor;
    const last = st[st.length - 1];
    return `Le ${x.cfg(e)} est la configuration d’iPhone Duo restée affichée le plus longtemps${where(x.c)} : ${hours(e.exposureSec)} au cumul sur ${n(e.restocks)} des ${n(d.n)} retours en stock que PickupChecker a confirmés dans ${storesPhrase(x)} depuis le ${longDate(d.since)}, dans ${nStores(e.stores)}${e.lifetimes ? `, ${secs(e.lifetimes.medianSec)} par retour en stock en médiane` : ""}. ${h ? `Le ${x.cfg(h)} a été affiché le moins longtemps : ${nRestocks(h.restocks)} et ${hours(h.exposureSec)} d’affichage.` : ""}${st.length > 1 ? ` La capacité répartit le compte plus que le coloris : ${last.restocks > 0 ? `les modèles ${st[0].key} sont revenus en stock ${ratio(st[0].restocks, last.restocks)} plus souvent que les ${last.key}` : `les modèles ${st[0].key} ont concentré ${pct(st[0].share)} des retours en stock alors que le ${last.key} n’est jamais revenu`}${co.length > 1 ? `, tandis que ${x.colour(co[0].key)} ne devance ${x.colour(co[1].key)} que de ${Math.abs(Math.round((co[0].share - co[1].share) * 100))} points` : ""}.` : ""} Personne ne peut dire laquelle vous réussirez à acheter ; ce qui se mesure, ce sont les créneaux de retrait passés, et c’est ce que cette page classe.`;
  },
  updated: (x, stamp) => `Mis à jour ${stamp} · données depuis le ${longDate(x.d.since)} · ${nAppleStores(x.stores)} · vérifiés toutes les ${SPEED.checkSec} s (magasins avec alertes toutes les ${SPEED.fastSec} s)`,
  nav: { easiest: "Affichée le plus longtemps", storage: "Capacité", colour: "Coloris", shelf: "Temps pour réserver", week: "Cette semaine", alerts: "Quoi surveiller", method: "Notre méthode" },
  h2: (x) => ({
    easiest: `Quelle configuration d’iPhone Duo est restée affichée le plus longtemps${where(x.c)} ?`,
    storage: "La capacité change-t-elle la fréquence des retours en stock ?",
    colour: `${x.d.byColor.length > 1 ? `${x.colour(x.d.byColor[0].key)} ou ${x.colour(x.d.byColor[1].key)}` : "Quel coloris"} : quel coloris revient le plus souvent ?`,
    shelf: "Quelle configuration laisse le plus de temps pour réserver ?",
    week: "Qu’est-ce qui a changé ces sept derniers jours ?",
    alerts: "Sur quelles configurations créer des alertes ?",
    method: "Comment nous comptons un retour en stock et la durée d’affichage",
  }),
  hero: {
    restocks: (label) => `retours en stock confirmés du ${label}`,
    exposure: "heures d’affichage, tous magasins cumulés",
    now: (one) => lit(one ? "l’affiche en ce moment" : "magasins l’affichent en ce moment"),
    median: "secondes d’affichage (médiane)",
    total: "retours en stock, toutes configurations",
  },
  easiestLead: (x) => {
    const e = x.d.easiest!;
    return `Le ${x.cfg(e)} arrive en tête sur les deux critères mesurables : il est revenu le plus souvent (${nRestocks(e.restocks)}, ${pct(e.restocks / x.d.n)} du total) et il est resté affiché le plus longtemps au cumul (${hours(e.exposureSec)}), c’est-à-dire le temps pendant lequel un retrait pouvait être réservé. ${e.nowStores > 0 ? `${nStores(e.nowStores)} ${e.nowStores <= 1 ? "l’affiche" : "l’affichent"} à l’instant où vous lisez ceci.` : "Aucun magasin ne l’affiche à l’instant où vous lisez ceci ; le prochain retour en stock apparaît ici en quelques secondes."}`;
  },
  easiestKeys: (x) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      `Les trois premières par affichage cumulé : ${list(L, top3.map((r) => `le ${x.cfg(r)} (${hours(r.exposureSec)})`))}.`,
      d.never.length ? `Jamais revenus en stock${where(x.c)} depuis le ${longDate(d.since)} : ${list(L, d.never.map((r) => x.cfg(r)))}.` : `Chaque configuration est revenue en stock au moins une fois depuis le ${longDate(d.since)}.`,
      d.lifetimes ? `Toutes configurations confondues, un retour en stock est resté affiché ${secs(d.lifetimes.medianSec)} (médiane) ; ${pct(d.lifetimes.within2min)} ont disparu en moins de 2 minutes.` : "La durée d’affichage apparaît dès que dix retours en stock ont une fin connue.",
    ];
  },
  rankCaption: (x) => `Toutes les configurations d’iPhone Duo${where(x.c)}, le plus d’affichage cumulé en premier · du ${longDate(x.d.since)} à aujourd’hui`,
  rankHead: ["Configuration", "Retours en stock", "Magasins", "Affichage cumulé", "Affichage médian", "Affiché maintenant", "Dernier retour en stock"],
  none: "aucun pour l’instant",
  storageLead: (x) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return "Les capacités seront comparées dès l’arrivée des retours en stock ; le tableau ci-dessous est en direct.";
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return `Oui, plus que tout le reste : le ${st[0].key} a représenté ${pct(st[0].share)} des retours en stock et le ${st[1].key} ${pct(st[1].share)}${big ? `, tandis que les modèles 1TB et 2TB réunis n’ont fait que ${pct(big / x.d.n)}` : ""}. Apple expédie surtout les capacités que la plupart des gens commandent ; ce sont aussi celles qu’un magasin reçoit en plusieurs exemplaires dans une même livraison.`;
  },
  groupCaption: (what) => `Retours en stock par ${what === "storage" ? "capacité" : "coloris"}, tous magasins cumulés`,
  groupHead: (what) => [what === "Storage" ? "Capacité" : "Coloris", "Retours en stock", "Part", "Magasins", "Affichage cumulé", "Affichage médian", "Affiché maintenant"],
  storageSwaps: (x) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: `Une alerte sur le ${last} seulement`, yes: `Le ${top} d’abord, le ${last} aussi`, why: `Le ${last} a représenté ${pct(st[st.length - 1].share)} des retours en stock ; le ${top} ${pct(st[0].share)}. Chaque alerte occupe une place de votre forfait.` },
      { no: "Attendre la capacité exacte", yes: `Prendre le ${top} ou le ${second} quand il arrive`, why: `À eux deux, ils ont représenté ${pct(st[0].share + st[1].share)} des retours en stock${where(x.c)} ; une coque et iCloud font que la capacité compte moins que l’attente.` },
    ];
  },
  colourLead: (x) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return "Les coloris seront comparés dès l’arrivée des retours en stock.";
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return `${x.colour(co[0].key)}, mais de peu : ${pct(co[0].share)} des retours en stock contre ${pct(co[1].share)} pour ${x.colour(co[1].key)}, soit ${gap} points d’écart${co[0].medianSec && co[1].medianSec ? ` ; en affichage, ils ont tenu ${secs(co[0].medianSec)} et ${secs(co[1].medianSec)} (médiane)` : ""}. Le coloris fait moins bouger le compte que la capacité. Surveiller un second coloris ajoute ses créneaux de retrait aux vôtres : ${co[1].restocks > 0 ? `${x.colour(co[1].key)} a ajouté ${nRestocks(co[1].restocks)} et ${hours(co[1].exposureSec)} d’affichage${where(x.c)} depuis le ${longDate(x.d.since)}, en plus des ${n(co[0].restocks)} retours en stock et ${hours(co[0].exposureSec)} de ${x.colour(co[0].key)} (toutes capacités)` : `${x.colour(co[1].key)} n’est pas revenu en stock${where(x.c)} depuis le ${longDate(x.d.since)} : il n’aurait donc rien ajouté jusqu’ici`}.`;
  },
  colourKeys: (x) => x.d.byColor.map((g) => `${x.colour(g.key)} : ${nRestocks(g.restocks)} dans ${nStores(g.stores)}, ${hours(g.exposureSec)} d’affichage cumulé${g.nowStores ? `, ${nStores(g.nowStores)} ${g.nowStores <= 1 ? "l’affiche" : "l’affichent"} en ce moment` : ""}.`),
  shelfLead: (x) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return "La durée d’affichage d’un retour en stock se mesure du retour en stock à la vérification suivante qui le voit épuisé ; les premiers chiffres apparaissent quand dix retours en stock d’une configuration ont pris fin.";
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return `Le ${x.cfg(slow)} vous laisse le plus de temps : ${secs(slow.lifetimes!.medianSec)} d’affichage (médiane) avant épuisement, contre ${secs(fast.lifetimes!.medianSec)} pour le ${x.cfg(fast)}. Les configurations qui partent le moins vite sont les grandes capacités, les plus chères — moins d’acheteurs les veulent — : « le plus de temps pour réserver » et « le plus de retours en stock » désignent donc des configurations différentes, et le classement ci-dessus pèse les deux.`;
  },
  shelfCaption: "Durée d’affichage par configuration (retour en stock → vérification suivante en rupture)",
  shelfHead: ["Configuration", "Retours en stock avec fin connue", "Médiane", "Épuisés en moins de 2 min", "Épuisés en moins de 20 min", "Le plus rapide"],
  shelfKeys: (x) => [
    `La moitié des retours en stock avaient disparu en ${x.d.lifetimes ? secs(x.d.lifetimes.medianSec) : "une minute environ"} ; notre alerte part environ ${SPEED.alertSec} s après notre confirmation, et ce qui reste de l’affichage dépend alors de votre téléphone et d’un paiement déjà préparé.`,
    `La durée est un maximum : nous voyons la rupture à la vérification suivante, jusqu’à ${SPEED.checkSec} s plus tard (${SPEED.fastSec} s dans les magasins avec alertes).`,
    "« Épuisé » signifie ici que la page de retrait d’Apple n’affichait plus la configuration dans ce magasin ; combien d’unités cela représentait, Apple ne le dit pas.",
  ],
  weekLead: (x) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return `Aucun retour en stock sur les quatorze derniers jours${where(x.c)} ; le tableau semaine par semaine commence au prochain.`;
    const lead = rows[0];
    return `${cap(nRestocks(tot7))} sur les sept derniers jours${totP ? ` contre ${n(totP)} la semaine précédente (${signed(tot7 / totP - 1)})` : ""}, avec le ${x.cfg(lead)} en tête (${n(lead.last7)}). ${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `Ce n’est pas la configuration en tête depuis le début (${x.cfg(x.d.easiest)}) : la répartition change à chaque livraison, consultez donc ce tableau avant de choisir vos alertes.` : "La configuration en tête depuis le début mène aussi cette semaine."}`;
  },
  weekCaption: "Retours en stock par configuration : 7 derniers jours contre les 7 précédents",
  weekHead: ["Configuration", "7 derniers jours", "7 jours précédents", "Évolution"],
  alertsLead: (x) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? `Créez des alertes sur ${list(L, top.map((r) => `le ${x.cfg(r)}`))} dans les deux ou trois magasins que vous pouvez atteindre le plus vite : cela couvre ${pct(top.reduce((a, r) => a + r.restocks, 0) / x.d.n)} des retours en stock enregistrés jusqu’ici${where(x.c)}. Ajoutez la configuration exacte que vous voulez en quatrième alerte, et prenez celle qui arrive en premier.`
      : `En attendant les premiers retours en stock${where(x.c)}, créez des alertes sur la capacité voulue, dans les deux coloris, dans vos magasins les plus proches.`;
  },
  alertsKeys: (x) => [
    `Les alertes se comptent par magasin × configuration : trois magasins × trois configurations = ${nAlerts(9)}.`,
    `Nous vérifions les magasins avec alertes toutes les ${SPEED.fastSec} secondes et confirmons le retour en stock avant d’envoyer ; la notification part environ ${SPEED.alertSec} s après, et le moment où elle s’affiche sur votre téléphone dépend de l’appareil et de sa connexion : cela, nous ne le mesurons pas.`,
    `${x.one ? "Le" : "Choisissez vos magasins selon la distance, pas selon le nombre de retours en stock : le"} magasin le plus actif est aussi celui que le plus de gens surveillent.`,
  ],
  methodLead: "Un retour en stock, c’est une configuration qui passe d’épuisée à disponible dans un magasin, confirmée par deux vérifications concordantes ; une première observation après une interruption du suivi n’est pas comptée. La durée d’affichage court du retour en stock à la première vérification qui le voit de nouveau épuisé : c’est donc un maximum. « Affichage cumulé » additionne ces durées sur tous les retours en stock de la configuration — la mesure la plus simple du temps pendant lequel un retrait pouvait être réservé. C’est un relevé des affichages passés, pas une probabilité d’achat ni un nombre d’unités vendues : Apple ne publie ni l’un ni l’autre.",
  methodKeys: (x) => [
    `Source : la disponibilité en retrait publiée par Apple pour ${storesPhrase(x)}, lue toutes les ${SPEED.checkSec} secondes par magasin (${SPEED.fastSec} s dans les magasins avec alertes) depuis le ${longDate(x.d.since)}.`,
    "Les magasins qui l’affichent en ce moment et les heures du dernier retour en stock sont en direct ; tout le reste est recalculé dans les cinq minutes.",
    "Citez librement avec un lien : les chiffres bougent, indiquez la date de lecture.",
  ],
  faq: (x): Faq[] => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor;
    return [
      { q: `Quel iPhone Duo est le plus facile à obtenir${where(x.c)} ?`, a: e ? `Personne ne peut dire lequel vous réussirez à acheter : Apple ne publie ni ses allocations ni le nombre de personnes qui essaient. Ce qui se mesure, ce sont les créneaux de retrait passés. Depuis le ${longDate(d.since)}, le ${x.cfg(e)} a été affiché le plus longtemps au total (${hours(e.exposureSec)} sur ${nRestocks(e.restocks)} dans ${nAppleStores(e.stores)})${h ? `, le ${x.cfg(h)} le moins longtemps (${hours(h.exposureSec)} sur ${nRestocks(h.restocks)})` : ""}, sur ${nConfirmed(d.n)} dans ${storesPhrase(x)}. C’est un relevé des affichages passés, pas une prévision pour vous ; pour voir quel changement ajoute le plus de créneaux à vos propres choix — une autre couleur, un autre magasin —, ouvrez « Qu’est-ce qui ajoute le plus de créneaux de retrait ? » dans l’éditeur d’alertes.` : `Trop peu de retours en stock confirmés${where(x.c)} pour le dire ; cette page classe chaque configuration dès qu’ils arrivent.` },
      { q: `Le ${co.length > 1 ? x.colour(co[1].key) : "second coloris"} est-il plus difficile à trouver que le ${co.length > 1 ? x.colour(co[0].key) : "premier"} ?`, a: co.length > 1 && d.n ? `Légèrement : le ${x.colour(co[0].key)} a représenté ${pct(co[0].share)} des retours en stock et le ${x.colour(co[1].key)} ${pct(co[1].share)}. L’écart entre capacités est bien plus grand : choisissez d’abord la capacité, puis créez des alertes sur ses deux coloris.` : "Les coloris seront comparés dès l’arrivée des retours en stock." },
      { q: `L’iPhone Duo 1TB ou 2TB est-il parfois en stock${where(x.c)} ?`, a: (() => { const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage)); const bn = big.reduce((a, r) => a + r.restocks, 0); const most = big.length ? Math.max(...big.map((r) => r.stores)) : 0; return bn ? `Oui, mais rarement : ${nRestocks(bn)} des modèles 1TB et 2TB sur ${n(d.n)} (${pct(bn / d.n)}), dans ${most > 0 ? nStores(most) : "aucun magasin"} au plus. Quand l’un apparaît, il reste affiché plus longtemps (moins d’acheteurs) : une alerte dessus vaut sa place même si elle se déclenche rarement.` : `Pas encore dans nos données${where(x.c)} : aucun retour en stock confirmé d’un modèle 1TB ou 2TB depuis le ${longDate(d.since)}.`; })() },
      { q: "Faut-il créer des alertes sur une configuration ou sur plusieurs ?", a: `Plusieurs, dans peu de magasins : les trois premières configurations ont représenté ${d.n ? pct(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n) : "la plupart"} des retours en stock${where(x.c)}. Trois configurations dans trois magasins proches font neuf alertes, ce qui tient dans un forfait Plus ; ajoutez la configuration exacte que vous voulez en quatrième.` },
      { q: "La répartition est-elle la même dans les autres pays ?", a: `Pas toujours : chaque pays reçoit sa propre dotation, et le classement de sa page peut différer. Les liens sous « Autres pays » ouvrent la même page pour les 18 autres pays suivis par PickupChecker ; la page des États-Unis a l’historique le plus long (depuis le ${longDate("2026-10-29")}).` },
    ];
  },
  sources: { apple: "Apple : configurations et prix de l’iPhone Duo", pickup: "Apple : retrait en magasin", log: "PickupChecker : le journal des retours en stock dont cette page est calculée" },
  ld: (x) => ({
    datasetName: `Retours en stock de l’iPhone Duo par configuration, Apple Store${where(x.c)}`,
    description: `Retours en stock confirmés de l’iPhone Duo dans ${storesPhrase(x)} depuis le ${longDate(x.d.since)}, par configuration (capacité × coloris) : nombre, magasins, affichage cumulé, durée d’affichage médiane, magasins qui l’affichent en ce moment.`,
    measured: ["retours en stock par configuration", "magasins avec un retour en stock", "durée d’affichage en secondes", "durée d’affichage médiane", "magasins qui l’affichent en ce moment"],
  }),
  related: "Pour aller plus loin",
  sameData: "Mêmes données, autres questions",
  otherCountries: "Autres pays",
  questions: { restockTimes: "Quand Apple réapprovisionne-t-il l’iPhone Duo ?", sellOut: "En combien de temps un retour en stock est-il épuisé ?", shortage: "La pénurie s’atténue-t-elle ?", channels: "Apple, opérateur ou revendeur ?", alerts: "Le moyen le plus rapide d’être prévenu", api: "L’API de stock gratuite" },
  setUpAlert: "Créer une alerte",
  logLive: "Journal des retours en stock, en direct",
  faqTitle: "Questions fréquentes",
  onThisPage: "Sur cette page",
};

/* ================================================================== la pénurie s’atténue-t-elle */
const supply: DecideDict["supply"] = {
  crumb: "La pénurie s’atténue-t-elle ?",
  title: (c) => fitTitleW([`La pénurie d’iPhone Duo s’atténue-t-elle ${IN[c.cc]} ?`, `Pénurie d’iPhone Duo ${IN[c.cc]} : vers la fin ?`, "La pénurie d’iPhone Duo s’atténue-t-elle ?"], 49),
  metaDescription: (x) => {
    const { d } = x;
    const w = d.last7;
    return d.trend !== "insufficient"
      ? fitTitleW([
        `${cap(trendWord(d))} retours en stock d’iPhone Duo${where(x.c)} cette semaine : ${n(w.restocks)} dans ${nAppleStores(w.stores)} en 7 jours (${signed(d.change!)} par rapport à la semaine précédente)${w.medianSec ? `, chacun épuisé en ${secs(w.medianSec)} (médiane)` : ""}. L’offre jour par jour, à quoi ressemblerait une détente, et s’il faut attendre.`,
        `${nRestocks(w.restocks)} d’iPhone Duo${where(x.c)} sur les 7 derniers jours (${signed(d.change!)} d’une semaine sur l’autre). L’offre jour par jour, et si la pénurie s’atténue.`,
      ], 160)
      : `La pénurie d’iPhone Duo s’atténue-t-elle${where(x.c)} ? ${nConfirmed(d.n)} en Apple Store depuis le ${longDate(d.since)}, jour par jour, avec ce à quoi ressemblerait une détente et s’il faut attendre ou acheter maintenant.`;
  },
  h1: (x) => `La pénurie d’iPhone Duo se résorbe-t-elle${where(x.c)}, et combien de temps va-t-elle durer ?`,
  intro: (x) => {
    const { d } = x;
    const w = d.last7;
    const nowStores = `${n(d.storesNow)} ${d.storesNow <= 1 ? "magasin en affiche" : "magasins en affichent"} un en ce moment.`;
    if (d.trend === "insufficient") {
      return `Trop tôt pour le dire${where(x.c)} : PickupChecker a commencé le suivi le ${longDate(d.since)}, il y a ${nDays(d.days)}, la première comparaison complète d’une semaine sur l’autre apparaîtra donc le ${longDate(d.comparableFrom)}. Jusqu’ici, ${nConfirmed(d.n)} dans ${n(d.storesEver)} des ${nAppleStores(x.stores)}${d.lifetimes ? `, chacun affiché ${secs(d.lifetimes.medianSec)} (médiane) avant épuisement` : ""} ; ${n(d.storesNow)} ${d.storesNow <= 1 ? "magasin affiche" : "magasins affichent"} un Duo en ce moment. Personne ne peut prédire la fin de la pénurie ; cette page montre les deux chiffres qui le diront en premier — les retours en stock par semaine et les secondes d’affichage — mis à jour à chaque retour en stock.`;
    }
    const verdict = d.trend === "up" ? "L’offre s’améliore" : d.trend === "down" ? "L’offre se resserre" : "L’offre est stable";
    const demand = w.medianSec ? (w.medianSec <= 120 ? `mais la demande l’absorbe toujours : un retour en stock a tenu ${secs(w.medianSec)} (médiane) cette semaine${d.prev7.medianSec ? ` (${secs(d.prev7.medianSec)} la semaine dernière)` : ""}, il n’est donc pas encore plus facile d’en acheter un à la main` : `et la durée d’affichage s’allonge : ${secs(w.medianSec)} (médiane) cette semaine${d.prev7.medianSec ? ` contre ${secs(d.prev7.medianSec)} la semaine dernière` : ""}, premier signe d’une détente`) : "";
    return `${verdict}${where(x.c)} : les Apple Store ont réapprovisionné l’iPhone Duo ${n(w.restocks)} fois sur les sept derniers jours, ${signed(d.change!)} par rapport à la semaine précédente (${n(d.prev7.restocks)}), dans ${nStores(w.stores)} sur ${n(x.stores)}${demand ? ` — ${demand}` : ""}. ${nowStores} Personne ne peut prédire la fin ; les deux chiffres qui le diront en premier sont sur cette page et se mettent à jour à chaque retour en stock.`;
  },
  updated: (x, stamp) => `Mis à jour ${stamp} · données depuis le ${longDate(x.d.since)} · ${nAppleStores(x.stores)} · vérifiés toutes les ${SPEED.checkSec} s`,
  nav: { trend: "Cette semaine", easier: "Plus facile à acheter ?", stores: "Combien de magasins", howlong: "Combien de temps", christmas: "Attendre ou acheter", world: "Autres pays", method: "Notre méthode" },
  h2: (x) => ({
    trend: `Les retours en stock d’iPhone Duo augmentent-ils ou diminuent-ils${where(x.c)} ?`,
    easier: "Devient-il vraiment plus facile d’en acheter un ?",
    stores: `Combien d’Apple Store${where(x.c)} ont déjà eu un iPhone Duo ?`,
    howlong: "Combien de temps la pénurie d’iPhone Duo va-t-elle durer ?",
    christmas: "Continuer d’attendre un retour en stock, ou acheter autrement ?",
    world: `La pénurie s’atténue-t-elle plus vite dans d’autres pays qu’${IN[x.c.cc]} ?`,
    method: "Notre méthode",
  }),
  weekBefore: "semaine précédente",
  goneIn2: "épuisés en moins de 2 minutes",
  storesEverLabel: (one) => lit(one ? "retours en stock confirmés à ce jour" : "magasins avec au moins un retour en stock"),
  hero: { last7: "retours en stock, 7 derniers jours", change: "par rapport aux 7 jours précédents", stores: (one) => lit(one ? "jours avec un retour en stock" : "magasins réapprovisionnés, 7 derniers jours"), median: "secondes d’affichage (médiane), 7 derniers jours", now: (one) => lit(one ? "en affiche un en ce moment" : "magasins en affichent un en ce moment"), sinceLast: "heures depuis le dernier retour en stock" },
  trendLead: (x) => {
    const { d } = x;
    if (d.trend === "insufficient") return `Le tableau quotidien est tout l’historique pour l’instant : ${nRestocks(d.n)} en ${nDays(d.days)}. Une ligne d’une semaine sur l’autre apparaîtra le ${longDate(d.comparableFrom)} ; d’ici là, lisez la tendance jour par jour.`;
    const w = d.last7, p = d.prev7;
    const gap = w.longestGapHours != null ? ` Le plus long intervalle entre deux retours en stock cette semaine a été de ${n(w.longestGapHours)} heures${p.longestGapHours != null ? ` (${n(p.longestGapHours)} la semaine dernière)` : ""}.` : "";
    return `${cap(trendWord(d))} retours en stock cette semaine : ${n(w.restocks)} (${dec1(w.perStoreDay * 7)} par magasin) contre ${n(p.restocks)} la semaine précédente, ${signed(d.change!)}.${gap} Les retours en stock arrivent par vagues liées aux livraisons : un seul jour calme ne dit pas grand-chose, ce sont les totaux sur sept jours qu’il faut regarder.`;
  },
  dailyCaption: (x) => `Retours en stock confirmés par jour local${where(x.c)}, le plus récent en premier (14 derniers jours)`,
  dailyHead: ["Jour", "Retours en stock", "Magasins", "Affichage médian"],
  trendKeys: (x) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? `Jour le plus actif jusqu’ici : ${dateLabel(best.date)}, avec ${nRestocks(best.restocks)} dans ${nStores(best.stores)}.` : "Aucun retour en stock pour l’instant ; le jour le plus actif apparaîtra ici.",
      x.d.sinceLastHours != null && x.d.latest ? `Dernier retour en stock il y a ${x.d.sinceLastHours < 1 ? "moins d’une heure" : `${n(x.d.sinceLastHours)} heures`} : ${x.storeName(x.d.latest.storeNumber)}, ${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}.` : "Aucun retour en stock enregistré pour l’instant.",
      `« En hausse » signifie au moins ${Math.round(0.15 * 100)} % de retours en stock de plus que la semaine précédente ; « en baisse », au moins ${Math.round(0.15 * 100)} % de moins ; entre les deux, la tendance est lue comme stable.`,
    ];
  },
  easierLead: (x) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return "Plus facile veut dire deux choses à la fois : plus de retours en stock, et chacun affiché plus longtemps. La durée d’affichage apparaît quand dix retours en stock de la période ont une fin connue.";
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return `${longer ? "Un peu, oui" : shorter ? "Non, au contraire" : "Pas encore"} : un retour en stock est resté affiché ${secs(w.medianSec)} (médiane) cette semaine${p.medianSec ? ` contre ${secs(p.medianSec)} la semaine dernière` : ""}, et ${pct(w.within2min!)} ont disparu en moins de deux minutes${p.within2min != null ? ` (${pct(p.within2min)} la semaine dernière)` : ""}. Une détente, c’est les deux chiffres qui bougent ensemble — plus de retours en stock et des affichages plus longs ; plus de retours en stock seuls veut dire qu’Apple expédie davantage alors qu’autant de gens attendent.`;
  },
  easierKeys: (x) => [
    "À quoi ressemblera une détente ici : une durée d’affichage médiane au-delà de 20 minutes, la plupart des magasins en affichant un au même moment, des délais de livraison apple.com à moins d’une semaine.",
    `D’ici là, le moyen d’en acheter un reste l’alerte : nous confirmons le retour en stock et envoyons la notification environ ${SPEED.alertSec} s plus tard, bien à l’intérieur de l’affichage médian.`,
    x.d.lifetimes ? `Depuis le début${where(x.c)} : ${nRestocks(x.d.lifetimes.n)} avec fin connue, ${secs(x.d.lifetimes.medianSec)} (médiane), ${pct(x.d.lifetimes.within2min)} épuisés en moins de 2 minutes.` : "Les chiffres de durée d’affichage depuis le début apparaissent après dix retours en stock terminés.",
  ],
  storesLead: (x) => {
    const { d } = x;
    const never = x.stores - d.storesEver;
    return x.one
      ? `${d.storesEver ? `Oui : l’unique Apple Store ${IN[x.c.cc]} a eu ${nConfirmed(d.n)} depuis le ${longDate(d.since)}` : `Pas encore : aucun retour en stock confirmé dans l’unique Apple Store ${IN[x.c.cc]} depuis le ${longDate(d.since)}`}${d.storesNow ? ", et il affiche un Duo en ce moment" : ""}.`
      : `${n(d.storesEver)} des ${nAppleStores(x.stores)}${where(x.c)} (${pct(d.storesEver / x.stores)}) ont eu au moins un retour en stock confirmé d’iPhone Duo depuis le ${longDate(d.since)}${never ? ` ; ${nStores(never)} ${never <= 1 ? "n’en a eu aucun" : "n’en ont eu aucun"}` : ""}. ${n(d.storesNow)} ${d.storesNow <= 1 ? "en affiche" : "en affichent"} un en ce moment. L’offre se répartit inégalement : les magasins phares et ceux des centres commerciaux sont réapprovisionnés le plus souvent, c’est pourquoi le magasin que vous choisissez pour vos alertes compte autant que la configuration.`;
  },
  storesKeys: (x) => [
    `Les magasins classés par nombre de retours en stock, avec les heures locales : la section « où » de la page des heures de retour en stock${where(x.c)}.`,
    "Un magasin jamais réapprovisionné n’est pas un magasin qu’Apple saute : les dotations arrivent par livraison, et plusieurs magasins n’ont reçu leur premier Duo que la deuxième semaine.",
  ],
  howlongLead: (x) => `Personne en dehors d’Apple ne le sait, et nous ne faisons pas de prévision. Ce que montre l’historique${where(x.c)} : ${nRestocks(x.d.n)} en ${nDays(x.d.days)}, ${x.d.trend === "insufficient" ? `une tendance d’une semaine sur l’autre à partir du ${longDate(x.d.comparableFrom)}` : `${trendWord(x.d)} retours en stock cette semaine que la semaine dernière`}, et des durées d’affichage ${x.d.last7.medianSec ? `autour de ${secs(x.d.last7.medianSec)}` : "de quelques minutes au plus"}. Une pénurie se termine selon une séquence que vous pouvez suivre ici : les retours en stock hebdomadaires grimpent, les durées d’affichage passent de quelques secondes à des heures, puis la plupart des magasins en affichent un en même temps et le délai de livraison d’apple.com tombe à quelques jours.`,
  howlongKeys: () => [
    "Signal 1 — les retours en stock hebdomadaires montent pendant deux ou trois semaines (le tableau ci-dessus).",
    "Signal 2 — la durée d’affichage médiane dépasse 20 minutes : les retours en stock survivent à ceux qui actualisent la page.",
    "Signal 3 — le délai de livraison d’apple.com passe sous une semaine et la plupart des magasins en affichent un en même temps.",
    "Le lancement d’un nouveau coloris ou d’une nouvelle capacité remet le compteur à zéro ; gardez l’alerte jusqu’au signal 3.",
  ],
  christmasLead: (x) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Gardez l’alerte active et gardez une commande en livraison dans la file — les deux, pas l’un ou l’autre. Au rythme actuel (${perDay >= 1 ? `environ ${nRestocks(Math.round(perDay))} par jour${where(x.c)}` : `moins d’un retour en stock par jour${where(x.c)}`}${w.medianSec ? `, chacun affiché ${secs(w.medianSec)} (médiane)` : ""}), un magasin surveillé près de chez vous a son tour en quelques jours, et la notification d’un retour en stock confirmé part environ ${SPEED.alertSec} s après que nous l’avons vu. Payer un surcoût ailleurs n’a de sens que si l’attente elle-même vous coûte plus que la marge ; la comparaison des canaux pèse cela honnêtement.`;
  },
  christmasKeys: () => [
    "Commandez d’abord en livraison sur apple.com : la commande garde votre place et s’annule quand un retrait aboutit.",
    "Des alertes sur les deux ou trois configurations les plus réapprovisionnées dans vos magasins les plus proches (la page des configurations dit lesquelles).",
    "Ayez l’app Apple Store connectée, le Duo dans le panier et une carte enregistrée : l’affichage médian est d’une minute environ.",
  ],
  worldLead: (x) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return "Les retours en stock hebdomadaires par magasin de chaque pays seront comparés ici dès que chacun aura une semaine complète de données.";
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return `${top.name} a eu le plus de retours en stock par magasin sur les sept derniers jours (${dec1(top.perStoreDay * 7)} par magasin), ${bottom.name} le moins (${dec1(bottom.perStoreDay * 7)})${mine ? ` ; ${countryLabel(x.c.cc, L)} est à ${dec1(mine.perStoreDay * 7)}` : ""}. Les dotations varient selon le pays et la date de lancement, une détente apparaît donc de façon inégale ; l’historique des États-Unis est le plus long.`;
  },
  worldCaption: "7 derniers jours par pays : retours en stock, retours en stock par magasin, affichage médian, magasins qui en affichent un maintenant",
  worldHead: ["Pays", "Magasins", "Retours en stock (7 j)", "Par magasin", "Affichage médian", "Affiché maintenant"],
  methodLead: `Un retour en stock, c’est une configuration qui passe d’épuisée à disponible dans un magasin, confirmée par deux vérifications concordantes à ${SPEED.checkSec} s d’intervalle (${SPEED.fastSec} s dans les magasins avec alertes) ; une première observation après une interruption du suivi ne compte pas. Les jours sont les jours locaux du magasin. La durée d’affichage court du retour en stock à la première vérification qui le voit de nouveau épuisé — un maximum, jusqu’à la vérification suivante. Les semaines sont les sept derniers jours locaux contre les sept précédents ; une comparaison exige les deux complètes.`,
  methodKeys: (x) => [
    `Source : la disponibilité en retrait publiée par Apple pour ${storesPhrase(x)}, depuis le ${longDate(x.d.since)}.`,
    "Tout sur cette page est recalculé dans les cinq minutes qui suivent un retour en stock ; les magasins qui en affichent un sont en direct.",
    "Citez avec un lien et la date : ces chiffres bougent.",
  ],
  faq: (x): Faq[] => {
    const { d } = x;
    const w = d.last7;
    return [
      { q: `Apple réapprovisionne-t-il encore l’iPhone Duo${where(x.c)} ?`, a: d.n ? `Oui : ${nConfirmed(w.restocks)} sur les sept derniers jours dans ${nAppleStores(w.stores)}${where(x.c)}, ${nRestocks(d.n)} depuis le ${longDate(d.since)}. Le dernier ${d.sinceLastHours != null && d.sinceLastHours < 1 ? "date de moins d’une heure" : d.sinceLastHours != null ? `remonte à ${n(d.sinceLastHours)} heures` : "n’est pas encore enregistré"}.` : `Aucun retour en stock confirmé${where(x.c)} depuis le début du suivi le ${longDate(d.since)} ; cette page se met à jour dans les cinq minutes qui suivent le premier.` },
      { q: `La pénurie d’iPhone Duo se résorbe-t-elle${where(x.c)} ?`, a: d.trend === "insufficient" ? `Trop tôt pour le dire : la première comparaison complète d’une semaine sur l’autre apparaîtra le ${longDate(d.comparableFrom)}. Surveillez deux chiffres — les retours en stock par semaine et les secondes d’affichage ; une détente, c’est les deux qui montent.` : `${cap(trendWord(d))} retours en stock cette semaine que la semaine dernière (${signed(d.change!)})${w.medianSec ? `, et un retour en stock a tenu ${secs(w.medianSec)} (médiane)` : ""}. Une détente, c’est plus de retours en stock et des affichages plus longs en même temps ; pour l’instant, ${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "les deux vont dans le bon sens" : "seule une partie de cela se produit"}.` },
      { q: "Quand l’iPhone Duo sera-t-il facile à acheter ?", a: "Personne en dehors d’Apple ne peut le dire, et PickupChecker ne fait pas de prévision. La séquence à surveiller : les retours en stock hebdomadaires montent pendant deux ou trois semaines, la durée d’affichage médiane dépasse 20 minutes, puis la plupart des magasins en affichent un en même temps et le délai de livraison d’apple.com passe sous une semaine." },
      { q: "Faut-il payer un surcoût plutôt qu’attendre ?", a: `Seulement si l’attente vous coûte plus que la marge : au rythme actuel, un magasin surveillé près de chez vous a son tour en quelques jours, et une alerte part environ ${SPEED.alertSec} s après un retour en stock confirmé. La revente, c’est aussi aucun délai de retour et les risques habituels ; la page de comparaison des canaux les pèse.` },
      { q: "Les fêtes de fin d’année changent-elles la donne ?", a: "La demande monte jusqu’en décembre alors que les livraisons gardent leur rythme : les durées d’affichage tendent à raccourcir plutôt qu’à s’allonger. Gardez une commande en livraison comme filet de sécurité et laissez les alertes attraper le retrait ; annulez celle dont vous n’avez pas besoin." },
    ];
  },
  sources: { newsroom: "Apple Newsroom : l’iPhone Duo arrive dans les Apple Store", pickup: "Apple : retrait en magasin", log: "PickupChecker : le journal des retours en stock dont cette page est calculée", restockTimes: "PickupChecker : quand Apple réapprovisionne l’iPhone Duo" },
  ld: (x) => ({
    datasetName: `Tendance de l’offre d’iPhone Duo, Apple Store${where(x.c)}`,
    description: `Retours en stock confirmés de l’iPhone Duo par jour dans ${storesPhrase(x)} depuis le ${longDate(x.d.since)} : retours en stock, magasins, durée d’affichage médiane, évolution d’une semaine sur l’autre.`,
    measured: ["retours en stock par jour", "magasins avec un retour en stock", "durée d’affichage médiane", "évolution d’une semaine sur l’autre", "magasins qui en affichent un maintenant"],
  }),
  related: "Pour aller plus loin",
  sameData: "Mêmes données, autres questions",
  otherCountries: "Cette page pour d’autres pays",
  questions: { restockTimes: "Quand Apple réapprovisionne-t-il l’iPhone Duo ?", configs: "Quelle configuration est la plus facile à obtenir ?", channels: "Apple, opérateur ou revendeur ?", sellOut: "En combien de temps un retour en stock est-il épuisé ?", howToGet: "Comment obtenir un iPhone Duo", alerts: "Le moyen le plus rapide d’être prévenu" },
  setUpAlert: "Créer une alerte",
  logLive: "Journal des retours en stock, en direct",
  faqTitle: "Questions fréquentes",
  onThisPage: "Sur cette page",
};

/* ================================================================== Apple, opérateur ou revendeur */
const channels: DecideDict["channels"] = {
  crumb: "Apple, opérateur ou revendeur ?",
  title: (c, retailer) => fitTitleW([`iPhone Duo ${IN[c.cc]} : Apple, opérateur ou revendeur ?`, `iPhone Duo ${IN[c.cc]} : Apple, ${retailer} ou opérateur ?`, `iPhone Duo ${IN[c.cc]} : chez Apple ou ailleurs ?`, "iPhone Duo : Apple, opérateur ou revendeur ?"], 49),
  metaDescription: (x) => fitTitleW([
    `Où obtenir vraiment un iPhone Duo${where(x.c)} : retrait en Apple Store (${nConfirmed(x.sup.n)} dans ${nStores(x.stores)} depuis le ${longDate(x.sup.since)}), livraison apple.com, ${list(L, x.ch.carriers.slice(0, 3))}, ${list(L, x.ch.retailers.slice(0, 2))} et revente — ce que chaque canal peut ou non vous dire, et lesquels surveiller.`,
    `Retrait en Apple Store, livraison apple.com, ${list(L, x.ch.carriers.slice(0, 2))}, ${x.ch.retailers[0] ?? "revendeurs"} ou revente pour l’iPhone Duo${where(x.c)} : ce que chaque canal peut vous dire et lesquels surveiller.`,
  ], 160),
  h1: (x) => `Apple Store, opérateur ou revendeur : où obtient-on vraiment un iPhone Duo${where(x.c)} ?`,
  intro: (x) => `Le retrait en Apple Store est le seul canal d’iPhone Duo${where(x.c)} dont on puisse mesurer l’offre : PickupChecker a confirmé ${nRestocks(x.sup.n)} dans ${storesPhrase(x)} depuis le ${longDate(x.sup.since)}, dont ${n(x.sup.last7.restocks)} sur les sept derniers jours, chacun lu sur la page de retrait d’Apple elle-même toutes les ${SPEED.checkSec} secondes. Les opérateurs (${list(L, x.ch.carriers)}) et les revendeurs (${list(L, x.ch.retailers)}) reçoivent leurs propres dotations et ne publient aucun flux de stock : personne — ni nous, ni quiconque — ne peut honnêtement vous donner leurs heures de réapprovisionnement. Ci-dessous : ce que chaque canal peut ou non vous dire, les compromis, et l’ordre dans lequel les surveiller.`,
  updated: (x, stamp) => `Mis à jour ${stamp} · données Apple Store depuis le ${longDate(x.sup.since)} · ${nAppleStores(x.stores)} · vérifiés toutes les ${SPEED.checkSec} s`,
  nav: { compare: "Canal par canal", pickup: "Retrait ou livraison", carriers: "Opérateurs", retailers: "Revendeurs", resale: "Surcoût de la revente", abroad: "Acheter à l’étranger", method: "Nos sources" },
  h2: (x) => ({
    compare: `Quel canal réapprovisionne l’iPhone Duo le plus souvent${where(x.c)} ?`,
    pickup: "Le retrait en Apple Store est-il plus rapide que la livraison apple.com ?",
    carriers: `Faut-il plutôt acheter l’iPhone Duo chez ${x.ch.carriers.length ? list(L, x.ch.carriers.slice(0, 3), 3) : "un opérateur"} ?`,
    retailers: `${x.ch.retailers.length ? list(L, x.ch.retailers.slice(0, 2), 2) : "Les revendeurs"} valent-ils le coup d’œil ?`,
    resale: `Payer un surcoût sur ${x.ch.resale[0] ?? "un site de revente"} en vaut-il la peine ?`,
    abroad: "Peut-on acheter un iPhone Duo à l’étranger et l’utiliser chez soi ?",
    method: "Comment nous savons ce que nous savons",
  }),
  hero: { restocks: "retours en stock confirmés en Apple Store", last7: "sur les 7 derniers jours", now: (one) => lit(one ? "Apple Store en affiche un en ce moment" : "Apple Store en affichent un en ce moment"), channels: "autres canaux, sans flux de stock public" },
  compareLead: (x) => `Le retrait en Apple Store, selon la seule mesure disponible : ${nConfirmed(x.sup.last7.restocks)} sur les sept derniers jours dans ${nStores(x.sup.last7.stores)}${where(x.c)}${x.sup.last7.medianSec ? `, chacun affiché ${secs(x.sup.last7.medianSec)} (médiane)` : ""}. Les opérateurs et les revendeurs sont presque certainement réapprovisionnés aussi — ils reçoivent leurs dotations des mêmes expéditions d’Apple — mais ils affichent un oui/non sur une fiche produit, pas un flux : la comparaison ci-dessous porte sur ce que vous pouvez surveiller, pas sur qui reçoit le plus.`,
  compareCaption: "Les canaux de l’iPhone Duo, comparés honnêtement",
  compareHead: ["Canal", "Ce qu’on sait de son stock", "Comment le surveiller", "L’inconvénient"],
  compareRows: (x) => {
    const r = x.ch;
    return [
      { channel: "Retrait en Apple Store", known: `${nConfirmed(x.sup.n)} depuis le ${longDate(x.sup.since)} ; chaque retour en stock, chaque magasin, horodaté.`, watch: `Une alerte ici (envoyée environ ${SPEED.alertSec} s après confirmation), ou le sélecteur de retrait de l’app Apple Store.`, catch: "Un affichage dure une minute environ ; il faut l’app ouverte et une carte enregistrée." },
      { channel: "Livraison apple.com", known: "Apple affiche un délai d’expédition au paiement ; il bouge chaque jour et n’est jamais un décompte de stock.", watch: "Passez la commande ; le délai sur votre page de commande se met à jour au fil des expéditions d’Apple.", catch: "Des semaines, pas des minutes — mais votre place dans la file est gardée." },
      { channel: `Opérateurs (${list(L, r.carriers)})`, known: "Dotation propre ; stock en ligne affiché par configuration, disponible / en réapprovisionnement. Ni historique, ni flux.", watch: "Leurs apps et leurs localisateurs de boutiques ; un appel à la boutique marche encore.", catch: `${lock(x) ?? "Forfaits, financement et règles d’activation s’appliquent ; le stock varie d’une boutique à l’autre."}` },
      { channel: `Revendeurs (${list(L, r.retailers)})`, known: "Dotation propre, souvent en ligne uniquement pour un produit en lancement ; affichée par configuration sur la fiche produit.", watch: "Leur fiche produit et leur app ; quelques-uns envoient des e-mails de retour en stock.", catch: "Les dotations sont plus petites que celles d’Apple et partent aussi en quelques minutes." },
      { channel: `Revente (${list(L, r.resale)})`, known: "Toujours disponible, à un certain prix.", watch: "—", catch: `Un surcoût, aucune preuve d’achat du fabricant, et ${noReturn(r.returnDays)}.` },
    ];
  },
  compareKeys: (x) => [
    `${n(x.ch.carriers.length + x.ch.retailers.length)} autres vendeurs${where(x.c)} et pas un seul historique de stock public : tout site qui prétend connaître les heures de réapprovisionnement d’un opérateur devine.`,
    "Notre position : surveillez le retrait en Apple Store avec une alerte, gardez une commande en livraison apple.com comme filet de sécurité, et jetez un œil à la fiche d’un revendeur quand vous y êtes déjà.",
  ],
  pickupLead: (x) => `Pour la vitesse, le retrait : une configuration qui apparaît sur la page de retrait se réserve dans la minute et se récupère le jour même, alors qu’une commande en livraison attend le délai d’Apple. Pour la certitude, la livraison : la commande garde votre place quoi qu’il arrive en magasin. ${x.sup.lifetimes ? `Les affichages en retrait${where(x.c)} ont duré ${secs(x.sup.lifetimes.medianSec)} (médiane) et ${pct(x.sup.lifetimes.within2min)} ont disparu en moins de deux minutes — c’est pour cela que l’alerte existe. ` : ""}La bonne réponse, c’est les deux : commandez en livraison aujourd’hui, créez l’alerte de retrait, annulez celle dont vous n’avez pas besoin.`,
  pickupSwaps: () => [
    { no: "Annuler la commande en livraison pour « repartir de zéro »", yes: "La garder jusqu’à avoir le retrait en main", why: "Apple ne publie pas de position dans la file ; une nouvelle commande reçoit simplement le délai du jour, rarement plus court que celui que vous avez." },
    { no: "Actualiser la page de retrait à la main", yes: "Laisser l’alerte la surveiller", why: `Nous vérifions les magasins avec alertes toutes les ${SPEED.fastSec} secondes et envoyons la notification environ ${SPEED.alertSec} s après confirmation ; en actualisant à la main, on voit la plupart des affichages une fois qu’ils ont disparu.` },
    { no: "Passer la commande en retrait au paiement, plus tard", yes: "Réserver le retrait comme nouvelle commande quand l’alerte se déclenche", why: "Les réservations en retrait puisent dans le stock du magasin, les commandes en livraison dans l’entrepôt : ce sont deux files, et celle du retrait est la rapide." },
  ],
  pickupKeys: (x) => [
    `La page d’Apple explique les options de retrait et de livraison${x.ch.returnDays ? ` et le délai de retour de ${n(x.ch.returnDays)} jours pour les deux` : x.ch.returnDays === 0 ? " ; notez qu’Apple à Hong Kong n’accepte aucun retour pour changement d’avis, seulement des échanges pour défaut" : ""} (sources ci-dessous).`,
    "Une réservation en retrait est une commande pour ce magasin ; Apple la met de côté et vous dit quand venir.",
  ],
  carriersLead: (x) => `Si vous voulez un financement, une reprise couplée à un forfait, ou si vous êtes déjà dans une boutique ${x.ch.carriers[0] ?? "d’un opérateur"} avec un exemplaire en rayon — oui. Si vous voulez le téléphone au plus vite, les opérateurs sont une seconde loterie, avec moins de chances et aucun moyen de la surveiller. ${lock(x) ?? "Vérifiez les conditions de verrouillage et de forfait avant d’acheter."} Leurs boutiques en ligne affichent la disponibilité par configuration, un coup d’œil ne coûte donc rien ; n’attendez simplement ni historique, ni notification.`,
  carriersKeys: (x) => [
    `Opérateurs${where(x.c)} : ${list(L, x.ch.carriers)}.`,
    "Le stock d’un opérateur se compte par boutique ; une boutique qui en affiche un en ligne peut ne l’avoir qu’en retrait sur place.",
    "Un iPhone acheté chez un opérateur est le même matériel ; la différence, c’est le contrat qui l’accompagne.",
  ],
  retailersLead: (x) => `Un coup d’œil quand vous y faites déjà vos achats, oui ; une surveillance, non : ${list(L, x.ch.retailers)} affichent l’iPhone Duo par configuration et écoulent leur dotation en ligne en quelques minutes, sans flux auquel s’abonner. Leur avantage : les facilités de paiement et les points de fidélité ; leur inconvénient : une dotation plus petite que celle des magasins Apple.`,
  retailersKeys: (x) => [
    `Revendeurs${where(x.c)} : ${list(L, x.ch.retailers)}.`,
    "Regardez le sélecteur de configuration de la fiche produit : grisé veut dire épuisé en ligne, ce qui ne dit rien de leurs magasins.",
  ],
  resaleLead: (x) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Rarement. Pesez le surcoût contre l’attente qu’il vous épargne : les Apple Store${where(x.c)} ont été réapprovisionnés ${perDay >= 1 ? `environ ${n(Math.round(perDay))} fois par jour` : "moins d’une fois par jour"} cette semaine, et une alerte part environ ${SPEED.alertSec} s après un retour en stock confirmé : un magasin surveillé près de chez vous aboutit en général en quelques jours. En face, ${list(L, x.ch.resale)} n’offrent aucune preuve d’achat du fabricant, ${noReturn(x.ch.returnDays)}, et les risques habituels — un appareil verrouillé par activation, une boîte échangée, un retour « scellé ».`;
  },
  resaleKeys: () => [
    "Si vous achetez quand même d’occasion : rencontrez le vendeur en personne, allumez l’appareil, vérifiez le numéro de série dans Réglages → Général → Informations, et connectez-vous avant de payer.",
    "La garantie Apple suit l’appareil, pas le ticket — mais une preuve d’achat peut être demandée ; une vente entre particuliers ne peut pas vous fournir celle d’Apple.",
    "Un surcoût qui dépasse une semaine d’attente est un surcoût pour l’impatience ; décidez en le sachant.",
  ],
  abroadLead: (x) => `Souvent oui, avec des vérifications : un iPhone acheté chez Apple est vendu déverrouillé dans la plupart des pays, le service de garantie Apple est disponible à l’international avec des exceptions, et le modèle doit prendre en charge les bandes de votre opérateur — et son eSIM, car les pages d’achat d’Apple présentent l’iPhone Duo comme eSIM uniquement dans tous les pays. Les taxes sont le vrai coût : ${x.c.pricesIncludeTax ? "le prix payé à l’étranger inclut une taxe locale que vous ne récupérerez peut-être pas" : "la taxe de vente s’ajoute en caisse"}, et la douane de votre pays peut ajouter des droits au retour. PickupChecker suit ${x.us ? "18 autres pays" : "les États-Unis et 17 autres pays"} : la question du stock elle-même trouve sa réponse sur les pages par pays.`,
  abroadKeys: () => [
    "Avant d’acheter : la page de garantie d’Apple pour savoir où le service est assuré, la liste des bandes et des SIM du modèle, et la prise en charge de l’eSIM par votre opérateur.",
    "Gardez le reçu : le service et tout retour suivent les règles du pays d’achat.",
    "Un téléphone acheté pour quelqu’un resté au pays est quand même un téléphone acheté à l’étranger ; les mêmes vérifications s’appliquent.",
  ],
  methodLead: (x) => `Les chiffres Apple Store de cette page viennent des vérifications de PickupChecker sur ${storesPhrase(x)} toutes les ${SPEED.checkSec} secondes depuis le ${longDate(x.sup.since)} ; un retour en stock ne compte qu’après deux observations concordantes. Les listes d’opérateurs et de revendeurs sont les vendeurs qu’Apple nomme lui-même pour le pays, plus les plus grands revendeurs, avec leurs propres pages pour sources ; ce que nous disons de leur stock est ce que leurs pages affichent : un instantané, pas un historique. Nous ne les aspirons pas et n’affirmons rien sur leurs heures de réapprovisionnement.`,
  methodKeys: () => ["Corrections bienvenues : si un vendeur de cette page ne propose plus l’iPhone Duo, dites-le-nous et il disparaît.", "Citez avec un lien et la date."],
  faq: (x): Faq[] => [
    { q: `Quel canal réapprovisionne l’iPhone Duo le plus vite${where(x.c)} ?`, a: `Le seul canal avec un historique mesurable est le retrait en Apple Store : ${nConfirmed(x.sup.last7.restocks)} sur les sept derniers jours${where(x.c)}${x.sup.last7.medianSec ? `, chacun affiché ${secs(x.sup.last7.medianSec)} (médiane)` : ""}. Les opérateurs et les revendeurs sont réapprovisionnés aussi mais ne publient aucun flux : personne ne peut les classer honnêtement.` },
    { q: "Si j’annule ma commande apple.com et que je recommande, est-ce que je perds ma place ?", a: "Vous obtenez une nouvelle commande avec le délai d’expédition du jour ; Apple ne publie aucune position dans la file. Comparez le délai affiché au paiement avec celui de votre commande actuelle avant d’annuler — il est rarement plus court." },
    { q: "Un iPhone Duo acheté chez un opérateur est-il différent de celui d’Apple ?", a: `Même matériel. ${lock(x) ?? "La différence, c’est le forfait et les éventuelles conditions de verrouillage ou de financement qui l’accompagnent."} Le stock des opérateurs est distinct de celui d’Apple et s’affiche par boutique.` },
    { q: "Acheter chez un revendeur donne-t-il droit au délai de retour d’Apple ?", a: x.ch.returnDays ? `Non — c’est la politique du revendeur qui s’applique. Le délai de ${n(x.ch.returnDays)} jours d’Apple vaut pour les achats faits chez Apple (apple.com et Apple Store).` : x.ch.returnDays === 0 ? "Apple à Hong Kong n’accepte lui-même aucun retour pour changement d’avis (échanges pour défaut uniquement) : comparez la politique du revendeur, certains y sont plus généreux qu’Apple." : "Non — c’est la politique du revendeur qui s’applique ; le délai de retour d’Apple ne couvre que les achats faits chez Apple." },
    { q: "Quels opérateurs Apple cite-t-il pour l’iPhone Duo ?", a: x.c.cc === "us" || x.c.cc === "jp" ? `La page d’achat d’Apple${where(x.c)} nomme ${list(L, x.ch.carriers)} ; dans tous les autres pays, elle le vend déverrouillé sans étape opérateur.` : `La page d’achat d’Apple${where(x.c)} vend l’iPhone Duo déverrouillé et ne nomme aucun opérateur ; ${list(L, x.ch.carriers)} sont les réseaux qu’Apple indique comme compatibles avec l’iPhone dans le pays, et ils le vendent à leurs propres conditions.` },
    { q: "Puis-je utiliser un iPhone Duo acheté à l’étranger avec mon opérateur ?", a: "En général oui, si le modèle prend en charge les bandes de votre opérateur, si celui-ci propose l’eSIM (l’iPhone Duo est eSIM uniquement partout) et si l’appareil est déverrouillé, ce qui est le cas des ventes d’Apple dans la plupart des pays. Le service de garantie est international avec des exceptions ; taxes et droits de douane sont le vrai surcoût." },
  ],
  sources: { buy: "Apple : acheter l’iPhone Duo", pickup: "Apple : retrait en magasin et livraison", returns: "Apple : retours et délai de retour", warranty: "Apple : service de garantie par pays", log: "PickupChecker : le journal des retours en stock dont cette page est calculée" },
  ld: (x) => ({
    description: `Retrait en Apple Store, livraison apple.com, opérateurs, revendeurs ou revente pour l’iPhone Duo${where(x.c)} : retours en stock mesurés en Apple Store, et ce que les autres canaux peuvent ou non vous dire.`,
  }),
  related: "Pour aller plus loin",
  sameData: "Mêmes données, autres questions",
  otherCountries: "Cette page pour d’autres pays",
  questions: { howToGet: "Comment obtenir un iPhone Duo", whereToBuy: "Où en acheter un aujourd’hui", shortage: "La pénurie s’atténue-t-elle ?", configs: "Quelle configuration est la plus facile à obtenir ?", restockTimes: "Quand Apple réapprovisionne-t-il l’iPhone Duo ?", alerts: "Le moyen le plus rapide d’être prévenu" },
  setUpAlert: "Créer une alerte",
  logLive: "Journal des retours en stock, en direct",
  faqTitle: "Questions fréquentes",
  onThisPage: "Sur cette page",
};

/* ================================================================== l’API publique */
const api: DecideDict["api"] = {
  crumb: "API de stock",
  title: (c) => fitTitleW([`API de stock iPhone Duo ${IN[c.cc]} : Apple Store en direct`, `API de stock iPhone Duo ${IN[c.cc]} (JSON gratuit)`, `API stock iPhone Duo ${IN[c.cc]} (JSON gratuit)`, `API de stock iPhone Duo (${countryLabel(c.cc, L)})`], 49),
  metaDescription: (x) => fitTitleW([
    `Une API JSON gratuite, en lecture seule, pour le stock en retrait de l’iPhone Duo dans ${nAppleStores(x.stores)}${where(x.c)} (${n(x.worldStores)} dans ${n(x.countries)} pays) : disponibilité actuelle par magasin et configuration, retours en stock confirmés des dernières 24 heures, sans clé, cache de 30 s. Endpoints, exemples curl/Python/JavaScript, limites, et quand un script bat une alerte.`,
    `API JSON gratuite pour le stock iPhone Duo dans ${nAppleStores(x.stores)}${where(x.c)} : disponibilité par magasin, retours en stock des dernières 24 h, sans clé. Endpoints, exemples et limites.`,
  ], 160),
  h1: (x) => `Existe-t-il une API ou un script pour surveiller le stock d’iPhone Duo dans les Apple Store${where(x.c)} ?`,
  intro: (x) => `Oui : PickupChecker publie une API JSON gratuite, en lecture seule, qui couvre ${storesPhrase(x)} (${n(x.worldStores)} magasins dans ${n(x.countries)} pays au total), construite à partir de vérifications toutes les ${SPEED.checkSec} secondes par magasin et mise en cache 30 s sur le CDN, sans clé ni inscription. Une requête renvoie la disponibilité en retrait actuelle de l’iPhone Duo dans chaque magasin, par configuration ; une seconde renvoie les retours en stock confirmés des dernières 24 heures. En ce moment, ${n(x.storesNow)} des ${nStores(x.stores)}${where(x.c)} en ${x.storesNow <= 1 ? "affiche" : "affichent"} un et ${nRestocks(x.restocks24)} ont été confirmés sur les dernières 24 heures. Ci-dessous : les endpoints, des exemples qui fonctionnent en curl, Python et JavaScript, la référence des champs, les limites — et pourquoi un script qui interroge l’API à l’intervalle du cache de 30 secondes reste plus lent qu’une notification.`,
  updated: (x, stamp) => `Mis à jour ${stamp} · ${nAppleStores(x.stores)}${where(x.c)} · vérifiés toutes les ${SPEED.checkSec} s · API en cache 30 s`,
  nav: { endpoints: "Endpoints", examples: "Exemples", fields: "Champs", limits: "Limites et conditions", script: "Script ou alerte ?", apple: "Interroger apple.com", method: "D’où viennent les données" },
  h2: (x) => ({
    endpoints: `Que renvoie l’API de stock iPhone Duo${where(x.c)} ?`,
    examples: "Comment l’appeler depuis curl, Python ou JavaScript ?",
    fields: "Que signifient les champs ?",
    limits: "À quelle fréquence puis-je interroger l’API, et à quelles conditions ?",
    script: "Écrire mon propre script, ou simplement utiliser les alertes ?",
    apple: "Puis-je interroger apple.com moi-même à la place ?",
    method: "D’où viennent les données",
  }),
  hero: { stores: (one) => lit(one ? "Apple Store couvert" : "Apple Store couverts"), now: "affichent un iPhone Duo en ce moment", restocks24: "retours en stock confirmés, dernières 24 h", cache: "secondes de cache de l’API" },
  perMinute: "requêtes par minute et par adresse",
  keysNeeded: "clé API nécessaire",
  endpointsLead: (x) => `Trois endpoints GET, tous en JSON, tous sous https://pickupchecker.com/api/v1 : \`stock\` donne chaque Apple Store${where(x.c)} avec les configurations qu’il affiche en retrait en ce moment et l’heure de sa dernière vérification ; \`restocks\` donne les retours en stock confirmés des 1 à 168 dernières heures, le plus récent en premier, en précisant si chacun est encore affiché ; \`iphone-duo\` est un raccourci vers \`stock?model=duo\`. Le code pays va dans le chemin (${x.c.cc}${x.c.cc === "uk" ? ", gb accepté aussi" : ""}) ; les modèles sont duo, 18-pro et 18-pro-max.`,
  endpointsCaption: "Endpoints (remplacez {country} par us, ca, uk, au, de, fr, it, es, jp, kr, hk, sg, ae, ch, nl, se, tw, at ou be)",
  endpointsHead: ["Endpoint", "Renvoie", "Paramètres"],
  endpointsRows: (x) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: "Chaque magasin : in_stock, les configurations disponibles, last_checked_at, last_in_stock_at ; un résumé avec stores_in_stock.", params: "model (duo | 18-pro | 18-pro-max), storage (ex. 512GB), color (ex. night-sky)" },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: "Retours en stock confirmés, le plus récent en premier : at, store, configuration, still_listed.", params: "model, hours (1–168, 24 par défaut), limit (1–200, 100 par défaut)" },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: "Redirige vers stock?model=duo.", params: "—" },
    { path: "/api/v1", returns: "Cette liste, les pays et les modèles, les limites.", params: "—" },
  ],
  examplesLead: "Copiez l’un de ces exemples ; chacun affiche les magasins qui proposent un iPhone Duo en ce moment. Sans clé, sans autre en-tête qu’un User-Agent qui nomme votre script (pour que nous puissions vous écrire s’il se comporte mal).",
  exampleTitles: { curl: "curl (n’importe quel shell)", python: "Python 3, bibliothèque standard uniquement", node: "JavaScript (Node 18+ ou un navigateur)" },
  fieldsLead: "Chaque champ est en snake_case et chaque heure en ISO 8601, en UTC. Les identifiants de magasin sont ceux d’Apple (numéros R) : ils correspondent aux pages magasin d’Apple et aux URL de ce site.",
  fieldsCaption: "Référence des champs",
  fieldsHead: ["Champ", "Type", "Signification"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "Moment où cette réponse a été calculée ; le CDN peut la servir jusqu’à 30 s." },
    { f: "country.code / name / currency", t: "string", m: "Le pays des magasins." },
    { f: "configurations[]", t: "object", m: "Les références couvertes par la requête, avec la capacité et le coloris tels qu’Apple les écrit." },
    { f: "summary.stores_in_stock", t: "integer", m: "Magasins qui affichent en retrait au moins une configuration couverte en ce moment." },
    { f: "stores[].store_number", t: "string", m: "L’identifiant du magasin chez Apple, ex. R085." },
    { f: "stores[].in_stock", t: "boolean", m: "Au moins une configuration couverte est affichée en retrait." },
    { f: "stores[].available[]", t: "object", m: "Les configurations affichées : part_number, storage, color." },
    { f: "stores[].last_checked_at", t: "string | null", m: `Dernière lecture de la page de retrait d’Apple pour ce magasin (normalement il y a moins de ${SPEED.checkSec} s).` },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "Dernier moment où ce magasin a affiché une configuration couverte." },
    { f: "restocks[].at", t: "string", m: "Moment où la configuration est passée d’épuisée à disponible (confirmé par deux vérifications)." },
    { f: "restocks[].still_listed", t: "boolean | null", m: "Si ce magasin l’affiche encore au moment de la réponse." },
    { f: "attribution", t: "object", m: "La source, la mention de licence et cette page." },
  ],
  limitsLead: "Interrogez l’API à un intervalle de 30 secondes ou plus par endpoint — les réponses sont mises en cache aussi longtemps sur le CDN, un intervalle plus court renvoie le même JSON — et restez sous 60 requêtes par minute depuis une même adresse, la limite qui atteint nos serveurs. Les données sont libres d’utilisation, y compris commerciale, à une condition : afficher « Source : PickupChecker » avec un lien vers pickupchecker.com (ou la page du magasin ou du pays) partout où les chiffres apparaissent. Sans clé, sans inscription, CORS ouvert : une page web peut l’appeler directement.",
  limitsKeys: () => [
    "Une réponse 429 signifie plus de 60 requêtes en une minute depuis votre adresse ; attendez le nombre de secondes indiqué par Retry-After.",
    "Les changements incompatibles passent par un nouveau chemin de version (/api/v2) ; sous v1, les champs sont ajoutés, jamais renommés.",
    "Merci d’indiquer un User-Agent qui nomme votre projet et un contact ; nous n’avons jamais bloqué un script poli.",
  ],
  scriptLead: (x) => `Si vous voulez un tableau de bord, un bot Discord, une feuille de calcul ou une étude, écrivez le script : l’API est faite pour ça. Si vous voulez vraiment acheter un iPhone Duo, le script est l’outil le plus lent : il voit un retour en stock à sa prochaine requête, jusqu’à 30 s plus tard, puis doit encore vous prévenir ; notre notification lit les mêmes magasins toutes les ${SPEED.fastSec} secondes, confirme le retour en stock et part environ ${SPEED.alertSec} s après — ${x.storesNow !== undefined ? "à l’intérieur de l’affichage médian d’une minute environ" : "à l’intérieur de l’affichage médian"}. Beaucoup font les deux : l’alerte pour acheter, l’API pour observer.`,
  scriptCaption: "Un script d’interrogation face à une notification",
  scriptHead: ["", "Votre script sur cette API", "Alerte PickupChecker"],
  scriptRows: () => [
    { k: "Voit un retour en stock après", a: "jusqu’à 30 s (cache) + votre intervalle", b: `notification envoyée environ ${SPEED.alertSec} s après notre vérification` },
    { k: "Atteint votre téléphone", a: "ce que vous construisez (e-mail, bot, SMS)", b: "une notification de l’app sur l’écran d’accueil" },
    { k: "Magasins surveillés", a: "tous, à chaque appel", b: `vos magasins toutes les ${SPEED.fastSec} s, tous les magasins toutes les ${SPEED.checkSec} s` },
    { k: "Coût", a: "gratuit", b: "un forfait pour les alertes ; ce site reste gratuit à lire" },
  ],
  appleLead: "Vous pouvez, dans certaines limites : la page de retrait d’apple.com répond par magasin et par configuration, et c’est exactement ce que nous lisons. Ce qui manque à un script fait une fois, c’est le soin — une rotation IPv6 pour qu’Apple continue de répondre, une règle de deux observations pour qu’un « indisponible » qui clignote ne devienne pas un faux retour en stock, la gestion du fuseau horaire de chaque magasin, et un historique tenu depuis le jour du lancement. Si vous voulez seulement la réponse, l’API est ce travail déjà fait ; si vous voulez apprendre, notre page de méthode explique chaque pièce.",
  appleKeys: () => [
    "La page d’Apple est un instantané : elle dit maintenant, jamais combien de temps un affichage a duré ni quand était le précédent.",
    `Nos vérifications sont espacées de ${SPEED.checkSec} s par magasin et jamais de moins de ${SPEED.fastSec} s ; un script qui interroge apple.com plus fort que cela se fait bloquer et n’apprend rien.`,
  ],
  methodLead: (x) => `Chaque chiffre vient de PickupChecker, qui lit la disponibilité en retrait en magasin publiée par Apple pour ${storesPhrase(x)} toutes les ${SPEED.checkSec} secondes (toutes les ${SPEED.fastSec} secondes dans les magasins avec alertes). Un changement n’est validé qu’après deux observations concordantes ; la première observation après une interruption n’est pas un retour en stock. L’API sert les mêmes tables que les pages de ce site ; rien n’est échantillonné ni estimé.`,
  methodKeys: () => ["La méthode en détail : la page « comment ça marche ».", "L’attribution est tout le prix ; un lien retour garde cette API gratuite."],
  faq: (x): Faq[] => [
    { q: `Existe-t-il une API gratuite pour le stock d’iPhone Duo dans les Apple Store${where(x.c)} ?`, a: `Oui — celle de PickupChecker, à https://pickupchecker.com/api/v1/${x.c.cc}/stock : chaque Apple Store${where(x.c)} avec les configurations qu’il affiche en retrait en ce moment, en JSON, sans clé, cache de 30 s. Un second endpoint renvoie les retours en stock confirmés des dernières 24 heures.` },
    { q: "Apple a-t-il une API de stock officielle ?", a: "Pas de publique. La page de retrait d’apple.com peut être lue par magasin et par configuration, ce que fait ce site avec soin (rotation, confirmation, fuseaux horaires) ; l’API proposée ici est ce travail exposé en JSON." },
    { q: "Les données sont-elles à jour ?", a: `Chaque magasin est vérifié toutes les ${SPEED.checkSec} secondes (toutes les ${SPEED.fastSec} secondes dans les magasins avec alertes) et la réponse de l’API est mise en cache 30 s : un chiffre a donc au plus 45 s environ ; last_checked_at vous le dit exactement.` },
    { q: "Puis-je l’utiliser dans un produit commercial ?", a: "Oui, avec attribution : « Source : PickupChecker » avec un lien vers pickupchecker.com partout où les données s’affichent, et un intervalle d’interrogation de 30 s ou plus. Aucune clé n’est nécessaire." },
    { q: "Un script me donnera-t-il un iPhone Duo plus vite qu’une alerte ?", a: `Non : un script voit un retour en stock à sa prochaine requête, jusqu’à 30 s plus tard ; l’alerte le confirme et part environ ${SPEED.alertSec} s après que nous l’avons vu. Le script pour observer, l’alerte pour acheter.` },
  ],
  sources: { pickup: "Apple : retrait en magasin", method: "PickupChecker : comment fonctionnent les vérifications", log: "PickupChecker : le journal des retours en stock" },
  ld: (x) => ({
    description: `API JSON gratuite pour la disponibilité en retrait de l’iPhone Duo dans ${storesPhrase(x)} : stock actuel par magasin et configuration, retours en stock confirmés des dernières 24 heures.`,
  }),
  related: "Pour aller plus loin",
  sameData: "Mêmes données, autres questions",
  otherCountries: "Cette page pour d’autres pays",
  questions: { alerts: "Le moyen le plus rapide d’être prévenu", howItWorks: "Comment fonctionnent les vérifications", restockTimes: "Quand Apple réapprovisionne-t-il l’iPhone Duo ?", shortage: "La pénurie s’atténue-t-elle ?", configs: "Quelle configuration est la plus facile à obtenir ?", stockChecker: "Vérificateur de stock iPhone Duo" },
  setUpAlert: "Créer une alerte",
  tryIt: "Ouvrir le JSON en direct",
  faqTitle: "Questions fréquentes",
  onThisPage: "Sur cette page",
};

export const decide: DecideDict = { configs, supply, channels, api };
