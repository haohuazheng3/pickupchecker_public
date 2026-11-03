/**
 * 台灣中文：place —— 各國頁面樹（首頁、門市索引、地區、城市、機型頁）的文案產生器，以台灣（tw）為主。
 * 與英文 lib/seo/countryCopy.ts 同樣的參數與回傳形狀；句子依即時數字組成。關鍵字：iPhone Duo、現貨查詢、
 * Apple 直營店、門市取貨、價格（Google Ads 台灣：iphone duo 33,100、apple 直營店 8,100、iphone duo 價格 1,900、
 * iphone 現貨 查詢 170）。地名參數多半是英文資料，這裡一律用 places.ts 換成 Apple 台灣的寫法。
 */
import * as cc from "@/lib/seo/countryCopy";
import type { HomeCopyInput, IntlPlaceInput, RestockTimesBrief } from "@/lib/seo/countryCopy";
import { CA_PROVINCE_TAX, CA_TAX_SOURCE, TAX_SOURCES, beforeTax, includedRate, pickupHelp, storeListSource, withProvinceTax } from "@/content/country-tax";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { catalogFor, citiesWithStores, modelByKey, statesWithStores, storesOf, type ModelKey, type Store } from "@/lib/apple/catalog";
import { alertHref, fmtDuration, type FaqItem } from "@/lib/seo/enrich";
import type { Block, Faq, Source } from "@/lib/content/types";
import type { KeywordSection } from "@/components/content/KeywordSections";
import { fitTitleW, list, price } from "../../format";
import { appleStoreLabel, cityLabel, regionLabel, storeLabel } from "../../places";
import type { Dict } from "../en";
import { content } from "./content";
import { L, cn, currencyZh, hh, n, regionZh, stampZh, taxName, taxNoteZh, zhCfg, zoneName, zs } from "./util";

const money = (c: Country, v: number) => price(L, c, v);
const TRACKING_START = "2026-11-02";

/** 「自 11 月 2 日開始追蹤以來」／「最近 30 天」。 */
function sinceWhen(now = Date.now()): string {
  return now - Date.parse(`${TRACKING_START}T00:00:00Z`) < 30 * 86400_000 ? "自 11 月 2 日開始追蹤以來" : "最近 30 天";
}

/** 地名參數（英文資料或已是中文）→ Apple 台灣的寫法。 */
const placeOf = (i: IntlPlaceInput) => (i.kind === "city" ? cityLabel(i.cc, i.name, L) : regionLabel(i.cc, i.name, L));

/** 「11 月 3 日 上午 10:31（台北標準時間）」。 */
function whenIn(code: CountryCode, iso: string | Date): string {
  const tz = COUNTRIES[code].timeZone;
  return `${stampZh(iso, tz)}（${zoneName(tz, iso)}）`;
}

/* ------------------------------------------------------------------ 稅與價格 */

function taxSentence(code: CountryCode, region?: string): string {
  const c = COUNTRIES[code];
  const duo = cc.priceOf(code, "duo");
  if (duo == null) return "";
  if (code === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    if (t) return zs(`256GB 的 iPhone Duo 在 Apple 加拿大官網售價 ${money(c, duo)}，未含稅；加上${region}的 ${t.rate}% ${CA_PROVINCE_TAX[region!].label}，約為 ${money(c, t.total)}。`);
    return zs(`256GB 的 iPhone Duo 在 Apple 加拿大官網售價 ${money(c, duo)}，未含稅：依門市所在省份另加 5% 到 15% 的稅。`);
  }
  const r = includedRate(c);
  if (r == null) return zs(`256GB 的 iPhone Duo 售價 ${money(c, duo)}，香港不收銷售稅，取貨時付的就是這個價格。`);
  return zs(`256GB 的 iPhone Duo 在${cn(code)}售價 ${money(c, duo)}，已含 ${r}% ${taxName(code)}：apple.com 上的價格就是取貨時付的價格。`);
}

const PRICE_ROWS: [ModelKey, string][] = [["duo", "256GB"], ["duo", "1TB"], ["18-pro-max", "256GB"], ["18-pro-max", "1TB"], ["18-pro", "256GB"]];

/** 各國的稅務來源；台灣指向財政部賦稅署中文網站。 */
function taxSource(code: Exclude<CountryCode, "us">): Source {
  return code === "tw" ? { label: "財政部賦稅署：營業稅", url: "https://www.dot.gov.tw/" } : TAX_SOURCES[code];
}

function priceSection(code: CountryCode, placeName: string, region?: string, model: ModelKey = "duo"): KeywordSection {
  const c = COUNTRIES[code];
  const m = modelByKey(model)!;
  const base = cc.priceOf(code, model) ?? 0;
  const src: Source = code === "us" ? { label: "apple.com", url: "https://www.apple.com/shop/buy-iphone" } : taxSource(code);
  const rows: [string, number][] = PRICE_ROWS.flatMap(([k, st]) => { const p = cc.priceOf(code, k, st); return p == null ? [] : [[`${modelByKey(k)!.name} ${st}`, p] as [string, number]]; });
  if (code === "ca") {
    const t = region ? CA_PROVINCE_TAX[region] : undefined;
    if (t) {
      return {
        id: "price-with-tax",
        h2: zs(`${m.name} 在${placeName}含稅多少錢？`),
        lead: zs(`${m.name} 256GB **未稅 ${money(c, base)}**；加上${region}的 ${t.total}% ${t.label}，在${placeName}的門市取貨約 **${money(c, withProvinceTax(base, region!)!.total)}**。`),
        blocks: [
          { t: "note", text: "**稅率依取貨地點計算：**看的是門市所在的省份，不是你的住址。" },
          { t: "table", head: ["iPhone", "apple.com 價格", `含 ${t.total}% ${t.label}`], rows: rows.map(([label, p]) => [label, money(c, p), money(c, withProvinceTax(p, region!)!.total)]), caption: zs(`${region}：Apple 加拿大售價加上 ${t.label}（${t.total}%）`), source: `[${CA_TAX_SOURCE.label}](${CA_TAX_SOURCE.url})；價格取自 apple.com/ca` },
        ],
      };
    }
    const provinces = Object.keys(CA_PROVINCE_TAX).filter((p) => storesOf("ca").some((s) => s.state === p));
    const cheapest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total < CA_PROVINCE_TAX[a].total ? b : a));
    const dearest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total > CA_PROVINCE_TAX[a].total ? b : a));
    return {
      id: "price-with-tax",
      h2: zs(`${m.name} 在加拿大含稅多少錢？各省一覽`),
      lead: zs(`${m.name} 256GB 的 Apple 售價 **${money(c, base)}** 未含稅；稅由取貨門市所在省份加上，從${cheapest}的 **${money(c, withProvinceTax(base, cheapest)!.total)}**（${CA_PROVINCE_TAX[cheapest].total}%）到${dearest}的 **${money(c, withProvinceTax(base, dearest)!.total)}**（${CA_PROVINCE_TAX[dearest].total}%）。`),
      blocks: [{
        t: "table",
        head: ["省份", "稅", "稅率", `${m.short} 256GB 含稅`],
        rows: provinces.map((p) => [p, CA_PROVINCE_TAX[p].label, `${CA_PROVINCE_TAX[p].total}%`, money(c, withProvinceTax(base, p)!.total)]),
        caption: "有 Apple 直營店的省份：門市取貨的銷售稅",
        source: `[${CA_TAX_SOURCE.label}](${CA_TAX_SOURCE.url})；價格取自 apple.com/ca`,
      }],
    };
  }
  const r = includedRate(c);
  const tn = taxName(code);
  return {
    id: "price",
    h2: zs(`${m.name} ${cn(code)}價格多少？${money(c, base)} 起，${taxNoteZh(c)}`),
    lead: r == null
      ? zs(`${m.name} 256GB 在 apple.com 售價 **${money(c, base)}**，就是在${placeName}取貨時付的價格：香港**不收銷售稅**，也沒有加值稅。`)
      : zs(`${m.name} 256GB 在 apple.com ${cn(code)}售價 **${money(c, base)}**，**已含 ${r}% ${tn}**（未稅 ${money(c, beforeTax(c, base))}），在${placeName}門市取貨不會再加任何費用。`),
    blocks: [{
      t: "table",
      head: r == null ? ["iPhone", "apple.com 價格"] : ["iPhone", "apple.com 價格", `未稅（扣除 ${r}% ${tn}）`],
      rows: rows.map(([label, p]) => (r == null ? [label, money(c, p)] : [label, money(c, p), money(c, beforeTax(c, p))])),
      caption: zs(`Apple ${cn(code)}官網售價${r == null ? "" : `，已含${tn}`}`),
      source: `[${src.label}](${src.url})；價格取自 apple.com/${c.buyPath ?? c.shopPath}`,
    }],
  };
}

function taxFaq(code: CountryCode, placeName: string, region?: string): FaqItem {
  const c = COUNTRIES[code];
  const duo = cc.priceOf(code, "duo") ?? 0;
  if (code === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    return t
      ? { q: zs(`在${placeName}買 iPhone Duo 含稅多少錢？`), a: zs(`256GB 約 ${money(c, t.total)}：Apple 售價 ${money(c, duo)} 加上${region}的 ${t.rate}% ${CA_PROVINCE_TAX[region!].label}，依取貨地點計稅。`) }
      : { q: "Apple 加拿大的價格含稅嗎？", a: zs(`不含。256GB 的 iPhone Duo 未稅 ${money(c, duo)}；GST、HST 或省銷售稅依門市所在省份另加，從 Alberta 的 5% 到 Quebec 的 14.975%。`) };
  }
  const r = includedRate(c);
  return r == null
    ? { q: "在香港買 iPhone 要付銷售稅嗎？", a: zs(`不用。香港沒有銷售稅也沒有加值稅，256GB 的 iPhone Duo 取貨時就是 ${money(c, duo)}，和 apple.com 價格一樣。`) }
    : { q: zs(`apple.com ${cn(code)}的價格含${taxName(code)}嗎？`), a: zs(`含。256GB 的 iPhone Duo 售價 ${money(c, duo)}，已含 ${r}% ${taxName(code)}；到門市取貨時不會再加收任何費用。`) };
}

/* ------------------------------------------------------------------ 地區、城市頁 */

function placeTitle(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = placeOf(i);
  return fitTitleW([
    `${w} Apple 直營店 iPhone Duo 即時現貨：${k === 2 ? "兩家" : `${n(k)} 家`}一次看`,
    `${w} Apple 直營店 iPhone Duo 即時現貨`,
    `${w} Apple 直營店 iPhone 現貨`,
    `${w} Apple 直營店`,
  ].map(zs));
}

function priceBit(code: CountryCode, region?: string): string {
  const c = COUNTRIES[code];
  const duo = cc.priceOf(code, "duo");
  if (duo == null) return "";
  if (code === "ca") { const t = region ? withProvinceTax(duo, region) : null; return t ? `、${region}含稅約 ${money(c, t.total)}` : `、未稅 ${money(c, duo)} 起`; }
  return `、價格 ${money(c, duo)} 起（${taxNoteZh(c)}）`;
}

function placeDescription(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = placeOf(i);
  return fitTitleW([
    `${w}共 ${n(k)} 家 Apple 直營店：現在 ${n(i.stockNow.duo)} 家可門市取貨 iPhone Duo、${n(i.stockNow["18-pro-max"])} 家有 18 Pro Max。各門市即時現貨、補貨時段${priceBit(i.cc, i.region)}。`,
    `${w}共 ${n(k)} 家 Apple 直營店：現在 ${n(i.stockNow.duo)} 家有 iPhone Duo、${n(i.stockNow["18-pro-max"])} 家有 18 Pro Max。各門市即時現貨與補貨時段。`,
  ].map(zs), 155);
}

function placeIntro(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? `，分布在 ${n(i.cities)} 個城市` : "";
  return zs(`**${placeOf(i)}共 ${n(k)} 家 Apple 直營店**${cities}：現在 **${n(i.stockNow.duo)}** 家可門市取貨 iPhone Duo、**${n(i.stockNow["18-pro-max"])}** 家有 18 Pro Max、**${n(i.stockNow["18-pro"])}** 家有 18 Pro。`);
}

/** Duo 區塊的答案句：哪幾家現在有。 */
function duoLead(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const have = cc.duoStoresNow(i);
  const st = i.duo;
  if (have.length > 0) return zs(`**${n(k)} 家中有 ${n(have.length)} 家**現在可門市取貨 iPhone Duo：${list(L, have.map((s) => appleStoreLabel(s, L)), 4, (x) => `另外 ${n(x)} 家`)}。`);
  if (st.month > 0) return zs(`**${n(k)} 家門市現在都沒有** iPhone Duo，但${sinceWhen()}已經補貨 **${n(st.month)} 次**。`);
  return zs(`**${n(k)} 家門市現在都沒有** iPhone Duo，${sinceWhen()}也還沒有任何一家記錄到 Duo 補貨。`);
}

function duoPoints(i: IntlPlaceInput, w: string, alert: string): Block[] {
  const k = i.stores.length;
  const have = cc.duoStoresNow(i);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const items: string[] = [];
  if (have.length > 0 && st.month > 0) items.push(`**${sinceWhen()}：**這裡的門市共補貨 Duo ${n(st.month)} 次`);
  if (st.lastRestock && last) items.push(`**上次補貨：**${whenIn(i.cc, st.lastRestock.at)}，${appleStoreLabel(last, L)}`);
  if (st.medianMs != null) items.push(`**一般上架時間：**補貨的 Duo 大約維持 ${fmtDuration(st.medianMs, L)}（中位數）`);
  items.push(`**最快的方法：**[在${w}設定 iPhone Duo 補貨通知](${alert})，${k <= 3 ? (k === 1 ? "設在這家門市" : k === 2 ? "兩家都設" : "三家都設") : `設在你到得了、最近的 ${n(Math.min(k, 5))} 家`}`);
  items.push("**一則通知** = 一家門市 × 一種規格；門市一上架，推播幾秒內就到");
  const blocks: Block[] = [];
  if (have.length === 0 && st.month === 0) blocks.push({ t: "note", text: "**一分鐘內就可能改變：**最快買到的方法是設通知，不是一直刷 apple.com。" });
  blocks.push({ t: "ul", items: items.map(zs) });
  return blocks;
}

function placeSections(i: IntlPlaceInput): KeywordSection[] {
  const k = i.stores.length;
  const w = placeOf(i);
  const alert = alertHref({ model: "duo", state: i.regionSlug, city: i.kind === "city" ? i.citySlug : undefined, country: i.cc });
  const scarce = cc.scarcest(i, "18-pro-max");
  const pm = catalogFor("18-pro-max", i.cc).length;
  return [
    {
      id: "iphone-duo",
      h2: zs(`${w}哪幾家 Apple 直營店現在有 iPhone Duo？`),
      lead: duoLead(i),
      blocks: duoPoints(i, w, alert),
    },
    {
      id: "iphone-18-pro-max",
      h2: zs(`${w} iPhone 18 Pro Max 現貨：各門市庫存`),
      lead: zs(`**${n(k)} 家中有 ${n(i.stockNow["18-pro-max"])} 家**有 iPhone 18 Pro Max；${w}共 ${n(k * pm)} 個「門市 × 規格」組合中，**${cc.pairsPct(i, "18-pro-max")}%** 有現貨。`),
      blocks: [{ t: "ul", items: [
        ...(scarce.length ? [`**目前最缺：**${list(L, scarce.map((x) => `${zhCfg(x.label)}（${n(k)} 家中 ${n(x.stores)} 家有）`))}`] : []),
        `**iPhone 18 Pro：**${n(k)} 家中 ${n(i.stockNow["18-pro"])} 家有貨，${cc.pairsPct(i, "18-pro")}% 的組合有現貨`,
        `**${sinceWhen()}：**${i.max.month ? `18 Pro Max 補貨 ${n(i.max.month)} 次` : "還沒有 18 Pro Max 補貨"}`,
        ...(i.max.medianMs != null ? [`**一般上架時間：**補貨的 Pro Max 大約維持 ${fmtDuration(i.max.medianMs, L)}（中位數）`] : []),
      ].map(zs) }],
    },
    priceSection(i.cc, w, i.cc === "ca" ? i.region : undefined),
  ];
}

/* ------------------------------------------------------------------ 國家：門市索引與首頁 */

/** 店名（不含 Apple）：「台北 101」。 */
const shortName = (s: Store) => storeLabel(s, L);

function storesIndexTitle(code: CountryCode): string {
  const stores = storesOf(code);
  const k = stores.length;
  const w = cn(code);
  return fitTitleW([
    k <= 3 ? `${w} Apple 直營店 iPhone 現貨：${stores.map(shortName).join("、")}` : `${w}全部 ${n(k)} 家 Apple 直營店：iPhone Duo 即時現貨`,
    `${w} Apple 直營店：iPhone Duo 即時現貨`,
    `${w} Apple 直營店 iPhone 現貨`,
  ].map(zs), 70);
}

function homeTitle(code: CountryCode): string {
  const k = storesOf(code).length;
  const w = cn(code);
  return fitTitleW([
    `iPhone Duo 現貨查詢：${w} Apple 直營店庫存，每 15 秒更新`,
    `${w} iPhone 現貨查詢：${n(k)} 家 Apple 直營店，每 15 秒更新`,
    `${w} iPhone 現貨查詢`,
  ].map(zs));
}

function homeH1(code: CountryCode): string {
  const k = storesOf(code).length;
  const w = cn(code);
  return zs(k === 1 ? `${w}唯一 Apple 直營店的 iPhone 現貨查詢` : `${w}${k === 2 ? "兩家" : `全部 ${n(k)} 家`} Apple 直營店的 iPhone 現貨查詢`);
}

function allStoresPhrase(code: CountryCode): string {
  const k = storesOf(code).length;
  return zs(k === 1 ? `${cn(code)}唯一的 Apple 直營店` : `${cn(code)}全部 ${n(k)} 家 Apple 直營店`);
}

function spreadPhrase(code: CountryCode): string {
  const c = COUNTRIES[code];
  const regions = statesWithStores(code);
  const cities = citiesWithStores(code);
  const k = storesOf(code).length;
  const city = (x: string) => cityLabel(code, x, L);
  if (k === 1) return `位於${city(cities[0].name)}`;
  if (cities.length === 1) return `都在${city(cities[0].name)}`;
  if (!c.regionNoun || regions.length === 1) return `分布在 ${n(cities.length)} 個城市`;
  return `分布在 ${n(regions.length)} 個${regionZh(c)}的 ${n(cities.length)} 個城市`;
}

function modelPageTitles(code: CountryCode, model: ModelKey): { title: string; h2: string[] } {
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const w = cn(code);
  const all = k === 1 ? "Apple 直營店" : k === 2 ? "兩家 Apple 直營店" : `全部 ${n(k)} 家 Apple 直營店`;
  return {
    title: fitTitleW([`${m.name} ${w}現貨與價格：${all}即時庫存`, `${m.name} ${w}現貨與價格`, `${m.name} ${w}現貨`].map(zs), 70),
    h2: [zs(`我附近哪家有 ${m.name}？${w}現在有貨的門市`), priceSection(code, w, undefined, model).h2],
  };
}

function modelIntro(code: CountryCode, model: ModelKey, inStock: number): string {
  const c = COUNTRIES[code];
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const w = cn(code);
  const r = cc.priceRange(code, model);
  const p = code === "ca" ? `**${money(c, r.low)}** 起（未稅）` : `**${money(c, r.low)}** 起（${taxNoteZh(c)}）`;
  const head = inStock === 0
    ? (k === 1 ? `${w}唯一的 Apple 直營店現在**沒有** ${m.name} 可門市取貨` : `${w}的 ${n(k)} 家 Apple 直營店現在**都沒有** ${m.name} 可門市取貨`)
    : `${w} ${n(k)} 家 Apple 直營店中，現在有 **${n(inStock)} 家**可門市取貨 ${m.name}`;
  return zs(`${head}（**每 15 秒**檢查一次）；售價 ${p}。`);
}

function modelDescription(code: CountryCode, model: ModelKey, inStock: number): string {
  const c = COUNTRIES[code];
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const w = cn(code);
  const r = cc.priceRange(code, model);
  return fitTitleW([
    `${w}有 ${m.name} 現貨嗎？${n(k)} 家 Apple 直營店中現在 ${n(inStock)} 家可門市取貨。依門市與規格即時更新，售價 ${money(c, r.low)} 起${code === "ca" ? "（未稅）" : ""}，附補貨時段。`,
    `${m.name} ${w}現貨：${n(k)} 家 Apple 直營店中現在 ${n(inStock)} 家有貨。各門市、各規格即時現貨、補貨時段與通知。`,
  ].map(zs), 155);
}

function homeDescription(code: CountryCode): string {
  const c = COUNTRIES[code];
  const k = storesOf(code).length;
  return zs(`每 15 秒即時查詢${allStoresPhrase(code)}的 iPhone Duo、18 Pro 與 18 Pro Max 門市取貨現貨。${k === 1 ? "價格" : "補貨時段與價格"}以${currencyZh(c)}顯示；你的門市一補貨，馬上推播通知你。`);
}

function homeIntro(code: CountryCode): string {
  const k = storesOf(code).length;
  const w = cn(code);
  if (k === 1) return zs(`${w}唯一的 Apple 直營店現在的門市取貨現貨：iPhone Duo **{{duo.storesNow}} / 1**、iPhone 18 Pro **{{pro.storesNow}} / 1**、iPhone 18 Pro Max **{{pm.storesNow}} / 1**（1 = 有貨）。`);
  return zs(`現在${w} ${n(k)} 家 Apple 直營店中，有 **{{duo.storesNow}} 家**可門市取貨 iPhone Duo，iPhone 18 Pro **{{pro.storesNow}} 家**、iPhone 18 Pro Max **{{pm.storesNow}} 家**。`);
}

function homeSections(i: HomeCopyInput): KeywordSection[] {
  const code = i.cc;
  const c = COUNTRIES[code];
  const w = cn(code);
  const stores = storesOf(code);
  const k = stores.length;
  return [
    {
      id: "iphone-stock",
      h2: zs(`${w} iPhone 現貨查詢：Duo、18 Pro 與 Pro Max 各門市庫存`),
      lead: zs(`PickupChecker 每 15 秒讀取一次 apple.com 上${allStoresPhrase(code)}每一種規格的門市取貨供應情況，依門市${k > 1 ? `、${regionZh(c)}` : ""}與規格整理。`),
      blocks: [
        { t: "table", head: ["機型", "規格數", "現在有貨的門市", "已記錄補貨"], rows: cc.modelRows(code, i.storesNow, i.restocks), caption: zs(`${w}的檢查範圍，截至 {{asOf}}`) },
        { t: "ul", items: [
          `**涵蓋範圍：**${allStoresPhrase(code)}，${spreadPhrase(code)} · 價格與零件編號都採用 Apple ${w}官網`,
          "**每家門市每 15 秒**檢查一次，你設定通知的門市每 5 秒一次",
          "**兩次檢查才算數：**apple.com 偶發的錯誤回應，絕不會變成假補貨或假售完",
          `**每次確認的變化**都寫進[補貨紀錄](${i.restocksPath})，也就是${i.index?.indexable ? `[門市頁面](${i.index.path})` : "門市頁面"}上補貨圖表的資料來源`,
        ].map(zs) },
        { t: "img", id: "phone-notification" },
      ],
    },
    priceSection(code, w),
    {
      id: "alerts",
      h2: zs(`${w} Apple 直營店庫存查詢與補貨通知`),
      lead: zs(`查詢免費；付費買的是「不用一直查」。選好你到得了的 Apple 直營店和確切的手機規格，${k === 1 ? "門市" : "任何一家"}只要一上架門市取貨，你的手機幾秒內就會收到推播。`),
      blocks: [
        { t: "ol", items: [
          "點 **通知我**，選擇 iPhone、容量與顏色。",
          k === 1 ? `勾選門市：${cityLabel(code, stores[0].city, L)}的 ${appleStoreLabel(stores[0], L)}。` : "勾選你到得了的門市；最近的排在最前面，附道路距離（公里）與車程。",
          "在 iPhone 上，把 PickupChecker 加入主畫面並允許通知（[安裝方式](/install)）。",
          "收到推播後，直接從推播打開 apple.com，結帳時選擇在那家門市取貨。",
        ].map(zs) },
        { t: "table", head: ["方案", "價格（美元）", "通知數"], rows: [["Plus", "$5 / 月", "10"], ["Pro", "$10 / 月", "20"], ["Max", "$20 / 月", "50"]], caption: "一則通知 = 一家門市 × 一種規格 · 瀏覽免費（[價格方案](/pricing)）" },
        { t: "note", text: zs("**我們的看法：**Duo 值得在你到得了的每一家門市都設通知；18 Pro 和 Pro Max 先看即時數字再決定。") },
        { t: "img", id: "apple-store-pickup-counter" },
      ],
    },
  ];
}

function homeFaq(code: CountryCode, rt: RestockTimesBrief): Faq[] {
  const k = storesOf(code).length;
  const w = cn(code);
  const p = code === "us" ? "" : `/${code}`;
  const when = rt.n === 0
    ? `自 11 月 2 日開始追蹤以來，還沒有確認的補貨。[Apple 什麼時候在${w}補貨 iPhone Duo？](${rt.path})會依當地小時與日期逐次記錄。`
    : rt.peakHour != null
      ? `大多落在**當地時間${hh(rt.peakHour)}**前後：自 11 月 2 日起，${n(rt.storesTotal)} 家門市中有 ${n(rt.stores)} 家共確認補貨 ${n(rt.n)} 次。[逐小時、逐日看](${rt.path})。`
      : `自 11 月 2 日起，${n(rt.storesTotal)} 家門市中有 ${n(rt.stores)} 家共確認補貨 ${n(rt.n)} 次，但天數還太少，說不出通常幾點。[逐小時、逐日看](${rt.path})。`;
  return [
    { q: zs(`${w}哪些 Apple 直營店現在有 iPhone Duo？`), a: zs(`上次檢查（{{asOf}}）時，${n(k)} 家中有 {{duo.storesNow}} 家。[${w} iPhone Duo 現貨](${p}/stock/iphone-duo)列出每家門市與規格，每 15 秒更新。`) },
    { q: zs(`Apple 什麼時候在${w}補貨 iPhone Duo？`), a: zs(when) },
    { q: "通知有多快？", a: zs(`你設定通知的門市每 5 秒檢查一次，${w}每家 Apple 直營店每 15 秒一次。第一次出現「有貨」時，一秒內會再確認一次，Apple 的偶發錯誤不會變成通知；確認後約 3 秒，推播就到你的手機。`) },
    { q: "要多少錢？", a: zs("即時現貨、地圖與補貨紀錄都免費。通知方案：Plus 每月 $5 可設 10 則、Pro $10 可設 20 則、Max $20 可設 50 則，以美元計費；隨時可取消（[價格方案](/pricing)）。") },
    taxFaq(code, w),
    { q: "可以幫我保留手機嗎？", a: zs(`不行。我們會在門市上架的那一刻通知你；你在 apple.com 下單並選擇門市取貨，Apple 就會替你保留（[Apple 取貨說明](${pickupHelp(code).url})）。`) },
  ];
}

const homeLabels: Dict["place"]["home"] = {
  appName: (code: CountryCode) => zs(`PickupChecker ${cn(code)} iPhone 現貨查詢`),
  offer: zs("即時現貨、地圖與補貨紀錄免費；通知每月 $5 起"),
  itemList: (code: CountryCode) => zs(`${cn(code)}的 Apple 直營店`),
  restockTimesChip: "什麼時候補貨",
  storesByRegion: (code: CountryCode) => `依${regionZh(code)}看門市`,
  browse: (code: CountryCode) => `瀏覽${cn(code)}現貨`,
  selloutH2: (code: CountryCode) => zs(`${cn(code)}的 iPhone 補貨多快賣完？`),
  selloutLabel: (code: CountryCode) => zs(`${cn(code)} Apple 直營店`),
  last24Label: (code: CountryCode) => cn(code),
  newsroom: "Apple Newsroom：iPhone Duo 抵達全球 Apple 直營店（2026 年 10 月 23 日）",
};

/** 門市頁的 <title> 與 H1：「Apple 信義 A13：iPhone 現貨查詢、庫存、門市取貨與營業時間」。 */
function storeTitle(s: Store, region?: string): string {
  const name = appleStoreLabel(s, L);
  const shown = region && !name.toLowerCase().includes(region.toLowerCase()) ? region : null;
  return fitTitleW(content.titles.store(name, shown).map(zs));
}

function sources(code: Exclude<CountryCode, "us">): { pickupHelp: Source; storeList: Source; tax: Source } {
  const w = cn(code);
  return {
    pickupHelp: { label: zs(`Apple ${w}：送貨與取貨說明（取貨時要帶什麼）`), url: pickupHelp(code).url },
    storeList: { label: zs(`Apple ${w}：直營店列表`), url: storeListSource(code).url },
    tax: taxSource(code),
  };
}

export const place: Dict["place"] = {
  sinceWhen,
  /** 中文地名不會和美國地名撞名，原樣使用。 */
  placeLabel: (_code: CountryCode, name: string) => name,
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
  sources,
};
