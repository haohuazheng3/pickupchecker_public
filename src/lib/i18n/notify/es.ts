/**
 * Notification texts in Spanish (Spain): push, alert email, "notifications stopped" email, device names, Stripe
 * checkout line. Plain TS, types only: the poller sends these too.
 */
import type { NotifyText } from "./en";

export const notifyEs: NotifyText = {
  pushTitle: (cfg: string) => cfg,
  pushBody: (where: string, quote: string | null) => `${where}${quote ? ` — ${quote}` : ""}. Toca para reservarlo en apple.com.`,
  testTitle: "Las notificaciones de PickupChecker están activadas",
  testBody: (time: string, device: string) => `Prueba enviada a las ${time} a tu ${device}. Las alertas de reposición llegan igual, en segundos.`,
  device: {
    iphoneApp: "iPhone (app de la pantalla de inicio)",
    iphoneSafari: "iPhone (Safari)",
    androidApp: "Android (app instalada)",
    android: (browser: string) => `Android${browser ? ` (${browser})` : ""}`,
    computer: (browser: string) => `ordenador${browser ? ` (${browser})` : ""}`,
    // Always follows "tu" ("a tu dispositivo").
    other: "dispositivo",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${limit} alertas. Tus tiendas se comprueban cada ${fastSec} s (todas las tiendas, cada ${checkSec} s) y el aviso llega unos ${alertSec} s después de confirmarse una reposición. Mensual, cancela cuando quieras.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "móvil Android", desktop: "ordenador", other: "dispositivo" },
    subject: (device: string) => `Las notificaciones se han detenido en tu ${device}: abre PickupChecker desde la pantalla de inicio`,
    gone: (device: string) => `Tu ${device} ha dejado de aceptar las notificaciones de PickupChecker (el servicio de notificaciones indica que la suscripción ya no existe).`,
    noAlerts: "Hasta que vuelvas a activarlas, no te llegarán alertas de reposición: PickupChecker solo avisa con notificaciones, nunca por correo.",
    reopenIos: "Abre PickupChecker desde tu pantalla de inicio (no desde Safari) y toca «Activar notificaciones» en la página de tu cuenta.",
    reopenOther: "Abre PickupChecker, ve a tu cuenta y toca «Activar notificaciones».",
    causes: "Causas habituales: se quitó la app de la pantalla de inicio, se desactivaron las notificaciones en Ajustes o se restauró el móvil.",
  },
};
