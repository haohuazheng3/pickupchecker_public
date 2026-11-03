/**
 * 한국어 문구: place — 국가 페이지 트리의 카피 빌더(제목, 답변 우선 도입부, 키워드 섹션, 가격·세금 섹션, FAQ).
 * 영어판(lib/seo/countryCopy.ts)과 같은 인자, 같은 반환 형태. 실시간 수치로 문장을 만들어요.
 * 검색어(Google Ads, 한국, 월간): 애플스토어 49,500 · 아이폰 듀오 27,100 · 아이폰 듀오 가격 2,400 · 애플스토어 재고 확인 210 ·
 * 애플스토어 매장 210 · 아이폰 재고 110. 제품명은 "iPhone Duo" 그대로, 제목·H1·도입부에 "아이폰 듀오"를 한 번 곁들여요.
 * 지역·도시 이름은 영어 데이터로 들어오므로 places.ts로 한국어 이름을 써요(이미 한국어면 그대로 돌아와요).
 */
import * as cc from "@/lib/seo/countryCopy";
import { priceOf, priceRange, scarcest, pairsPct, duoStoresNow, INTL_TRACKING_SINCE, type IntlPlaceInput, type HomeCopyInput, type RestockTimesBrief } from "@/lib/seo/countryCopy";
import { catalogFor, citiesWithStores, statesWithStores, storesOf, modelByKey, type ModelKey, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { CA_PROVINCE_TAX, CA_TAX_SOURCE, TAX_SOURCES, beforeTax, includedRate, pickupHelp, storeListSource, taxName, withProvinceTax } from "@/content/country-tax";
import { fitTitleW, list, num, pct, price, stamp } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, colorLabel, countryLabel, regionLabel } from "@/lib/i18n/places";
import { alertHref, fmtDuration, storeTitle as enStoreTitle, type FaqItem } from "@/lib/seo/enrich";
import { hourLabel } from "@/lib/content/siteFacts";
import type { Block, Faq, Source } from "@/lib/content/types";
import type { KeywordSection } from "@/components/content/KeywordSections";
import type { Dict } from "../en";
import { eulReul, eunNeun } from "./common";

const L = "ko" as const;
const n = (x: number) => num(L, x);
const money = (code: CountryCode, v: number) => price(L, COUNTRIES[code], v);
/** 나라 이름: 한국은 "대한민국". */
const cn = (code: CountryCode) => countryLabel(code, L);
/** "국내" (한국) / "일본" (다른 나라): 가격·재고 앞에 붙는 말. */
const dom = (code: CountryCode) => (code === "kr" ? "국내" : cn(code));
/** 시·도처럼 그 나라의 지역 단위(한국어). */
const REGION_WORD: Record<string, string> = { state: "주", province: "시·도", area: "지역", department: "도", prefecture: "도도부현", emirate: "토후국", canton: "칸톤", region: "지역", county: "주", city: "시" };
const regionWord = (code: CountryCode) => REGION_WORD[COUNTRIES[code].regionNoun ?? "area"] ?? "지역";
/** 가격 안의 세금 이름. */
const taxKo = (code: CountryCode) => {
  const t = taxName(COUNTRIES[code]);
  return t === "VAT" ? "부가세" : t === "consumption tax" ? "소비세" : t;
};
/** "부가세 10% 포함" / "세전" / "판매세 없음". */
const taxNote = (code: CountryCode) => {
  if (code === "ca") return "세전";
  const r = includedRate(COUNTRIES[code]);
  return r == null ? "판매세 없음" : `${taxKo(code)} ${r}% 포함`;
};
/** 장소 이름(영어 데이터 → 한국어). */
const nameOf = (i: IntlPlaceInput) => {
  const nm = i.kind === "city" ? cityLabel(i.cc, i.name, L) : regionLabel(i.cc, i.name, L);
  // 매장 목록 페이지는 나라 이름을 넘겨요: 한국에서는 "국내".
  return nm === cn(i.cc) ? dom(i.cc) : nm;
};
/** scarcest()의 "256GB Silver" → "256GB 실버". */
const cfgKo = (label: string) => {
  const [storage, ...color] = label.split(" ");
  return `${storage} ${colorLabel(color.join(" "), L)}`;
};

/** 한국 부가가치세율(10%)의 근거: 부가가치세법 제30조. */
const KR_TAX: Source = { label: "국가법령정보센터: 부가가치세법 제30조(세율 10%)", url: "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EB%B6%80%EA%B0%80%EA%B0%80%EC%B9%98%EC%84%B8%EB%B2%95" };
const taxSource = (code: Exclude<CountryCode, "us">): Source => (code === "kr" ? KR_TAX : TAX_SOURCES[code]);
const helpSource = (code: CountryCode): Source => ({ label: "Apple: 배송 및 픽업 도움말(픽업할 때 챙길 것)", url: pickupHelp(code).url });

/* ------------------------------------------------------------------ 기간, 이름, 시각 */

function sinceWhen(now = Date.now()): string {
  return now - Date.parse(`${INTL_TRACKING_SINCE}T00:00:00Z`) < 30 * 86400_000 ? "11월 2일 추적 시작 이후" : "최근 30일 동안";
}

/** 미국 매장 도시·주와 이름이 같은 곳은 나라를 붙여요("Manchester(영국)"). */
function placeLabel(code: CountryCode, name: string): string {
  return cc.placeLabel(code, name) === name ? name : `${name}(${cn(code)})`;
}

/** "11월 2일 오후 3:04"(한국 시간), 다른 나라는 시간대 표기를 붙여요. */
function whenIn(code: CountryCode, iso: string | Date): string {
  return stamp(L, iso, COUNTRIES[code].timeZone, code !== "kr");
}

/* ------------------------------------------------------------------ 세금 */

function taxSentence(code: CountryCode, region?: string): string {
  const duo = priceOf(code, "duo");
  if (duo == null) return "";
  if (code === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    if (t) return `256GB iPhone Duo의 Apple 캐나다 가격 ${money(code, duo)}은 세전이에요. ${regionLabel(code, region!, L)}에서는 ${t.rate}% ${CA_PROVINCE_TAX[region!].label}가 붙어 약 ${money(code, t.total)}이 돼요.`;
    return `256GB iPhone Duo의 Apple 캐나다 가격 ${money(code, duo)}은 세전이에요. 주에 따라 5%~15%가 더 붙어요.`;
  }
  const r = includedRate(COUNTRIES[code]);
  if (r == null) return `256GB iPhone Duo는 ${money(code, duo)}이고, 홍콩은 판매세가 없어서 픽업할 때도 이 금액 그대로예요.`;
  return `256GB iPhone Duo의 ${dom(code)} 가격은 ${money(code, duo)}(${taxKo(code)} ${r}% 포함)이에요. 매장 픽업이라고 따로 붙는 금액은 없어요.`;
}

const PRICE_ROWS: [ModelKey, string][] = [["duo", "256GB"], ["duo", "1TB"], ["18-pro-max", "256GB"], ["18-pro-max", "1TB"], ["18-pro", "256GB"]];

function priceSection(code: CountryCode, placeName: string, region?: string, model: ModelKey = "duo"): KeywordSection {
  const c = COUNTRIES[code];
  const m = modelByKey(model)!;
  const base = priceOf(code, model) ?? 0;
  const src = taxSource(code as Exclude<CountryCode, "us">);
  const shop = `apple.com/${c.buyPath ?? c.shopPath}`;
  const rows: [string, number][] = PRICE_ROWS.flatMap(([k, st]) => { const p = priceOf(code, k, st); return p == null ? [] : [[`${modelByKey(k)!.name} ${st}`, p] as [string, number]]; });
  if (code === "ca") {
    const t = region ? CA_PROVINCE_TAX[region] : undefined;
    if (t) {
      const rk = regionLabel(code, region!, L);
      return {
        id: "price-with-tax",
        h2: `${placeName} ${m.name} 세금 포함 가격`,
        lead: `256GB ${eunNeun(m.name)} **세전 ${money(code, base)}**이고, ${rk}의 ${t.total}% ${t.label}를 더하면 ${placeName} 매장에서 약 **${money(code, withProvinceTax(base, region!)!.total)}**이에요.`,
        blocks: [
          { t: "note", text: "**세금은 픽업하는 곳 기준:** 집 주소가 아니라 매장이 있는 주의 세율이 붙어요." },
          { t: "table", head: ["iPhone", "apple.com 가격", `${t.total}% ${t.label} 포함`], rows: rows.map(([label, p]) => [label, money(code, p), money(code, withProvinceTax(p, region!)!.total)]), caption: `${rk}: Apple 캐나다 가격 + ${t.label}(${t.total}%)`, source: `[${src.label}](${src.url}); 가격: apple.com/ca` },
        ],
      };
    }
    const provinces = Object.keys(CA_PROVINCE_TAX).filter((p) => storesOf("ca").some((s) => s.state === p));
    const cheapest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total < CA_PROVINCE_TAX[a].total ? b : a));
    const dearest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total > CA_PROVINCE_TAX[a].total ? b : a));
    return {
      id: "price-with-tax",
      h2: `캐나다 ${m.name} 주별 세금 포함 가격`,
      lead: `256GB ${m.name}의 Apple 가격 **${money(code, base)}**은 세전이에요. 픽업 매장이 있는 주의 세금이 붙어, ${regionLabel(code, cheapest, L)}(${CA_PROVINCE_TAX[cheapest].total}%) **${money(code, withProvinceTax(base, cheapest)!.total)}**부터 ${regionLabel(code, dearest, L)}(${CA_PROVINCE_TAX[dearest].total}%) **${money(code, withProvinceTax(base, dearest)!.total)}**까지예요.`,
      blocks: [{
        t: "table",
        head: ["주", "세금", "세율", `${m.short} 256GB 세금 포함`],
        rows: provinces.map((p) => [regionLabel(code, p, L), CA_PROVINCE_TAX[p].label, `${CA_PROVINCE_TAX[p].total}%`, money(code, withProvinceTax(base, p)!.total)]),
        caption: "Apple Store가 있는 주: 매장 픽업에 붙는 판매세",
        source: `[${CA_TAX_SOURCE.label}](${CA_TAX_SOURCE.url}); 가격: apple.com/ca`,
      }],
    };
  }
  const r = includedRate(c);
  const tk = taxKo(code);
  return {
    id: "price",
    h2: model === "duo" && code === "kr"
      ? `iPhone Duo(아이폰 듀오) 가격: ${money(code, base)}부터, ${taxNote(code)}`
      : `${dom(code)} ${m.name} 가격: ${money(code, base)}부터, ${taxNote(code)}`,
    lead: r == null
      ? `apple.com의 256GB ${m.name} 가격 **${money(code, base)}**이 ${placeName}에서 픽업할 때 내는 금액 그대로예요. 홍콩은 **판매세도 부가세도 없어요**.`
      : `256GB ${eunNeun(m.name)} apple.com ${dom(code)} 가격이 **${money(code, base)}**이고 **${tk} ${r}%가 포함**돼 있어요(세전 ${money(code, beforeTax(c, base))}). ${placeName}에서 매장 픽업해도 더 붙는 금액은 없어요.`,
    blocks: [{
      t: "table",
      head: r == null ? ["iPhone", "apple.com 가격"] : ["iPhone", "apple.com 가격", `${tk} ${r}% 제외`],
      rows: rows.map(([label, p]) => (r == null ? [label, money(code, p)] : [label, money(code, p), money(code, beforeTax(c, p))])),
      caption: `Apple ${dom(code)} 가격${r == null ? "" : `, ${tk} 포함`}`,
      source: `[${src.label}](${src.url}); 가격: ${shop}`,
    }],
  };
}

function taxFaq(code: CountryCode, placeName: string, region?: string): FaqItem {
  const duo = priceOf(code, "duo") ?? 0;
  if (code === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    return t
      ? { q: `${placeName}에서 iPhone Duo는 세금 포함 얼마인가요?`, a: `256GB 기준 약 ${money(code, t.total)}이에요. Apple 가격 ${money(code, duo)}에 ${regionLabel(code, region!, L)}의 ${t.rate}% ${CA_PROVINCE_TAX[region!].label}가 픽업하는 곳 기준으로 붙어요.` }
      : { q: "Apple 캐나다 가격에 세금이 포함돼 있나요?", a: `아니요. 256GB iPhone Duo는 세전 ${money(code, duo)}이고, 매장이 있는 주에 따라 GST, HST 또는 주 판매세가 붙어요. 앨버타 5%부터 퀘벡 14.975%까지예요.` };
  }
  const r = includedRate(COUNTRIES[code]);
  return r == null
    ? { q: "홍콩에서 iPhone에 판매세가 붙나요?", a: `아니요. 홍콩은 판매세와 부가세가 없어서 256GB iPhone Duo는 픽업할 때도 apple.com 가격 그대로 ${money(code, duo)}이에요.` }
    : { q: `iPhone Duo ${dom(code)} 가격에 ${taxKo(code)}가 포함돼 있나요?`, a: `네. 256GB iPhone Duo ${money(code, duo)}에는 ${taxKo(code)} ${r}%가 포함돼 있어서, 매장에서 받을 때 더 내는 금액은 없어요.` };
}

/* ------------------------------------------------------------------ 지역·도시 페이지 */

function placeTitle(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = placeLabel(i.cc, nameOf(i));
  return fitTitleW([
    `${w} 애플스토어 ${k}곳: iPhone Duo(아이폰 듀오) 실시간 재고`,
    `${w} 애플스토어 ${k}곳: iPhone Duo 실시간 재고`,
    `${w} 애플스토어: iPhone 재고 확인`,
    `${w} Apple Store iPhone 재고`,
  ]);
}

function priceBit(code: CountryCode, region?: string): string {
  const duo = priceOf(code, "duo");
  if (duo == null) return "";
  if (code === "ca") { const t = region ? withProvinceTax(duo, region) : null; return t ? `, 세금 포함 약 ${money(code, t.total)}` : `, 세전 ${money(code, duo)}`; }
  return `, ${money(code, duo)}(${taxNote(code)})`;
}

function placeDescription(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = placeLabel(i.cc, nameOf(i));
  return fitTitleW([
    `${w} Apple Store ${k}곳 중 지금 iPhone Duo 픽업 가능 ${i.stockNow.duo}곳, 18 Pro Max ${i.stockNow["18-pro-max"]}곳. 매장별 실시간 재고와 재입고 시간${priceBit(i.cc, i.region)}.`,
    `${w} Apple Store ${k}곳 중 iPhone Duo 재고 ${i.stockNow.duo}곳, 18 Pro Max ${i.stockNow["18-pro-max"]}곳. 매장별 실시간 재고, 재입고 시간.`,
  ], 155);
}

function placeIntro(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = nameOf(i);
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? `(도시 ${n(i.cities)}곳)` : "";
  return `${w}${cities}의 **Apple Store ${n(k)}곳** 중 지금 iPhone Duo(아이폰 듀오)를 매장 픽업할 수 있는 곳은 **${n(i.stockNow.duo)}곳**, 18 Pro Max는 **${n(i.stockNow["18-pro-max"])}곳**, 18 Pro는 **${n(i.stockNow["18-pro"])}곳**이에요.`;
}

function duoLead(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  if (have.length > 0) return `**${n(k)}곳 중 ${n(have.length)}곳**에 지금 iPhone Duo가 있어요: ${list(L, have.map((s) => appleStoreLabel(s, L)), 4, (x) => `그 외 ${n(x)}곳`)}.`;
  if (st.month > 0) return `지금은 **${n(k)}곳 모두** iPhone Duo가 없지만, ${sinceWhen()} **${n(st.month)}회** 재입고됐어요.`;
  return `지금은 **${n(k)}곳 모두** iPhone Duo가 없고, ${sinceWhen()} 기록된 Duo 재입고도 없어요.`;
}

function duoPoints(i: IntlPlaceInput, w: string, alert: string): Block[] {
  const k = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const items: string[] = [];
  if (have.length > 0 && st.month > 0) items.push(`**${sinceWhen()} 기록:** 이곳 매장 Duo 재입고 ${n(st.month)}회`);
  if (st.lastRestock && last) items.push(`**마지막 재입고:** ${whenIn(i.cc, st.lastRestock.at)} · ${appleStoreLabel(last, L)}`);
  if (st.medianMs != null) items.push(`**보통 판매 시간:** 재입고된 Duo는 약 ${fmtDuration(st.medianMs, L)} 떠 있었어요(중앙값)`);
  items.push(`**가장 빠른 방법:** 갈 수 있는 ${k <= 3 ? `매장 ${n(k)}곳 모두` : `가까운 매장 ${n(Math.min(k, 5))}곳`}에 [${w} iPhone Duo 알림 설정](${alert})`);
  items.push("**알림 하나** = 매장 하나 × 정확한 구성 하나. 매장에 재고가 뜨면 몇 초 안에 푸시가 와요");
  const blocks: Block[] = [];
  if (have.length === 0 && st.month === 0) blocks.push({ t: "note", text: "**1분 안에도 바뀔 수 있어요:** 가장 빨리 구하는 방법은 apple.com 새로고침이 아니라 알림이에요." });
  blocks.push({ t: "ul", items });
  return blocks;
}

function placeSections(i: IntlPlaceInput): KeywordSection[] {
  const k = i.stores.length;
  const w = nameOf(i);
  const alert = alertHref({ model: "duo", state: i.regionSlug, city: i.kind === "city" ? i.citySlug : undefined, country: i.cc });
  const scarce = scarcest(i, "18-pro-max");
  const pm = catalogFor("18-pro-max", i.cc).length;
  return [
    {
      id: "iphone-duo",
      h2: `${w} iPhone Duo 재고, 지금 있는 매장`,
      lead: duoLead(i),
      blocks: duoPoints(i, w, alert),
    },
    {
      id: "iphone-18-pro-max",
      h2: `${w} iPhone 18 Pro Max 매장별 재고`,
      lead: `**${n(k)}곳 중 ${n(i.stockNow["18-pro-max"])}곳**에 iPhone 18 Pro Max가 있고, 이곳의 매장 × 구성 ${n(k * pm)}개 중 **${pct(L, pairsPct(i, "18-pro-max"))}**에 재고가 있어요.`,
      blocks: [{ t: "ul", items: [
        ...(scarce.length ? [`**지금 가장 귀한 구성:** ${list(L, scarce.map((x) => `${cfgKo(x.label)}(${n(k)}곳 중 ${n(x.stores)}곳)`))}`] : []),
        `**iPhone 18 Pro:** ${n(k)}곳 중 ${n(i.stockNow["18-pro"])}곳, 매장 × 구성의 ${pct(L, pairsPct(i, "18-pro"))}에 재고`,
        `**${sinceWhen()} 기록:** ${i.max.month ? `18 Pro Max 재입고 ${n(i.max.month)}회` : "아직 18 Pro Max 재입고 없음"}`,
        ...(i.max.medianMs != null ? [`**보통 판매 시간:** 재입고된 Pro Max는 약 ${fmtDuration(i.max.medianMs, L)} 떠 있었어요(중앙값)`] : []),
      ] }],
    },
    priceSection(i.cc, w, i.cc === "ca" ? i.region : undefined),
  ];
}

/* ------------------------------------------------------------------ 나라: 매장 목록과 홈 */

function storesIndexTitle(code: CountryCode): string {
  const k = storesOf(code).length;
  return fitTitleW([
    `${dom(code)} 애플스토어 매장 ${k}곳: iPhone Duo(아이폰 듀오) 실시간 재고`,
    `${dom(code)} 애플스토어 매장 ${k}곳: iPhone Duo 실시간 재고`,
    `${cn(code)} Apple Store: iPhone 실시간 재고`,
  ], 70);
}

function homeTitle(code: CountryCode): string {
  const k = storesOf(code).length;
  return fitTitleW([
    `iPhone Duo(아이폰 듀오) 재고 확인 · 애플스토어 ${k}곳 15초마다`,
    `iPhone 재고 확인 · ${dom(code)} 애플스토어 ${k}곳 15초마다`,
    `iPhone 재고 확인 · 애플스토어 ${k}곳`,
  ]);
}

function homeH1(code: CountryCode): string {
  const k = storesOf(code).length;
  return k === 1 ? `${cn(code)}의 Apple Store iPhone 재고, 15초마다 확인` : `${dom(code)} Apple Store ${k}곳의 iPhone 재고, 15초마다 확인`;
}

function allStoresPhrase(code: CountryCode): string {
  const k = storesOf(code).length;
  return k === 1 ? `${cn(code)}의 Apple Store` : `${dom(code)} Apple Store ${n(k)}곳 전체`;
}

/** 매장이 있는 곳 한 줄: "서울 6곳 · 경기도 1곳" / "8개 시·도, 22개 도시". */
function spreadPhrase(code: CountryCode): string {
  const regions = statesWithStores(code);
  const cities = citiesWithStores(code);
  const stores = storesOf(code);
  if (stores.length === 1) return cityLabel(code, cities[0].name, L);
  if (cities.length === 1) return `모두 ${cityLabel(code, cities[0].name, L)}`;
  if (!COUNTRIES[code].regionNoun || regions.length === 1) {
    if (cities.length <= 4) return cities.map((x) => ({ name: cityLabel(code, x.name, L), k: stores.filter((s) => s.city === x.name).length })).sort((a, b) => b.k - a.k).map((x) => `${x.name} ${n(x.k)}곳`).join(" · ");
    return `${n(cities.length)}개 도시`;
  }
  if (regions.length <= 4) return regions.map((r) => ({ name: regionLabel(code, r.name, L), k: stores.filter((s) => s.state === r.name).length })).sort((a, b) => b.k - a.k).map((r) => `${r.name} ${n(r.k)}곳`).join(" · ");
  return `${n(regions.length)}개 ${regionWord(code)}, ${n(cities.length)}개 도시`;
}

function modelPageTitles(code: CountryCode, model: ModelKey): { title: string; h2: string[] } {
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const name = model === "duo" ? "iPhone Duo(아이폰 듀오)" : m.name;
  const all = k === 1 ? "Apple Store" : `애플스토어 ${k}곳`;
  return {
    title: fitTitleW([`${name} 재고: ${dom(code)} ${all} 실시간`, `${m.name} 재고: ${dom(code)} ${all} 실시간`, `${m.name} ${dom(code)} 재고`], 70),
    h2: [`내 주변 ${m.name}: 지금 재고 있는 ${dom(code)} 매장`, priceSection(code, dom(code), undefined, model).h2],
  };
}

function modelIntro(code: CountryCode, model: ModelKey, inStock: number): string {
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const r = priceRange(code, model);
  const p = code === "ca" ? `**세전 ${money(code, r.low)}**부터` : `**${money(code, r.low)}**부터(${taxNote(code)})`;
  const subj = `지금 ${eulReul(m.name)} 매장 픽업할 수 있는 ${dom(code)} Apple Store는`;
  return inStock === 0
    ? `${subj} **없어요**(${k === 1 ? "단 한 곳" : `${n(k)}곳 모두`}, **15초마다** 확인). 가격은 ${p}예요.`
    : `${subj} **${n(k)}곳 중 ${n(inStock)}곳**이에요(**15초마다** 확인). 가격은 ${p}예요.`;
}

function modelDescription(code: CountryCode, model: ModelKey, inStock: number): string {
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const r = priceRange(code, model);
  return fitTitleW([
    `${m.name} ${dom(code)} 재고 있을까? 지금 Apple Store ${n(k)}곳 중 ${n(inStock)}곳에서 픽업 가능. 매장·구성별 실시간 재고, ${money(code, r.low)}부터${code === "ca" ? "(세전)" : ""}, 재입고 시간까지.`,
    `${m.name} ${dom(code)} 재고: Apple Store ${n(k)}곳 중 ${n(inStock)}곳. 매장·구성별 실시간 픽업 재고, 재입고 시간, 알림.`,
  ], 155);
}

/* ------------------------------------------------------------------ 나라 홈 */

function homeDescription(code: CountryCode): string {
  const k = storesOf(code).length;
  const cur = COUNTRIES[code].currency === "KRW" ? "원화" : COUNTRIES[code].currency;
  return fitTitleW([
    `${allStoresPhrase(code)}의 iPhone Duo, 18 Pro, Pro Max 픽업 재고를 15초마다 확인. ${k === 1 ? "" : "재입고 시간, "}${cur} 가격, 내 매장 재입고 시 푸시 알림.`,
    `${allStoresPhrase(code)}의 iPhone 픽업 재고를 15초마다 확인. 재입고 시간, ${cur} 가격, 푸시 알림.`,
  ], 155);
}

function homeIntro(code: CountryCode): string {
  const k = storesOf(code).length;
  return `지금 iPhone Duo(아이폰 듀오)를 매장 픽업할 수 있는 ${dom(code)} Apple Store는 **${n(k)}곳 중 {{duo.storesNow}}곳**, iPhone 18 Pro는 **{{pro.storesNow}}곳**, iPhone 18 Pro Max는 **{{pm.storesNow}}곳**이에요.`;
}

function homeSections(i: HomeCopyInput): KeywordSection[] {
  const code = i.cc;
  const k = storesOf(code).length;
  const stores = storesOf(code);
  return [
    {
      id: "iphone-stock",
      h2: `${dom(code)} iPhone 재고 확인: Duo, 18 Pro, Pro Max 매장별`,
      lead: `PickupChecker는 ${allStoresPhrase(code)}에서 모든 구성의 apple.com 매장 픽업 가능 여부를 15초마다 읽고, 매장별${k > 1 ? `·${regionWord(code)}별` : ""}·구성별로 보여 줘요.`,
      blocks: [
        { t: "table", head: ["모델", "구성", "지금 재고 있는 매장", "기록된 재입고"], rows: cc.modelRows(code, i.storesNow, i.restocks), caption: `${dom(code)} 확인 범위, {{asOf}} 기준` },
        { t: "ul", items: [
          `**범위:** ${spreadPhrase(code)} · 가격과 부품 번호는 Apple ${dom(code)} 기준`,
          "**모든 매장 15초마다**, 알림을 건 매장은 5초마다",
          "**두 번 확인해야 인정:** apple.com의 일시적 오류 한 번이 가짜 재입고나 품절로 보이지 않아요",
          `**확인된 변화는 모두** [재입고 기록](${i.restocksPath})에 남고, ${i.index?.indexable ? `[매장 페이지](${i.index.path})` : "매장 페이지"}의 재입고 차트로 이어져요`,
        ] },
        { t: "img", id: "phone-notification" },
      ],
    },
    priceSection(code, dom(code)),
    {
      id: "alerts",
      h2: "애플스토어 재고 확인과 재입고 알림",
      lead: `확인은 무료예요. 돈을 내는 건 확인할 필요가 없어지는 부분이에요. 갈 수 있는 Apple Store와 정확한 iPhone을 고르면, ${k === 1 ? "매장" : "그중 한 곳"}에 매장 픽업 재고가 뜨고 몇 초 안에 휴대폰으로 푸시가 와요.`,
      blocks: [
        { t: "ol", items: [
          "**알림 받기**를 누르고 iPhone, 용량, 색상을 고르세요.",
          k === 1 ? `매장을 체크하세요: ${cityLabel(code, stores[0].city, L)}의 ${appleStoreLabel(stores[0], L)}.` : "갈 수 있는 매장을 체크하세요. 가까운 순으로, 도로 거리(km)와 운전 시간이 함께 나와요.",
          "iPhone에서는 PickupChecker를 홈 화면에 추가하고 알림을 허용하세요([설치 방법](/install)).",
          "푸시가 오면 거기서 apple.com을 열고, 그 매장의 매장 픽업으로 결제하세요.",
        ] },
        { t: "table", head: ["요금제", "가격(USD)", "알림"], rows: [["Plus", "$5 / 월", "10"], ["Pro", "$10 / 월", "20"], ["Max", "$20 / 월", "50"]], caption: "알림 하나 = 매장 하나 × 정확한 구성 하나 · 둘러보기는 무료([요금제](/pricing))" },
        { t: "note", text: "**저희 생각:** Duo는 갈 수 있는 모든 매장에 알림을 걸 만해요. 18 Pro와 Pro Max는 실시간 수치부터 먼저 보세요." },
        { t: "img", id: "apple-store-pickup-counter" },
      ],
    },
  ];
}

function homeFaq(code: CountryCode, rt: RestockTimesBrief): Faq[] {
  const k = storesOf(code).length;
  const p = code === "us" ? "" : `/${code}`;
  const when = rt.n === 0
    ? `11월 2일 추적을 시작한 뒤 아직 확인된 재입고가 없어요. [${dom(code)} iPhone Duo는 언제 재입고되나요?](${rt.path})에서 들어오는 대로 현지 시간·요일별로 세요.`
    : rt.peakHour != null
      ? `대부분 **현지 시간 ${hourLabel(rt.peakHour, L)} 전후**에 들어와요. 11월 2일 이후 매장 ${n(rt.storesTotal)}곳 중 ${n(rt.stores)}곳에서 확인된 재입고 ${n(rt.n)}회 기준이에요. [시간별·일별 보기](${rt.path}).`
      : `11월 2일 이후 매장 ${n(rt.storesTotal)}곳 중 ${n(rt.stores)}곳에서 확인된 재입고는 ${n(rt.n)}회예요. 날짜가 아직 적어 보통 시간대를 말하긴 일러요. [시간별·일별 보기](${rt.path}).`;
  return [
    { q: `지금 iPhone Duo 재고가 있는 ${dom(code)} Apple Store는 어디인가요?`, a: `마지막 확인({{asOf}}) 기준 ${n(k)}곳 중 {{duo.storesNow}}곳이에요. [${dom(code)} iPhone Duo 재고](${p}/stock/iphone-duo)에 매장과 구성별로 나오고, 15초마다 업데이트돼요.` },
    { q: `${dom(code)}에서 iPhone Duo는 언제 재입고되나요?`, a: when },
    { q: "알림은 얼마나 빠른가요?", a: `알림을 건 매장은 5초마다, ${dom(code)} 모든 Apple Store는 15초마다 확인해요. 처음 ‘재고 있음’이 보이면 1초 안에 한 번 더 확인해 Apple 쪽 오류가 알림이 되지 않게 하고, 그로부터 약 3초 뒤 휴대폰에 푸시가 와요.` },
    { q: "요금은 얼마인가요?", a: "실시간 재고, 지도, 재입고 기록은 무료예요. 알림은 Plus 월 $5에 10개, Pro $10에 20개, Max $20에 50개이고 미국 달러로 청구돼요. 언제든 해지할 수 있어요([요금제](/pricing))." },
    taxFaq(code, dom(code)),
    { q: "휴대폰을 대신 예약해 주나요?", a: `아니요. 매장에 뜨는 순간 알려 드리면 apple.com에서 매장 픽업으로 직접 구입하고, Apple이 보관해 줘요([Apple 픽업 안내](${pickupHelp(code).url})).` },
  ];
}

const homeLabels: Dict["place"]["home"] = {
  appName: (code: CountryCode) => `PickupChecker iPhone 재고 확인 · ${cn(code)}`,
  offer: "실시간 재고, 지도, 재입고 기록은 무료, 알림은 월 $5부터",
  itemList: (code: CountryCode) => `${cn(code)} Apple Store`,
  restockTimesChip: "재입고 시간",
  storesByRegion: (code: CountryCode) => `${regionWord(code)}별 매장`,
  browse: (code: CountryCode) => `${dom(code)} 재고 둘러보기`,
  selloutH2: (code: CountryCode) => `${dom(code)} iPhone 재입고는 얼마나 빨리 품절되나요?`,
  selloutLabel: (code: CountryCode) => `${dom(code)} Apple Store`,
  last24Label: (code: CountryCode) => dom(code),
  newsroom: "Apple Newsroom: iPhone Duo, 전 세계 Apple Store 출시(2026년 10월 23일)",
};

/** 매장 페이지 <title>·H1: "Apple 가로수길: 오늘 iPhone 재고·매장 픽업·영업시간" (도시의 유일한 매장이면 괄호에 도시). */
function storeTitle(s: Store, region?: string): string {
  return enStoreTitle(s, undefined, undefined, region, L);
}

export const place: Dict["place"] = {
  sinceWhen,
  placeLabel,
  whenIn,
  taxSentence,
  priceSection,
  taxFaq,
  placeTitle,
  placeDescription,
  placeIntro,
  placeSections,
  storesIndexTitle,
  homeTitle,
  homeH1,
  allStoresPhrase,
  spreadPhrase,
  modelPageTitles,
  modelIntro,
  modelDescription,
  modelRows: cc.modelRows,
  homeDescription,
  homeIntro,
  homeSections,
  homeFaq,
  home: homeLabels,
  storeTitle,
  sources: (code: Exclude<CountryCode, "us">) => ({ pickupHelp: helpSource(code), storeList: { label: `Apple: 매장 목록(${cn(code)})`, url: storeListSource(code).url }, tax: taxSource(code) }),
};

