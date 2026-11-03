/**
 * Apple's own names for stores, cities, regions and colours in each language (client-safe, pure data). Taken
 * from apple.com's store lists and buy pages in that language on 2026-11-03 (docs/i18n.md §6): /jp/retail/storelist,
 * /de/shop/buy-iphone/iphone-duo… A name missing here is written as in English (proper names mostly are).
 */
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { baseLang, type Lang } from "./locales";

/** Store names Apple writes differently (by store number). Hong Kong: the names people search for. */
const STORE: Partial<Record<string, Record<string, string>>> = {
  ja: { R005: "名古屋栄", R048: "福岡", R710: "川崎", R711: "京都", R091: "心斎橋", R768: "梅田", R079: "銀座", R718: "丸の内", R224: "表参道", R119: "渋谷", R128: "新宿" },
  ko: { R770: "하남", R691: "강남", R692: "가로수길", R764: "홍대", R751: "잠실", R738: "명동", R747: "여의도" },
  "zh-TW": { R713: "台北 101", R694: "信義 A13" },
  // Brussels as people there search for it ("apple brussel" 22,200 / "apple bruxelles" 22,200 a month).
  nl: { R486: "Brussel" },
  fr: { R486: "Bruxelles" },
  // Hong Kong: what people type ("apple 廣東道" 9,900, "apple ifc" 9,900, "apple apm" 2,400, "apple 又一城" 260).
  "zh-HK": { R409: "銅鑼灣", R428: "ifc mall", R485: "又一城", R673: "apm Hong Kong", R610: "新城市廣場", R499: "廣東道" },
  // UAE: Apple's Arabic site has no store pages (they redirect to English), so the names people type in Arabic
  // ("ابل ياس مول" 720, "ابل دبي مول" 480, "ابل الجيمي مول" 320 a month, DataForSEO 2026-11-03).
  ar: { R597: "دبي مول", R596: "مول الإمارات", R595: "ياس مول", R706: "جزيرة الماريه", R785: "الجيمي مول" },
};

/** City names by country, English → the language's. */
const CITY: Partial<Record<string, Partial<Record<CountryCode, Record<string, string>>>>> = {
  ja: { jp: { Nagoya: "名古屋", Fukuoka: "福岡", Kawasaki: "川崎", Kyoto: "京都", Osaka: "大阪", Tokyo: "東京" } },
  ko: { kr: { Hanam: "하남", Seoul: "서울" } },
  zh: {
    tw: { Taipei: "台北" },
    hk: { "Causeway Bay": "銅鑼灣", Central: "中環", "Kowloon Tong": "九龍塘", "Kwun Tong": "觀塘", "Sha Tin": "沙田", "Tsim Sha Tsui": "尖沙咀" },
  },
  de: {
    de: { Munich: "München", Cologne: "Köln", Hanover: "Hannover" },
    at: { Vienna: "Wien" },
    ch: { Geneva: "Genf", Zurich: "Zürich" },
  },
  fr: {
    ch: { Basel: "Bâle", Geneva: "Genève" },
    be: { Brussels: "Bruxelles" },
    ca: { Montreal: "Montréal", "Quebec City": "Québec" },
  },
  nl: { nl: { "The Hague": "Den Haag" }, be: { Brussels: "Brussel" } },
  it: { it: { Florence: "Firenze", Milan: "Milano", Rome: "Roma", Turin: "Torino" } },
  ar: { ae: { Dubai: "دبي", "Abu Dhabi": "أبوظبي", "Al Ain": "العين" } },
};

/** Region names (Apple's store-list groups), English → the language's. */
const REGION: Partial<Record<string, Partial<Record<CountryCode, Record<string, string>>>>> = {
  ja: { jp: { Aichi: "愛知県", Fukuoka: "福岡県", Kanagawa: "神奈川県", Kyoto: "京都府", Osaka: "大阪府", Tokyo: "東京都" } },
  ko: { kr: { Gyeonggi: "경기도", Seoul: "서울" } },
  zh: { tw: { Taipei: "台北市" }, hk: { "Hong Kong": "香港" } },
  de: {
    de: { Bavaria: "Bayern", Hesse: "Hessen", "Lower Saxony": "Niedersachsen", "North Rhine-Westphalia": "Nordrhein-Westfalen", Saxony: "Sachsen" },
    at: { Vienna: "Wien" },
    ch: { Basel: "Basel-Stadt", Geneva: "Genf", Zurich: "Zürich" },
  },
  fr: {
    ch: { Basel: "Bâle-Ville", Geneva: "Genève" },
    be: { Brussels: "Région de Bruxelles-Capitale" },
    ca: { "British Columbia": "Colombie-Britannique", "Nova Scotia": "Nouvelle-Écosse", Quebec: "Québec" },
  },
  nl: { nl: { "North Holland": "Noord-Holland", "South Holland": "Zuid-Holland" }, be: { Brussels: "Brussels Hoofdstedelijk Gewest" } },
  it: { it: { Florence: "Firenze", Milan: "Milano", Rome: "Roma", Turin: "Torino", Venice: "Venezia" } },
  ar: { ae: { Dubai: "دبي", "Abu Dhabi": "أبوظبي" } },
};

/** Apple's colour names in each language (Sweden writes them in lower case, as Apple does). */
const COLOR: Partial<Record<Lang, Record<string, string>>> = {
  ja: { "Night Sky": "ナイトスカイ", "Star White": "スターホワイト", Black: "ブラック", Burgundy: "バーガンディ", Glacier: "グレイシャー", Silver: "シルバー" },
  ko: { "Night Sky": "나이트 스카이", "Star White": "스타 화이트", Black: "블랙", Burgundy: "버건디", Glacier: "글레이셔", Silver: "실버" },
  "zh-TW": { "Night Sky": "夜空色", "Star White": "星光白色", Black: "黑色", Burgundy: "勃根地紅色", Glacier: "冰川藍色", Silver: "銀色" },
  "zh-HK": { "Night Sky": "夜空色", "Star White": "星光白色", Black: "黑色", Burgundy: "布根地紅色", Glacier: "冰川色", Silver: "銀色" },
  de: { "Night Sky": "Nachthimmel", "Star White": "Sternenweiß", Black: "Schwarz", Burgundy: "Burgunder", Glacier: "Polar", Silver: "Silber" },
  "de-CH": { "Night Sky": "Nachthimmel", "Star White": "Sternenweiss", Black: "Schwarz", Burgundy: "Burgunder", Glacier: "Polar", Silver: "Silber" },
  fr: { "Night Sky": "Ciel nocturne", "Star White": "Blanc stellaire", Black: "Noir", Burgundy: "Bordeaux", Glacier: "Glacier", Silver: "Argent" },
  "fr-CA": { "Night Sky": "Ciel nocturne", "Star White": "Blanc stellaire", Black: "Noir", Burgundy: "Bordeaux", Glacier: "Glacier", Silver: "Argent" },
  it: { "Night Sky": "Cielo notturno", "Star White": "Bianco stellare", Black: "Nero", Burgundy: "Borgogna", Glacier: "Ghiacciaio", Silver: "Argento" },
  es: { "Night Sky": "Cielo nocturno", "Star White": "Blanco estelar", Black: "Negro", Burgundy: "Burdeos", Glacier: "Azul glacial", Silver: "Plata" },
  nl: { "Night Sky": "Nachthemel", "Star White": "Sterrenwit", Black: "Zwart", Burgundy: "Bordeauxrood", Glacier: "Gletsjer", Silver: "Zilver" },
  sv: { "Night Sky": "natthimmel", "Star White": "stjärnvit", Black: "svart", Burgundy: "bourgogne", Glacier: "glaciär", Silver: "silver" },
  // apple.com/ae-ar/iphone-duo/specs and /iphone-18-pro/specs.
  ar: { "Night Sky": "سماء الليل", "Star White": "أبيض النجوم", Black: "أسود", Burgundy: "عنّابي", Glacier: "جليدي", Silver: "فضي" },
};

const fam = (lang: Lang) => (lang === "zh-TW" || lang === "zh-HK" ? "zh" : baseLang(lang));

/** The store's own name in the language ("銀座", "가로수길"), else its English one. */
/**
 * Where a variant has no name of its own for a store, the one its sibling uses: a Taipei reader watching Causeway
 * Bay reads Hong Kong's 銅鑼灣 (both write Traditional Chinese), a Montréal reader watching Brussels reads Bruxelles.
 */
const STORE_FALLBACK: Partial<Record<Lang, Lang[]>> = { "zh-TW": ["zh-HK"], "zh-HK": ["zh-TW"], "fr-CA": ["fr"], "de-CH": ["de"] };
export function storeLabel(s: { storeNumber: string; name: string }, lang: Lang): string {
  for (const l of [lang, ...(STORE_FALLBACK[lang] ?? [])]) {
    const n = STORE[l]?.[s.storeNumber];
    if (n) return n;
  }
  return s.name;
}
/** "Apple 銀座", "Apple Kurfürstendamm": the name people search for. English keeps catalog.appleName's rules. */
export function appleStoreLabel(s: { storeNumber: string; name: string }, lang: Lang): string {
  const n = storeLabel(s, lang);
  return /^apple\b/i.test(n) ? n : `Apple ${n}`;
}
export function cityLabel(cc: CountryCode, city: string, lang: Lang): string {
  return lang === "en" ? city : CITY[fam(lang)]?.[cc]?.[city] ?? city;
}
export function regionLabel(cc: CountryCode, region: string, lang: Lang): string {
  return lang === "en" ? region : REGION[fam(lang)]?.[cc]?.[region] ?? region;
}
export function colorLabel(color: string, lang: Lang): string {
  return COLOR[lang]?.[color] ?? color;
}
/** "256GB Night Sky" → "256GB ナイトスカイ". */
export function configLabel(item: { storage: string; color: string }, lang: Lang): string {
  return `${item.storage} ${colorLabel(item.color, lang)}`;
}
const names = new Map<string, Intl.DisplayNames>();
/** The country's name in the language (Intl), English: the site's own name ("United Kingdom"). */
/** Where Intl's name is the long official one ("中國香港特別行政區", "Sonderverwaltungsregion Hongkong"): what people say. */
const SHORT_NAME: Partial<Record<CountryCode, Record<string, string>>> = {
  hk: { ja: "香港", ko: "홍콩", zh: "香港", de: "Hongkong", fr: "Hong Kong", it: "Hong Kong", es: "Hong Kong", nl: "Hongkong", sv: "Hongkong", ar: "هونغ كونغ" },
  ae: { ar: "الإمارات" },
};
export function countryLabel(cc: CountryCode, lang: Lang): string {
  if (lang === "en") return COUNTRIES[cc].name;
  const short = SHORT_NAME[cc]?.[fam(lang)];
  if (short) return short;
  let d = names.get(lang);
  if (!d) { d = new Intl.DisplayNames([lang], { type: "region" }); names.set(lang, d); }
  return d.of(COUNTRIES[cc].iso) ?? COUNTRIES[cc].name;
}

/** Addresses as Apple writes them in the language (Japan, Korea, Taiwan, Hong Kong order them large to small). */
const ADDRESS: Partial<Record<Lang, Record<string, string>>> = {
  "ja": { R711: "〒600-8006 京都府京都市下京区四条通高倉東入立売中之町83-1", R768: "〒530-0011 大阪府大阪市北区大深町4-20 グランフロント大阪南館", R091: "〒542-0086 大阪府大阪市中央区西心斎橋1-5-5 アーバンBLD心斎橋", R005: "〒460-0008 愛知県名古屋市中区栄3-17-15 エフエックスビル", R079: "〒104-0061 東京都中央区銀座3-5-12 サヱグサビル", R718: "〒100-0005 東京都千代田区丸の内2-5-2 三菱ビル", R128: "〒160-0022 東京都新宿区新宿3−30−13 新宿マルイ本館", R119: "〒150-0041 東京都渋谷区神南1-20-9 公園通りビル", R224: "〒150-0001 東京都渋谷区神宮前4-2-13", R710: "〒212-0013 神奈川県川崎市幸区堀川町72-1 ラゾーナ川崎プラザ", R048: "〒810-0001 福岡県福岡市中央区天神2-5-19" },
  "ko": { R770: "경기 하남시 미사대로 750 스타필드 하남, 1F", R751: "서울 송파구 올림픽로 300 롯데월드몰 1F", R738: "서울 중구 남대문로 2가 9-1 하이드파크", R692: "서울 강남구 가로수길 43", R747: "서울 영등포구 국제금융로 10 IFC MALL, L1", R691: "서울 강남구 강남대로 464", R764: "서울 마포구 양화로 140" },
  "zh-TW": { R694: "台北市信義區松壽路 13 號", R713: "台北市信義區市府路 45 號 台北 101 購物中心 1F" },
  "zh-HK": { R409: "香港銅鑼灣軒尼詩道 500 號希慎廣場", R428: "香港中環金融街 8 號國際金融中心商場", R499: "香港尖沙咀廣東道 100 號", R485: "香港九龍塘達之路 80 號又一城", R673: "香港觀塘觀塘道 418 號", R610: "香港沙田沙田正街 18 號新城市廣場 1 期 L4" },
};
/** The store's address in the language where Apple writes it differently, else undefined. */
export function addressLabel(s: { storeNumber: string }, lang: Lang): string | undefined {
  return ADDRESS[lang]?.[s.storeNumber];
}
