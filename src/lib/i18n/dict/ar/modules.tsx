/**
 * العربية: modules — وحدات التوفر والمتاجر والمخزون (src/components/{restocks,stores,stock}).
 * `label` عبارة مكان تحمل حرف الجر («في دبي»، «في Apple دبي مول»، «هنا»). الأرقام تصل خامًا فتُنسَّق هنا؛ المدد والأوقات
 * والتواريخ تصل منسّقة. فترات الفحص 15 ثانية (كل متجر) و5 ثوانٍ (المتاجر التي عليها تنبيهات) فقط.
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import { CONFIGS, DAYS, SELLOUTS, STORES_G, TIMES, N, count, theStoresG } from "./util";

const CHECK = "كل 15 ثانية، و5 ثوانٍ مع تنبيه";

export const modules: Dict["modules"] = {
  daily: {
    empty: (label: string, days: number) => `لم يُسجَّل أي توفر أو نفاد ${label} خلال آخر ${count(days, DAYS)}؛ يمتلئ المخطط من أول حالة.`,
    summary: (restocks: number, soldouts: number, label: string, days: number, activeDays: number) =>
      `${label} خلال آخر ${count(days, DAYS)}: ${restocks === 0 ? "لا توفر" : `توفر ${count(restocks, TIMES)}`} و${soldouts === 0 ? "لا نفاد" : `نفد ${count(soldouts, TIMES)}`}، على مدى ${count(activeDays, DAYS)}.`,
    busiest: (day: string, restocks: number) => <> وكان أكثر الأيام توفرًا <b className="text-ink">{day}</b> ({count(restocks, TIMES)}).</>,
    barAria: (day: string, restocks: number, soldouts: number) => `${day}: توفر ${count(restocks, TIMES)}، ونفاد ${count(soldouts, TIMES)}`,
    barTitle: (day: string, restocks: number, soldouts: number) => `${day}: توفر ${N(restocks)} · نفاد ${N(soldouts)}`,
    legendRestocks: "توفر",
    legendSoldouts: "نفاد",
  },

  last24: {
    title: (label: string) => `توفر iPhone Duo ${label} خلال آخر 24 ساعة`,
    asOf: (when: string) => `حتى ${when}`,
    localTime: (when: string) => `${when} بالتوقيت المحلي`,
    anAppleStore: "متجر Apple",
    unknown: "تعذّرت قراءة عدد آخر 24 ساعة الآن؛ المخزون المباشر وسجل التوفر في هذه الصفحة لم يتأثرا.",
    none: (label: string, asOf: string) => <><b className="text-ink">لم يتوفر iPhone Duo {label} خلال آخر 24 ساعة</b> (حتى {asOf}).</>,
    some: (o: { restocks: number; one: boolean; label: string; withStores: number; allStores: number; config: string; store: ReactNode | null; when: string }) => (
      <>خلال آخر 24 ساعة توفر iPhone Duo <b className="text-ink">{count(o.restocks, TIMES)} {o.one ? o.label : `في ${N(o.withStores)} من ${theStoresG(o.allStores)} ${o.label}`}</b>؛ آخرها: <b className="text-ink">{o.config}</b>{o.store != null && <> في {o.store}</>}، {o.when} بالتوقيت المحلي.</>
    ),
    tileRestocks: "توفر مؤكد · 24 ساعة",
    tileConfigsBack: "خيارات عادت للتوفر",
    tileStores: (configs: number, allConfigs: number) => `متاجر شهدت توفرًا${configs ? ` · ${N(configs)} من ${count(allConfigs, CONFIGS)}` : ""}`,
    tileLatest: (config: string, store: string | null) => <>الأحدث · {config}{store != null && <> · {store}</>}</>,
    tileBefore: (config: string, store: string | null, day: string) => <>آخر توفر قبلها · {config}{store != null && <> · {store}</>} · {day}</>,
    tileNoEarlier: "لا توفر أقدم في السجل",
    caption: (label: string, asOf: string) => `التوفر المؤكد لكل خيار من iPhone Duo ${label}، آخر 24 ساعة، حتى ${asOf}`,
    thConfig: "الخيار",
    thRestocks: "التوفر",
    thStores: "المتاجر",
    thLast: "آخر توفر (بالتوقيت المحلي)",
    thNow: "متوفر الآن",
    ofStores: (n: number, total: number) => `${N(n)} من ${N(total)}`,
    noneIn24: "لا شيء خلال 24 ساعة",
    yes: "نعم",
    no: "لا",
    countedTitle: "كيف نحتسب التوفر",
    counted: "فحوص PickupChecker الخاصة لاستلام apple.com من المتاجر: كل متجر كل 15 ثانية، والمتاجر التي عليها تنبيهات كل 5 ثوانٍ. لا يُسجَّل التوفر إلا حين يتفق فحصان، ولا تُحتسب أول مرة نرى فيها متجرًا، ولا نخلط أبدًا تقارير المتتبعات الأخرى بأرقامنا.",
    alert: (label: string | null) => `نبّهني${label != null ? ` ${label}` : ""}: التوفر التالي يصلك خلال ثوانٍ`,
  },

  clock: {
    none: (label: string, days: number) => `لم يُسجَّل أي توفر ${label} خلال آخر ${count(days, DAYS)} بعد.`,
    thin: (total: number, label: string, days: number, dates: number | null) =>
      `توفر ${count(total, TIMES)} ${label} خلال آخر ${count(days, DAYS)}${dates != null ? ` (في ${count(dates, DAYS)})` : ""}، وهذا أقل من أن يكشف نمطًا بعد.`,
    pattern: (total: number, label: string, days: number, hour: string, day: string | null) => (
      <>توفر {count(total, TIMES)} {label} خلال آخر {count(days, DAYS)}، وأغلبها نحو الساعة <b className="text-ink">{hour}</b> بالتوقيت المحلي{day ? <>، و<b className="text-ink">{day}</b> أكثر الأيام توفرًا</> : null}.</>
    ),
    byHour: (zone: string) => `حسب الساعة · ${zone}`,
    byWeekday: "حسب يوم الأسبوع",
    barReported: (n: number) => ` (+${N(n)} أبلغت عنها متتبعات أخرى)`,
    barReportedTitle: (bar: string, n: number) => `${bar}: ${N(n)} أبلغت عنها متتبعات أخرى`,
    legendOurs: "مؤكد من PickupChecker",
  },

  feed: {
    empty: "لم يُسجَّل أي توفر بعد.",
    available: "متوفر",
    soldOut: "نفد",
    soldOutAt: (time: ReactNode) => <>نفد {time}</>,
    since: (time: ReactNode) => <>منذ {time}</>,
    restockedAt: (time: ReactNode) => <>توفر {time}</>,
    mapAria: (store: string) => `اعرض ${store} على الخريطة`,
    map: "الخريطة",
    buyAria: (model: string, config: string) => `اشترِ ${model} ${config} من apple.com`,
    buy: "اشترِ من apple.com",
  },

  byConfig: {
    empty: (label: string, days: number) => `لم يعد أي خيار للتوفر ${label} خلال آخر ${count(days, DAYS)}، لذا لا ترتيب بعد.`,
    intro: (label: string, days: number) => `الخيارات التي عادت للتوفر ${label} خلال آخر ${count(days, DAYS)}، الأكثر تكرارًا أولًا.`,
    times: (n: number) => `${N(n)}×`,
    alert: "نبّهني",
  },

  sellout: {
    typical: (label: string, band: string) => `عادةً ينفد iPhone Duo بعد توفره ${label} خلال نحو ${band}.`,
    half: (label: string, duration: string) => `نصف حالات التوفر ${label} نفدت خلال ${duration}.`,
    none: (label: string, days: number) => `لم ينفد أي توفر ${label} خلال آخر ${count(days, DAYS)} بعد.`,
    whatDuo: "iPhone Duo",
    whatAll: "كل أجهزة iPhone",
    tileHalf: (what: string) => <>نصفها نفد خلال · {what}</>,
    tileWithin30: "نفد خلال 30 ثانية",
    tileWithin60: "نفد خلال دقيقة",
    tileFastest: (n: number, days: number) => <>الأسرع · من {count(n, SELLOUTS)} خلال {count(days, DAYS)}</>,
    caption: (days: number) => `حسب الطراز، آخر ${count(days, DAYS)}`,
    thIphone: "iPhone",
    thSoldOut: "نفد",
    thHalf: "نصفها نفد خلال",
    thWithin30: "≤ 30 ث",
    thWithin60: "≤ دقيقة",
    thFastest: "الأسرع",
    each: "كل توفر على حدة",
    barNote: (full: string) => `الشريط = ثوانٍ معروضة · يمتلئ عند ${full}`,
    stillListed: (duration: string) => `ما زال معروضًا · ${duration}`,
    approx: (range: string) => `≈ ${range}`,
    measuredTitle: "طريقة القياس",
    measured: (estimated: boolean) =>
      `«نفد خلال 45–60 ث» يعني أن الخيار كان لا يزال معروضًا في فحصنا بعد 45 ثانية من أول رؤية له، واختفى في الفحص بعد 60 ثانية. نفحص المتاجر التي عليها تنبيهات كل 5 ثوانٍ، وكل متجر آخر كل 15 ثانية، وهذا هو عرض كل نطاق${estimated ? "؛ وتشير ≈ إلى حالات توفر سبقت تسجيلنا للفحص الأخير، فحدُّها دورة الـ15 ثانية" : ""}. وقد يظهر عرضٌ أقصر من فحص واحد ويختفي بين فحصين، لذا فالنسبة الحقيقية لما ينفد خلال 30 ثانية أعلى مما يظهر.`,
  },

  configTable: {
    title: "كل الخيارات في هذا المتجر",
    titleAt: (store: string) => `كل الخيارات في ${store}`,
    lookupOff: (hasRows: boolean) => `لا تتيح Apple حاليًا الاستعلام عن الاستلام من هذا المتجر${hasRows ? " (آخر إجاباتها أدناه)" : ""}`,
    tracked: (n: number) => `نتابع ${count(n, CONFIGS)}`,
    firstSweep: "أول فحص جارٍ — تظهر الحالات خلال دقيقة",
    inStock: (n: number, total: number) => `${N(n)} من ${N(total)} متوفرة`,
    available: "متوفر",
    unavailable: "غير متوفر",
    noLookup: "لا استعلام عن الاستلام",
    notChecked: "لم يُفحص بعد",
    since: (ago: ReactNode) => <>{ago}</>,
    lastAvailable: (ago: ReactNode) => <>آخر توفر {ago}</>,
    neverHere: "لم يُشاهَد متوفرًا هنا",
    buy: "اشترِ",
    alertAria: (model: string, config: string, store: string) => `نبّهني حين يتوفر ${model} ${config} في ${store}`,
    alert: "نبّهني ←",
  },

  matrix: {
    store: "المتجر",
    checked: "آخر فحص",
    cellTitle: (model: string, n: number, total: number) => `${model}: ${N(n)} من ${count(total, CONFIGS)} متوفرة`,
  },

  nearby: {
    duo: (short: string, n: number) => `${short} · ${N(n)}`,
    noDuo: (short: string) => `لا ${short}`,
  },

  stockByModel: {
    availableNow: (n: number, total: number) => `${N(n)} من ${count(total, CONFIGS)} متوفرة الآن`,
    noneNow: (total: number) => `لا شيء من ${count(total, CONFIGS)} الآن`,
    lookupOff: "لا تتيح Apple الاستعلام عن الاستلام هنا حاليًا",
    notChecked: "لم يُفحص بعد",
    more: (n: number) => `+${N(n)}`,
    checked: (ago: ReactNode) => <>آخر فحص {ago}</>,
    alert: "نبّهني ←",
  },

  storeBlock: {
    checked: (ago: ReactNode) => <>آخر فحص {ago} · {CHECK}</>,
    map: "اعرض على الخريطة",
    alert: "نبّهني هنا",
    alsoIn: (region: string) => `أيضًا في ${region}`,
    acrossLine: "أقرب المتاجر عبر الحدود",
    elsewhere: "أقرب المتاجر في أماكن أخرى",
  },

  hours: {
    title: "ساعات العمل",
    local: (zone: string) => `التوقيت المحلي · ${zone}`,
    today: (hours: string, week: string) => ` · اليوم ${hours} · ${week}`,
    directions: "الاتجاهات",
    applePage: "صفحة المتجر على apple.com",
    liveMap: "الخريطة المباشرة",
    storePage: "صفحة المتجر",
    closed: "مغلق",
    everyDay: (hours: string) => `يوميًا ${hours}`,
    openNow: (closes: string) => `مفتوح الآن · يغلق الساعة ${closes}`,
    opensAt: (opens: string) => `يفتح الساعة ${opens}`,
    closedToday: (next: string | null) => (next ? `مغلق اليوم · يفتح ${next}` : "مغلق اليوم"),
    closedNow: (next: string | null) => (next ? `مغلق الآن · يفتح ${next}` : "مغلق الآن"),
    nextOpen: (day: string | null, time: string) => `${day ?? "غدًا"} الساعة ${time}`,
  },

  liveStats: {
    inStock: "متوفر الآن",
    storesWith: "متاجر فيها مخزون",
    lastCheck: "آخر فحص",
    none: "—",
  },

  board: {
    summary: (n: number, stores: number, short: string) => `${N(n)} من ${count(stores, STORES_G)} فيها ${short}`,
    lastCheck: (ago: ReactNode) => <>آخر فحص {ago}</>,
    firstSweep: "أول فحص جارٍ.",
    noneListed: (model: string, storage: string | null, color: string | null) => `لا يعرض أي متجر ${model}${storage ? ` ${storage}` : ""}${color ? ` بلون ${color}` : ""} الآن.`,
    more: (n: number) => `+${N(n)}`,
    seen: (ago: ReactNode) => <>شوهد {ago}</>,
    loading: "جارٍ تحميل المخزون",
  },

  duoNow: {
    eyebrow: (label: string) => `iPhone Duo ${label} الآن`,
    /** جمل الحكم. `stamp` الوقت المحلي منسّقًا؛ `list` المتاجر المتوفرة (storeItem). */
    notNow: (o: { stamp: string; n: number; label: string }) => <><b className="text-ink">غير متوفر حتى {o.stamp}</b>: {o.n === 1 ? `لا يعرض متجر Apple ${o.label} أي iPhone Duo للاستلام.` : `لا يعرض أيٌّ من ${theStoresG(o.n)} ${o.label} أي iPhone Duo للاستلام.`}</>,
    notNowOne: (o: { stamp: string; name: string }) => <><b className="text-ink">غير متوفر حتى {o.stamp}</b>: لا يعرض {o.name} أي خيار من iPhone Duo للاستلام.</>,
    inStock: (o: { stamp: string; k: number; n: number; label: string; list: ReactNode }) => <><b className="text-ink">متوفر حتى {o.stamp}</b>: يعرض {N(o.k)} من {theStoresG(o.n)} {o.label} iPhone Duo للاستلام: {o.list}.</>,
    inStockOne: (o: { stamp: string; k: number; total: number; name: string; list: ReactNode }) => <><b className="text-ink">متوفر حتى {o.stamp}</b>: يعرض {o.name} {N(o.k)} من {count(o.total, CONFIGS)} من iPhone Duo للاستلام: {o.list}.</>,
    /** متجر متوفر في القائمة: رابطه وعدد الخيارات ومنذ متى. */
    storeItem: (store: ReactNode, configs: number, ago: string | null) => <>{store} ({count(configs, CONFIGS)}{ago ? `، معروض ${ago}` : ""})</>,
    configItem: (config: string, ago: string | null) => <>{config}{ago ? ` (معروض ${ago})` : ""}</>,
    lastIn: (o: { config: string; store: ReactNode | null; when: string; lasted: string | null }) => <>آخر توفر: <b className="text-ink">{o.config}</b>{o.store != null && <> في {o.store}</>}، {o.when}{o.lasted ? <> ({o.lasted})</> : null}.</>,
    neverYet: (label: string, since: string) => `لا توفر مؤكدًا لـ iPhone Duo ${label} منذ بدء المتابعة في ${since}.`,
    others: (o: { pro: number; max: number; one: boolean; configs: number }) => (o.one ? `يتوفر iPhone 18 Pro هنا في ${N(o.pro)} من ${count(o.configs, CONFIGS)}، و18 Pro Max في ${N(o.max)}.` : `يتوفر iPhone 18 Pro في ${N(o.pro)} منها، و18 Pro Max في ${N(o.max)}.`),
    updated: (stamp: string) => `آخر تحديث ${stamp}`,
    checked: (note: string) => `الفحص ${note}`,
    since: (date: string) => `البيانات منذ ${date}`,
    method: "لا يُحتسب التوفر إلا حين يتفق فحصان؛ ولا تُحتسب أول مرة نرى فيها المتجر",
    /* Tiles */
    tShare: (range: string) => `من حالات التوفر في الفترة ${range}`,
    tBusiest: (n: number) => `أكثر ساعة توفرًا · ${count(n, TIMES)}`,
    tHalf: "نفد نصفها خلال",
    tSince: (date: string) => `توفر مؤكد منذ ${date}`,
    tToday: "اليوم حتى الآن",
    mostOften: (config: string, k: number, total: number) => `الأكثر: ${config} (${N(k)} من ${N(total)})`,
    /** الصفحات العربية تقول دائمًا «بالتوقيت المحلي»؛ أسماء المناطق الزمنية الأمريكية للإنجليزية فقط. */
    zone: (tz: string | null): string => { void tz; return "بالتوقيت المحلي"; },
    summary: (o: { pct: string; n: number; stores: number; label: string; since: string; range: string; zone: string; busiest: string; busiestN: number; median: string | null; config: string | null; k: number; one: boolean }) =>
      `${o.pct} من حالات توفر iPhone Duo التي أكّدها PickupChecker ${o.one ? o.label : `في ${theStoresG(o.stores)} ${o.label}`} منذ ${o.since}، وعددها ${N(o.n)}، وقعت في الفترة ${o.range} ${o.zone}؛ وكانت أكثر ساعة توفرًا ${o.busiest} (${count(o.busiestN, TIMES)}).${o.median ? ` ونفد نصفها خلال ${o.median}.` : ""}${o.config ? ` وكان ${o.config} الأكثر عودة (${N(o.k)} من ${N(o.n)}).` : ""}`,
    tooFew: (o: { n: number; label: string; since: string; one: boolean; stores: number }) => `توفر iPhone Duo ${count(o.n, TIMES)} بشكل مؤكد ${o.one ? o.label : `في ${theStoresG(o.stores)} ${o.label}`} منذ ${o.since}؛ وهذا أقل من أن نحدد ساعة معتادة بعد، وكل حالة مدرجة أدناه.`,
    hourByHour: "ساعة بساعة، كل متجر ←",
    lastThree: (k: number, label: string) => (k === 1 ? `آخر توفر لـ iPhone Duo ${label}` : `آخر ${N(k)} حالات توفر لـ iPhone Duo ${label}`),
    secs: (x: number) => `${N(x)} ث`,
    mins: (x: number) => `${N(x)} د`,
    listedRange: (low: string, high: string) => `عُرض ${low}–${high}`,
    listedAbout: (x: string) => `عُرض نحو ${x}`,
    stillListed: (x: string) => `ما زال معروضًا (${x})`,
    ago: (x: string) => `منذ ${x}`,
    alerts: (o: { sent: number; stores: number; total: number; days: number; label: string; one: boolean }) => (o.one
      ? `خلال آخر ${count(o.days, DAYS)} أرسل PickupChecker إلى الأعضاء ${N(o.sent)} تنبيه توفر لـ iPhone Duo ${o.label}.`
      : `خلال آخر ${count(o.days, DAYS)} أرسل PickupChecker إلى الأعضاء ${N(o.sent)} تنبيه توفر لـ iPhone Duo في ${N(o.stores)} من ${theStoresG(o.total)} ${o.label}.`),
    alertMe: (label: string) => `نبّهني ${label}`,
    unknown: "تعذّرت قراءة نمط التوفر الآن؛ المخزون المباشر في هذه الصفحة لم يتأثر.",
    allModels: (o: { n: number; days: number; peak: string | null }) => `أجهزة iPhone الثلاثة: توفرت ${count(o.n, TIMES)} خلال ${count(o.days, DAYS)}${o.peak ? `، وأغلبها نحو ${o.peak}` : ""}.`,
  },
};
