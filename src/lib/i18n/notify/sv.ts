/**
 * Notification texts in Swedish (push, alert email, "notifications stopped" email, device names, Stripe checkout
 * line). Plain TS with no imports besides types: the poller sends these too.
 */
import type { NotifyText } from "./en";

export const notifySv: NotifyText = {
  pushTitle: (cfg: string) => cfg,
  pushBody: (where: string, quote: string | null) => `${where}${quote ? ` – ${quote}` : ""}. Tryck för att reservera på apple.com.`,
  testTitle: "Notiser från PickupChecker är på",
  testBody: (time: string, device: string) => `Test skickat ${time} till din ${device}. Notiser om påfyllningar kommer på samma sätt, inom några sekunder.`,
  device: {
    iphoneApp: "iPhone (hemskärmsapp)",
    iphoneSafari: "iPhone (Safari)",
    androidApp: "Android (installerad app)",
    android: (browser: string) => `Android${browser ? ` (${browser})` : ""}`,
    computer: (browser: string) => `dator${browser ? ` (${browser})` : ""}`,
    other: "enhet",
  },
  email: {
    subject: (cfg: string, store: string, more: number) => `I lager: ${cfg} på ${store}${more > 0 ? ` +${more} till` : ""}`,
    intro: "Goda nyheter – går att hämta i butik just nu:",
    reserve: "Reservera",
    store: "Butik",
    tip: "Lager för hämtning försvinner snabbt: öppna appen Apple Store eller apple.com, välj ”Hämta i butik” och välj butiken.",
    manage: (url: string) => `Hantera eller pausa den här bevakningen: ${url}`,
    htmlTitle: "Går att hämta nu",
    htmlReserve: "Reservera på apple.com",
    htmlStorePage: "Butikssidan →",
    htmlTip: "Lager för hämtning försvinner snabbt – reservera i appen Apple Store eller på apple.com, välj <b>Hämta i butik</b> och välj butiken.",
    htmlManage: "Hantera eller pausa den här bevakningen",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${limit} bevakningar. Dina butiker kollas var ${fastSec}:e sekund (alla butiker var ${checkSec}:e sekund), och notisen kommer cirka ${alertSec} s efter att en påfyllning bekräftats. Månadsvis, avsluta när du vill.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android-telefon", desktop: "dator", other: "enhet" },
    subject: (device: string) => `Notiserna har slutat fungera på din ${device} – öppna PickupChecker från hemskärmen`,
    gone: (device: string) => `Din ${device} har slutat ta emot notiser från PickupChecker (notistjänsten meddelade att prenumerationen har försvunnit).`,
    byEmail: "Notiser om påfyllningar för dina bevakningar kommer nu via e-post tills du slår på notiserna igen.",
    reopenIos: "Öppna PickupChecker från hemskärmen (inte Safari) och tryck på ”Slå på notiser” på kontosidan.",
    reopenOther: "Öppna PickupChecker, gå till kontosidan och tryck på ”Slå på notiser”.",
    causes: "Vanliga orsaker: appen togs bort från hemskärmen, notiserna stängdes av i Inställningar, eller telefonen återställdes.",
  },
};
