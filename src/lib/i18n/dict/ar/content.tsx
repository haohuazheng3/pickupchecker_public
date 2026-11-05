/**
 * العربية: content — أجزاء صفحات SEO (الأسئلة الشائعة، روابط التصفح، شرائط الأرقام، أجزاء صفحة الطراز، المصادر،
 * الوحدات المباشرة)، ساعات العمل، المدد، عناوين الصفحات، رموز {{tokens}}، جملة نمط التوفر، ونصوص الصور.
 * تصل الأرقام والمدد والمسافات وأسماء المتاجر والمدن والألوان منسّقة بالعربية. لا تُترجم أسماء الطرازات والسعات وApple Store
 * وPickupChecker وapple.com. فترات الفحص 15 ثانية و5 ثوانٍ فقط.
 */
import type { ReactNode } from "react";
import type { Forms } from "@/lib/i18n/format";
import type { Dict } from "../en";
import { CITIES, CONFIGS, DAYS, MINUTES, NOUNS, STORES, STORES_G, TIMES, count, daysOf, forms, parseN, searchedStore, streetAr } from "./util";

type Kind = "state" | "city" | "store" | "model";

export const content: Dict["content"] = {
  hours: {
    closed: "مغلق",
    everyDay: (hours: string) => `يوميًا ${hours}`,
    tomorrow: "غدًا",
    dayAt: (day: string, time: string) => `${day} الساعة ${time}`,
    closedTodayOpens: (next: string) => `مغلق اليوم · يفتح ${next}`,
    closedToday: "مغلق اليوم",
    opensAt: (time: string) => `يفتح الساعة ${time}`,
    openNow: (closes: string) => `مفتوح الآن · يغلق الساعة ${closes}`,
    closedNowOpens: (next: string) => `مغلق الآن · يفتح ${next}`,
    closedNow: "مغلق الآن",
  },

  duration: {
    underAMinute: "أقل من دقيقة",
    pair: (a: string, b: string) => `${a} و${b}`,
  },
  listMore: (n: string) => `${n} أخرى`,
  nearLine: (place: string, distance: string) => `${place} (${distance})`,

  faq: {
    /** How answers name the page: «في Apple دبي مول»، «لجهاز iPhone Duo»، «في دبي». */
    where: (kind: Kind, place: string) => (kind === "model" ? `لجهاز ${place}` : `في ${place}`),
    nRestocks: TIMES,
    restockA: ({ count: c, where, days, week, peak }: { count: string | null; where: string; days: string; week: string; peak: { hour: string; day: string | null } | null }) =>
      `${c == null ? `لم يُسجَّل أي توفر ${where} خلال آخر ${daysOf(days)}` : `سُجّل التوفر ${where} ${c} خلال آخر ${daysOf(days)}${parseN(week) === 0 ? "، لا شيء منها هذا الأسبوع" : `، منها ${week} هذا الأسبوع`}`}${peak ? `، وأغلبها نحو الساعة ${peak.hour} بالتوقيت المحلي${peak.day ? `، وأكثرها يوم ${peak.day}` : ""}` : ""}؛ ولا تنشر Apple أي جدول للتوفر.`,
    lastsNone: (where: string) => `لا تكفي بعدُ حالات التوفر ثم النفاد ${where} لقياس المدة.`,
    lasts: (days: string, duration: string) => `خلال آخر ${daysOf(days)} بقي الخيار متوفرًا بعد عودته نحو ${duration} (الوسيط) ثم نفد من جديد.`,
    storeIn: (store: string, line: string) => `${store} في ${line}`,
    nearestA: (stores: string) => `${stores}.`,

    modelStockQ: (model: string) => `أي متاجر Apple يتوفر فيها ${model} الآن؟`,
    modelStockNone: (model: string) => `لا يوجد عند آخر فحص؛ تتحدث القائمة في هذه الصفحة فور أن يعرض أي متجر Apple في الولايات المتحدة ${model} للاستلام.`,
    nUsStores: forms({ one: "متجر Apple واحد في الولايات المتحدة", two: "متجرا Apple في الولايات المتحدة", few: "# متاجر Apple في الولايات المتحدة", many: "# متجرًا في الولايات المتحدة", other: "# متجر Apple في الولايات المتحدة" }),
    modelStockSome: (c: string) => `${c} عند آخر فحص، وكلٌّ منها مذكور في هذه الصفحة مع الخيارات المتوفرة فيه.`,
    priceQ: (model: string) => `كم سعر ${model}؟`,
    priceA: (low: string, high: string, storages: string, colors: string) => `من ${low} إلى ${high} غير مقفل، حسب السعة (${storages})، بألوان ${colors}.`,
    modelRestockQ: (model: string) => `كم مرة يتوفر ${model} من جديد؟`,
    modelLastsQ: (model: string) => `كم يصمد مخزون ${model} بعد ظهوره؟`,
    reserveQ: (model: string) => `هل يمكنني حجز ${model} للاستلام؟`,
    reserveA: "لا؛ حين يعرض متجرٌ خيارًا ما، تشتريه من apple.com مع اختيار الاستلام من المتجر، فيُحجز لك حتى موعد الاستلام.",

    storeStockQ: (store: string, model: string) => `هل يتوفر ${model} في ${store}؟`,
    nConfigs: CONFIGS,
    storeStockYes: (c: string) => `نعم، ${c} عند آخر فحص؛ يوضح الجدول في هذه الصفحة السعة واللون.`,
    storeStockNo: (other: { pro: string; proMax: string } | null) => `لا، عند آخر فحص${other ? `، لكنه يعرض ${other.pro} من خيارات iPhone 18 Pro و${other.proMax} من خيارات 18 Pro Max` : "، ولا أي خيار من iPhone 18 Pro أو 18 Pro Max أيضًا"}.`,
    hoursQ: (store: string) => `ما ساعات عمل ${store}؟`,
    hoursA: ({ hours, today, address, phone }: { hours: string | null; today: string | null; address: string; phone: string | null }) =>
      `${hours ?? "ساعات العمل مذكورة في هذه الصفحة"}${today ? `؛ اليوم ${today}` : ""}؛ العنوان: ${streetAr(address)}${phone ? `، الهاتف: ${phone}` : ""}.`,
    storeRestockQ: (store: string) => `كم مرة يتوفر iPhone من جديد في ${store}؟`,
    storeLastsQ: (store: string) => `كم يصمد المخزون في ${store}؟`,
    storeNearestQ: (store: string) => `ما أقرب متجر Apple آخر إلى ${store}؟`,

    placeStockQ: (place: string, model: string) => `أي متاجر Apple في ${place} يتوفر فيها ${model} الآن؟`,
    placeStockNone: (place: string, model: string) => `لا يوجد عند آخر فحص؛ تتحدث هذه الصفحة لحظة أن يعرض أي متجر في ${place} ${model} للاستلام.`,
    nStores: STORES,
    placeStockSome: (c: string, stores: string) => `${c} عند آخر فحص: ${stores}.`,
    countQ: (place: string) => `كم عدد متاجر Apple في ${place}؟`,
    nAppleStores: forms({ one: "متجر Apple واحد", two: "متجرا Apple", few: "# متاجر Apple", many: "# متجرًا", other: "# متجر Apple" }),
    countMany: (c: string, stores: string) => (c.startsWith("متجرا") ? `${c}: ${stores}.` : `${c}، منها ${stores}.`),
    countOne: (c: string, store: string) => `${c}: ${store}.`,
    placeRestockQ: (place: string) => `كم مرة يتوفر iPhone من جديد في متاجر Apple في ${place}؟`,
    placeLastsQ: (place: string) => `كم يصمد المخزون في ${place}؟`,
    placeNearestQ: (place: string) => `ما أقرب متجر Apple خارج ${place}؟`,
  },

  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? place : kind === "model" ? "كل متاجر Apple في الولايات المتحدة" : `متاجر Apple في ${place}`;
    return [
      "مخزون الاستلام يُباع عبر apple.com: تختار الخيار والمتجر عند الدفع، وتدفع أونلاين، ثم تستلم من المتجر، وغالبًا في اليوم نفسه. وهو منفصل عن المعروض على الرفوف وعن متاجر شركات الاتصالات.",
      `يفحص PickupChecker كل خيار نتابعه في ${at} كل 15 ثانية، وكل 5 ثوانٍ حين يشير إليه تنبيه؛ ولا يُحتسب أي تغيير إلا بعد فحص ثانٍ يؤكده، فلا يتحول خلل عابر إلى توفر أو نفاد وهمي.`,
      "كل تغيير مؤكد يُسجَّل، ومن هذا السجل يُبنى مخطط التوفر وسجله في هذه الصفحة.",
    ];
  },
  alertRule: "التنبيه الواحد = متجر واحد، طراز واحد، سعة واحدة، لون واحد؛ ويصلك إشعار خلال ثوانٍ من تحوّل apple.com إلى «متوفر».",

  titles: {
    state: (name: string, duoNow: string, stores: string) => [
      `ابل ستور ${name}: iPhone Duo متوفر في ${duoNow} من ${count(parseN(stores), STORES_G)} الآن`,
      `ابل ستور ${name}: مخزون iPhone Duo للاستلام مباشرة`,
      `ابل ستور ${name}: مخزون iPhone Duo`,
      `ابل ستور ${name}: مخزون iPhone`,
    ],
    city: (city: string, code: string, duoNow: string, stores: string) => [
      `ابل ستور ${city}، ${code}: iPhone Duo في ${duoNow} من ${count(parseN(stores), STORES_G)}`,
      `ابل ستور ${city}، ${code}: مخزون iPhone Duo للاستلام`,
      `ابل ستور ${city}، ${code}: مخزون iPhone Duo`,
      `ابل ستور ${city}: مخزون iPhone`,
    ],
    /** «ابل دبي مول» أولًا (كما يكتبها الناس في البحث)، ثم الوعد. */
    store: (name: string, region: string | null) => {
      const n = searchedStore(name);
      const r = region ? ` (${region})` : "";
      return [
        `${n}${r}: مخزون iPhone اليوم، الاستلام وساعات العمل`,
        `${n}${r}: مخزون iPhone اليوم وساعات العمل`,
        `${n}${r}: مخزون iPhone وساعات العمل`,
        `${n}: مخزون iPhone اليوم، الاستلام وساعات العمل`,
        `${n}: مخزون iPhone وساعات العمل`,
        `${n}: مخزون iPhone`,
        `${n} – المخزون`,
      ];
    },
    model: (name: string, storesNow: string) => [
      `مخزون ${name} للاستلام: متوفر الآن في ${storesNow} من متاجر Apple`,
      `مخزون ${name} للاستلام: في ${count(parseN(storesNow), STORES_G)} الآن`,
      `مخزون ${name} للاستلام من المتجر مباشرة`,
    ],
  },

  tokens: {
    tooFewToMeasure: "البيانات أقل من أن تُقاس بعد",
    noneLoggedYet: "لم يُسجَّل بعد",
    noneYet: "لا شيء بعد",
  },

  pattern: {
    none: (days: string) => `لم يتأكد أي توفر خلال آخر ${daysOf(days)}.`,
    nConfirmed: TIMES,
    countIn: (c: string, days: string) => `تأكد التوفر ${c} خلال آخر ${daysOf(days)}`,
    stay: (minutes: string) => `، ويبقى معروضًا عادةً نحو ${count(parseN(minutes), MINUTES)} قبل أن ينفد`,
    nDays: DAYS,
    tooFew: (c: string, onDays: string | null, stay: string) => `${c}${onDays ? ` في ${onDays}` : ""}${stay}؛ وهذا أقل من أن يكشف نمطًا بعد.`,
    usual: (hour: string, weekday: string | null, c: string, stay: string) => `يتوفر عادةً نحو الساعة ${hour} بالتوقيت المحلي${weekday ? `، وأكثر الأيام توفرًا ${weekday}` : ""}؛ ${c}${stay}.`,
  },

  regionNouns: Object.fromEntries(Object.entries(NOUNS).map(([k, w]) => [k, { one: w.one, other: w.other }])) as Record<string, Forms>,

  measured: "طريقة القياس",

  faqTitle: "الأسئلة الشائعة",
  breadcrumb: "مسار التنقل",
  keepExploring: "تابع الاستكشاف",
  browse: {
    storesByState: "المتاجر حسب الولاية",
    allStatesCities: "كل الولايات والمدن ←",
    liveByModel: "المخزون المباشر حسب الطراز",
    modelStock: (model: string) => `مخزون ${model}`,
    thisPage: "هذه الصفحة",
    restockLog: (short: string) => `سجل توفر ${short}`,
    liveMap: "الخريطة المباشرة",
    mostStores: "الأكثر متاجر",
    allStates: "كل الولايات",
    bigCities: "المدن الكبرى",
    cities: "المدن",
    storesBy: (region: string) => `المتاجر حسب ال${region}`,
    allStoresIn: ({ country }: { inName: string; country: string }) => <>كل متاجر Apple في {country} ←</>,
    allRegions: (regions: string) => `كل ال${regions}`,
  },
  modelCards: "حسب الطراز",
  narrative: {
    lastRestock: (config: ReactNode, at: ReactNode, ago: ReactNode) => <>{" "}آخر توفر: {config}{at}، {ago}.</>,
    at: (store: ReactNode) => <> في {store}</>,
  },
  statStrip: {
    inStockNow: "متوفر الآن",
    ofStores: (n: string) => `من ${count(parseN(n), STORES_G)}`,
    stores: "المتاجر",
    nCities: CITIES,
    tracked: "قيد المتابعة",
    modelNow: (short: string) => `${short} الآن`,
    configsInStock: "خيارات متوفرة",
    storesWithStock: forms({ one: "متجر فيه مخزون", two: "متجران فيهما مخزون", few: "متاجر فيها مخزون", many: "متجرًا فيه مخزون", other: "متجر فيه مخزون" }),
    restocks24h: "التوفر · 24 ساعة",
    restocksHint: (week: string, month: string, days: string) => `${week} في 7 أيام · ${month} في ${daysOf(days)}`,
    sellOuts: (days: string) => `النفاد · ${daysOf(days)}`,
    stays: (duration: string) => `يبقى ~${duration}`,
    noPairs: "لا بيانات بعد",
    lastRestock: "آخر توفر",
    noneYet: "لا شيء بعد",
    inLastDays: (days: string) => `خلال آخر ${daysOf(days)}`,
  },
  product: {
    chooseIphone: "اختر iPhone",
    storage: "السعة",
    color: "اللون",
    all: "الكل",
    numbersAre: (unit: ReactNode) => <>الأرقام = عدد {unit} التي فيها مخزون الآن.</>,
    seen: (ago: ReactNode) => <>شوهد {ago}</>,
    last: (ago: ReactNode) => <>آخر مرة {ago}</>,
    notSeenYet: "لم يُشاهَد بعد",
    firstCheckPending: "بانتظار أول فحص",
    inStock: "متوفر",
    inStockLower: "متوفر",
    none: "لا يوجد",
    here: "هنا",
    notAvailable: "غير متوفر",
    notCheckedYet: "لم يُفحص بعد",
    availableForPickup: "متوفر للاستلام",
    since: (ago: ReactNode) => <> · {ago}</>,
    lastInStock: (ago: ReactNode) => <>آخر توفر {ago}</>,
    neverSeen: "لم يُشاهَد متوفرًا هنا بعد",
    firstCheckSoon: "أول فحص خلال دقيقة",
    buy: "اشترِ من apple.com",
    checked: (checked: ReactNode, note: ReactNode) => <>آخر فحص {checked} · {note}</>,
    checkNote: "كل 15 ثانية، و5 ثوانٍ مع تنبيه",
  },

  source: (source: ReactNode) => <>المصدر: {source}</>,
  photoCredit: (link: ReactNode) => <>الصورة: {link}</>,
  sources: "المصادر",
  allUsStores: "جميع متاجر Apple الـ269 في الولايات المتحدة",
  trackerSource: (where: ReactNode, since: ReactNode, asOf: ReactNode) => <>متتبع PickupChecker المباشر: كل خيارات iPhone Duo و18 Pro و18 Pro Max في {where}، نفحصها كل 15 ثانية (وكل 5 ثوانٍ للمتاجر التي عليها تنبيهات) منذ {since}؛ أرقام هذه الصفحة حتى {asOf}.</>,
  live: {
    configsCaption: (stores: ReactNode, model: ReactNode) => <>عدد متاجر Apple (من {stores}) التي تعرض كل خيار من {model} للاستلام الآن · مباشر</>,
    storage: "السعة",
    pricesCaption: (model: ReactNode) => <>أسعار {model} على apple.com (غير مقفل، قبل الضريبة) ومخزون الاستلام المباشر</>,
    price: "السعر",
    bestColor: "اللون الأكثر توفرًا (عدد المتاجر الآن)",
    noRestock: (model: string) => `لم يُسجَّل أي توفر لجهاز ${model} بعد.`,
    clockLabel: (model: string) => `لجهاز ${model} في كل الولايات المتحدة`,
    storesWithIt: "متاجر يتوفر فيها الآن",
    pairsInStock: "أزواج متجر × خيار متوفرة",
    restocksLogged: "مرات التوفر المسجلة",
    medianTime: "مدة البقاء في المخزون (الوسيط)",
    underOneMin: (min: string) => `< ${min}`,
  },

  photos: {
    "apple-store-pickup-counter": { alt: "منضدة استلام خشبية عليها لافتة Pickup داخل متجر Apple", caption: "تُسلَّم طلبات الاستلام عند منضدة كهذه." },
    "phone-map": { alt: "يدان تستخدمان تطبيق خرائط على هاتف ذكي في الهواء الطلق", caption: "حين يدوم التوفر دقيقة واحدة، تصبح المسافة إلى المتجر أهم مما يظن الناس." },
    "phone-card-payment": { alt: "امرأة تحمل iPhone وبطاقة ائتمان لتدفع أونلاين", caption: "الدفع أونلاين ثم الاستلام من المتجر." },
    "phone-on-box": { alt: "هاتف ذكي جديد فوق علبته البيضاء", caption: "هاتف جديد خرج للتو من علبته." },
    "city-map-phone": { alt: "شخصان يتفقدان خريطة المدينة على هاتف", caption: "تخطيط الطريق إلى المتجر." },
    "phone-notification": { alt: "يد تحمل هاتفًا تظهر على شاشة قفله إشعارات", caption: "التنبيه يصل إلى شاشة القفل." },
    "apple-store-crowd-inside": { alt: "حشد يصطف داخل متجر Apple مزدحم في مركز تسوق", caption: "زحام أسبوع الإطلاق داخل متجر Apple: المخزون الذي يصل إلى الرفوف ينفد في دقائق." },
    "apple-store-glass-canopy": { alt: "متجر Apple بواجهة زجاجية ومظلة خشبية ليلًا", caption: "متجر Apple بواجهة زجاجية بعد حلول الظلام." },
    "apple-store-night-vancouver": { alt: "متجر Apple مضاء ليلًا في فانكوفر", caption: "متجر Apple ليلًا: قد يظهر مخزون الاستلام في أي ساعة، لكنه يظهر صباحًا أكثر بكثير." },
    "phone-hand-camera": { alt: "شخص يحمل iPhone بثلاث كاميرات", caption: "طرازات Pro هي التي يصطف الناس من أجلها." },
    "place-ae-uae": { alt: "برج العرب خلف أشجار النخيل وجسر مقوّس للمشاة في مدينة جميرا بدبي", caption: "برج العرب، دبي." },
    "place-ae-abu-dhabi": { alt: "أبراج الواجهة البحرية في أبوظبي عبر مياه زرقاء صافية في يوم مشمس", caption: "أفق أبوظبي من البحر." },
    "place-ae-abu-dhabi-emirate": { alt: "القباب والمآذن البيضاء لجامع الشيخ زايد الكبير تحت سماء زرقاء", caption: "جامع الشيخ زايد الكبير، أبوظبي." },
    "place-ae-dubai": { alt: "منظر جوي لوسط مدينة دبي يرتفع فيه برج خليفة فوق دبي مول", caption: "وسط مدينة دبي: برج خليفة ودبي مول، حيث يقع متجر Apple دبي مول." },
  },
};
