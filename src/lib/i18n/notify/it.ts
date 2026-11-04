/** Notification texts in Italian (push, alert email, "notifications stopped" email, Stripe checkout line). Poller-safe: no imports besides types. */
import type { NotifyText } from "./en";

export const notifyIt: NotifyText = {
  pushTitle: (cfg: string) => cfg,
  pushBody: (where: string, quote: string | null) => `${where}${quote ? ` — ${quote}` : ""}. Tocca per prenotarlo su apple.com.`,
  testTitle: "Le notifiche di PickupChecker sono attive",
  testBody: (time: string, device: string) => `Prova inviata alle ${time} al tuo ${device}. Gli avvisi di rifornimento arrivano allo stesso modo, in pochi secondi.`,
  device: {
    iphoneApp: "iPhone (app nella schermata Home)",
    iphoneSafari: "iPhone (Safari)",
    androidApp: "Android (app installata)",
    android: (browser: string) => `Android${browser ? ` (${browser})` : ""}`,
    computer: (browser: string) => `computer${browser ? ` (${browser})` : ""}`,
    other: "dispositivo",
  },
  email: {
    subject: (cfg: string, store: string, more: number) => `Disponibile: ${cfg} da ${store}${more > 0 ? ` +${more} altri` : ""}`,
    intro: "Buone notizie: disponibile adesso per il Ritiro in negozio:",
    reserve: "Prenota",
    store: "Negozio",
    tip: "La disponibilità per il ritiro sparisce in fretta: apri l'app Apple Store o apple.com, scegli «Ritiro» e seleziona il negozio.",
    manage: (url: string) => `Gestisci o metti in pausa questo avviso: ${url}`,
    htmlTitle: "Disponibile per il ritiro adesso",
    htmlReserve: "Prenota su apple.com",
    htmlStorePage: "Pagina del negozio →",
    htmlTip: "La disponibilità per il ritiro sparisce in fretta: prenota nell'app Apple Store o su apple.com, scegli <b>Ritiro</b> e seleziona il negozio.",
    htmlManage: "Gestisci o metti in pausa questo avviso",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${limit} avvisi. I tuoi negozi vengono controllati ogni ${fastSec} s (tutti i negozi ogni ${checkSec} s), con una notifica circa ${alertSec} s dopo un rifornimento confermato. Mensile, disdici quando vuoi.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "telefono Android", desktop: "computer", other: "dispositivo" },
    subject: (device: string) => `Notifiche interrotte sul tuo ${device}: apri PickupChecker dalla schermata Home`,
    gone: (device: string) => `Il tuo ${device} ha smesso di accettare le notifiche di PickupChecker (il servizio push ha segnalato che l'iscrizione non esiste più).`,
    byEmail: "Gli avvisi di rifornimento per le tue regole ora arrivano via email, finché non riattivi le notifiche.",
    reopenIos: "Apri PickupChecker dalla schermata Home (non da Safari) e tocca «Attiva le notifiche» nella pagina dell'account.",
    reopenOther: "Apri PickupChecker, vai all'account e tocca «Attiva le notifiche».",
    causes: "Cause comuni: l'app è stata rimossa dalla schermata Home, le notifiche sono state disattivate in Impostazioni o il telefono è stato ripristinato.",
  },
};
