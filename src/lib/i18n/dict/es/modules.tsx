/**
 * Spanish (Spain): modules — the restock, store and stock modules. `label` arrives with its preposition
 * ("en Madrid", "en Apple Puerta del Sol", "aquí"); numbers raw (formatted here), durations and times formatted.
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import { n, reposiciones, dias, tiendas, v } from "./words";

const agotamientos = (x: number) => `${n(x)} ${x === 1 ? "agotamiento" : "agotamientos"}`;
const configs = (x: number) => `${n(x)} ${x === 1 ? "configuración" : "configuraciones"}`;
const CHECK_NOTE = "cada 15 s; 5 s con alerta";
/** "las 9:00" / "la 1:00". */
const las = (hour: string) => (/^1:/.test(hour) ? `la ${hour}` : `las ${hour}`);

export const modules: Dict["modules"] = {
  daily: {
    empty: (label: string, days: number) => `No se ha registrado ninguna reposición ni agotamiento ${label} en los últimos ${n(days)} días: el gráfico se rellena desde el primero.`,
    summary: (restocks: number, soldouts: number, label: string, days: number, activeDays: number) =>
      `${reposiciones(restocks)} y ${agotamientos(soldouts)} ${label} en los últimos ${n(days)} días, ${activeDays === 1 ? "en un solo día" : `repartidos en ${dias(activeDays)}`}.`,
    busiest: (day: string, restocks: number) => <> El día con más fue el <b className="text-ink">{day}</b>, con {n(restocks)}.</>,
    barAria: (day: string, restocks: number, soldouts: number) => `${day}: ${reposiciones(restocks)}, ${agotamientos(soldouts)}`,
    barTitle: (day: string, restocks: number, soldouts: number) => `${day}: ${reposiciones(restocks)} · ${agotamientos(soldouts)}`,
    legendRestocks: "reposiciones",
    legendSoldouts: "agotamientos",
  },

  last24: {
    title: (label: string) => `Reposiciones del iPhone Duo ${label} en las últimas 24 horas`,
    asOf: (when: string) => `a fecha de ${when}`,
    localTime: (when: string) => `${when}, hora local`,
    anAppleStore: "un Apple Store",
    unknown: "Ahora mismo no hemos podido leer el recuento de las últimas 24 horas; el stock en directo y el registro de reposiciones de esta página no se ven afectados.",
    none: (label: string, asOf: string) => <><b className="text-ink">Ninguna reposición del iPhone Duo {label} en las últimas 24 horas</b> (a fecha de {asOf}).</>,
    some: (o: { restocks: number; one: boolean; label: string; withStores: number; allStores: number; config: string; store: ReactNode | null; when: string }) => (
      <>En las últimas 24 horas, el iPhone Duo se ha repuesto <b className="text-ink">{o.restocks === 1 ? "una vez" : `${n(o.restocks)} veces`} {o.one ? o.label : `en ${n(o.withStores)} de los ${n(o.allStores)} Apple Store ${o.label.replace(/^en /, "de ")}`}</b>; la última: <b className="text-ink">{o.config}</b>{o.store != null && <> en {o.store}</>}, el {o.when}, hora local.</>
    ),
    tileRestocks: "reposiciones confirmadas · 24 h",
    tileConfigsBack: "configuraciones que han vuelto",
    tileStores: (cfgs: number, allConfigs: number) => `tiendas con reposición${cfgs ? ` · ${n(cfgs)} de ${configs(allConfigs)}` : ""}`,
    tileLatest: (config: string, store: string | null) => <>la última · {config}{store != null && <> · {store}</>}</>,
    tileBefore: (config: string, store: string | null, day: string) => <>la anterior · {config}{store != null && <> · {store}</>} · {day}</>,
    tileNoEarlier: "no hay ninguna anterior registrada",
    caption: (label: string, asOf: string) => `Reposiciones confirmadas de cada configuración del iPhone Duo ${label}, últimas 24 horas, a fecha de ${asOf}`,
    thConfig: "Configuración",
    thRestocks: "Reposiciones",
    thStores: "Tiendas",
    thLast: "Última reposición (hora local)",
    thNow: "En stock ahora",
    ofStores: (k: number, total: number) => `${n(k)} de ${n(total)}`,
    noneIn24: "ninguna en 24 h",
    yes: "sí",
    no: "no",
    countedTitle: "Cómo contamos las reposiciones",
    counted: "Son comprobaciones propias de PickupChecker sobre la recogida en tienda de apple.com: cada tienda cada 15 segundos; las que tienen alertas, cada 5. Una reposición solo se registra cuando dos comprobaciones coinciden; la primera vez que vemos una tienda no cuenta, y nunca mezclamos datos de otros rastreadores.",
    alert: (label: string | null) => `Avísame${label != null ? ` ${label}` : ""} → la próxima, en segundos`,
  },

  clock: {
    none: (label: string, days: number) => `Aún no hay reposiciones registradas ${label} en los últimos ${n(days)} días.`,
    thin: (total: number, label: string, days: number, dates: number | null) =>
      `${reposiciones(total)} ${label} en los últimos ${n(days)} días${dates != null ? ` (en ${dias(dates)})` : ""}: aún muy pocas para hablar de un patrón.`,
    pattern: (total: number, label: string, days: number, hour: string, day: string | null) => (
      <>{reposiciones(total)} {label} en los últimos {n(days)} días. La mayoría llega hacia <b className="text-ink">{las(hour)}</b>, hora local{day ? <>, y el <b className="text-ink">{day}</b> es el día con más</> : null}.</>
    ),
    byHour: (zone: string) => `Por hora · ${zone}`,
    byWeekday: "Por día de la semana",
    barReported: (k: number) => ` (+${n(k)} según otros rastreadores)`,
    barReportedTitle: (bar: string, k: number) => `${bar}: ${n(k)} según otros rastreadores`,
    legendOurs: "Confirmadas por PickupChecker",
  },

  feed: {
    empty: "Aún no hay reposiciones registradas.",
    available: "Disponible",
    soldOut: "Agotado",
    soldOutAt: (time: ReactNode) => <>agotado {time}</>,
    since: (time: ReactNode) => <>desde {time}</>,
    restockedAt: (time: ReactNode) => <>repuesto {time}</>,
    mapAria: (store: string) => `Ver ${store} en el mapa`,
    map: "Mapa",
    buyAria: (model: string, config: string) => `Comprar el ${model} ${config} en apple.com`,
    buy: "Comprar en apple.com",
  },

  byConfig: {
    empty: (label: string, days: number) => `Ninguna configuración se ha repuesto ${label} en los últimos ${n(days)} días, así que aún no hay clasificación.`,
    intro: (label: string, days: number) => `Qué configuraciones han vuelto ${label} en los últimos ${n(days)} días, de más a menos frecuentes.`,
    times: (k: number) => `${n(k)}×`,
    alert: "Avísame",
  },

  sellout: {
    typical: (label: string, band: string) => `Una reposición típica del iPhone Duo ${label} se agotó en unos ${band}.`,
    half: (label: string, duration: string) => `La mitad de las reposiciones ${label} se agotaron en menos de ${duration}.`,
    none: (label: string, days: number) => `Aún no se ha agotado ninguna reposición ${label} en los últimos ${n(days)} días.`,
    whatDuo: "iPhone Duo",
    whatAll: "todos los iPhone",
    tileHalf: (what: string) => <>la mitad, agotada en · {what}</>,
    tileWithin30: "agotadas en 30 s",
    tileWithin60: "agotadas en 1 min",
    tileFastest: (k: number, days: number) => <>la más rápida · {reposiciones(k)} agotadas, {n(days)} d</>,
    caption: (days: number) => `Por iPhone, últimos ${n(days)} días`,
    thIphone: "iPhone",
    thSoldOut: "Agotadas",
    thHalf: "La mitad, agotada en",
    thWithin30: "≤ 30 s",
    thWithin60: "≤ 1 min",
    thFastest: "La más rápida",
    each: "Reposición a reposición",
    barNote: (full: string) => `barra = segundos disponible · llena a los ${full}`,
    stillListed: (duration: string) => `aún disponible · ${duration}`,
    approx: (r: string) => `≈ ${r}`,
    measuredTitle: "Cómo se mide",
    measured: (estimated: boolean) =>
      `«Agotado en 45–60 s» significa que la configuración seguía disponible en nuestra comprobación 45 segundos después de verla por primera vez y ya no estaba en la de los 60 segundos. Las tiendas con alertas se comprueban cada 5 segundos y el resto cada 15, así que ese es el ancho de cada intervalo${estimated ? "; ≈ marca reposiciones anteriores a que guardáramos la última comprobación, acotadas por la ronda de 15 segundos" : ""}. Una disponibilidad más corta que una comprobación puede aparecer y desaparecer entre dos de ellas, así que la proporción real agotada en 30 segundos es mayor de lo que se ve.`,
  },

  configTable: {
    title: "Todas las configuraciones de esta tienda",
    titleAt: (store: string) => `Todas las configuraciones en ${store}`,
    lookupOff: (hasRows: boolean) => `Apple no ofrece ahora mismo consultas de recogida en esta tienda${hasRows ? " (abajo, las últimas respuestas que dio)" : ""}`,
    tracked: (k: number) => `${configs(k)} seguidas`,
    firstSweep: "Primera ronda en curso: los estados aparecen en menos de un minuto",
    inStock: (k: number, total: number) => `${n(k)} de ${n(total)} en stock`,
    available: "Disponible",
    unavailable: "No disponible",
    noLookup: "sin consulta de recogida",
    notChecked: "aún sin comprobar",
    since: (ago: ReactNode) => <>desde {ago}</>,
    lastAvailable: (ago: ReactNode) => <>disponible por última vez {ago}</>,
    neverHere: "nunca visto en stock aquí",
    buy: "Comprar",
    alertAria: (model: string, config: string, store: string) => `Avísame cuando el ${model} ${config} esté disponible en ${store}`,
    alert: "Avísame →",
  },

  matrix: {
    store: "Tienda",
    checked: "Comprobado",
    cellTitle: (model: string, k: number, total: number) => `${model}: ${n(k)} de ${configs(total)} disponibles`,
  },

  nearby: {
    duo: (short: string, k: number) => `${short} · ${n(k)}`,
    noDuo: (short: string) => `sin ${short}`,
  },

  stockByModel: {
    availableNow: (k: number, total: number) => `${n(k)} de ${configs(total)} ${v(k, "disponible", "disponibles")} ahora`,
    noneNow: (total: number) => `ninguna de ${configs(total)} ahora mismo`,
    lookupOff: "Apple no ofrece ahora mismo consultas de recogida aquí",
    notChecked: "aún sin comprobar",
    more: (k: number) => `+${n(k)}`,
    checked: (ago: ReactNode) => <>comprobado {ago}</>,
    alert: "Avísame →",
  },

  storeBlock: {
    checked: (ago: ReactNode) => <>Comprobado {ago} · {CHECK_NOTE}</>,
    map: "Ver en el mapa",
    alert: "Avísame aquí",
    alsoIn: (region: string) => `También en ${region}`,
    acrossLine: "Tiendas más cercanas al otro lado del límite estatal",
    elsewhere: "Tiendas más cercanas en otras zonas",
  },

  hours: {
    title: "Horario",
    local: (zone: string) => `Hora local · ${zone}`,
    today: (hours: string, week: string) => ` · hoy ${hours} · ${week}`,
    directions: "Cómo llegar",
    applePage: "Página de la tienda en apple.com",
    liveMap: "Mapa en directo",
    storePage: "Página de la tienda",
    closed: "Cerrado",
    everyDay: (hours: string) => `Todos los días ${hours}`,
    openNow: (closes: string) => `Abierto ahora · cierra a ${las(closes)}`,
    opensAt: (opens: string) => `Abre a ${las(opens)}`,
    closedToday: (next: string | null) => (next ? `Cerrado hoy · abre ${next}` : "Cerrado hoy"),
    closedNow: (next: string | null) => (next ? `Cerrado ahora · abre ${next}` : "Cerrado ahora"),
    nextOpen: (day: string | null, time: string) => `${day ?? "mañana"} a ${las(time)}`,
  },

  liveStats: {
    inStock: "En stock ahora",
    storesWith: "Tiendas con stock",
    lastCheck: "Última comprobación",
    none: "—",
  },

  board: {
    summary: (k: number, stores: number, short: string) => `${n(k)} de ${tiendas(stores)} ${v(k, "tiene", "tienen")} el ${short} en stock`,
    lastCheck: (ago: ReactNode) => <>Última comprobación {ago}</>,
    firstSweep: "Primera ronda en curso.",
    noneListed: (model: string, storage: string | null, color: string | null) => `Ninguna tienda tiene ahora el ${model}${storage ? ` ${storage}` : ""}${color ? ` en ${color}` : ""}.`,
    more: (k: number) => `+${n(k)}`,
    seen: (ago: ReactNode) => <>Visto {ago}</>,
    loading: "Cargando stock",
  },
};
