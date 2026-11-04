/**
 * Textes de notification en français (notification push, e-mail d’alerte, e-mail « notifications arrêtées », ligne
 * du paiement Stripe). Code du poller : aucun import hors types. La typographie française (espaces insécables avant
 * : ; ? ! % et dans « ») est appliquée à la fin, sur chaque chaîne et chaque résultat de fonction.
 */
import type { NotifyText } from "./en";

const nb = (s: string): string => s.replace(/ ([:;?!%»])/g, (_m, p: string) => `${p === ":" || p === "»" ? " " : " "}${p}`).replace(/« /g, "« ");
function typo<T>(d: T): T {
  if (typeof d === "string") return nb(d) as T;
  if (Array.isArray(d)) return d.map((x) => typo(x)) as T;
  if (typeof d === "function") return ((...a: unknown[]) => typo((d as (...x: unknown[]) => unknown)(...a))) as T;
  if (d && typeof d === "object") return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, typo(v)])) as T;
  return d;
}

const raw: NotifyText = {
  pushTitle: (cfg) => cfg,
  pushBody: (where, quote) => `${where}${quote ? ` — ${quote}` : ""}. Touchez pour réserver sur apple.com.`,
  testTitle: "Les notifications PickupChecker sont activées",
  testBody: (time, device) => `Test envoyé à ${time} sur votre ${device}. Les alertes de retour en stock arrivent de la même façon, en quelques secondes.`,
  device: {
    iphoneApp: "iPhone (app de l’écran d’accueil)",
    iphoneSafari: "iPhone (Safari)",
    androidApp: "Android (app installée)",
    android: (browser) => `Android${browser ? ` (${browser})` : ""}`,
    computer: (browser) => `ordinateur${browser ? ` (${browser})` : ""}`,
    other: "appareil",
  },
  email: {
    subject: (cfg, store, more) => `En stock : ${cfg} chez ${store}${more > 0 ? ` +${more} autre${more > 1 ? "s" : ""}` : ""}`,
    intro: "Bonne nouvelle : disponible en retrait en magasin dès maintenant :",
    reserve: "Réserver",
    store: "Magasin",
    tip: "Le stock en retrait part vite : ouvrez l’app Apple Store ou apple.com, choisissez le retrait en magasin et sélectionnez le magasin.",
    manage: (url) => `Gérer ou mettre en pause cette alerte : ${url}`,
    htmlTitle: "En stock pour le retrait maintenant",
    htmlReserve: "Réserver sur apple.com",
    htmlStorePage: "Page du magasin →",
    htmlTip: "Le stock en retrait part vite : réservez dans l’app Apple Store ou sur apple.com, choisissez <b>le retrait en magasin</b> et sélectionnez le magasin.",
    htmlManage: "Gérer ou mettre en pause cette alerte",
  },
  checkoutSubmit: (plan, limit, fastSec, checkSec, alertSec) => `${plan} : ${limit} alertes. Vos magasins sont vérifiés toutes les ${fastSec} s (chaque magasin toutes les ${checkSec} s), avec une notification environ ${alertSec} s après la confirmation d’un retour en stock. Mensuel, résiliable à tout moment.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "téléphone Android", desktop: "ordinateur", other: "appareil" },
    subject: (device) => `Notifications arrêtées sur votre ${device} : ouvrez PickupChecker depuis l’écran d’accueil`,
    gone: (device) => `Votre ${device} n’accepte plus les notifications PickupChecker (le service de notifications indique que l’abonnement n’existe plus).`,
    byEmail: "Les alertes de retour en stock de vos règles arrivent désormais par e-mail, jusqu’à ce que vous réactiviez les notifications.",
    reopenIos: "Ouvrez PickupChecker depuis votre écran d’accueil (pas dans Safari) et touchez « Activer les notifications » sur la page Compte.",
    reopenOther: "Ouvrez PickupChecker, allez dans Compte et touchez « Activer les notifications ».",
    causes: "Causes fréquentes : l’app a été retirée de l’écran d’accueil, les notifications ont été désactivées dans Réglages, ou le téléphone a été restauré.",
  },
};

export const notifyFr: NotifyText = typo(raw);
