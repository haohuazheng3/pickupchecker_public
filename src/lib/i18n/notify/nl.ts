/**
 * Notification texts in Dutch (push, alert email, "notifications stopped" email, device names, Stripe checkout line).
 * Plain TS with no imports besides types: the poller sends these too.
 */
import type { NotifyText } from "./en";

export const notifyNl: NotifyText = {
  pushTitle: (cfg: string) => cfg,
  pushBody: (where: string, quote: string | null) => `${where}${quote ? ` — ${quote}` : ""}. Tik om te reserveren op apple.com.`,
  testTitle: "Meldingen van PickupChecker staan aan",
  testBody: (time: string, device: string) => `Test verstuurd om ${time} naar je ${device}. Voorraadalerts komen op dezelfde manier binnen, binnen seconden.`,
  device: {
    iphoneApp: "iPhone (app op beginscherm)",
    iphoneSafari: "iPhone (Safari)",
    androidApp: "Android (geïnstalleerde app)",
    android: (browser: string) => `Android${browser ? ` (${browser})` : ""}`,
    computer: (browser: string) => `computer${browser ? ` (${browser})` : ""}`,
    other: "dit apparaat",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${limit} alerts. Je winkels worden elke ${fastSec} sec. gecheckt (elke winkel elke ${checkSec} sec.), met een push zo'n ${alertSec} sec. nadat nieuwe voorraad is bevestigd. Per maand, altijd opzegbaar.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android-telefoon", desktop: "computer", other: "apparaat" },
    subject: (device: string) => `Meldingen gestopt op je ${device} — open PickupChecker vanaf je beginscherm`,
    gone: (device: string) => `Je ${device} accepteert geen meldingen van PickupChecker meer (de pushdienst meldde dat het abonnement niet meer bestaat).`,
    noAlerts: "Tot je meldingen weer aanzet, kunnen voorraadalerts je niet bereiken: PickupChecker waarschuwt alleen met meldingen, nooit per e-mail.",
    reopenIos: 'Open PickupChecker vanaf je beginscherm (niet in Safari) en tik op "Zet meldingen aan" op de accountpagina.',
    reopenOther: 'Open PickupChecker, ga naar Account en tik op "Zet meldingen aan".',
    causes: "Veelvoorkomende oorzaken: de app is van het beginscherm verwijderd, meldingen zijn uitgezet in Instellingen, of de telefoon is hersteld.",
  },
};
