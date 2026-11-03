/**
 * Spanish (Spain): account — the dashboard, its restock modules, /install, /checkout/success and /pricing. Plan
 * names and dollar amounts stay as they are (billing is in USD everywhere).
 */
import type { Dict } from "../en";
import { n, tiendas, reposiciones } from "./words";

const s = (k: number, one: string, many: string) => `${n(k)} ${k === 1 ? one : many}`;

export const account: Dict["account"] = {
  loading: "Cargando",
  meta: { title: "Mis alertas" },
  signedInAs: (email: string) => `Sesión iniciada como ${email}`,
  title: "Mis alertas",
  units: { s: "s", min: "min", taps: "toques" },

  plan: {
    title: "Plan",
    none: "Aún sin plan: las alertas están desactivadas",
    summary: (plan: string, on: number, limit: number) => `${plan} · ${n(on)} de ${n(limit)} alertas activas`,
    renews: (date: string) => ` · se renueva el ${date}`,
    ends: (date: string) => ` · termina el ${date}`,
  },

  sent: {
    title: "Alertas enviadas",
    last: (ago: string) => `La última, ${ago}`,
    none: "Aún no se ha enviado nada",
    empty: "Aún no se ha enviado nada.",
    channel: { push: "notificación", email: "correo" } as Record<string, string>,
    status: { sent: "enviada", failed: "fallida", skipped: "omitida" } as Record<string, string>,
  },

  fast: {
    title: "Resérvalo en 20 segundos",
    sub: "haz ahora todo salvo los cuatro últimos toques",
    lasts: "lo que suele durar un Duo disponible",
    push: "confirmado → aviso en tu móvil",
    tapsLeft: "te quedan cuando llega el aviso",
    steps: [
      { title: "Encuentra tu franja", hint: "el horario de tus tiendas, abajo · prepáralo 10 min antes" },
      { title: "Prepara el pago en Apple", hint: "capacidad y color exactos → Entrega y recogida" },
      { title: "Acepta las condiciones · o cómpralo libre", hint: "libre y pagado al contado: sin ningún paso extra" },
      { title: "Que no se bloquee", hint: "Bloqueo automático → Nunca · tócalo cada 10–15 min" },
      { title: "Aviso: léelo, no lo toques", hint: "Recogida → la tienda indicada → primera franja → Apple Pay" },
    ],
    guide: "La guía de 2 minutos",
    window: "Tu franja de reposición",
  },

  restock: {
    title: "Cuándo reponen tus tiendas",
    anyIphone: "iPhone",
    and: " y ",
    yours: (k: number) => (k === 1 ? "tu tienda" : `tus ${n(k)} tiendas`),
    Yours: (k: number) => (k === 1 ? "Tu tienda" : `Tus ${n(k)} tiendas`),
    otherStores: (k: number) => s(k, "tienda más", "tiendas más"),
    meta: (what: string, stores: number, days: number, zone: string) => `${what} · ${tiendas(stores)} · últimos ${n(days)} días · ${zone}`,
    busiest: (yours: string, then: string | null) => (then ? `hora con más en ${yours} · después, ${then}` : `hora con más en ${yours}`),
    busiestArea: (stores: number, zone: string) => `la hora con más en las ${n(stores)} tiendas con ${zone}`,
    next: (inHours: number) => `próxima franja · ${inHours === 0 ? "esta hora" : `dentro de ${n(inHours)} h`}`,
    typical: "lo que suele estar disponible antes de agotarse",
    count: (yours: string, days: number, total: number, pattern: boolean) => (total === 0 ? `aún sin reposiciones en ${yours} · últimos ${n(days)} días` : `reposiciones en ${yours} · últimos ${n(days)} días${pattern ? "" : " · muy pocas para un patrón"}`),
    byHour: (busiestInGreen: boolean) => `Por hora${busiestInGreen ? " · en verde, la de más reposiciones" : ""}`,
    byWeekday: (busiest: string | null) => `Por día de la semana${busiest ? ` · el de más: ${busiest}` : ""}`,
    hourChart: (yours: string, zone: string, items: string) => `Reposiciones por hora en ${yours}, ${zone}: ${items}`,
    weekdayChart: (yours: string, items: string) => `Reposiciones por día de la semana en ${yours}: ${items}`,
    chartItem: (label: string, k: number, reported: number) => `${label} ${n(k)}${reported ? ` (+${n(reported)} según otros rastreadores)` : ""}`,
    barTitle: (label: string, k: number, yours: string, area: { n: number; zone: string } | null, reported: number) =>
      `${label}: ${reposiciones(k)} en ${yours}${area ? ` · ${n(area.n)} en las tiendas con ${area.zone}` : ""}${reported ? ` · ${n(reported)} según otros rastreadores` : ""}`,
    now: "ahora",
    allZone: (stores: number, zone: string) => `Las ${n(stores)} tiendas con ${zone}`,
    reportMarkBars: "En discontinua",
    reportMarkDots: "Puntos huecos",
    sellTitle: "Cuánto tardan en agotarse tus reposiciones",
    sellMeta: (what: string, stores: number, days: number) => `${what} · ${tiendas(stores)} · últimos ${n(days)} días`,
    sellLabel: (yours: string) => `en ${yours}`,
  },

  success: {
    metaTitle: "Las alertas están activadas",
    isOn: (plan: string) => `${plan} está activado`,
    yourPlan: "Tu plan",
    received: "Pago recibido",
    onPlan: (limit: number) => `${n(limit)} alertas en tu plan.`,
    planOn: "Tu plan está activado.",
    pending: "Tu suscripción aparecerá en tu cuenta en menos de un minuto.",
    open: "Abrir mis alertas",
    another: "Añadir otra alerta",
    saved: (k: number) => `${s(k, "alerta guardada", "alertas guardadas")} · recibo de Stripe`,
    pushOn: "Notificaciones",
    pushNext: "Siguiente paso: las alertas en tu móvil",
  },

  install: {
    metaTitle: "Instala la app: alertas de reposición en tu pantalla de inicio",
    metaDescription: "Añade PickupChecker a tu pantalla de inicio y recibe una notificación en cuanto haya un iPhone Duo, 18 Pro o Pro Max disponible para recogida cerca de ti.",
  },

  pricing: {
    metaTitle: "Precios: 10 alertas por $5, 20 por $10, 50 por $20",
    metaDescription: "Alertas de stock para recogida de iPhone: tus tiendas comprobadas cada 5 segundos y un aviso unos 3 segundos después de una reposición. Plus, $5 al mes por 10 alertas; Pro, $10 por 20; Max, $20 por 50. Cancela cuando quieras.",
    title: "Precios",
    lead: "**Una alerta = una tienda × un iPhone exacto.** Consultar es gratis.",
    chips: ["468 Apple Store en 19 países", "Cancela cuando quieras", "Tarjeta o Link"],
    fastest: "El intervalo de comprobación publicado más rápido de cualquier rastreador de stock de iPhone",
    everyFast: "Tus tiendas, cada **5 segundos** · otros rastreadores publican intervalos de 8 segundos a 15 minutos",
    sellsOut: (band: string) => `Una reposición típica del iPhone Duo se agota en **${band}**; algunas, en 20–30 segundos`,
    band: (r: string) => `${r} segundos`,
    aboutMinute: "aproximadamente un minuto",
    sameSpeed: "Todos los planes tienen la misma velocidad",
    rechecked: "tus tiendas, comprobadas de nuevo",
    toPhone: "de la reposición confirmada a tu móvil",
    listing: "lo que suele durar un Duo disponible",
    note: { plus: "1 iPhone × 10 tiendas", pro: "2 iPhone × 10 tiendas", max: "5 iPhone × 10 tiendas" } as Record<string, string>,
    month: "/ mes",
    alerts: (k: number) => `${n(k)} alertas`,
    perks: ["Tus tiendas, cada 5 s; todas las demás, cada 15 s", "Aviso unos 3 s después de confirmar una reposición"],
    cancel: "Cancela cuando quieras",
    get: (plan: string) => `Contratar ${plan}`,
    billing: "Facturación con Stripe · tarjeta o Link · los cambios de plan se prorratean",
    refund: "¿No te convence? [Reembolso completo en los primeros 7 días](/refunds) si aún no te ha llegado ninguna alerta de reposición",
  },
};
