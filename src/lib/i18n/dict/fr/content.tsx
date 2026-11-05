/**
 * Chaînes françaises : content — briques SEO (FAQ, liens, bandeaux de chiffres, pièces produit, sources, widgets en
 * direct), helpers d’enrich (horaires, durées, réponses FAQ, titres), jetons {{…}}, phrase de tendance d’un magasin
 * et textes alternatifs des photos. Les arguments arrivent déjà rédigés pour la langue (nombres, durées, noms).
 */
import type { Dict } from "../en";
import type { Forms } from "@/lib/i18n/format";
import { dans } from "./util";
import { storeTitleVariants } from "./place";

const f = (x: Forms): Forms => x;
/** "de Paris" / "d’Apple Opéra". */
const de = (x: string) => (/^[aeiouyhâéèêîôû]/i.test(x) ? `d’${x}` : `de ${x}`);
type Kind = "state" | "city" | "store" | "model";

export const content: Dict["content"] = {
  hours: {
    closed: "Fermé",
    everyDay: (hours) => `Tous les jours ${hours}`,
    tomorrow: "demain",
    dayAt: (day, time) => `${day} à ${time}`,
    closedTodayOpens: (next) => `Fermé aujourd’hui · ouvre ${next}`,
    closedToday: "Fermé aujourd’hui",
    opensAt: (time) => `Ouvre à ${time}`,
    openNow: (closes) => `Ouvert · ferme à ${closes}`,
    closedNowOpens: (next) => `Fermé · ouvre ${next}`,
    closedNow: "Fermé en ce moment",
  },

  duration: {
    underAMinute: "moins d’une minute",
    pair: (a, b) => `${a} ${b}`,
  },
  listMore: (n) => `${n} autres`,
  nearLine: (place, distance) => `${place} (${distance})`,

  faq: {
    where: (kind: Kind, place: string) => (kind === "store" ? `chez ${place}` : kind === "model" ? `pour l’${place}` : dans(place)),
    nRestocks: f({ one: "# retour en stock", other: "# retours en stock" }),
    restockA: ({ count, where, days, week, peak }) =>
      `${count == null ? `Aucun retour en stock enregistré ${where} sur les ${days} derniers jours` : `${count} ${where} sur les ${days} derniers jours, dont ${week} cette semaine`}${peak ? `, la plupart vers ${peak.hour}, heure locale${peak.day ? `, le plus souvent le ${peak.day}` : ""}` : ""} ; Apple ne publie aucun calendrier.`,
    lastsNone: (where) => `Trop peu de paires retour en stock / rupture ${where} pour mesurer pour l’instant.`,
    lasts: (days, duration) => `Sur les ${days} derniers jours, une configuration revenue en stock est restée disponible environ ${duration} (médiane) avant d’être de nouveau épuisée.`,
    storeIn: (store, line) => `${store} à ${line}`,
    nearestA: (stores) => `${stores}.`,

    modelStockQ: (model) => `Quels Apple Store ont l’${model} en stock en ce moment ?`,
    modelStockNone: (model) => `Aucun à la dernière vérification ; la liste de cette page se met à jour dès qu’un Apple Store américain affiche l’${model} en retrait.`,
    nUsStores: f({ one: "# Apple Store américain", other: "# Apple Store américains" }),
    modelStockSome: (count) => `${count} à la dernière vérification, chacun nommé sur cette page avec les configurations qu’il propose.`,
    priceQ: (model) => `Combien coûte l’${model} ?`,
    priceA: (low, high, storages, colors) => `De ${low} à ${high}, débloqué, selon la capacité (${storages}), en ${colors}.`,
    modelRestockQ: (model) => `À quelle fréquence l’${model} revient-il en stock ?`,
    modelLastsQ: (model) => `Combien de temps dure le stock d’${model} quand il apparaît ?`,
    reserveQ: (model) => `Peut-on réserver l’${model} en retrait ?`,
    reserveA: "Non : dès qu’un magasin affiche une configuration, vous l’achetez sur apple.com en choisissant le retrait en magasin, et elle est alors mise de côté pour votre créneau.",

    storeStockQ: (store, model) => `${store} a-t-il l’${model} en stock ?`,
    nConfigs: f({ one: "# configuration", other: "# configurations" }),
    storeStockYes: (count) => `Oui, ${count} à la dernière vérification ; le tableau de cette page indique la capacité et la couleur.`,
    storeStockNo: (other) => `Pas à la dernière vérification${other ? `, mais il affiche ${other.pro} configurations iPhone 18 Pro et ${other.proMax} 18 Pro Max` : ", ni aucune configuration 18 Pro ou 18 Pro Max"}.`,
    hoursQ: (store) => `Quels sont les horaires ${de(store)} ?`,
    hoursA: ({ hours, today, address, phone }) => `${hours ?? "Les horaires figurent sur cette page"}${today ? ` ; aujourd’hui ${today}` : ""} ; ${address}${phone ? `, ${phone}` : ""}.`,
    storeRestockQ: (store) => `À quelle fréquence ${store} est-il réapprovisionné en iPhone ?`,
    storeLastsQ: (store) => `Combien de temps dure le stock chez ${store} ?`,
    storeNearestQ: (store) => `Quel est l’autre Apple Store le plus proche ${de(store)} ?`,

    placeStockQ: (place, model) => `Quels Apple Store ${dans(place)} ont l’${model} en stock en ce moment ?`,
    placeStockNone: (place, model) => `Aucun à la dernière vérification ; cette page se met à jour dès qu’un magasin ${dans(place)} affiche l’${model} en retrait.`,
    nStores: f({ one: "# magasin", other: "# magasins" }),
    placeStockSome: (count, stores) => `${count} à la dernière vérification : ${stores}.`,
    countQ: (place) => `Combien y a-t-il d’Apple Store ${dans(place)} ?`,
    nAppleStores: f({ one: "# Apple Store", other: "# Apple Store" }),
    countMany: (count, stores) => `${count}, dont ${stores}.`,
    countOne: (count, store) => `${count} : ${store}.`,
    placeRestockQ: (place) => `À quelle fréquence les Apple Store ${dans(place)} sont-ils réapprovisionnés en iPhone ?`,
    placeLastsQ: (place) => `Combien de temps dure le stock ${dans(place)} ?`,
    placeNearestQ: (place) => `Quel est l’Apple Store le plus proche hors ${place} ?`,
  },

  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? `chez ${place}` : kind === "model" ? "dans chaque Apple Store américain" : `dans les Apple Store ${dans(place)}`;
    return [
      "Le stock en retrait se vend sur apple.com : on choisit une configuration et un magasin au moment du paiement, on paie en ligne et on récupère en magasin, souvent le jour même. Il est distinct du stock en rayon et des boutiques des opérateurs.",
      `PickupChecker vérifie chaque configuration suivie ${at} toutes les 15 secondes, et toutes les 5 quand une alerte la vise ; un changement ne compte qu’après une seconde vérification qui le confirme, pour qu’un bug ne devienne jamais un faux retour en stock ni une fausse rupture.`,
      "Chaque changement confirmé est enregistré ; ce journal alimente le graphique et l’historique des retours en stock de cette page.",
    ];
  },
  alertRule: "Une alerte = un magasin, un modèle, une capacité, une couleur ; une notification part quelques secondes après qu’apple.com passe à « disponible ».",

  titles: {
    state: (name, duoNow, stores) => [
      `Apple Store ${name} : l’iPhone Duo dans ${duoNow} des ${stores} magasins`,
      `Apple Store ${name} : stock iPhone Duo en retrait, en direct`,
      `Apple Store ${name} : stock iPhone Duo`,
      `Apple Store ${name} : stock iPhone`,
    ],
    city: (city, code, duoNow, stores) => [
      `Apple Store ${city} (${code}) : l’iPhone Duo dans ${duoNow} des ${stores}`,
      `Apple Store ${city} (${code}) : stock iPhone Duo en retrait`,
      `Apple Store ${city} (${code}) : stock iPhone Duo`,
      `Apple Store ${city} : stock iPhone`,
    ],
    store: (name, region) => storeTitleVariants(name, region),
    model: (name, storesNow) => [
      `Stock ${name} en retrait : ${storesNow} Apple Store l’ont en ce moment`,
      `${name} : en stock dans ${storesNow} Apple Store`,
      `Stock ${name} en retrait, en direct`,
    ],
  },

  tokens: {
    tooFewToMeasure: "trop peu de données pour mesurer pour l’instant",
    noneLoggedYet: "aucun enregistré pour l’instant",
    noneYet: "aucun pour l’instant",
  },

  pattern: {
    none: (days) => `Aucun retour en stock confirmé sur les ${days} derniers jours.`,
    nConfirmed: f({ one: "# retour en stock confirmé", other: "# retours en stock confirmés" }),
    countIn: (count, days) => `${count} sur les ${days} derniers jours`,
    stay: (minutes) => ` ; affiché ~${minutes} min en général avant d’être épuisé`,
    nDays: f({ one: "# jour", other: "# jours" }),
    tooFew: (count, onDays, stay) => `${count}${onDays ? `, répartis sur ${onDays}` : ""} : trop peu pour dégager une tendance pour l’instant${stay}.`,
    usual: (hour, weekday, count, stay) => `Revient généralement en stock vers ${hour}, heure locale${weekday ? `, surtout le ${weekday}` : ""} ; ${count}${stay}.`,
  },

  regionNouns: {
    state: f({ one: "État", other: "États" }),
    province: f({ one: "province", other: "provinces" }),
    area: f({ one: "région", other: "régions" }),
    department: f({ one: "département", other: "départements" }),
    prefecture: f({ one: "préfecture", other: "préfectures" }),
    emirate: f({ one: "émirat", other: "émirats" }),
    canton: f({ one: "canton", other: "cantons" }),
    region: f({ one: "région", other: "régions" }),
    county: f({ one: "comté", other: "comtés" }),
    city: f({ one: "ville", other: "villes" }),
  } as Record<string, Forms>,

  measured: "Comment c’est mesuré",

  faqTitle: "Questions fréquentes",
  breadcrumb: "Fil d’Ariane",
  keepExploring: "Continuer l’exploration",
  browse: {
    storesByState: "Magasins par État",
    allStatesCities: "Tous les États et villes →",
    liveByModel: "Stock en direct par modèle",
    modelStock: (model) => `Stock ${model}`,
    thisPage: "cette page",
    restockLog: (short) => `Journal des retours en stock ${short}`,
    liveMap: "Carte en direct",
    mostStores: "Le plus de magasins",
    allStates: "Tous les États",
    bigCities: "Grandes villes",
    cities: "Villes",
    storesBy: (region) => `Magasins par ${region}`,
    allStoresIn: ({ country }) => <>Tous les Apple Store {dans(country)} →</>,
    allRegions: (regions) => `${/^(provinces|régions|préfectures|villes)$/.test(regions) ? "Toutes les" : "Tous les"} ${regions}`,
  },
  modelCards: "Par iPhone",
  narrative: {
    lastRestock: (config, at, ago) => <>{" "}Dernier retour en stock : {config}{at}, {ago}.</>,
    at: (store) => <> chez {store}</>,
  },
  statStrip: {
    inStockNow: "En stock maintenant",
    ofStores: (n) => `sur ${n} magasins`,
    stores: "Magasins",
    nCities: f({ one: "# ville", other: "# villes" }),
    tracked: "suivis",
    modelNow: (short) => `${short} maintenant`,
    configsInStock: "config. en stock",
    storesWithStock: f({ one: "magasin avec du stock", other: "magasins avec du stock" }),
    restocks24h: "Retours en stock 24 h",
    restocksHint: (week, month, days) => `${week} sur 7 j · ${month} sur ${days} j`,
    sellOuts: (days) => `Ruptures ${days} j`,
    stays: (duration) => `reste ~${duration}`,
    noPairs: "pas encore mesuré",
    lastRestock: "Dernier retour en stock",
    noneYet: "aucun pour l’instant",
    inLastDays: (days) => `sur les ${days} derniers jours`,
  },
  product: {
    chooseIphone: "Choisissez l’iPhone",
    storage: "Capacité",
    color: "Couleur",
    all: "Toutes",
    numbersAre: (unit) => <>Chiffres = {unit} avec du stock en ce moment.</>,
    seen: (ago) => <>vu {ago}</>,
    last: (ago) => <>dernier {ago}</>,
    notSeenYet: "pas encore vu",
    firstCheckPending: "première vérification en attente",
    inStock: "En stock",
    inStockLower: "en stock",
    none: "aucun",
    here: "ici",
    notAvailable: "Indisponible",
    notCheckedYet: "Pas encore vérifié",
    availableForPickup: "Disponible pour le retrait",
    since: (ago) => <> · depuis {ago}</>,
    lastInStock: (ago) => <>Dernière fois en stock {ago}</>,
    neverSeen: "Jamais vu en stock ici pour l’instant",
    firstCheckSoon: "Première vérification d’ici une minute",
    buy: "Acheter sur apple.com",
    checked: (checked, note) => <>Vérifié {checked} · {note}</>,
    checkNote: "toutes les 15 s, 5 s avec une alerte",
  },

  source: (source) => <>Source : {source}</>,
  photoCredit: (link) => <>Photo : {link}</>,
  sources: "Sources",
  allUsStores: "les 269 Apple Store des États-Unis",
  trackerSource: (where, since, asOf) => <>Suivi en direct PickupChecker : chaque configuration d’iPhone Duo, d’iPhone 18 Pro et d’iPhone 18 Pro Max dans {where}, vérifiée toutes les 15 secondes (toutes les 5 pour les magasins avec alertes) depuis le {since} ; chiffres de cette page au {asOf}.</>,
  live: {
    configsCaption: (stores, model) => <>Apple Store (sur {stores}) proposant chaque configuration {model} en retrait en ce moment · en direct</>,
    storage: "Capacité",
    pricesCaption: (model) => <>Prix de l’{model} sur apple.com (débloqué, hors taxes) et stock en retrait en direct</>,
    price: "Prix",
    bestColor: "Meilleure couleur, magasins en ce moment",
    noRestock: (model) => `Aucun retour en stock d’${model} enregistré pour l’instant.`,
    clockLabel: (model) => `pour l’${model} dans tout le pays`,
    storesWithIt: "Magasins qui l’ont en ce moment",
    pairsInStock: "Couples magasin × config. en stock",
    restocksLogged: "Retours en stock enregistrés",
    medianTime: "Durée médiane en stock",
    underOneMin: (min) => `< ${min}`,
  },

  /** Les photos génériques et celles des lieux de France, Belgique, Suisse et Canada ; les autres restent en anglais. */
  photos: {
    "apple-store-pickup-counter": { alt: "Comptoir de retrait en bois avec un panneau « Pickup » dans un Apple Store", caption: "Les commandes en retrait se récupèrent à un comptoir comme celui-ci." },
    "phone-map": { alt: "Mains qui suivent un itinéraire sur une application de cartes, en extérieur", caption: "La distance compte plus qu’on ne le croit quand un retour en stock dure une minute." },
    "phone-card-payment": { alt: "Une femme tient un iPhone et une carte bancaire pour payer en ligne", caption: "Payer en ligne pour un retrait en magasin." },
    "phone-on-box": { alt: "Un smartphone neuf posé sur sa boîte blanche", caption: "Un téléphone neuf, tout juste sorti de sa boîte." },
    "city-map-phone": { alt: "Deux personnes consultent un plan de ville sur un téléphone", caption: "Préparer le trajet jusqu’au magasin." },
    "phone-notification": { alt: "Main tenant un téléphone qui affiche des notifications sur l’écran verrouillé", caption: "Une alerte arrive sur l’écran verrouillé." },
    "apple-store-crowd-inside": { alt: "Une foule fait la queue dans un Apple Store très fréquenté d’un centre commercial", caption: "La foule de la semaine de lancement dans un Apple Store : le stock qui arrive en rayon part en quelques minutes." },
    "apple-store-glass-canopy": { alt: "Apple Store avec façade vitrée et auvent en bois, de nuit", caption: "Un Apple Store vitré, à la nuit tombée." },
    "apple-store-night-vancouver": { alt: "Un Apple Store illuminé la nuit à Vancouver", caption: "Un Apple Store de nuit : le stock en retrait peut apparaître à toute heure, mais il arrive bien plus souvent le matin." },
    "phone-hand-camera": { alt: "Une personne tient un iPhone à triple appareil photo", caption: "Les modèles Pro sont ceux pour lesquels on fait la queue." },
    "place-fr-france": { alt: "La tour Eiffel au-dessus de la Seine et ses bateaux-mouches par une journée ensoleillée", caption: "La tour Eiffel et la Seine, Paris." },
    "place-fr-paris": { alt: "L’avenue des Champs-Élysées et ses arbres vue d’en haut au crépuscule", caption: "Les Champs-Élysées, Paris, au crépuscule." },
    "place-fr-lyon": { alt: "Façades colorées du Vieux Lyon sur les quais, sous la basilique Notre-Dame de Fourvière", caption: "Le Vieux Lyon au pied de la colline de Fourvière." },
    "place-fr-bouches-du-rhone": { alt: "Voiliers dans le Vieux-Port de Marseille, Notre-Dame de la Garde sur la colline", caption: "Le Vieux-Port de Marseille sous Notre-Dame de la Garde." },
    "place-fr-seine-et-marne": { alt: "Le château de Fontainebleau qui se reflète dans son étang", caption: "Le château de Fontainebleau, Seine-et-Marne." },
    "place-fr-yvelines": { alt: "La cour de marbre et la façade dorée du château de Versailles", caption: "Le château de Versailles, Yvelines." },
    "place-be-belgium": { alt: "L’hôtel de ville et les maisons des corporations de la Grand-Place de Bruxelles au coucher du soleil", caption: "La Grand-Place de Bruxelles au coucher du soleil." },
    "place-ch-geneva": { alt: "Vue aérienne du jet d’eau sur le lac Léman, avec la ville et les montagnes en arrière-plan", caption: "Le jet d’eau de Genève sur le lac Léman." },
    "place-ch-zurich": { alt: "Les tours jumelles du Grossmünster au-dessus de la Limmat, dans la vieille ville de Zurich", caption: "Le Grossmünster et la Limmat, Zurich." },
    "place-ca-canada": { alt: "La tour CN et le Rogers Centre au-dessus des gratte-ciel de Toronto, vus de l’autre côté de l’eau par beau temps", caption: "La tour CN et Toronto vus du lac." },
    "place-ca-quebec": { alt: "Le Château Frontenac dominant les toits du Vieux-Québec", caption: "Le Château Frontenac, Québec." },
    "place-ca-ontario": { alt: "Les chutes du Fer-à-Cheval, à Niagara Falls, en Ontario, enveloppées de brume au-dessus de la rivière Niagara", caption: "Les chutes du Fer-à-Cheval, Niagara Falls, Ontario." },
    "place-ca-alberta": { alt: "Le lac Louise et ses sommets enneigés dans le parc national Banff, en Alberta", caption: "Le lac Louise, parc national Banff, Alberta." },
    "place-ca-british-columbia": { alt: "Les tours du centre-ville de Vancouver au-dessus d’une marina, avec les montagnes de la Rive-Nord derrière", caption: "Vancouver et les montagnes de la Rive-Nord, Colombie-Britannique." },
    "place-ca-calgary": { alt: "Les gratte-ciel du centre-ville de Calgary et la tour de Calgary sous un ciel dégagé", caption: "Le centre-ville de Calgary et la tour de Calgary." },
    "place-ca-edmonton": { alt: "Le centre-ville d’Edmonton au-dessus de la rivière Saskatchewan Nord gelée, par une claire journée d’hiver", caption: "Edmonton au-dessus de la rivière Saskatchewan Nord, en hiver." },
    "place-ca-ottawa": { alt: "L’édifice du Centre et la tour de la Paix sur la colline du Parlement, à Ottawa, sous un ciel bleu", caption: "La colline du Parlement, Ottawa." },
    "place-ca-toronto": { alt: "L’ancien hôtel de ville derrière le square Nathan Phillips et son bassin, au centre-ville de Toronto", caption: "Le square Nathan Phillips et l’ancien hôtel de ville, Toronto." },
  },
};
