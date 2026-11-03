/**
 * Chaînes françaises : account (tableau de bord, modules de réassort, pages installation, paiement réussi, tarifs).
 * Les noms de formule et les montants en dollars restent tels quels (facturation en USD partout).
 */
import type { Dict } from "../en";
import { num } from "@/lib/i18n/format";

const n = (v: number) => num("fr", v);
const s = (k: number, one: string, many = `${one}s`) => `${n(k)} ${k > 1 ? many : one}`;

export const account: Dict["account"] = {
  loading: "Chargement",
  meta: { title: "Mes alertes" },
  signedInAs: (email) => `Connecté en tant que ${email}`,
  title: "Mes alertes",
  units: { s: "s", min: "min", taps: "touchers" },

  plan: {
    title: "Formule",
    none: "Pas encore de formule : les alertes sont désactivées",
    summary: (plan, on, limit) => `${plan} · ${n(on)} alerte${on > 1 ? "s" : ""} active${on > 1 ? "s" : ""} sur ${n(limit)}`,
    renews: (date) => ` · renouvellement le ${date}`,
    ends: (date) => ` · se termine le ${date}`,
  },

  sent: {
    title: "Alertes envoyées",
    last: (ago) => `Dernière ${ago}`,
    none: "Rien d’envoyé pour l’instant",
    empty: "Rien d’envoyé pour l’instant.",
    channel: { push: "notification", email: "e-mail" } as Record<string, string>,
    status: { sent: "envoyée", failed: "échec", skipped: "ignorée" } as Record<string, string>,
  },

  fast: {
    title: "Le réserver en 20 secondes",
    sub: "faites tout dès maintenant, sauf les quatre derniers touchers",
    lasts: "durée d’affichage typique d’un Duo",
    push: "confirmé → notification sur votre téléphone",
    tapsLeft: "restent à faire quand la notification arrive",
    steps: [
      { title: "Repérez votre créneau", hint: "les horaires de vos magasins, ci-dessous · prêt 10 min avant" },
      { title: "Préparez le paiement Apple", hint: "capacité + couleur exactes → Livraison et retrait" },
      { title: "Cochez les conditions · ou prenez-le débloqué", hint: "débloqué, payé comptant : aucune case à cocher" },
      { title: "Gardez l’écran allumé", hint: "Verrouillage auto → Jamais · touchez-le toutes les 10–15 min" },
      { title: "Alerte : lisez, ne touchez pas", hint: "Retrait → le magasin indiqué → premier créneau → Apple Pay" },
    ],
    guide: "Le guide en 2 minutes (en anglais)",
    window: "Votre créneau de retour en stock",
  },

  restock: {
    title: "Quand vos magasins sont réapprovisionnés",
    anyIphone: "iPhone",
    and: " et ",
    yours: (k) => (k === 1 ? "votre magasin" : `vos ${n(k)} magasins`),
    Yours: (k) => (k === 1 ? "Votre magasin" : `Vos ${n(k)} magasins`),
    otherStores: (k) => s(k, "autre magasin", "autres magasins"),
    meta: (what, stores, days, zone) => `${what} · ${s(stores, "magasin")} · ${days} derniers jours · ${zone}`,
    busiest: (yours, then) => (then ? `heure la plus active dans ${yours} · puis ${then}` : `heure la plus active dans ${yours}`),
    busiestArea: (stores, zone) => `la plus active sur les ${n(stores)} magasins (${zone})`,
    next: (inHours) => `prochain créneau · ${inHours === 0 ? "dans l’heure" : `dans ${n(inHours)} h`}`,
    typical: "durée d’affichage typique avant épuisement",
    count: (yours, days, total, pattern) => (total === 0 ? `aucun retour en stock dans ${yours} pour l’instant · ${days} derniers jours` : `retours en stock dans ${yours} · ${days} derniers jours${pattern ? "" : " · trop peu pour une tendance"}`),
    byHour: (busiestInGreen) => `Par heure${busiestInGreen ? " · la plus active en vert" : ""}`,
    byWeekday: (busiest) => `Par jour de la semaine${busiest ? ` · le plus actif : ${busiest}` : ""}`,
    hourChart: (yours, zone, items) => `Retours en stock par heure dans ${yours} (${zone}) : ${items}`,
    weekdayChart: (yours, items) => `Retours en stock par jour de la semaine dans ${yours} : ${items}`,
    chartItem: (label, k, reported) => `${label} ${n(k)}${reported ? ` (+${s(reported, "signalé", "signalés")} par d’autres sites de suivi)` : ""}`,
    barTitle: (label, k, yours, area, reported) =>
      `${label} : ${s(k, "retour en stock", "retours en stock")} dans ${yours}${area ? ` · ${n(area.n)} sur tout le fuseau (${area.zone})` : ""}${reported ? ` · ${s(reported, "signalé", "signalés")} par d’autres sites de suivi` : ""}`,
    now: "maintenant",
    allZone: (stores, zone) => `Les ${n(stores)} magasins du fuseau (${zone})`,
    reportMarkBars: "En pointillés",
    reportMarkDots: "Points creux",
    sellTitle: "En combien de temps vos retours en stock sont épuisés",
    sellMeta: (what, stores, days) => `${what} · ${s(stores, "magasin")} · ${days} derniers jours`,
    sellLabel: (yours) => `dans ${yours}`,
  },

  success: {
    metaTitle: "Les alertes sont activées",
    isOn: (plan) => `${plan} est activé`,
    yourPlan: "Votre formule",
    received: "Paiement reçu",
    onPlan: (limit) => `${n(limit)} alertes dans votre formule.`,
    planOn: "Votre formule est activée.",
    pending: "Votre abonnement apparaîtra dans votre compte d’ici une minute.",
    open: "Ouvrir mes alertes",
    another: "Ajouter une alerte",
    saved: (k) => `${s(k, "alerte enregistrée", "alertes enregistrées")} · reçu envoyé par Stripe`,
    pushOn: "Notifications",
    pushNext: "Prochaine étape : les alertes sur votre téléphone",
  },

  install: {
    metaTitle: "Installer l’app : alertes de retour en stock sur l’écran d’accueil",
    metaDescription: "Ajoutez PickupChecker à votre écran d’accueil et recevez une notification dès qu’un iPhone Duo, 18 Pro ou Pro Max est en stock pour le retrait près de chez vous.",
  },

  pricing: {
    metaTitle: "Tarifs : 10 alertes $5, 20 pour $10, 50 pour $20",
    metaDescription: "Alertes de stock iPhone en retrait : vos magasins vérifiés toutes les 5 secondes, une notification environ 3 secondes après un retour en stock. Plus $5/mois pour 10 alertes, Pro $10 pour 20, Max $20 pour 50. Résiliable à tout moment.",
    title: "Tarifs",
    lead: "**Une alerte = un magasin × un iPhone exact.** Consulter le stock est gratuit.",
    chips: ["Tous les Apple Store suivis", "Résiliable à tout moment", "Carte ou Link"],
    fastest: "L’intervalle de vérification publié le plus court de tous les suivis de stock iPhone",
    everyFast: "Vos magasins toutes les **5 secondes** · les autres sites de suivi annoncent de 8 secondes à 15 minutes",
    sellsOut: (band) => `Un retour en stock typique d’iPhone Duo est épuisé en **${band}**, certains en 20 à 30 secondes`,
    band: (range) => `${range} secondes`,
    aboutMinute: "environ une minute",
    sameSpeed: "Toutes les formules ont la même vitesse",
    rechecked: "vos magasins revérifiés",
    toPhone: "du retour en stock confirmé à votre téléphone",
    listing: "durée typique d’affichage d’un Duo, de l’apparition à l’épuisement",
    note: { plus: "1 iPhone × 10 magasins", pro: "2 iPhone × 10 magasins", max: "5 iPhone × 10 magasins" } as Record<string, string>,
    month: "/ mois",
    alerts: (k) => `${n(k)} alertes`,
    perks: ["Vos magasins vérifiés toutes les 5 s, tous les autres toutes les 15 s", "Notification environ 3 s après un retour en stock confirmé"],
    cancel: "Résiliable à tout moment",
    get: (plan) => `Choisir ${plan}`,
    billing: "Facturation Stripe · carte ou Link · changements de formule au prorata",
    refund: "Pas pour vous ? [Remboursement intégral sous 7 jours](/refunds) si aucune alerte de retour en stock ne vous est encore parvenue",
  },
};
