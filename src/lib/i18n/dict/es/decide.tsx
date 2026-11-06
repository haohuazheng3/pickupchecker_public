/**
 * Spanish (Spain): the four decision pages (seo.md §16) — which configuration is easiest to get, is the shortage
 * easing, Apple vs carriers vs retailers, and the public API. Same keys, arguments and shapes as dict/en/decide.tsx
 * (the type checker holds them to it); every number comes through the view, and the labels (configuration, colour,
 * store, country) arrive already in Spanish. Castilian, "tú", Apple España's wording («Recogida», «Disponible»).
 * Facts that never change wording: check intervals are 15 s and 5 s (SPEED); model names, storage sizes, brands,
 * URLs, JSON fields and HTTP terms are not translated.
 */
import type { Faq } from "@/lib/content/types";
import type { Country } from "@/lib/apple/countries";
import type { DuoSupply } from "@/lib/content/duoDecide";
import { exposureHours } from "@/lib/content/duoDecide";
import { SPEED } from "@/lib/plans";
import { fitTitleW, list, num } from "@/lib/i18n/format";
import type { ApiView, ChannelsView, ConfigsView, DecideCtx, DecideDict, SupplyView } from "../en/decide";
import { L, n, pc, pais, enPais, dePais, cap, apples, tiendas, reposiciones, dias, noun, v } from "./words";

type D = DecideDict;

/* ---------------------------------------------------------------- numbers, dates, durations */

/** "1 tienda" / "5 tiendas" for any noun pair. */
const pl = (x: number, one: string, many: string): string => `${n(x)} ${x === 1 ? one : many}`;
/** A share 0–1 as "59 %", "<1 %". */
const pct = (x: number): string => (x > 0 && x < 0.005 ? "<1 %" : pc(Math.round(x * 100)));
/** A change (−1…) as "+28 %", "−12 %". */
const signed = (x: number): string => `${x > 0 ? "+" : x < 0 ? "−" : ""}${pc(Math.round(Math.abs(x) * 100))}`;
const dtf = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", ...o });
/** "2 de noviembre de 2026". */
const longDate = (ymd: string): string => dtf({ month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "jue, 29 oct". */
const dateLabel = (ymd: string): string => dtf({ weekday: "short", month: "short", day: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "38,4 h" of listing time, "41 min" under an hour. */
const hours = (sec: number): string => (sec >= 3600 ? `${num(L, exposureHours(sec))} h` : `${n(Math.max(1, Math.round(sec / 60)))} min`);
/** A listing's lifetime in prose: "79 segundos", "3 minutos". */
const segs = (s: number): string => (s >= 120 ? `${n(Math.round(s / 60))} minutos` : pl(Math.round(s), "segundo", "segundos"));
/** "2,3×". */
const ratio = (a: number, b: number): string => (b > 0 ? `${num(L, Math.round((a / b) * 10) / 10)}×` : "—");
/** One decimal, always shown: "1,3", "2,0". */
const dec1 = (x: number): string => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(x);
const horas = (x: number): string => pl(x, "hora", "horas");
/** "Movistar, Orange y Vodafone" (at most `max` items, then "y 2 más"). */
const lw = (items: string[], max = 6): string => list(L, items, max, (k) => `${n(k)} más`);
/** "Movistar, Orange o Vodafone". */
const orList = (items: string[]): string => new Intl.ListFormat("es-ES", { style: "long", type: "disjunction" }).format(items);

/* ---------------------------------------------------------------- shared phrases */

/** " en España" after a noun; nothing for the US, whose pages carry no country. */
const where = (c: Country): string => (c.cc === "us" ? "" : ` ${enPais(c.cc)}`);
/** " de España" after "los Apple Store" (avoids "en los Apple Store en España"); nothing for the US. */
const deWhere = (c: Country): string => (c.cc === "us" ? "" : ` ${dePais(c.cc)}`);
/** "el único Apple Store de España" / "los 11 Apple Store de España". */
const storesPhrase = (x: DecideCtx): string => (x.one ? `el único Apple Store ${dePais(x.c.cc)}` : `los ${apples(x.stores)} ${dePais(x.c.cc)}`);
const trendWord = (d: DuoSupply): string => (d.trend === "up" ? "más" : d.trend === "down" ? "menos" : "más o menos las mismas");
/** "el plazo de devolución de 14 días de Apple", Hong Kong's no-returns policy, or a neutral phrase. */
const returnPhrase = (days: number | null): string => (days ? `el plazo de devolución de ${n(days)} días de Apple` : days === 0 ? "la política de Apple allí de no aceptar devoluciones (solo cambios por defecto)" : "la política de devoluciones de Apple");
/**
 * channels.ts holds each market's carrier-lock sentence in English (`carrierLock`); Spain's is written here in Spanish,
 * any other country gets the neutral line the English falls back to (the Spanish pages exist for Spain only).
 */
const lockPhrase = (x: ChannelsView, fallback: string): string => (x.c.cc === "es" ? "Apple vende el iPhone libre en España; no hemos comprobado si las unidades financiadas por una operadora llevan bloqueo." : fallback);
const confirmadas = (x: number): string => pl(x, "reposición confirmada", "reposiciones confirmadas");

/* ================================================================== which configuration is easiest to get */
const configs = {
  crumb: "¿Qué configuración?",
  title: (c: Country) => fitTitleW([`¿Qué iPhone Duo se repone más ${enPais(c.cc)}? Ranking`, `¿Qué iPhone Duo se repone más ${enPais(c.cc)}?`, `¿Qué iPhone Duo se repone más? (${pais(c.cc)})`], 49),
  metaDescription: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    return e && h
      ? fitTitleW([
        `El iPhone Duo ${x.cfg(e)} es el más fácil de conseguir${where(x.c)}: ${n(e.restocks)} de las ${reposiciones(d.n)} confirmadas en ${apples(x.stores)} y ${hours(e.exposureSec)} disponible en total desde el ${longDate(d.since)}; el ${x.cfg(h)}, el más difícil (${n(h.restocks)}). Todas las configuraciones ordenadas por capacidad y color, actualizado con cada reposición.`,
        `El iPhone Duo ${x.cfg(e)} es el más fácil de conseguir${where(x.c)} (${n(e.restocks)} de ${reposiciones(d.n)} desde el ${longDate(d.since)}); el ${x.cfg(h)}, el más difícil. Todas las configuraciones ordenadas por capacidad y color.`,
      ], 160)
      : `Todas las configuraciones del iPhone Duo ordenadas por reposiciones confirmadas en los Apple Store${deWhere(x.c)} desde el ${longDate(d.since)}: capacidad, color, tiempo en stock y qué hay disponible ahora mismo.`;
  },
  h1: (x: ConfigsView) => `¿Qué configuración del iPhone Duo se repone más${where(x.c)} y cuál es la más fácil de conseguir?`,
  intro: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    if (!e) return `PickupChecker ha confirmado ${pl(d.n, "reposición del iPhone Duo", "reposiciones del iPhone Duo")} en ${storesPhrase(x)} desde el ${longDate(d.since)}: aún muy pocas para ordenar las configuraciones. La tabla de abajo se rellena con cada reposición; la página de EE. UU. ya muestra el patrón.`;
    const st = d.byStorage, co = d.byColor;
    const last = st[st.length - 1];
    return `El iPhone Duo ${x.cfg(e)} es el más fácil de conseguir${where(x.c)}: ${n(e.restocks)} de las ${reposiciones(d.n)} que PickupChecker ha confirmado en ${storesPhrase(x)} desde el ${longDate(d.since)}, en ${tiendas(e.stores)}, con ${hours(e.exposureSec)} disponible en total${e.lifetimes ? ` y una mediana de ${segs(e.lifetimes.medianSec)} en stock` : ""}. ${h ? `El más difícil es el ${x.cfg(h)}: ${reposiciones(h.restocks)} y ${hours(h.exposureSec)} disponible.` : ""}${st.length > 1 ? ` La capacidad pesa más que el color: ${last.restocks > 0 ? `los modelos de ${st[0].key} se repusieron ${ratio(st[0].restocks, last.restocks)} más a menudo que los de ${last.key}` : `los modelos de ${st[0].key} concentraron el ${pct(st[0].share)} de las reposiciones, mientras que el de ${last.key} no se ha repuesto ni una vez`}${co.length > 1 ? `, y ${x.colour(co[0].key)} solo aventajó a ${x.colour(co[1].key)} en ${pl(Math.abs(Math.round((co[0].share - co[1].share) * 100)), "punto", "puntos")}` : ""}.` : ""}`;
  },
  updated: (x: ConfigsView, stamp: string) => `Actualizado ${stamp} · datos desde el ${longDate(x.d.since)} · ${apples(x.stores)} · comprobaciones cada ${SPEED.checkSec} segundos (tiendas con alertas: cada ${SPEED.fastSec})`,
  nav: { easiest: "La más fácil ahora", storage: "Capacidad", colour: "Color", shelf: "Margen para comprar", week: "Esta semana", alerts: "Qué vigilar", method: "Cómo contamos" },
  h2: (x: ConfigsView) => ({
    easiest: `¿Qué configuración del iPhone Duo es la más fácil de conseguir${where(x.c)} ahora mismo?`,
    storage: "¿La capacidad cambia las probabilidades?",
    colour: x.d.byColor.length > 1 ? `¿${x.colour(x.d.byColor[0].key)} o ${x.colour(x.d.byColor[1].key)}: qué color vuelve más a menudo?` : "¿Qué color vuelve más a menudo?",
    shelf: "¿Qué configuración te da más tiempo para comprarla?",
    week: "¿Qué ha cambiado en los últimos siete días?",
    alerts: "¿Para qué configuraciones debería crear alertas?",
    method: "Cómo contamos una reposición y el tiempo en stock",
  }),
  hero: {
    restocks: (label: string) => `reposiciones confirmadas del ${label}`,
    exposure: "horas disponible, sumando todas las tiendas",
    now: ((one: boolean) => (one ? "la tiene ahora mismo" : "tiendas la tienen ahora mismo")) as unknown as D["configs"]["hero"]["now"],
    median: "segundos en stock (mediana)",
    total: "reposiciones de todas las configuraciones",
  },
  easiestLead: (x: ConfigsView) => {
    const e = x.d.easiest!;
    return `El ${x.cfg(e)} gana en las dos cuentas que importan: es el que más veces ha vuelto (${reposiciones(e.restocks)}, el ${pct(e.restocks / x.d.n)} del total) y el que más tiempo ha estado disponible en conjunto (${hours(e.exposureSec)}), que es el margen que hubo para abrir la app y reservar uno. ${e.nowStores > 0 ? `${tiendas(e.nowStores)} lo ${v(e.nowStores, "tiene", "tienen")} mientras lees esto.` : "Ninguna tienda lo tiene mientras lees esto; la próxima reposición aparece aquí en segundos."}`;
  },
  easiestKeys: (x: ConfigsView) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      `Las tres con más tiempo disponible: ${lw(top3.map((r) => `${x.cfg(r)} (${hours(r.exposureSec)})`))}.`,
      d.never.length ? `Sin ninguna reposición${where(x.c)} desde el ${longDate(d.since)}: ${lw(d.never.map((r) => x.cfg(r)))}.` : `Todas las configuraciones se han repuesto al menos una vez desde el ${longDate(d.since)}.`,
      d.lifetimes ? `Contando todas las configuraciones, una reposición estuvo disponible una mediana de ${segs(d.lifetimes.medianSec)}; el ${pct(d.lifetimes.within2min)} desapareció en 2 minutos.` : "El tiempo en stock aparece cuando diez reposiciones tienen un final conocido.",
    ];
  },
  rankCaption: (x: ConfigsView) => `Todas las configuraciones del iPhone Duo${where(x.c)}, primero las que más tiempo han estado disponibles · del ${longDate(x.d.since)} a hoy`,
  rankHead: ["Configuración", "Reposiciones", "Tiendas", "Disponible en total", "Mediana en stock", "En stock ahora", "Última reposición"],
  none: "aún ninguna",
  storageLead: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return `Las capacidades se comparan cuando llegan reposiciones; la tabla de abajo es en directo.`;
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return `Sí, más que ninguna otra cosa: el ${st[0].key} acaparó el ${pct(st[0].share)} de las reposiciones y el ${st[1].key}, el ${pct(st[1].share)}${big ? `, mientras que los de 1TB y 2TB sumaron juntos el ${pct(big / x.d.n)}` : ""}. Apple envía las capacidades que más gente pide; las más repuestas son también las que una tienda recibe por varias unidades en una misma entrega.`;
  },
  groupCaption: (what: "storage" | "colour") => `Reposiciones por ${what === "storage" ? "capacidad" : "color"}, sumando todas las tiendas`,
  groupHead: (what: "Storage" | "Colour") => [what === "Storage" ? "Capacidad" : "Color", "Reposiciones", "Porcentaje", "Tiendas", "Disponible en total", "Mediana en stock", "En stock ahora"],
  storageSwaps: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: `Alerta solo para el ${last}`, yes: `El ${top} primero, y el ${last} también`, why: `El ${last} supuso el ${pct(st[st.length - 1].share)} de las reposiciones; el ${top}, el ${pct(st[0].share)}. Cada alerta ocupa un hueco.` },
      { no: "Esperar a la capacidad exacta", yes: `Llevarte el ${top} o el ${second} cuando salga`, why: `Entre los dos concentraron el ${pct(st[0].share + st[1].share)} de todas las reposiciones${where(x.c)}; una funda e iCloud hacen que la capacidad importe menos que la espera.` },
    ];
  },
  colourLead: (x: ConfigsView) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return `Los colores se comparan cuando llegan reposiciones.`;
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return `${x.colour(co[0].key)}, pero por poco: el ${pct(co[0].share)} de las reposiciones frente al ${pct(co[1].share)} de ${x.colour(co[1].key)}, ${pl(gap, "punto", "puntos")} de diferencia${co[0].medianSec && co[1].medianSec ? `; en stock duraron una mediana de ${segs(co[0].medianSec)} y ${segs(co[1].medianSec)}` : ""}. El color cambia tus probabilidades menos que la capacidad, así que una alerta para los dos colores de la capacidad que quieres casi duplica tus opciones.`;
  },
  colourKeys: (x: ConfigsView) => x.d.byColor.map((g) => `${x.colour(g.key)}: ${reposiciones(g.restocks)} en ${tiendas(g.stores)}, ${hours(g.exposureSec)} disponible en total${g.nowStores ? `, ${tiendas(g.nowStores)} lo ${v(g.nowStores, "tiene", "tienen")} ahora` : ""}.`),
  shelfLead: (x: ConfigsView) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return `El tiempo en stock de una reposición se mide desde la reposición hasta la siguiente comprobación que la ve agotada; las primeras cifras aparecen cuando diez reposiciones de una configuración han terminado.`;
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return `El ${x.cfg(slow)} es el que más margen te da: una mediana de ${segs(slow.lifetimes!.medianSec)} disponible antes de agotarse, frente a ${segs(fast.lifetimes!.medianSec)} del ${x.cfg(fast)}. Los que más tardan en venderse son las capacidades caras (las quiere menos gente), así que «más margen para comprar» y «más reposiciones» señalan configuraciones distintas, y el ranking de arriba pondera las dos.`;
  },
  shelfCaption: "Tiempo en stock por configuración (reposición → siguiente comprobación con agotado)",
  shelfHead: ["Configuración", "Reposiciones con final conocido", "Mediana", "Agotadas en 2 min", "Agotadas en 20 min", "La más rápida"],
  shelfKeys: (x: ConfigsView) => [
    `El aviso llega a tu móvil unos ${SPEED.alertSec} segundos después de que confirmemos una reposición; la disponibilidad mediana es de ${x.d.lifetimes ? segs(x.d.lifetimes.medianSec) : "alrededor de un minuto"}, así que la mayoría de las reposiciones están a tu alcance si tienes la app Apple Store abierta en el Duo y una tarjeta guardada.`,
    `El tiempo es un límite superior: vemos el agotamiento en la siguiente comprobación, hasta ${SPEED.checkSec} segundos después (${SPEED.fastSec} en las tiendas con alertas).`,
  ],
  weekLead: (x: ConfigsView) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return `Ninguna reposición en los últimos catorce días${where(x.c)}; la tabla semana a semana empieza con la próxima.`;
    const lead = rows[0];
    return `${cap(reposiciones(tot7))} en los últimos siete días${totP ? ` frente a ${n(totP)} la semana anterior (${signed(tot7 / totP - 1)})` : ""}, con el ${x.cfg(lead)} a la cabeza con ${n(lead.last7)}. ${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `No es la misma configuración que lidera el total histórico (${x.cfg(x.d.easiest)}): la mezcla cambia con cada entrega, así que mira esta tabla antes de decidir para qué crear alertas.` : "La líder histórica sigue liderando esta semana."}`;
  },
  weekCaption: "Reposiciones por configuración: últimos 7 días frente a los 7 anteriores",
  weekHead: ["Configuración", "Últimos 7 días", "7 días anteriores", "Cambio"],
  alertsLead: (x: ConfigsView) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? `Crea alertas para ${lw(top.map((r) => x.cfg(r)))} en las dos o tres tiendas a las que llegues más rápido; eso cubre el ${pct(top.reduce((a, r) => a + r.restocks, 0) / x.d.n)} de las reposiciones habidas hasta ahora${where(x.c)}. Añade la configuración exacta que quieres como cuarta alerta y llévate la que salga primero.`
      : `Hasta que lleguen reposiciones${where(x.c)}, crea alertas para la capacidad que quieres en los dos colores en tus tiendas más cercanas.`;
  },
  alertsKeys: (x: ConfigsView) => [
    `Las alertas son por tienda × configuración, así que tres tiendas × tres configuraciones son ${pl(9, "alerta", "alertas")}.`,
    `Comprobamos las tiendas con alertas cada ${SPEED.fastSec} segundos y confirmamos la reposición antes de avisar; el aviso llega unos ${SPEED.alertSec} segundos después.`,
    x.one ? "La tienda con más movimiento es también la que más gente vigila." : "Elige las tiendas por distancia, no por número de reposiciones: la tienda con más movimiento es también la que más gente vigila.",
  ],
  methodLead: `Una reposición es una configuración que pasa de agotada a disponible en una tienda, confirmada por dos comprobaciones coincidentes; la primera vez que vemos algo tras un hueco en el seguimiento no cuenta. El tiempo en stock va desde la reposición hasta la primera comprobación que la ve agotada de nuevo, así que es un límite superior. «Disponible en total» suma esos tiempos en todas las reposiciones de la configuración: la medida más sencilla de cuánta oportunidad hubo de comprar una.`,
  methodKeys: (x: ConfigsView) => [
    `Fuente: la propia disponibilidad para recogida de Apple en ${storesPhrase(x)}, leída cada ${SPEED.checkSec} segundos por tienda (cada ${SPEED.fastSec} en las tiendas con alertas) desde el ${longDate(x.d.since)}.`,
    "Las tiendas con stock ahora y la hora de la última reposición son en directo; todo lo demás se recalcula en menos de cinco minutos.",
    "Cita lo que quieras con un enlace: las cifras cambian, así que indica la fecha en que las leíste.",
  ],
  faq: (x: ConfigsView): Faq[] => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor;
    return [
      { q: `¿Qué iPhone Duo es el más fácil de conseguir${where(x.c)}?`, a: e ? `El ${x.cfg(e)}: ${reposiciones(e.restocks)} confirmadas en ${apples(e.stores)} desde el ${longDate(d.since)} y ${hours(e.exposureSec)} disponible en total, más que ninguna otra configuración. ${h ? `El ${x.cfg(h)} es el más difícil, con ${reposiciones(h.restocks)}.` : ""}` : `Aún hay muy pocas reposiciones confirmadas${where(x.c)} para decirlo; esta página ordena todas las configuraciones en cuanto llegan.` },
      { q: `¿Es más difícil encontrar ${co.length > 1 ? x.colour(co[1].key) : "un color"} que ${co.length > 1 ? x.colour(co[0].key) : "el otro"}?`, a: co.length > 1 && d.n ? `Un poco: ${x.colour(co[0].key)} supuso el ${pct(co[0].share)} de las reposiciones y ${x.colour(co[1].key)}, el ${pct(co[1].share)}. La diferencia entre capacidades es mucho mayor, así que elige primero la capacidad y crea alertas para sus dos colores.` : "Los colores se comparan cuando llegan reposiciones." },
      { q: `¿Llega a haber stock del iPhone Duo de 1TB o 2TB${where(x.c)}?`, a: (() => { const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage)); const bn = big.reduce((a, r) => a + r.restocks, 0); const most = big.length ? Math.max(...big.map((r) => r.stores)) : 0; return bn ? `Sí, pero rara vez: ${reposiciones(bn)} de los modelos de 1TB y 2TB de un total de ${n(d.n)} (${pct(bn / d.n)}), en ${most > 0 ? tiendas(most) : "ninguna tienda"} como máximo. Cuando aparece uno, está disponible más tiempo (lo quiere menos gente), así que una alerta para él merece un hueco aunque salte pocas veces.` : `Aún no en nuestros datos${where(x.c)}: ninguna reposición confirmada de un modelo de 1TB o 2TB desde el ${longDate(d.since)}.`; })() },
      { q: "¿Creo alertas para una configuración o para varias?", a: `Para varias, en pocas tiendas: las tres configuraciones más repuestas concentraron ${d.n ? `el ${pct(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n)}` : "la mayoría"} de las reposiciones${where(x.c)}. Tres configuraciones en tres tiendas cercanas son nueve alertas, que caben en un plan Plus; añade la exacta que quieres como cuarta.` },
      { q: "¿La mezcla es la misma en otros países?", a: `No siempre: cada país recibe su propia asignación y el ranking de su página puede variar. Los enlaces de «Otros países» abren esta misma página para los otros ${n(18)} países que sigue PickupChecker; la página de EE. UU. tiene el historial más largo (desde el ${longDate("2026-10-29")}).` },
    ];
  },
  sources: { apple: "Apple: configuraciones y precios del iPhone Duo", pickup: "Apple: recogida en tienda", log: "PickupChecker: el registro de reposiciones del que sale esta página" },
  ld: (x: ConfigsView) => ({
    datasetName: `Reposiciones del iPhone Duo por configuración, Apple Store ${dePais(x.c.cc)}`,
    description: `Reposiciones confirmadas del iPhone Duo en ${storesPhrase(x)} desde el ${longDate(x.d.since)}, por configuración (capacidad × color): número, tiendas, tiempo disponible en total, mediana en stock, tiendas con stock ahora.`,
    measured: ["reposiciones por configuración", "tiendas con alguna reposición", "tiempo disponible en segundos", "mediana en stock", "tiendas con stock ahora"],
  }),
  related: "Sigue leyendo",
  sameData: "Los mismos datos, otras preguntas",
  otherCountries: "Otros países",
  questions: { restockTimes: "¿Cuándo repone Apple el iPhone Duo?", sellOut: "¿Cuánto tarda en agotarse una reposición?", shortage: "¿Mejora la escasez?", channels: "¿Apple, operadora o distribuidor?", alerts: "La forma más rápida de enterarte", api: "La API de stock gratuita" },
  setUpAlert: "Crear alertas",
  logLive: "Registro de reposiciones, en directo",
  faqTitle: "Preguntas frecuentes",
  onThisPage: "En esta página",
};

/* ================================================================== is the shortage easing */
const supply = {
  crumb: "¿Mejora la escasez?",
  title: (c: Country) => fitTitleW([`¿Mejora la escasez del iPhone Duo ${enPais(c.cc)}? Tendencia semanal`, `¿Mejora la escasez del iPhone Duo ${enPais(c.cc)}?`, `¿Mejora la escasez del iPhone Duo? (${pais(c.cc)})`], 49),
  metaDescription: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    return d.trend !== "insufficient"
      ? fitTitleW([
        `${cap(trendWord(d))} reposiciones del iPhone Duo${where(x.c)} esta semana: ${n(w.restocks)} en ${apples(w.stores)} en 7 días (${signed(d.change!)} frente a la semana anterior)${w.medianSec ? `, cada una agotada en una mediana de ${segs(w.medianSec)}` : ""}. Suministro día a día, cómo se vería el final de la escasez y si merece la pena esperar.`,
        `${cap(reposiciones(w.restocks))} del iPhone Duo${where(x.c)} en los últimos 7 días (${signed(d.change!)} semana a semana). Suministro día a día y si la escasez mejora.`,
      ], 160)
      : `¿Mejora la escasez del iPhone Duo${where(x.c)}? ${cap(confirmadas(d.n))} en los Apple Store desde el ${longDate(d.since)}, día a día, con cómo se vería el final de la escasez y si conviene esperar o comprar ya.`;
  },
  h1: (x: SupplyView) => `¿Está mejorando la escasez del iPhone Duo${where(x.c)} y cuánto va a durar?`,
  intro: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    if (d.trend === "insufficient") {
      return `Aún es pronto para decirlo${where(x.c)}: PickupChecker empezó el seguimiento el ${longDate(d.since)}, hace ${dias(d.days)}, así que la primera comparación completa semana a semana aparecerá el ${longDate(d.comparableFrom)}. Por ahora, ${confirmadas(d.n)} en ${n(d.storesEver)} de ${apples(x.stores)}${d.lifetimes ? `, cada una disponible una mediana de ${segs(d.lifetimes.medianSec)} antes de agotarse` : ""}; ${n(d.storesNow)} ${d.storesNow === 1 ? "tienda tiene" : "tiendas tienen"} un Duo ahora mismo. Nadie puede predecir cuándo acabará la escasez; esta página muestra las dos cifras que lo dirán antes que nada (reposiciones por semana y segundos en stock), actualizadas con cada reposición.`;
    }
    const verdict = d.trend === "up" ? "El suministro mejora" : d.trend === "down" ? "El suministro se reduce" : "El suministro se mantiene";
    const demand = w.medianSec ? (w.medianSec <= 120 ? `pero la demanda sigue agotándolo todo: una reposición duró una mediana de ${segs(w.medianSec)} esta semana${d.prev7.medianSec ? ` (${segs(d.prev7.medianSec)} la semana pasada)` : ""}, así que todavía no es más fácil comprar uno a mano` : `y el tiempo en stock se alarga: una mediana de ${segs(w.medianSec)} esta semana${d.prev7.medianSec ? ` frente a ${segs(d.prev7.medianSec)} la semana pasada` : ""}, la primera señal de que la escasez afloja`) : "";
    return `${verdict}${where(x.c)}: los Apple Store repusieron el iPhone Duo ${pl(w.restocks, "vez", "veces")} en los últimos siete días, ${signed(d.change!)} respecto a la semana anterior (${n(d.prev7.restocks)}), en ${tiendas(w.stores)} de ${n(x.stores)}${demand ? `, ${demand}` : ""}. ${n(d.storesNow)} ${d.storesNow === 1 ? "tienda tiene" : "tiendas tienen"} uno ahora mismo. Nadie puede predecir el final; las dos cifras que lo dirán antes que nada están en esta página y se actualizan con cada reposición.`;
  },
  updated: (x: SupplyView, stamp: string) => `Actualizado ${stamp} · datos desde el ${longDate(x.d.since)} · ${apples(x.stores)} · comprobaciones cada ${SPEED.checkSec} segundos`,
  nav: { trend: "Esta semana", easier: "¿Más fácil comprar?", stores: "Cuántas tiendas", howlong: "Cuánto durará", christmas: "Esperar o comprar", world: "Otros países", method: "Cómo contamos" },
  h2: (x: SupplyView) => ({
    trend: `¿Suben o bajan las reposiciones del iPhone Duo${where(x.c)}?`,
    easier: "¿Es más fácil comprar uno de verdad?",
    stores: `¿Cuántos Apple Store${where(x.c)} han llegado a tener un iPhone Duo?`,
    howlong: "¿Cuánto va a durar la escasez del iPhone Duo?",
    christmas: "¿Sigo esperando una reposición o lo compro de otra forma?",
    world: `¿Mejora la escasez más deprisa en otros países${x.us ? "" : ` que ${enPais(x.c.cc)}`}?`,
    method: "Cómo contamos",
  }),
  weekBefore: "semana anterior",
  goneIn2: "agotadas en 2 minutos",
  storesEverLabel: ((one: boolean) => (one ? "reposiciones confirmadas hasta ahora" : "tiendas con al menos una reposición")) as unknown as D["supply"]["storesEverLabel"],
  hero: {
    last7: "reposiciones, últimos 7 días",
    change: "frente a los 7 días anteriores",
    stores: ((one: boolean) => (one ? "días con reposición" : "tiendas que repusieron, últimos 7 días")) as unknown as D["supply"]["hero"]["stores"],
    median: "segundos en stock (mediana), últimos 7 días",
    now: ((one: boolean) => (one ? "lo tiene ahora mismo" : "tiendas con uno ahora mismo")) as unknown as D["supply"]["hero"]["now"],
    sinceLast: "horas desde la última reposición",
  },
  trendLead: (x: SupplyView) => {
    const { d } = x;
    if (d.trend === "insufficient") return `La tabla diaria es todo el historial por ahora: ${reposiciones(d.n)} en ${dias(d.days)}. La línea semana a semana aparecerá el ${longDate(d.comparableFrom)}; hasta entonces, lee la dirección día a día.`;
    const w = d.last7, p = d.prev7;
    const gap = w.longestGapHours != null ? `El mayor hueco entre dos reposiciones esta semana fue de ${horas(w.longestGapHours)}${p.longestGapHours != null ? ` (${n(p.longestGapHours)} la semana pasada)` : ""}. ` : "";
    return `${cap(trendWord(d))} esta semana: ${reposiciones(w.restocks)} (${dec1(w.perStoreDay * 7)} por tienda) frente a ${n(p.restocks)} la semana anterior, ${signed(d.change!)}. ${gap}Las reposiciones llegan en oleadas ligadas a las entregas, así que un día tranquilo dice poco; lo que hay que mirar son los totales de siete días.`;
  },
  dailyCaption: (x: SupplyView) => `Reposiciones confirmadas por día local${where(x.c)}, las más recientes primero (últimos 14 días)`,
  dailyHead: ["Día", "Reposiciones", "Tiendas", "Mediana en stock"],
  trendKeys: (x: SupplyView) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? `El día con más hasta ahora: ${dateLabel(best.date)}, con ${reposiciones(best.restocks)} en ${tiendas(best.stores)}.` : "Aún no hay ninguna reposición; el día con más aparecerá aquí.",
      x.d.sinceLastHours != null && x.d.latest ? `Última reposición hace ${x.d.sinceLastHours < 1 ? "menos de una hora" : horas(x.d.sinceLastHours)}: ${x.storeName(x.d.latest.storeNumber)}, ${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}.` : "Aún no hay ninguna reposición registrada.",
      `«Suben» significa al menos un ${pc(Math.round(0.15 * 100))} más de reposiciones que la semana anterior; «bajan», al menos un ${pc(Math.round(0.15 * 100))} menos; lo que queda entre medias se lee como estable.`,
    ];
  },
  easierLead: (x: SupplyView) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return `Más fácil significa dos cosas a la vez: más reposiciones y que cada una esté disponible más tiempo. El tiempo en stock aparece cuando diez reposiciones de la ventana tienen un final conocido.`;
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return `${longer ? "Un poco, sí" : shorter ? "No, al contrario" : "Todavía no"}: una reposición estuvo disponible una mediana de ${segs(w.medianSec)} esta semana${p.medianSec ? ` frente a ${segs(p.medianSec)} la semana pasada` : ""}, y el ${pct(w.within2min!)} desapareció en dos minutos${p.within2min != null ? ` (el ${pct(p.within2min)} la semana pasada)` : ""}. El final de la escasez se ve cuando las dos cifras se mueven juntas (más reposiciones y más tiempo en stock); más reposiciones a solas significan que Apple envía más mientras sigue esperando la misma gente.`;
  },
  easierKeys: (x: SupplyView) => [
    "Cómo se verá aquí el final de la escasez: mediana en stock por encima de 20 minutos, la mayoría de las tiendas con uno a la vez y plazos de entrega en apple.com de menos de una semana.",
    `Hasta entonces, la forma de comprar uno sigue siendo una alerta: confirmamos la reposición y avisamos unos ${SPEED.alertSec} segundos después, con margen de sobra dentro de la disponibilidad mediana.`,
    x.d.lifetimes ? `Histórico${where(x.c)}: ${reposiciones(x.d.lifetimes.n)} con final conocido, mediana de ${segs(x.d.lifetimes.medianSec)}, el ${pct(x.d.lifetimes.within2min)} agotadas en 2 minutos.` : "Las cifras históricas de tiempo en stock aparecen tras diez reposiciones terminadas.",
  ],
  storesLead: (x: SupplyView) => {
    const { d } = x;
    const never = x.stores - d.storesEver;
    return x.one
      ? `${d.storesEver ? `Sí: el único Apple Store ${dePais(x.c.cc)} ha tenido ${confirmadas(d.n)} desde el ${longDate(d.since)}` : `Aún no: ninguna reposición confirmada en el único Apple Store ${dePais(x.c.cc)} desde el ${longDate(d.since)}`}${d.storesNow ? ", y tiene un Duo ahora mismo" : ""}.`
      : `${n(d.storesEver)} de los ${apples(x.stores)}${where(x.c)} (el ${pct(d.storesEver / x.stores)}) ${v(d.storesEver, "ha", "han")} tenido al menos una reposición confirmada del iPhone Duo desde el ${longDate(d.since)}${never ? `; ${tiendas(never)} ${never === 1 ? "no la ha tenido" : "no la han tenido"}` : ""}. ${n(d.storesNow)} ${v(d.storesNow, "tiene", "tienen")} uno ahora mismo. El suministro se reparte de forma desigual: las tiendas insignia y las de centro comercial son las que más reponen, por eso la tienda que eliges para las alertas importa tanto como la configuración.`;
  },
  storesKeys: (x: SupplyView) => [
    `Tiendas por número de reposiciones, con horas locales: la sección «Por ${noun(x.c, x.us).one}» de la página de horas de reposición${where(x.c)}.`,
    "Una tienda que nunca ha repuesto no es una tienda que Apple se salte: las asignaciones llegan por entregas, y varias tiendas recibieron su primer Duo solo en la segunda semana.",
  ],
  howlongLead: (x: SupplyView) => `Nadie fuera de Apple lo sabe, y nosotros no hacemos pronósticos. Lo que muestra el historial${where(x.c)}: ${reposiciones(x.d.n)} en ${dias(x.d.days)}, ${x.d.trend === "insufficient" ? `una tendencia semana a semana a partir del ${longDate(x.d.comparableFrom)}` : `${trendWord(x.d)} reposiciones esta semana que la pasada`} y tiempos en stock ${x.d.last7.medianSec ? `de alrededor de ${segs(x.d.last7.medianSec)}` : "de pocos minutos"}. Una escasez termina en una secuencia que puedes seguir aquí: suben las reposiciones por semana, el tiempo en stock pasa de segundos a horas, y después la mayoría de las tiendas tienen uno a la vez y el plazo de entrega de apple.com baja a días.`,
  howlongKeys: () => [
    "Señal 1: las reposiciones por semana siguen subiendo durante dos o tres semanas (la tabla de arriba).",
    "Señal 2: la mediana en stock supera los 20 minutos; las reposiciones duran más que la gente que recarga.",
    "Señal 3: el plazo de entrega de apple.com baja a menos de una semana y la mayoría de las tiendas tienen uno a la vez.",
    "El lanzamiento de nuevos colores o capacidades pone el reloj a cero; mantén la alerta hasta la señal 3.",
  ],
  christmasLead: (x: SupplyView) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Mantén la alerta y mantén un pedido con envío a casa en la cola: las dos cosas, no una. Al ritmo actual (${perDay >= 1 ? `alrededor de ${pl(Math.round(perDay), "reposición", "reposiciones")} al día${where(x.c)}` : `menos de una reposición al día${where(x.c)}`}${w.medianSec ? `, cada una disponible una mediana de ${segs(w.medianSec)}` : ""}), a una tienda vigilada cerca de ti le toca el turno en cuestión de días, y una reposición confirmada llega a tu móvil unos ${SPEED.alertSec} segundos después de que la veamos. Pagar un sobreprecio en otro sitio solo tiene sentido si la espera en sí te cuesta más que el recargo; la comparativa de canales lo sopesa con honestidad.`;
  },
  christmasKeys: () => [
    "Pide primero con envío a casa en apple.com: te guarda el sitio y se puede cancelar cuando salga una recogida.",
    "Alertas para las dos o tres configuraciones más repuestas en tus tiendas más cercanas (la página de configuraciones dice cuáles).",
    "Ten la app Apple Store con la sesión iniciada, el Duo en la bolsa y una tarjeta guardada: la disponibilidad mediana es de alrededor de un minuto.",
  ],
  worldLead: (x: SupplyView) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return `Aquí se compararán las reposiciones semanales por tienda de cada país cuando todos tengan una semana completa de datos.`;
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return `${top.name} fue el país con más reposiciones por tienda en los últimos siete días (${dec1(top.perStoreDay * 7)} por tienda) y ${bottom.name}, el que menos (${dec1(bottom.perStoreDay * 7)})${mine ? `; ${pais(x.c.cc)} se queda en ${dec1(mine.perStoreDay * 7)}` : ""}. Las asignaciones varían según el país y la fecha de lanzamiento, así que el final de la escasez se nota de forma desigual; el historial de EE. UU. es el más largo.`;
  },
  worldCaption: "Últimos 7 días por país: reposiciones, reposiciones por tienda, mediana en stock, tiendas con uno ahora",
  worldHead: ["País", "Tiendas", "Reposiciones (7 d)", "Por tienda", "Mediana en stock", "En stock ahora"],
  methodLead: `Una reposición es una configuración que pasa de agotada a disponible en una tienda, confirmada por dos comprobaciones coincidentes separadas ${SPEED.checkSec} segundos (${SPEED.fastSec} en las tiendas con alertas); la primera vez que vemos algo tras un hueco en el seguimiento no cuenta. Los días son los días locales de la tienda. El tiempo en stock va desde la reposición hasta la primera comprobación que la ve agotada de nuevo: un límite superior, hasta la siguiente comprobación. Las semanas son los últimos siete días locales frente a los siete anteriores; una comparación necesita las dos completas.`,
  methodKeys: (x: SupplyView) => [
    `Fuente: la disponibilidad para recogida de Apple en ${storesPhrase(x)}, desde el ${longDate(x.d.since)}.`,
    "Todo lo de esta página se recalcula en menos de cinco minutos tras una reposición; las tiendas con stock ahora son en directo.",
    "Cita con un enlace y la fecha: son cifras en movimiento.",
  ],
  faq: (x: SupplyView): Faq[] => {
    const { d } = x;
    const w = d.last7;
    return [
      { q: `¿Sigue reponiendo Apple el iPhone Duo${where(x.c)}?`, a: d.n ? `Sí: ${confirmadas(w.restocks)} en los últimos siete días en ${apples(w.stores)}${where(x.c)}, ${reposiciones(d.n)} desde el ${longDate(d.since)}. ${d.sinceLastHours != null ? `La última, hace ${d.sinceLastHours < 1 ? "menos de una hora" : horas(d.sinceLastHours)}.` : "La última aún no está registrada."}` : `Ninguna reposición confirmada aún${where(x.c)} desde que empezó el seguimiento el ${longDate(d.since)}; esta página se actualiza en menos de cinco minutos tras la primera.` },
      { q: `¿Está mejorando la escasez del iPhone Duo${where(x.c)}?`, a: d.trend === "insufficient" ? `Aún es pronto para decirlo: la primera comparación completa semana a semana aparecerá el ${longDate(d.comparableFrom)}. Vigila dos cifras, reposiciones por semana y segundos en stock; mejorar significa que suban las dos.` : `${cap(trendWord(d))} reposiciones esta semana que la pasada (${signed(d.change!)})${w.medianSec ? `, y una reposición duró una mediana de ${segs(w.medianSec)}` : ""}. Mejorar significa más reposiciones y más tiempo en stock a la vez; por ahora ${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "las dos van en la buena dirección" : "solo se cumple una parte"}.` },
      { q: "¿Cuándo será fácil comprar el iPhone Duo?", a: "Nadie fuera de Apple puede decirlo, y PickupChecker no hace pronósticos. La secuencia que hay que vigilar: las reposiciones semanales suben durante dos o tres semanas, la mediana en stock supera los 20 minutos, y después la mayoría de las tiendas tienen uno a la vez y el plazo de entrega de apple.com baja a menos de una semana." },
      { q: "¿Pago un sobreprecio en vez de esperar?", a: `Solo si la espera te cuesta más que el recargo: al ritmo actual, a una tienda vigilada cerca de ti le toca el turno en cuestión de días, y una alerta te llega unos ${SPEED.alertSec} segundos después de una reposición confirmada. La reventa, además, no tiene plazo de devolución y trae los riesgos de siempre; la página de comparativa de canales los sopesa.` },
      { q: "¿La campaña de Navidad cambia las probabilidades?", a: "La demanda sube hacia diciembre mientras las entregas mantienen su ritmo, así que los tiempos en stock tienden a acortarse, no a alargarse. Mantén un pedido con envío a casa como red de seguridad y deja que las alertas cacen la recogida; cancela el que no necesites." },
    ];
  },
  sources: { newsroom: "Apple Newsroom: el iPhone Duo llega a los Apple Store", pickup: "Apple: recogida en tienda", log: "PickupChecker: el registro de reposiciones del que sale esta página", restockTimes: "PickupChecker: cuándo repone Apple el iPhone Duo" },
  ld: (x: SupplyView) => ({
    datasetName: `Tendencia del suministro del iPhone Duo, Apple Store ${dePais(x.c.cc)}`,
    description: `Reposiciones confirmadas del iPhone Duo por día en ${storesPhrase(x)} desde el ${longDate(x.d.since)}: reposiciones, tiendas, mediana en stock, cambio semana a semana.`,
    measured: ["reposiciones por día", "tiendas con alguna reposición", "mediana en stock", "cambio semana a semana", "tiendas con stock ahora"],
  }),
  related: "Sigue leyendo",
  sameData: "Los mismos datos, otras preguntas",
  otherCountries: "Esta página para otros países",
  questions: { restockTimes: "¿Cuándo repone Apple el iPhone Duo?", configs: "¿Qué configuración es la más fácil de conseguir?", channels: "¿Apple, operadora o distribuidor?", sellOut: "¿Cuánto tarda en agotarse una reposición?", howToGet: "Cómo conseguir un iPhone Duo", alerts: "La forma más rápida de enterarte" },
  setUpAlert: "Crear alertas",
  logLive: "Registro de reposiciones, en directo",
  faqTitle: "Preguntas frecuentes",
  onThisPage: "En esta página",
};

/* ================================================================== Apple vs carriers vs retailers */
const channels = {
  crumb: "¿Apple, operadora o distribuidor?",
  title: (c: Country, retailer: string) => fitTitleW([`iPhone Duo ${enPais(c.cc)}: ¿Apple, ${retailer} u operadora?`, `iPhone Duo: ¿Apple, ${retailer} u operadora?`, `iPhone Duo ${enPais(c.cc)}: ¿Apple, operadora o distribuidor?`, `iPhone Duo: ¿Apple, operadora o distribuidor? (${pais(c.cc)})`, "iPhone Duo: ¿Apple, operadora o distribuidor?"], 49),
  metaDescription: (x: ChannelsView) => fitTitleW([
    `Dónde conseguir de verdad un iPhone Duo${where(x.c)}: recogida en Apple Store (${confirmadas(x.sup.n)} en ${tiendas(x.stores)} desde el ${longDate(x.sup.since)}), envío de apple.com, ${lw(x.ch.carriers.slice(0, 3))}, ${lw(x.ch.retailers.slice(0, 2))} y reventa: lo que cada canal puede y no puede decirte, y cuál vigilar.`,
    `Recogida en Apple Store, envío de apple.com, ${lw(x.ch.carriers.slice(0, 2))}, ${x.ch.retailers[0] ?? "distribuidores"} o reventa para el iPhone Duo${where(x.c)}: lo que cada canal puede decirte y cuál vigilar.`,
  ], 160),
  h1: (x: ChannelsView) => `Apple Store, operadora o distribuidor: ¿dónde se consigue de verdad un iPhone Duo${where(x.c)}?`,
  intro: (x: ChannelsView) => `La recogida en Apple Store es el único canal del iPhone Duo${where(x.c)} cuyo suministro se puede medir: PickupChecker ha confirmado ${reposiciones(x.sup.n)} en ${storesPhrase(x)} desde el ${longDate(x.sup.since)}, ${n(x.sup.last7.restocks)} de ellas en los últimos siete días, cada una leída de la propia página de recogida de Apple cada ${SPEED.checkSec} segundos. Las operadoras (${lw(x.ch.carriers)}) y los distribuidores (${lw(x.ch.retailers)}) reciben sus propias asignaciones y no publican ningún dato de stock, así que nadie (ni nosotros ni nadie) puede darte con honestidad sus horas de reposición. Abajo, lo que cada canal puede y no puede decirte, los pros y los contras, y en qué orden vigilarlos.`,
  updated: (x: ChannelsView, stamp: string) => `Actualizado ${stamp} · datos de Apple Store desde el ${longDate(x.sup.since)} · ${apples(x.stores)} · comprobaciones cada ${SPEED.checkSec} segundos`,
  nav: { compare: "Canal por canal", pickup: "Recogida o envío", carriers: "Operadoras", retailers: "Distribuidores", resale: "Sobreprecio de reventa", abroad: "Comprar fuera", method: "Cómo lo sabemos" },
  h2: (x: ChannelsView) => ({
    compare: `¿Qué canal repone el iPhone Duo más a menudo${where(x.c)}?`,
    pickup: "¿La recogida en Apple Store es más rápida que pedir el envío en apple.com?",
    carriers: `¿Me conviene comprar el iPhone Duo en ${x.ch.carriers.length ? orList(x.ch.carriers.slice(0, 3)) : "una operadora"}?`,
    retailers: `¿Merece la pena mirar en ${x.ch.retailers.length ? lw(x.ch.retailers.slice(0, 2), 2) : "los distribuidores"}?`,
    resale: `¿Merece la pena pagar un sobreprecio en ${x.ch.resale[0] ?? "una web de reventa"}?`,
    abroad: "¿Puedo comprar un iPhone Duo en el extranjero y usarlo en casa?",
    method: "Cómo sabemos lo que sabemos",
  }),
  hero: {
    restocks: "reposiciones confirmadas en Apple Store",
    last7: "en los últimos 7 días",
    now: ((one: boolean) => (one ? "Apple Store con uno ahora" : "Apple Store con uno ahora")) as unknown as D["channels"]["hero"]["now"],
    channels: "otros canales, sin datos públicos de stock",
  },
  compareLead: (x: ChannelsView) => `La recogida en Apple Store, por la única medida disponible: ${confirmadas(x.sup.last7.restocks)} en los últimos siete días en ${tiendas(x.sup.last7.stores)}${where(x.c)}${x.sup.last7.medianSec ? `, cada una disponible una mediana de ${segs(x.sup.last7.medianSec)}` : ""}. Las operadoras y los distribuidores casi seguro que también reponen (reciben asignaciones de los mismos envíos de Apple), pero muestran un sí/no en una página de producto, no un historial, así que la comparativa de abajo va de lo que puedes vigilar, no de quién recibe más.`,
  compareCaption: "Los canales del iPhone Duo, comparados con honestidad",
  compareHead: ["Canal", "Qué se sabe de su stock", "Cómo vigilarlo", "La pega"],
  compareRows: (x: ChannelsView) => {
    const r = x.ch;
    return [
      { channel: "Recogida en Apple Store", known: `${confirmadas(x.sup.n)} desde el ${longDate(x.sup.since)}; cada reposición, cada tienda, con su hora.`, watch: `Una alerta aquí (unos ${SPEED.alertSec} segundos después de confirmarla) o el selector de recogida de la app Apple Store.`, catch: "La disponibilidad dura alrededor de un minuto; necesitas la app abierta y una tarjeta guardada." },
      { channel: "Envío de apple.com", known: "Apple muestra un plazo de envío al pagar; cambia a diario y nunca es un recuento de stock.", watch: "Haz el pedido; el plazo de tu página de pedido se actualiza a medida que Apple envía.", catch: "Semanas, no minutos, pero tu sitio en la cola queda guardado." },
      { channel: `Operadoras (${lw(r.carriers)})`, known: "Asignación propia; el stock online se muestra por configuración como disponible / sin stock. Sin historial, sin datos abiertos.", watch: "Sus apps y buscadores de tiendas; llamar a la tienda sigue funcionando.", catch: lockPhrase(x, "Se aplican condiciones de tarifa, financiación y activación; el stock varía según la tienda.") },
      { channel: `Distribuidores (${lw(r.retailers)})`, known: "Asignación propia, a menudo solo online para un producto recién lanzado; se muestra por configuración en la página del producto.", watch: "Su página de producto y su app; algunos envían correos de reposición.", catch: "Las asignaciones son menores que las de Apple y también se agotan en minutos." },
      { channel: `Reventa (${lw(r.resale)})`, known: "Siempre hay, a un precio.", watch: "—", catch: `Un sobreprecio, sin justificante de compra del fabricante y ${r.returnDays ? `sin ${returnPhrase(r.returnDays)}` : "sin ningún plazo de devolución"}.` },
    ];
  },
  compareKeys: (x: ChannelsView) => [
    `${n(x.ch.carriers.length + x.ch.retailers.length)} vendedores más${where(x.c)} y ni un solo historial público de stock: cualquier web que diga conocer las horas de reposición de una operadora está adivinando.`,
    "Nuestra postura: vigila la recogida en Apple Store con una alerta, mantén un pedido con envío de apple.com como red de seguridad y mira la página de un distribuidor cuando ya estés en ella.",
  ],
  pickupLead: (x: ChannelsView) => `Por rapidez, la recogida: una configuración que aparece en la página de recogida se puede reservar en ese mismo minuto y recoger el mismo día, mientras que un pedido con envío espera al plazo de Apple. Por seguridad, el envío: el pedido te guarda el sitio pase lo que pase en las tiendas. ${x.sup.lifetimes ? `La disponibilidad para recogida${where(x.c)} duró una mediana de ${segs(x.sup.lifetimes.medianSec)} y el ${pct(x.sup.lifetimes.within2min)} desapareció en dos minutos: por eso existe la alerta. ` : ""}La respuesta correcta son las dos: pide el envío hoy, crea la alerta de recogida y cancela el que no necesites.`,
  pickupSwaps: () => [
    { no: "Cancelar el pedido de envío para «empezar de cero»", yes: "Mantenerlo hasta tener la recogida en la mano", why: "Apple no publica posiciones en la cola; un pedido nuevo recibe simplemente el plazo de hoy, que rara vez es anterior al que ya tienes." },
    { no: "Recargar la página de recogida a mano", yes: "Dejar que la alerta la vigile", why: `Comprobamos las tiendas con alertas cada ${SPEED.fastSec} segundos y avisamos unos ${SPEED.alertSec} segundos después de confirmar; quien recarga a mano ve la mayoría de las reposiciones cuando ya han desaparecido.` },
    { no: "Cambiar el pedido a recogida más adelante, al pagar", yes: "Reservar la recogida como pedido nuevo cuando salte la alerta", why: "Las reservas para recogida salen del stock de la tienda y los pedidos con envío, del almacén: son dos colas, y la rápida es la de recogida." },
  ],
  pickupKeys: (x: ChannelsView) => [
    `La propia página de Apple explica las opciones de recogida y envío${x.ch.returnDays ? ` y el plazo de devolución de ${n(x.ch.returnDays)} días para ambas` : x.ch.returnDays === 0 ? "; ten en cuenta que Apple en Hong Kong no acepta devoluciones por cambio de opinión, solo cambios por defecto" : ""} (fuentes abajo).`,
    "Una reserva para recogida es un pedido para esa tienda; Apple te lo guarda y te dice cuándo ir.",
  ],
  carriersLead: (x: ChannelsView) => `Si quieres financiación, canjear tu móvil antiguo junto con una tarifa, o ya estás en una tienda de ${x.ch.carriers[0] ?? "una operadora"} con uno en el estante, sí. Si lo que quieres es el móvil cuanto antes, las operadoras son una segunda lotería con menos probabilidades y sin forma de vigilarla. ${lockPhrase(x, "Comprueba el bloqueo y las condiciones de la tarifa antes de comprar.")} Sus tiendas online muestran la disponibilidad por configuración, así que echar un vistazo no cuesta nada; solo que no esperes un historial ni un aviso.`,
  carriersKeys: (x: ChannelsView) => [
    `Operadoras${where(x.c)}: ${lw(x.ch.carriers)}.`,
    "El stock de las operadoras es por tienda; una tienda que lo muestra online puede tenerlo solo para recoger en persona.",
    "Un iPhone de operadora es el mismo aparato; la diferencia es el contrato que lleva asociado.",
  ],
  retailersLead: (x: ChannelsView) => `Merece la pena mirar cuando ya estás comprando allí, no vigilarlos: ${lw(x.ch.retailers)} muestran el iPhone Duo por configuración y venden su asignación online en minutos, sin ningún canal al que suscribirse. Su ventaja son las condiciones de pago y los puntos de fidelidad; su desventaja, una asignación menor que la de las propias tiendas de Apple.`,
  retailersKeys: (x: ChannelsView) => [
    `Distribuidores${where(x.c)}: ${lw(x.ch.retailers)}.`,
    "Mira el selector de configuración de la página del producto: en gris significa sin stock online, lo que no dice nada de sus tiendas físicas.",
  ],
  resaleLead: (x: ChannelsView) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Rara vez. Pon el sobreprecio frente a la espera que te ahorra: los Apple Store${where(x.c)} repusieron ${perDay >= 1 ? `alrededor de ${pl(Math.round(perDay), "vez", "veces")} al día` : "menos de una vez al día"} esta semana, y una alerta te llega unos ${SPEED.alertSec} segundos después de una reposición confirmada, así que a una tienda vigilada cerca de ti le suele tocar en cuestión de días. Enfrente, ${lw(x.ch.resale)} no ofrecen justificante de compra del fabricante, ${x.ch.returnDays ? `nada de ${returnPhrase(x.ch.returnDays)}` : "ningún plazo de devolución"} y los riesgos de siempre: un aparato con bloqueo de activación, una caja cambiada, una devolución «precintada».`;
  },
  resaleKeys: () => [
    "Si aun así compras de reventa: quedad en persona, enciéndelo, mira el número de serie en Ajustes → General → Información e inicia sesión antes de pagar.",
    "La garantía de Apple va con el aparato, no con el tique, pero pueden pedirte el justificante de compra; una venta entre particulares no puede darte el de Apple.",
    "Un sobreprecio que supera una semana de espera es un sobreprecio por la impaciencia; decide sabiéndolo.",
  ],
  abroadLead: (x: ChannelsView) => `A menudo sí, con comprobaciones: un iPhone comprado a Apple se vende libre en la mayoría de los países, el servicio de garantía de Apple está disponible internacionalmente con excepciones, y el modelo tiene que ser compatible con las bandas de tu operadora en casa, y con su eSIM, porque las páginas de compra de Apple presentan el iPhone Duo como solo eSIM en todos los países. Los impuestos son el coste real: ${x.c.pricesIncludeTax ? "el precio que pagas fuera incluye un impuesto local que quizá no puedas recuperar" : "el impuesto sobre las ventas se añade en caja"}, y la aduana de tu país puede sumar aranceles a la vuelta. PickupChecker sigue ${x.us ? "otros 18 países" : "EE. UU. y otros 17 países"}, así que la pregunta del stock en sí se responde desde las páginas de cada país.`,
  abroadKeys: () => [
    "Antes de comprar: la página de garantía de Apple con los países donde da servicio, la lista de bandas y SIM del modelo y la compatibilidad eSIM de tu operadora.",
    "Guarda el tique: el servicio y cualquier devolución siguen las normas del país de compra.",
    "Un móvil comprado para alguien de casa sigue siendo un móvil comprado fuera; valen las mismas comprobaciones.",
  ],
  methodLead: (x: ChannelsView) => `Las cifras de Apple Store de esta página salen de las comprobaciones propias de PickupChecker en ${storesPhrase(x)} cada ${SPEED.checkSec} segundos desde el ${longDate(x.sup.since)}; una reposición solo cuenta tras dos observaciones coincidentes. Las listas de operadoras y distribuidores son los vendedores que la propia Apple nombra para el país más los revendedores más grandes, con sus propias páginas como fuente; lo que decimos de su stock es lo que muestran sus páginas, que es una instantánea, no un historial. No rastreamos sus webs y no afirmamos nada sobre sus horas de reposición.`,
  methodKeys: () => ["Correcciones bienvenidas: si un vendedor de esta página ya no tiene el iPhone Duo, dínoslo y lo quitamos.", "Cita con un enlace y la fecha."],
  faq: (x: ChannelsView): Faq[] => [
    { q: `¿Qué canal repone el iPhone Duo más rápido${where(x.c)}?`, a: `El único canal con un historial medible es la recogida en Apple Store: ${confirmadas(x.sup.last7.restocks)} en los últimos siete días${where(x.c)}${x.sup.last7.medianSec ? `, cada una disponible una mediana de ${segs(x.sup.last7.medianSec)}` : ""}. Las operadoras y los distribuidores también reponen, pero no publican ningún dato, así que nadie puede ordenarlos con honestidad.` },
    { q: "Si cancelo mi pedido de apple.com y vuelvo a pedir, ¿pierdo mi sitio?", a: "Recibes un pedido nuevo con el plazo de envío de hoy; Apple no publica posiciones en la cola. Compara el plazo que aparece al pagar con el de tu pedido actual antes de cancelar: rara vez es anterior." },
    { q: "¿Un iPhone Duo de operadora es distinto del de Apple?", a: `El mismo aparato. ${lockPhrase(x, "La diferencia está en la tarifa y en las condiciones de bloqueo o financiación que lleve asociadas.")} El stock de las operadoras es independiente del de Apple y se muestra por tienda.` },
    { q: "¿Comprar en un distribuidor me da el plazo de devolución de Apple?", a: x.ch.returnDays ? `No: se aplica la política del propio distribuidor. El plazo de ${n(x.ch.returnDays)} días de Apple vale para las compras hechas a Apple (apple.com y Apple Store).` : x.ch.returnDays === 0 ? "Apple en Hong Kong no acepta devoluciones por cambio de opinión (solo cambios por defecto), así que compara la política del propio distribuidor; algunos son más generosos que Apple allí." : "No: se aplica la política del propio distribuidor; el plazo de devolución de Apple cubre solo las compras hechas a Apple." },
    { q: "¿Qué operadoras nombra Apple para el iPhone Duo?", a: x.c.cc === "us" || x.c.cc === "jp" ? `La página de compra de Apple${where(x.c)} nombra a ${lw(x.ch.carriers)}; la de cualquier otro país lo vende libre, sin paso de operadora.` : `La página de compra de Apple${where(x.c)} vende el iPhone Duo libre y no nombra ninguna operadora; ${lw(x.ch.carriers)} son las redes que Apple indica como compatibles con el iPhone allí, y lo venden con sus propias condiciones.` },
    { q: "¿Puedo usar con mi operadora un iPhone Duo comprado en el extranjero?", a: "Normalmente sí, si el modelo es compatible con las bandas de tu operadora, tu operadora ofrece eSIM (el iPhone Duo es solo eSIM en todas partes) y está libre, como lo están las ventas de la propia Apple en la mayoría de los países. El servicio de garantía es internacional con excepciones; los impuestos y aranceles son el coste extra real." },
  ],
  sources: { buy: "Apple: comprar el iPhone Duo", pickup: "Apple: recogida en tienda y envío", returns: "Apple: devoluciones y plazo de devolución", warranty: "Apple: servicio de garantía por país", log: "PickupChecker: el registro de reposiciones del que sale esta página" },
  ld: (x: ChannelsView) => ({
    description: `Recogida en Apple Store, envío de apple.com, operadoras, distribuidores y reventa para el iPhone Duo${where(x.c)}: reposiciones medidas en Apple Store y lo que los demás canales pueden y no pueden decirte.`,
  }),
  related: "Sigue leyendo",
  sameData: "Los mismos datos, otras preguntas",
  otherCountries: "Esta página para otros países",
  questions: { howToGet: "Cómo conseguir un iPhone Duo", whereToBuy: "Dónde comprar uno hoy", shortage: "¿Mejora la escasez?", configs: "¿Qué configuración es la más fácil de conseguir?", restockTimes: "¿Cuándo repone Apple el iPhone Duo?", alerts: "La forma más rápida de enterarte" },
  setUpAlert: "Crear alertas",
  logLive: "Registro de reposiciones, en directo",
  faqTitle: "Preguntas frecuentes",
  onThisPage: "En esta página",
};

/* ================================================================== the public API */
const api = {
  crumb: "API de stock",
  title: (c: Country) => fitTitleW([`API de stock del iPhone Duo ${enPais(c.cc)}: datos en directo`, `API gratuita de stock del iPhone Duo ${enPais(c.cc)}`, `API de stock del iPhone Duo (${pais(c.cc)})`], 49),
  metaDescription: (x: ApiView) => fitTitleW([
    `Una API JSON gratuita y de solo lectura para el stock de recogida del iPhone Duo en ${apples(x.stores)}${where(x.c)} (${n(x.worldStores)} en ${n(x.countries)} países): disponibilidad actual por tienda y configuración, reposiciones confirmadas de las últimas 24 horas, sin clave, con caché de 30 s. Endpoints, ejemplos en curl, Python y JavaScript, límites y cuándo un script gana a una alerta.`,
    `API JSON gratuita del stock del iPhone Duo en ${apples(x.stores)}${where(x.c)}: disponibilidad por tienda, reposiciones de las últimas 24 h, sin clave. Endpoints, ejemplos y límites.`,
  ], 160),
  h1: (x: ApiView) => `¿Hay una API o un script para vigilar el stock del iPhone Duo en los Apple Store${deWhere(x.c)}?`,
  intro: (x: ApiView) => `Sí: PickupChecker publica una API JSON gratuita y de solo lectura que cubre ${storesPhrase(x)} (${n(x.worldStores)} tiendas en ${n(x.countries)} países en total), construida a partir de comprobaciones cada ${SPEED.checkSec} segundos por tienda y con una caché de 30 segundos en el borde de la red, sin clave y sin registro. Una petición devuelve la disponibilidad actual para recogida del iPhone Duo en todas las tiendas, por configuración; una segunda, las reposiciones confirmadas de las últimas 24 horas. Ahora mismo ${n(x.storesNow)} de ${tiendas(x.stores)}${where(x.c)} ${v(x.storesNow, "tiene", "tienen")} uno y se ${x.restocks24 === 1 ? "ha confirmado 1 reposición" : `han confirmado ${reposiciones(x.restocks24)}`} en las últimas 24 horas. Abajo: los endpoints, ejemplos que funcionan en curl, Python y JavaScript, la referencia de campos, los límites, y por qué un script que consulta con el intervalo de caché de 30 segundos sigue siendo más lento que un aviso push.`,
  updated: (x: ApiView, stamp: string) => `Actualizado ${stamp} · ${apples(x.stores)}${where(x.c)} · comprobaciones cada ${SPEED.checkSec} segundos · API con caché de 30 s`,
  nav: { endpoints: "Endpoints", examples: "Ejemplos", fields: "Campos", limits: "Límites y condiciones", script: "¿Script o alerta?", apple: "Rastrear apple.com", method: "De dónde salen los datos" },
  h2: (x: ApiView) => ({
    endpoints: `¿Qué devuelve la API de stock del iPhone Duo${where(x.c)}?`,
    examples: "¿Cómo la llamo desde curl, Python o JavaScript?",
    fields: "¿Qué significan los campos?",
    limits: "¿Con qué frecuencia puedo consultar y cuáles son las condiciones?",
    script: "¿Escribo mi propio script o uso las alertas sin más?",
    apple: "¿Puedo consultar apple.com yo mismo en vez de usarla?",
    method: "De dónde salen los datos",
  }),
  hero: {
    stores: ((one: boolean) => (one ? "Apple Store cubierto" : "Apple Store cubiertos")) as unknown as D["api"]["hero"]["stores"],
    now: "con un iPhone Duo ahora",
    restocks24: "reposiciones confirmadas, últimas 24 h",
    cache: "segundos de caché de la API",
  },
  perMinute: "peticiones por minuto y dirección",
  keysNeeded: "claves de API necesarias",
  endpointsLead: (x: ApiView) => `Tres endpoints GET, todos JSON, todos bajo https://pickupchecker.com/api/v1: \`stock\` devuelve cada Apple Store${deWhere(x.c)} con las configuraciones que tiene ahora para recogida y cuándo se comprobó por última vez; \`restocks\` devuelve las reposiciones confirmadas de las últimas 1–168 horas, las más recientes primero, indicando si cada una sigue disponible; \`iphone-duo\` es un atajo a \`stock?model=duo\`. El código de país va en la ruta (${x.c.cc}${x.c.cc === "uk" ? ", también se acepta gb" : ""}); los modelos son duo, 18-pro y 18-pro-max.`,
  endpointsCaption: "Endpoints (sustituye {country} por us, ca, uk, au, de, fr, it, es, jp, kr, hk, sg, ae, ch, nl, se, tw, at o be)",
  endpointsHead: ["Endpoint", "Devuelve", "Parámetros"],
  endpointsRows: (x: ApiView) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: "Cada tienda: in_stock, las configuraciones disponibles, last_checked_at, last_in_stock_at; un resumen con stores_in_stock.", params: "model (duo | 18-pro | 18-pro-max), storage (p. ej. 512GB), color (p. ej. night-sky)" },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: "Reposiciones confirmadas, las más recientes primero: at, store, configuration, still_listed.", params: "model, hours (1–168, por defecto 24), limit (1–200, por defecto 100)" },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: "Redirige a stock?model=duo.", params: "—" },
    { path: "/api/v1", returns: "Esta lista, los países y modelos, los límites.", params: "—" },
  ],
  examplesLead: "Copia uno de estos; cada uno imprime las tiendas que tienen un iPhone Duo ahora mismo. Sin clave, sin más cabecera que un User-Agent que identifique tu script (para poder escribirte si se porta mal).",
  exampleTitles: { curl: "curl (cualquier shell)", python: "Python 3, solo biblioteca estándar", node: "JavaScript (Node 18+ o un navegador)" },
  fieldsLead: "Todos los campos van en snake_case y todas las horas en ISO 8601 en UTC. Los identificadores de tienda son los de Apple (números R), así que coinciden con las páginas de tienda de Apple y con las URL de este sitio.",
  fieldsCaption: "Referencia de campos",
  fieldsHead: ["Campo", "Tipo", "Significado"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "Cuándo se calculó esta respuesta; la CDN puede servirla hasta 30 s." },
    { f: "country.code / name / currency", t: "string", m: "El país de las tiendas." },
    { f: "configurations[]", t: "object", m: "Los números de pieza que cubre la consulta, con storage y color tal como los escribe Apple." },
    { f: "summary.stores_in_stock", t: "integer", m: "Tiendas con al menos una configuración cubierta disponible para recogida ahora." },
    { f: "stores[].store_number", t: "string", m: "El identificador de tienda de Apple, p. ej. R085." },
    { f: "stores[].in_stock", t: "boolean", m: "Al menos una configuración cubierta está disponible para recogida." },
    { f: "stores[].available[]", t: "object", m: "Las configuraciones disponibles: part_number, storage, color." },
    { f: "stores[].last_checked_at", t: "string | null", m: `Cuándo leímos por última vez la página de recogida de Apple de esta tienda (normalmente hace menos de ${SPEED.checkSec} s).` },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "El último momento en que esta tienda tuvo una configuración cubierta." },
    { f: "restocks[].at", t: "string", m: "Cuándo la configuración pasó de agotada a disponible (confirmado por dos comprobaciones)." },
    { f: "restocks[].still_listed", t: "boolean | null", m: "Si esa tienda la sigue teniendo en el momento de la respuesta." },
    { f: "attribution", t: "object", m: "La fuente, la línea de licencia y esta página." },
  ],
  limitsLead: `Consulta con un intervalo de 30 segundos o más por endpoint (las respuestas se guardan en caché ese tiempo en el borde de la red, así que un intervalo más corto devuelve el mismo JSON) y no pases de 60 peticiones por minuto desde una misma dirección, que es el límite que llega a nuestros servidores. Los datos son de uso libre, también comercial, con una condición: muestra «Fuente: PickupChecker» con un enlace a pickupchecker.com (o a la página de la tienda o del país) allí donde aparezcan las cifras. Sin clave, sin registro, CORS abierto, así que una página en el navegador puede llamarla directamente.`,
  limitsKeys: () => [
    "Una respuesta 429 significa más de 60 peticiones en un minuto desde tu dirección; espera los segundos de Retry-After.",
    "Los cambios incompatibles tendrán una ruta de versión nueva (/api/v2); bajo v1 los campos se añaden, nunca se renombran.",
    "Pon un User-Agent con el nombre de tu proyecto y un contacto; nunca hemos bloqueado un script educado.",
  ],
  scriptLead: (x: ApiView) => `Si quieres un panel, un bot de Discord, una hoja de cálculo o investigar, escribe el script: para eso está la API. Si lo que quieres es comprar un iPhone Duo, el script es la herramienta lenta: ve una reposición en su siguiente consulta, hasta 30 segundos después, y luego tiene que avisarte; nuestro aviso push lee las mismas tiendas cada ${SPEED.fastSec} segundos, confirma la reposición y llega a tu móvil unos ${SPEED.alertSec} segundos después, ${x.storesNow !== undefined ? "dentro de la disponibilidad mediana de alrededor de un minuto" : "dentro de la disponibilidad mediana"}. Mucha gente hace las dos cosas: la alerta para comprar y la API para mirar.`,
  scriptCaption: "Un script que consulta frente a un aviso push",
  scriptHead: ["", "Tu script sobre esta API", "Alerta de PickupChecker"],
  scriptRows: () => [
    { k: "Ve una reposición al cabo de", a: "hasta 30 s (caché) + tu intervalo", b: `unos ${SPEED.alertSec} s` },
    { k: "Llega a tu móvil", a: "lo que tú montes (correo, bot, SMS)", b: "una notificación de la app de la pantalla de inicio" },
    { k: "Tiendas vigiladas", a: "todas, en cada llamada", b: `tus tiendas cada ${SPEED.fastSec} s, todas cada ${SPEED.checkSec} s` },
    { k: "Coste", a: "gratis", b: "un plan para las alertas; leer este sitio es gratis" },
  ],
  appleLead: `Puedes, con límites: la página de recogida de apple.com responde por tienda y configuración, que es exactamente lo que leemos. Lo que a un script hecho deprisa le falta es el cuidado: rotación de IPv6 para que Apple siga respondiendo, una regla de dos observaciones para que un «no disponible» intermitente no se convierta en una falsa reposición, el manejo de la zona horaria de cada tienda y un registro guardado desde el día del lanzamiento. Si solo quieres la respuesta, la API es ese trabajo ya hecho; si quieres aprender, nuestra página de método explica cada pieza.`,
  appleKeys: () => [
    "La página de Apple es una instantánea: te dice el ahora, nunca cuánto duró una disponibilidad ni cuándo fue la última.",
    `Nuestras comprobaciones van separadas ${SPEED.checkSec} segundos por tienda y nunca menos de ${SPEED.fastSec}; un script que consulte apple.com más deprisa acaba bloqueado y no aprende nada.`,
  ],
  methodLead: (x: ApiView) => `Cada cifra sale de que PickupChecker lee la propia disponibilidad para recogida en tienda de Apple en ${storesPhrase(x)} cada ${SPEED.checkSec} segundos (cada ${SPEED.fastSec} en las tiendas con alertas). Un cambio solo se da por bueno tras dos observaciones coincidentes; la primera vez que vemos algo tras un hueco no es una reposición. La API sirve las mismas tablas que leen las páginas de este sitio; nada se muestrea ni se estima.`,
  methodKeys: () => ["El método al completo: la página de cómo funciona.", "La atribución es todo el precio; un enlace de vuelta mantiene esto gratis."],
  faq: (x: ApiView): Faq[] => [
    { q: `¿Hay una API gratuita para el stock del iPhone Duo en los Apple Store${deWhere(x.c)}?`, a: `Sí, la de PickupChecker, en https://pickupchecker.com/api/v1/${x.c.cc}/stock: cada Apple Store${deWhere(x.c)} con las configuraciones que tiene ahora para recogida, en JSON, sin clave, con caché de 30 s. Un segundo endpoint devuelve las reposiciones confirmadas de las últimas 24 horas.` },
    { q: "¿Apple tiene una API de stock oficial?", a: "Pública, no. La página de recogida de apple.com se puede leer por tienda y configuración, que es lo que hace este sitio con cuidado (rotación, confirmación, zonas horarias); la API de aquí es ese trabajo expuesto como JSON." },
    { q: "¿Hasta qué punto están al día los datos?", a: `Cada tienda se comprueba cada ${SPEED.checkSec} segundos (cada ${SPEED.fastSec} en las tiendas con alertas) y la respuesta de la API se guarda en caché 30 segundos, así que una cifra tiene como mucho unos 45 segundos; last_checked_at te lo dice con exactitud.` },
    { q: "¿Puedo usarla en un producto comercial?", a: "Sí, con atribución: «Fuente: PickupChecker» enlazado a pickupchecker.com allí donde se muestren los datos, y un intervalo de consulta de 30 segundos o más. No hace falta clave." },
    { q: "¿Un script me conseguirá un iPhone Duo antes que una alerta?", a: `No: un script ve una reposición en su siguiente consulta, hasta 30 segundos después; la alerta la confirma y llega a tu móvil unos ${SPEED.alertSec} segundos después de que la veamos. Usa el script para mirar y la alerta para comprar.` },
  ],
  sources: { pickup: "Apple: recogida en tienda", method: "PickupChecker: cómo funcionan las comprobaciones", log: "PickupChecker: el registro de reposiciones" },
  ld: (x: ApiView) => ({
    description: `API JSON gratuita de la disponibilidad para recogida del iPhone Duo en ${storesPhrase(x)}: stock actual por tienda y configuración, reposiciones confirmadas de las últimas 24 horas.`,
  }),
  related: "Sigue leyendo",
  sameData: "Los mismos datos, otras preguntas",
  otherCountries: "Esta página para otros países",
  questions: { alerts: "La forma más rápida de enterarte", howItWorks: "Cómo funcionan las comprobaciones", restockTimes: "¿Cuándo repone Apple el iPhone Duo?", shortage: "¿Mejora la escasez?", configs: "¿Qué configuración es la más fácil de conseguir?", stockChecker: "Comprobador de stock del iPhone Duo" },
  setUpAlert: "Crear alertas",
  tryIt: "Abrir el JSON en directo",
  faqTitle: "Preguntas frecuentes",
  onThisPage: "En esta página",
};

export const decide: DecideDict = { configs, supply, channels, api };
