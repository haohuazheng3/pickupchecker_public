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
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${limit} bevakningar. Dina butiker kollas var ${fastSec}:e sekund (alla butiker var ${checkSec}:e sekund), och notisen kommer cirka ${alertSec} s efter att en påfyllning bekräftats. Månadsvis, avsluta när du vill.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android-telefon", desktop: "dator", other: "enhet" },
    subject: (device: string) => `Notiserna har slutat fungera på din ${device} – öppna PickupChecker från hemskärmen`,
    gone: (device: string) => `Din ${device} har slutat ta emot notiser från PickupChecker (notistjänsten meddelade att prenumerationen har försvunnit).`,
    noAlerts: "Tills du slår på notiserna igen kan inga påfyllningsnotiser nå dig: PickupChecker larmar bara med notiser, aldrig via e-post.",
    reopenIos: "Öppna PickupChecker från hemskärmen (inte Safari) och tryck på ”Slå på notiser” på kontosidan.",
    reopenOther: "Öppna PickupChecker, gå till kontosidan och tryck på ”Slå på notiser”.",
    causes: "Vanliga orsaker: appen togs bort från hemskärmen, notiserna stängdes av i Inställningar, eller telefonen återställdes.",
  },
};
