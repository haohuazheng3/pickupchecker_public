/**
 * Notification texts in Dutch (push, alert email, "notifications stopped" email, device names, Stripe checkout line).
 * Plain TS with no imports besides types: the poller sends these too.
 */
import type { NotifyText } from "./en";

export const notifyNl: NotifyText = {
  pushTitle: (cfg: string) => `Op voorraad: ${cfg}`,
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
  email: {
    subject: (cfg: string, store: string, more: number) => `Op voorraad: ${cfg} bij ${store}${more > 0 ? ` +${more} meer` : ""}`,
    intro: "Goed nieuws — nu beschikbaar om op te halen in de winkel:",
    reserve: "Reserveren",
    store: "Winkel",
    tip: 'Ophaalvoorraad gaat snel: open de Apple Store-app of apple.com, kies "Ophalen" en selecteer de winkel.',
    manage: (url: string) => `Deze alert beheren of pauzeren: ${url}`,
    htmlTitle: "Nu op voorraad om op te halen",
    htmlReserve: "Reserveren op apple.com",
    htmlStorePage: "Winkelpagina →",
    htmlTip: "Ophaalvoorraad gaat snel — reserveer in de Apple Store-app of op apple.com, kies <b>Ophalen</b> en selecteer de winkel.",
    htmlManage: "Deze alert beheren of pauzeren",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${limit} alerts. Je winkels worden elke ${fastSec} sec. gecheckt (elke winkel elke ${checkSec} sec.), met een push zo'n ${alertSec} sec. nadat nieuwe voorraad is bevestigd. Per maand, altijd opzegbaar.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android-telefoon", desktop: "computer", other: "apparaat" },
    subject: (device: string) => `Meldingen gestopt op je ${device} — open PickupChecker vanaf je beginscherm`,
    gone: (device: string) => `Je ${device} accepteert geen meldingen van PickupChecker meer (de pushdienst meldde dat het abonnement niet meer bestaat).`,
    byEmail: "Voorraadalerts komen nu per e-mail binnen, tot je meldingen weer aanzet.",
    reopenIos: 'Open PickupChecker vanaf je beginscherm (niet in Safari) en tik op "Zet meldingen aan" op de accountpagina.',
    reopenOther: 'Open PickupChecker, ga naar Account en tik op "Zet meldingen aan".',
    causes: "Veelvoorkomende oorzaken: de app is van het beginscherm verwijderd, meldingen zijn uitgezet in Instellingen, of de telefoon is hersteld.",
  },
};
