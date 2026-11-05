/**
 * Spanish (Spain): content — the SEO building blocks (FAQ, browse rows, stat strips, product parts, sources), the
 * enrich helpers' words (hours, durations, FAQ answers, titles), live tokens, the restock-pattern sentence and
 * photo alt text. Arguments arrive formatted for Spanish (numbers, durations, "9:00" hours, colour names).
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import type { Forms } from "@/lib/i18n/format";
import { aprox, fixDay, fixHour } from "./words";

const f = (x: Forms): Forms => x;

type Kind = "state" | "city" | "store" | "model";

/** "las 9:00" / "la 1:00" for an hour label. */
const lasS = (hour: string): string => { const x = fixHour(hour); return /^1:/.test(x) ? `la ${x}` : `las ${x}`; };
/** "los lunes", "los sábados". */
const losDays = (day: string): string => { const d = fixDay(day); return /o$/.test(d) ? `los ${d}s` : `los ${d}`; };
/** "Todas las provincias" / "Todos los estados". */
const FEM = new Set(["provincias", "zonas", "prefecturas", "regiones", "ciudades"]);

export const content: Dict["content"] = {
  hours: {
    closed: "Cerrado",
    everyDay: (hours: string) => `Todos los días ${hours}`,
    tomorrow: "mañana",
    dayAt: (day: string, time: string) => `${day} a ${lasS(time)}`,
    closedTodayOpens: (next: string) => `Cerrado hoy · abre ${next}`,
    closedToday: "Cerrado hoy",
    opensAt: (time: string) => `Abre a ${lasS(time)}`,
    openNow: (closes: string) => `Abierto ahora · cierra a ${lasS(closes)}`,
    closedNowOpens: (next: string) => `Cerrado ahora · abre ${next}`,
    closedNow: "Cerrado ahora",
  },

  duration: {
    underAMinute: "menos de un minuto",
    pair: (a: string, b: string) => `${a} ${b}`,
  },
  listMore: (n: string) => `${n} más`,
  nearLine: (place: string, distance: string) => `${place} (${distance})`,

  faq: {
    where: (kind: Kind, place: string) => (kind === "model" ? `del ${place}` : `en ${place}`),
    nRestocks: f({ one: "# reposición", other: "# reposiciones" }),
    restockA: ({ count, where, days, week, peak }: { count: string | null; where: string; days: string; week: string; peak: { hour: string; day: string | null } | null }) =>
      `${count == null ? `No se ha registrado ninguna reposición ${where} en los últimos ${days} días` : `${count} ${where} en los últimos ${days} días, ${week} esta semana`}${peak ? `, la mayoría hacia ${lasS(peak.hour)}, hora local${peak.day ? `, y sobre todo ${losDays(peak.day)}` : ""}` : ""}; Apple no publica ningún calendario.`,
    lastsNone: (where: string) => `Aún hay muy pocos pares de reposición y agotamiento ${where} para medirlo.`,
    lasts: (days: string, duration: string) => `En los últimos ${days} días, una configuración repuesta siguió disponible ${aprox(duration)} (mediana) antes de volver a agotarse.`,
    storeIn: (store: string, line: string) => `${store} en ${line}`,
    nearestA: (stores: string) => `${stores}.`,

    modelStockQ: (model: string) => `¿Qué Apple Store tienen ahora el ${model} en stock?`,
    modelStockNone: (model: string) => `Ninguno en la última comprobación; la lista de esta página se actualiza en cuanto un Apple Store de EE. UU. pone el ${model} disponible para recogida.`,
    nUsStores: f({ one: "# Apple Store de EE. UU.", other: "# Apple Store de EE. UU." }),
    modelStockSome: (count: string) => `${count} en la última comprobación, cada uno con sus configuraciones en esta página.`,
    priceQ: (model: string) => `¿Cuánto cuesta el ${model}?`,
    priceA: (low: string, high: string, storages: string, colors: string) => `De ${low} a ${high}, libre, según la capacidad (${storages}), en ${colors}.`,
    modelRestockQ: (model: string) => `¿Cada cuánto se repone el ${model}?`,
    modelLastsQ: (model: string) => `¿Cuánto dura el stock del ${model} cuando aparece?`,
    reserveQ: (model: string) => `¿Puedo reservar el ${model} para recogerlo?`,
    reserveA: "No; cuando una tienda pone disponible una configuración, la compras en apple.com eligiendo «Recogida», y te la guardan para la franja horaria que elijas.",

    storeStockQ: (store: string, model: string) => `¿Tiene ${store} el ${model} en stock?`,
    nConfigs: f({ one: "# configuración", other: "# configuraciones" }),
    storeStockYes: (count: string) => `Sí, ${count} en la última comprobación; la tabla de esta página indica la capacidad y el color.`,
    storeStockNo: (other: { pro: string; proMax: string } | null) => `No en la última comprobación${other ? `, aunque tiene ${other.pro} configuraciones del iPhone 18 Pro y ${other.proMax} del 18 Pro Max` : ", y tampoco ninguna configuración del 18 Pro ni del 18 Pro Max"}.`,
    hoursQ: (store: string) => `¿Qué horario tiene ${store}?`,
    hoursA: ({ hours, today, address, phone }: { hours: string | null; today: string | null; address: string; phone: string | null }) =>
      `${hours ?? "El horario aparece en esta página"}${today ? `; hoy, ${today}` : ""}; ${address}${phone ? `, tel. ${phone}` : ""}.`,
    storeRestockQ: (store: string) => `¿Cada cuánto repone ${store} el iPhone?`,
    storeLastsQ: (store: string) => `¿Cuánto dura el stock en ${store}?`,
    storeNearestQ: (store: string) => `¿Cuál es el otro Apple Store más cercano a ${store}?`,

    placeStockQ: (place: string, model: string) => `¿Qué Apple Store de ${place} tienen ahora el ${model} en stock?`,
    placeStockNone: (place: string, model: string) => `Ninguno en la última comprobación; esta página se actualiza en cuanto una tienda de ${place} pone el ${model} disponible para recogida.`,
    nStores: f({ one: "# tienda", other: "# tiendas" }),
    placeStockSome: (count: string, stores: string) => `${count} en la última comprobación: ${stores}.`,
    countQ: (place: string) => `¿Cuántos Apple Store hay en ${place}?`,
    nAppleStores: f({ one: "# Apple Store", other: "# Apple Store" }),
    countMany: (count: string, stores: string) => `${count}, entre ellos ${stores}.`,
    countOne: (count: string, store: string) => `${count}: ${store}.`,
    placeRestockQ: (place: string) => `¿Cada cuánto reponen el iPhone los Apple Store de ${place}?`,
    placeLastsQ: (place: string) => `¿Cuánto dura el stock en ${place}?`,
    placeNearestQ: (place: string) => `¿Cuál es el Apple Store más cercano fuera de ${place}?`,
  },

  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? place : kind === "model" ? "todos los Apple Store de EE. UU." : `los Apple Store de ${place}`;
    return [
      "El stock para recogida se vende en apple.com: al pagar eliges una configuración y una tienda, pagas online y lo recoges en la tienda, a menudo el mismo día. No es el stock de los estantes ni el de las tiendas de los operadores.",
      `PickupChecker comprueba cada configuración seguida en ${at} cada 15 segundos, y cada 5 cuando una alerta apunta a ella; un cambio solo cuenta tras una segunda comprobación que lo confirme, así que un fallo nunca se convierte en una reposición o un agotamiento falsos.`,
      "Cada cambio confirmado queda registrado, y ese registro alimenta el gráfico y el historial de reposiciones de esta página.",
    ];
  },
  alertRule: "Una alerta = una tienda, un modelo, una capacidad y un color; el aviso sale segundos después de que apple.com lo marque como disponible.",

  titles: {
    state: (name: string, duoNow: string, stores: string) => [
      `Apple Store en ${name}: ${duoNow} de ${stores} ${duoNow === "1" ? "tiene" : "tienen"} el iPhone Duo`,
      `Apple Store en ${name}: stock del iPhone Duo en directo`,
      `Apple Store en ${name}: stock del iPhone Duo`,
      `Apple Store ${name}: stock de iPhone`,
    ],
    city: (city: string, code: string, duoNow: string, stores: string) => [
      `Apple Store en ${city}, ${code}: ${duoNow} de ${stores} ${duoNow === "1" ? "tiene" : "tienen"} el iPhone Duo`,
      `Apple Store en ${city}, ${code}: stock del iPhone Duo`,
      `Apple Store ${city}, ${code}: stock del iPhone Duo`,
      `Apple Store ${city}: stock de iPhone`,
    ],
    store: (name: string, region: string | null) => {
      const r = region ? ` (${region})` : "";
      return [
        `${name}${r}: stock de iPhone hoy, recogida y horario`,
        `${name}${r}: stock de iPhone hoy y horario`,
        `${name}${r}: stock de iPhone y horario`,
        `${name}: stock de iPhone hoy, recogida y horario`,
        `${name}: stock de iPhone y horario`,
        `${name}: stock de iPhone`,
        `${name} – stock`,
      ];
    },
    model: (name: string, storesNow: string) => [
      `Stock del ${name} para recogida: ${storesNow} Apple Store lo ${storesNow === "1" ? "tiene" : "tienen"} ahora`,
      `Stock del ${name}: ${storesNow} Apple Store lo ${storesNow === "1" ? "tiene" : "tienen"} ahora`,
      `Stock del ${name} para recogida en tienda, en directo`,
    ],
  },

  tokens: {
    tooFewToMeasure: "aún hay muy pocos datos para medirlo",
    noneLoggedYet: "aún no hay ninguna registrada",
    noneYet: "aún ninguna",
  },

  pattern: {
    none: (days: string) => `Ninguna reposición confirmada en los últimos ${days} días.`,
    nConfirmed: f({ one: "# reposición confirmada", other: "# reposiciones confirmadas" }),
    countIn: (count: string, days: string) => `${count} en los últimos ${days} días`,
    stay: (minutes: string) => `; normalmente sigue disponible ~${minutes} min antes de agotarse`,
    nDays: f({ one: "# día", other: "# días" }),
    tooFew: (count: string, onDays: string | null, stay: string) => `${count}${onDays ? ` en ${onDays}` : ""}: aún muy pocas para hablar de un patrón${stay}.`,
    usual: (hour: string, weekday: string | null, count: string, stay: string) => `Repone sobre todo hacia ${lasS(hour)}, hora local${weekday ? `, y el día con más reposiciones es el ${fixDay(weekday)}` : ""}; ${count}${stay}.`,
  },

  regionNouns: {
    state: f({ one: "estado", other: "estados" }),
    province: f({ one: "provincia", other: "provincias" }),
    area: f({ one: "zona", other: "zonas" }),
    department: f({ one: "departamento", other: "departamentos" }),
    prefecture: f({ one: "prefectura", other: "prefecturas" }),
    emirate: f({ one: "emirato", other: "emiratos" }),
    canton: f({ one: "cantón", other: "cantones" }),
    region: f({ one: "región", other: "regiones" }),
    county: f({ one: "provincia", other: "provincias" }),
    city: f({ one: "ciudad", other: "ciudades" }),
  } as Record<string, Forms>,

  measured: "Cómo se mide",

  faqTitle: "Preguntas frecuentes",
  breadcrumb: "Ruta de navegación",
  keepExploring: "Sigue explorando",
  browse: {
    storesByState: "Tiendas por estado",
    allStatesCities: "Todos los estados y ciudades →",
    liveByModel: "Stock en directo por modelo",
    modelStock: (model: string) => `Stock del ${model}`,
    thisPage: "esta página",
    restockLog: (short: string) => `Registro de reposiciones del ${short}`,
    liveMap: "Mapa en directo",
    mostStores: "Más tiendas",
    allStates: "Todos los estados",
    bigCities: "Grandes ciudades",
    cities: "Ciudades",
    storesBy: (region: string) => `Tiendas por ${region}`,
    allStoresIn: ({ country }: { inName: string; country: string }) => <>Todos los Apple Store de {country} →</>,
    allRegions: (regions: string) => `${FEM.has(regions) ? "Todas las" : "Todos los"} ${regions}`,
  },
  modelCards: "Por iPhone",
  narrative: {
    lastRestock: (config: ReactNode, at: ReactNode, ago: ReactNode) => <>{" "}Última reposición: {config}{at}, {ago}.</>,
    at: (store: ReactNode) => <> en {store}</>,
  },
  statStrip: {
    inStockNow: "En stock ahora",
    ofStores: (n: string) => `de ${n} tiendas`,
    stores: "Tiendas",
    nCities: f({ one: "# ciudad", other: "# ciudades" }),
    tracked: "seguidas",
    modelNow: (short: string) => `${short} ahora`,
    configsInStock: "configuraciones en stock",
    storesWithStock: f({ one: "tienda con stock", other: "tiendas con stock" }),
    restocks24h: "Reposiciones 24 h",
    restocksHint: (week: string, month: string, days: string) => `${week} en 7 d · ${month} en ${days} d`,
    sellOuts: (days: string) => `Agotamientos ${days} d`,
    stays: (duration: string) => `dura ~${duration}`,
    noPairs: "aún sin pares",
    lastRestock: "Última reposición",
    noneYet: "aún ninguna",
    inLastDays: (days: string) => `en los últimos ${days} días`,
  },
  product: {
    chooseIphone: "Elige el iPhone",
    storage: "Capacidad",
    color: "Color",
    all: "Todos",
    numbersAre: (unit: ReactNode) => <>Cifras = {unit} con stock ahora.</>,
    seen: (ago: ReactNode) => <>visto {ago}</>,
    last: (ago: ReactNode) => <>última vez {ago}</>,
    notSeenYet: "aún no visto",
    firstCheckPending: "primera comprobación pendiente",
    inStock: "En stock",
    inStockLower: "en stock",
    none: "ninguno",
    here: "aquí",
    notAvailable: "No disponible",
    notCheckedYet: "Aún sin comprobar",
    availableForPickup: "Disponible para recogida",
    since: (ago: ReactNode) => <> · desde {ago}</>,
    lastInStock: (ago: ReactNode) => <>En stock por última vez {ago}</>,
    neverSeen: "Aún no se ha visto en stock aquí",
    firstCheckSoon: "Primera comprobación en menos de un minuto",
    buy: "Comprar en apple.com",
    checked: (checked: ReactNode, note: ReactNode) => <>Comprobado {checked} · {note}</>,
    checkNote: "cada 15 s; 5 s con alerta",
  },

  source: (source: ReactNode) => <>Fuente: {source}</>,
  photoCredit: (link: ReactNode) => <>Foto: {link}</>,
  sources: "Fuentes",
  allUsStores: "los 269 Apple Store de EE. UU.",
  trackerSource: (where: ReactNode, since: ReactNode, asOf: ReactNode) => <>Seguimiento en directo de PickupChecker: cada configuración del iPhone Duo, 18 Pro y 18 Pro Max en {where}, comprobada cada 15 segundos (cada 5 en las tiendas con alertas) desde el {since}; cifras de esta página a fecha de {asOf}.</>,
  live: {
    configsCaption: (stores: ReactNode, model: ReactNode) => <>Apple Store (de {stores}) con cada configuración del {model} para recogida ahora · en directo</>,
    storage: "Capacidad",
    pricesCaption: (model: ReactNode) => <>Precios del {model} en apple.com (libre, sin impuestos) y stock para recogida en directo</>,
    price: "Precio",
    bestColor: "Mejor color, tiendas ahora",
    noRestock: (model: string) => `Aún no hay ninguna reposición del ${model} registrada.`,
    clockLabel: (model: string) => `del ${model} en todo el país`,
    storesWithIt: "Tiendas con stock ahora",
    pairsInStock: "Pares tienda × configuración en stock",
    restocksLogged: "Reposiciones registradas",
    medianTime: "Tiempo mediano en stock",
    underOneMin: (min: string) => `< ${min}`,
  },

  photos: {
    "apple-store-pickup-counter": { alt: "Mostrador de recogida de madera con el rótulo Pickup dentro de un Apple Store", caption: "Los pedidos con recogida se entregan en un mostrador como este." },
    "phone-map": { alt: "Manos usando una app de mapas en un smartphone al aire libre", caption: "La distancia importa más de lo que parece cuando una reposición dura un minuto." },
    "phone-card-payment": { alt: "Una mujer con un iPhone y una tarjeta de crédito pagando online", caption: "Pagar online para recoger en tienda." },
    "phone-on-box": { alt: "Un smartphone nuevo apoyado sobre su caja blanca", caption: "Un móvil nuevo, recién sacado de la caja." },
    "city-map-phone": { alt: "Dos personas consultando un mapa de la ciudad en un móvil", caption: "Planificar la ruta hasta la tienda." },
    "phone-notification": { alt: "Mano sujetando un móvil con notificaciones en la pantalla de bloqueo", caption: "Una alerta llega a la pantalla de bloqueo." },
    "apple-store-crowd-inside": { alt: "Gente haciendo cola dentro de un Apple Store lleno en un centro comercial", caption: "Colas en un Apple Store la semana del lanzamiento: el stock que llega a la tienda vuela en minutos." },
    "apple-store-glass-canopy": { alt: "Apple Store con fachada de cristal y marquesina de madera de noche", caption: "Un Apple Store acristalado al caer la noche." },
    "apple-store-night-vancouver": { alt: "Un Apple Store iluminado de noche en Vancouver", caption: "Apple Store de noche: el stock para recogida puede aparecer a cualquier hora, pero llega mucho más a menudo por la mañana." },
    "phone-hand-camera": { alt: "Persona sujetando un iPhone con triple cámara", caption: "Los modelos Pro son por los que se hace cola." },
    "place-es-spain": { alt: "La Ciudad de las Artes y las Ciencias de Valencia bajo un cielo azul", caption: "La Ciudad de las Artes y las Ciencias, Valencia." },
    "place-es-madrid-region": { alt: "Los rascacielos de las Cuatro Torres, en el norte de Madrid, con la sierra al fondo", caption: "Las Cuatro Torres, el distrito de negocios de Madrid." },
    "place-es-madrid": { alt: "El edificio Metrópolis en la Gran Vía de Madrid bajo un cielo despejado", caption: "El edificio Metrópolis, en la Gran Vía de Madrid." },
    "place-es-barcelona": { alt: "Vista aérea de la Sagrada Família sobre el Eixample de Barcelona al atardecer", caption: "La Sagrada Família, Barcelona, al atardecer." },
  },
};
