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
  email: {
    subject: (cfg: string, store: string, more: number) => `Disponible: ${cfg} en ${store}${more > 0 ? ` y ${more} más` : ""}`,
    intro: "Buenas noticias: ya está disponible para recogida en tienda:",
    reserve: "Reservar",
    store: "Tienda",
    tip: "El stock para recogida vuela: abre la app Apple Store o apple.com, elige «Recogida» y selecciona la tienda.",
    manage: (url: string) => `Gestiona o pausa esta alerta: ${url}`,
    htmlTitle: "Disponible para recogida ahora",
    htmlReserve: "Reservar en apple.com",
    htmlStorePage: "Página de la tienda →",
    htmlTip: "El stock para recogida vuela: resérvalo en la app Apple Store o en apple.com, elige <b>Recogida</b> y selecciona la tienda.",
    htmlManage: "Gestiona o pausa esta alerta",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${limit} alertas. Tus tiendas se comprueban cada ${fastSec} s (todas las tiendas, cada ${checkSec} s) y el aviso llega unos ${alertSec} s después de confirmarse una reposición. Mensual, cancela cuando quieras.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "móvil Android", desktop: "ordenador", other: "dispositivo" },
    subject: (device: string) => `Las notificaciones se han detenido en tu ${device}: abre PickupChecker desde la pantalla de inicio`,
    gone: (device: string) => `Tu ${device} ha dejado de aceptar las notificaciones de PickupChecker (el servicio de notificaciones indica que la suscripción ya no existe).`,
    byEmail: "Las alertas de reposición de tus reglas te llegarán por correo hasta que vuelvas a activar las notificaciones.",
    reopenIos: "Abre PickupChecker desde tu pantalla de inicio (no desde Safari) y toca «Activar notificaciones» en la página de tu cuenta.",
    reopenOther: "Abre PickupChecker, ve a tu cuenta y toca «Activar notificaciones».",
    causes: "Causas habituales: se quitó la app de la pantalla de inicio, se desactivaron las notificaciones en Ajustes o se restauró el móvil.",
  },
};
