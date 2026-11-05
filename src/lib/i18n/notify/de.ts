/**
 * Notification texts in German (push, alert email, "notifications stopped" email, Stripe checkout line).
 * Plain TS, no imports but types: the poller sends these too. Switzerland gets them with ß → ss.
 */
import type { NotifyText } from "./en";

export const notifyDe: NotifyText = {
  pushTitle: (cfg: string) => cfg,
  pushBody: (where: string, quote: string | null) => `${where}${quote ? ` – ${quote}` : ""}. Tippen, um auf apple.com zu reservieren.`,
  testTitle: "PickupChecker-Mitteilungen sind an",
  testBody: (time: string, device: string) => `Test um ${time} gesendet an: ${device}. Restock-Alarme kommen genauso, in Sekunden.`,
  device: {
    iphoneApp: "iPhone (Home-Bildschirm-App)",
    iphoneSafari: "iPhone (Safari)",
    androidApp: "Android (installierte App)",
    android: (browser: string) => `Android${browser ? ` (${browser})` : ""}`,
    computer: (browser: string) => `Computer${browser ? ` (${browser})` : ""}`,
    other: "dieses Gerät",
  },
  email: {
    subject: (cfg: string, store: string, more: number) => `Verfügbar: ${cfg} bei ${store}${more > 0 ? ` +${more} weitere` : ""}`,
    intro: "Gute Nachricht – jetzt zur Abholung im Store verfügbar:",
    reserve: "Reservieren",
    store: "Store",
    tip: "Abhol-Ware ist schnell weg: Öffnen Sie die Apple Store App oder apple.com, wählen Sie „Abholen“ und dann den Store.",
    manage: (url: string) => `Diesen Alarm verwalten oder pausieren: ${url}`,
    htmlTitle: "Jetzt zur Abholung verfügbar",
    htmlReserve: "Auf apple.com reservieren",
    htmlStorePage: "Store-Seite →",
    htmlTip: "Abhol-Ware ist schnell weg – reservieren Sie in der Apple Store App oder auf apple.com, wählen Sie <b>Abholen</b> und dann den Store.",
    htmlManage: "Diesen Alarm verwalten oder pausieren",
    cancel: (url: string) => `Schon Ihr iPhone bekommen? Jederzeit kündbar: ${url}`,
    htmlGotIt: "Schon Ihr iPhone bekommen?",
    htmlCancel: "Jederzeit kündigen",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${limit} Alarme. Ihre Stores werden alle ${fastSec} Sek. geprüft (jeder Store alle ${checkSec} Sek.), mit einem Push etwa ${alertSec} Sek. nach einem bestätigten Restock. Monatlich, jederzeit kündbar.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android-Handy", desktop: "Computer", other: "Gerät" },
    subject: (device: string) => `Mitteilungen auf Ihrem ${device} gestoppt – PickupChecker vom Home-Bildschirm öffnen`,
    gone: (device: string) => `Ihr ${device} nimmt keine PickupChecker-Mitteilungen mehr an (der Push-Dienst meldet, dass das Abo nicht mehr existiert).`,
    byEmail: "Restock-Alarme für Ihre Regeln kommen jetzt per E-Mail, bis Sie Mitteilungen wieder einschalten.",
    reopenIos: "Öffnen Sie PickupChecker vom Home-Bildschirm (nicht in Safari) und tippen Sie auf der Kontoseite auf „Mitteilungen einschalten“.",
    reopenOther: "Öffnen Sie PickupChecker, gehen Sie zu „Konto“ und tippen Sie auf „Mitteilungen einschalten“.",
    causes: "Häufige Ursachen: Die App wurde vom Home-Bildschirm entfernt, Mitteilungen wurden in den Einstellungen ausgeschaltet, oder das Handy wurde wiederhergestellt.",
  },
};
