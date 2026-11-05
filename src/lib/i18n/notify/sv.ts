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
    cancel: (url: string) => `Har du fått din iPhone? Säg upp när du vill: ${url}`,
    htmlGotIt: "Har du fått din iPhone?",
    htmlCancel: "Säg upp när du vill",
    nudge: (url: string) => `Det här kom med e-post eftersom ingen telefon har notiser påslagna för ditt konto. En notis kommer cirka 3 sekunder efter en påfyllning – öppna PickupChecker från hemskärmen och tryck på ”Slå på notiser”: ${url}`,
    htmlNudge: (url: string) => `Det här kom med e-post eftersom ingen telefon har notiser påslagna för ditt konto. En <b>notis kommer cirka 3 sekunder</b> efter en påfyllning – öppna PickupChecker från hemskärmen och tryck på <b>Slå på notiser</b>. <a href="${url}" style="color:#0a7f3f">Så gör du →</a>`,
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
  nudge: {
    subject: "Få påfyllningslarm för iPhone Duo i telefonen, cirka 3 sekunder efter påfyllningen",
    intro: "Dina PickupChecker-larm kommer med e-post eftersom ingen telefon har notiser påslagna för ditt konto. E-post är den långsamma vägen: en typisk iPhone Duo-påfyllning tar slut på ungefär en minut, medan en notis kommer cirka 3 sekunder efter att vi bekräftat den.",
    howTitle: "Slå på dem på under en minut:",
    stepsIos: ["Öppna pickupchecker.com i Safari på din iPhone, tryck på Dela och sedan ”Lägg till på hemskärmen”.", "Öppna PickupChecker från hemskärmen (inte Safari) och logga in.", "Tryck på ”Slå på notiser” på kontosidan och sedan på ”Tillåt”."],
    stepsOther: "På Android eller dator: öppna pickupchecker.com/account och tryck på ”Slå på notiser”.",
    after: "Tills en enhet är påslagen fortsätter larmen att komma med e-post; därefter kommer de som notiser och e-posten upphör.",
    cta: (url: string) => `Guide med bilder: ${url}`,
  },
};
