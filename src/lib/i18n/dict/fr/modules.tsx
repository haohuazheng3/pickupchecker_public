/**
 * Chaînes françaises : modules — retours en stock, magasins et stock (src/components/{restocks,stores,stock}).
 * `label` est déjà une expression de lieu avec sa préposition (« à Paris », « dans le Rhône », « chez Apple Opéra »,
 * « ici »). Les nombres arrivent bruts (num / plural) ; durées, heures et dates arrivent déjà formatées.
 */
import type { Dict } from "../en";
import { num, plural } from "@/lib/i18n/format";

const n = (v: number) => num("fr", v);
const restocks = (v: number) => plural("fr", v, { one: "# retour en stock", other: "# retours en stock" });
const soldouts = (v: number) => plural("fr", v, { one: "# rupture", other: "# ruptures" });

export const modules: Dict["modules"] = {
  daily: {
    empty: (label, days) => `Aucun retour en stock ni rupture enregistré ${label} sur les ${days} derniers jours : le graphique se remplit dès le premier.`,
    summary: (r, s, label, days, activeDays) => `${restocks(r)} et ${soldouts(s)} ${label} sur les ${days} derniers jours, répartis sur ${plural("fr", activeDays, { one: "# jour", other: "# jours différents" })}.`,
    busiest: (day, r) => <> Le jour le plus actif : <b className="text-ink">{day}</b>, avec {n(r)}.</>,
    barAria: (day, r, s) => `${day} : ${restocks(r)}, ${soldouts(s)}`,
    barTitle: (day, r, s) => `${day} : ${restocks(r)} · ${soldouts(s)}`,
    legendRestocks: "retours en stock",
    legendSoldouts: "ruptures",
  },

  last24: {
    title: (label) => `Retours en stock d’iPhone Duo ${label} sur les dernières 24 heures`,
    asOf: (when) => `au ${when}`,
    localTime: (when) => `${when}, heure locale`,
    anAppleStore: "un Apple Store",
    unknown: "Le décompte des dernières 24 heures est momentanément illisible ; le stock en direct et le journal des retours en stock de cette page ne sont pas touchés.",
    none: (label, asOf) => <><b className="text-ink">Aucun retour en stock d’iPhone Duo {label} sur les dernières 24 heures</b> ({asOf}).</>,
    some: (o) => (
      <>Sur les dernières 24 heures, l’iPhone Duo est revenu en stock <b className="text-ink">{plural("fr", o.restocks, { one: "# fois", other: "# fois" })} {o.one ? o.label : `dans ${n(o.withStores)} ${o.allStores > 1 ? `des ${n(o.allStores)} Apple Store` : "Apple Store sur 1"} ${o.label}`}</b> ; le dernier : <b className="text-ink">{o.config}</b>{o.store != null && <> chez {o.store}</>}, {o.when}, heure locale.</>
    ),
    tileRestocks: "retours en stock confirmés · 24 h",
    tileConfigsBack: "configurations revenues en stock",
    tileStores: (configs, allConfigs) => `magasins avec un retour en stock${configs ? ` · ${plural("fr", configs, { one: "# configuration", other: "# configurations" })} sur ${n(allConfigs)}` : ""}`,
    tileLatest: (config, store) => <>dernier · {config}{store != null && <> · {store}</>}</>,
    tileBefore: (config, store, day) => <>le précédent · {config}{store != null && <> · {store}</>} · {day}</>,
    tileNoEarlier: "aucun retour en stock plus ancien enregistré",
    caption: (label, asOf) => `Retours en stock confirmés de chaque configuration d’iPhone Duo ${label}, dernières 24 heures, au ${asOf}`,
    thConfig: "Configuration",
    thRestocks: "Retours en stock",
    thStores: "Magasins",
    thLast: "Dernier retour en stock (heure locale)",
    thNow: "En stock maintenant",
    ofStores: (k, total) => `${n(k)} sur ${n(total)}`,
    noneIn24: "aucun en 24 h",
    yes: "oui",
    no: "non",
    countedTitle: "Comment les retours en stock sont comptés",
    counted: "Nos propres vérifications du retrait en magasin sur apple.com : chaque magasin toutes les 15 secondes, les magasins avec alertes toutes les 5. Un retour en stock n’est enregistré que si deux vérifications concordent ; la toute première observation d’un magasin ne compte pas ; les signalements d’autres sites de suivi ne sont jamais mélangés aux nôtres.",
    alert: (label) => `M’alerter${label != null ? ` ${label}` : ""} → le prochain en quelques secondes`,
  },

  clock: {
    none: (label, days) => `Aucun retour en stock enregistré ${label} sur les ${days} derniers jours pour l’instant.`,
    thin: (total, label, days, dates) => `${restocks(total)} ${label} sur les ${days} derniers jours${dates != null ? ` (sur ${plural("fr", dates, { one: "# jour", other: "# jours" })})` : ""} : trop peu pour dégager une tendance pour l’instant.`,
    pattern: (total, label, days, hour, day) => (
      <>{restocks(total)} {label} sur les {days} derniers jours. La plupart arrivent vers <b className="text-ink">{hour}</b>, heure locale{day ? <>, et le <b className="text-ink">{day}</b> est le jour le plus actif</> : null}.</>
    ),
    byHour: (zone) => `Par heure · ${zone}`,
    byWeekday: "Par jour de la semaine",
    barReported: (k) => ` (+${n(k)} ${k > 1 ? "signalés" : "signalé"} par d’autres sites de suivi)`,
    barReportedTitle: (bar, k) => `${bar} : ${n(k)} ${k > 1 ? "signalés" : "signalé"} par d’autres sites de suivi`,
    legendOurs: "Confirmés par PickupChecker",
  },

  feed: {
    empty: "Aucun retour en stock enregistré pour l’instant.",
    available: "Disponible",
    soldOut: "Épuisé",
    soldOutAt: (time) => <>épuisé {time}</>,
    since: (time) => <>depuis {time}</>,
    restockedAt: (time) => <>revenu en stock {time}</>,
    mapAria: (store) => `Voir ${store} sur la carte`,
    map: "Carte",
    buyAria: (model, config) => `Acheter l’${model} ${config} sur apple.com`,
    buy: "Acheter sur apple.com",
  },

  byConfig: {
    empty: (label, days) => `Aucune configuration n’est revenue en stock ${label} sur les ${days} derniers jours : pas encore de classement.`,
    intro: (label, days) => `Les configurations revenues en stock ${label} sur les ${days} derniers jours, les plus fréquentes d’abord.`,
    times: (k) => `${n(k)}×`,
    alert: "M’alerter",
  },

  sellout: {
    typical: (label, band) => `Un retour en stock typique d’iPhone Duo ${label} a été épuisé en ${band} environ.`,
    half: (label, duration) => `La moitié des retours en stock ${label} ont été épuisés en moins de ${duration}.`,
    none: (label, days) => `Aucun retour en stock ${label} n’a été épuisé sur les ${days} derniers jours pour l’instant.`,
    whatDuo: "iPhone Duo",
    whatAll: "tous les iPhone",
    tileHalf: (what) => <>moitié épuisée en · {what}</>,
    tileWithin30: "épuisés en 30 s max",
    tileWithin60: "épuisés en 1 min max",
    tileFastest: (k, days) => <>le plus rapide · {restocks(k)} épuisés, {days} j</>,
    caption: (days) => `Par iPhone, ${days} derniers jours`,
    thIphone: "iPhone",
    thSoldOut: "Épuisés",
    thHalf: "Moitié épuisée en",
    thWithin30: "≤ 30 s",
    thWithin60: "≤ 1 min",
    thFastest: "Le plus rapide",
    each: "Retour en stock par retour en stock",
    barNote: (full) => `barre = secondes d’affichage · pleine à ${full}`,
    stillListed: (duration) => `toujours affiché · ${duration}`,
    approx: (range) => `≈ ${range}`,
    measuredTitle: "Comment c’est mesuré",
    measured: (estimated) =>
      `« Épuisé en 45–60 s » signifie que la configuration était encore affichée lors de notre vérification 45 secondes après la première observation, et disparue à celle des 60 secondes. Les magasins avec alertes sont vérifiés toutes les 5 secondes, tous les autres toutes les 15 : c’est la largeur de chaque fourchette${estimated ? " ; ≈ marque les retours en stock antérieurs à l’enregistrement de la dernière vérification, bornés alors par le tour de 15 secondes" : ""}. Une offre plus courte qu’une vérification peut apparaître et disparaître entre deux : la part réelle épuisée en moins de 30 secondes est donc plus élevée qu’indiqué.`,
  },

  configTable: {
    title: "Toutes les configurations dans ce magasin",
    titleAt: (store) => `Toutes les configurations chez ${store}`,
    lookupOff: (hasRows) => `Apple ne propose pas la vérification du retrait en magasin pour ce magasin en ce moment${hasRows ? " (ses dernières réponses figurent ci-dessous)" : ""}`,
    tracked: (k) => plural("fr", k, { one: "# configuration suivie", other: "# configurations suivies" }),
    firstSweep: "Première vérification en cours : les statuts s’affichent d’ici une minute",
    inStock: (k, total) => `${n(k)} sur ${n(total)} en stock`,
    available: "Disponible",
    unavailable: "Indisponible",
    noLookup: "pas de vérification du retrait",
    notChecked: "pas encore vérifié",
    since: (ago) => <>depuis {ago}</>,
    lastAvailable: (ago) => <>dernière disponibilité {ago}</>,
    neverHere: "jamais vu en stock ici",
    buy: "Acheter",
    alertAria: (model, config, store) => `M’alerter quand l’${model} ${config} est disponible chez ${store}`,
    alert: "M’alerter →",
  },

  matrix: {
    store: "Magasin",
    checked: "Vérifié",
    cellTitle: (model, k, total) => `${model} : ${plural("fr", k, { one: "# configuration", other: "# configurations" })} sur ${n(total)} ${k > 1 ? "disponibles" : "disponible"}`,
  },

  nearby: {
    duo: (short, k) => `${short} · ${n(k)}`,
    noDuo: (short) => `pas de ${short}`,
  },

  stockByModel: {
    availableNow: (k, total) => `${plural("fr", k, { one: "# configuration", other: "# configurations" })} sur ${n(total)} ${k > 1 ? "disponibles" : "disponible"} maintenant`,
    noneNow: (total) => `aucune des ${n(total)} configurations en ce moment`,
    lookupOff: "Apple ne propose pas la vérification du retrait ici en ce moment",
    notChecked: "pas encore vérifié",
    more: (k) => `+${n(k)}`,
    checked: (ago) => <>vérifié {ago}</>,
    alert: "M’alerter →",
  },

  storeBlock: {
    checked: (ago) => <>Vérifié {ago} · toutes les 15 s, 5 s avec une alerte</>,
    map: "Voir sur la carte",
    alert: "M’alerter ici",
    alsoIn: (region) => `Aussi : ${region}`,
    acrossLine: "Magasins les plus proches de l’autre côté de la limite de l’État",
    elsewhere: "Magasins les plus proches ailleurs",
  },

  hours: {
    title: "Horaires",
    local: (zone) => `Heure locale · ${zone}`,
    today: (hours, week) => ` · aujourd’hui ${hours} · ${week}`,
    directions: "Itinéraire",
    applePage: "Page du magasin sur apple.com",
    liveMap: "Carte en direct",
    storePage: "Page du magasin",
    closed: "Fermé",
    everyDay: (hours) => `Tous les jours ${hours}`,
    openNow: (closes) => `Ouvert · ferme à ${closes}`,
    opensAt: (opens) => `Ouvre à ${opens}`,
    closedToday: (next) => (next ? `Fermé aujourd’hui · ouvre ${next}` : "Fermé aujourd’hui"),
    closedNow: (next) => (next ? `Fermé · ouvre ${next}` : "Fermé"),
    nextOpen: (day, time) => `${day ?? "demain"} à ${time}`,
  },

  liveStats: {
    inStock: "En stock maintenant",
    storesWith: "Magasins avec stock",
    lastCheck: "Dernière vérification",
    none: "—",
  },

  board: {
    summary: (k, stores, short) => `${plural("fr", k, { one: "# magasin", other: "# magasins" })} sur ${n(stores)} ${k > 1 ? "ont" : "a"} le ${short} en stock`,
    lastCheck: (ago) => <>Dernière vérification {ago}</>,
    firstSweep: "Première vérification en cours.",
    noneListed: (model, storage, color) => `Aucun magasin n’affiche l’${model}${storage ? ` ${storage}` : ""}${color ? ` ${color}` : ""} en ce moment.`,
    more: (k) => `+${n(k)}`,
    seen: (ago) => <>Vu {ago}</>,
    loading: "Chargement du stock",
  },
};
