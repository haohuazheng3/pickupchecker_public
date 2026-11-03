/**
 * 繁體中文（香港）: place — the copy builders of a country's page tree (English: lib/seo/countryCopy.ts), written for
 * Hong Kong readers. Keywords (Google Ads, Hong Kong, monthly): iphone duo 18,100 · apple 廣東道 9,900 · apple ifc
 * 9,900 · apple apm 2,400 · apple store 香港 1,900 · iphone duo 價錢 590 · iphone 18 pro max 現貨 260 · apple 又一城
 * 260 · apple store 沙田 260 · iphone 現貨 210 · apple 銅鑼灣 210 · iphone duo 香港 140. Hong Kong has no sales tax.
 */
import type { Dict } from "../en";
import { INTL_TRACKING_SINCE, duoStoresNow, modelRows, pairsPct, priceOf, priceRange, scarcest, type HomeCopyInput, type IntlPlaceInput, type RestockTimesBrief } from "@/lib/seo/countryCopy";
import { CA_PROVINCE_TAX, TAX_SOURCES, beforeTax, includedRate, pickupHelp, storeListSource, withProvinceTax } from "@/content/country-tax";
import { catalogFor, citiesWithStores, modelByKey, statesWithStores, storesOf, type ModelKey, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { alertHref, fmtDuration, listWords, type FaqItem } from "@/lib/seo/enrich";
import { price } from "@/lib/i18n/format";
import { cityLabel } from "@/lib/i18n/places";
import type { KeywordSection } from "@/components/content/KeywordSections";
import type { Block, Faq, Source } from "@/lib/content/types";
import { CURRENCY, HK_TITLE, L, apple, cityNoun, cn, fitW, hr, n, rn, taxNameZh, taxNoteZh, zhCfg, zhPlace, zoneStampZh } from "./common";

type NonUs = Exclude<CountryCode, "us">;
const money = (cc: CountryCode, v: number) => price(L, COUNTRIES[cc], v);
const lw = (items: string[], max = 6) => listWords(items, max, L);

/** "自11月2日開始追蹤以來" while the 30-day window still reaches back to the start, else "過去 30 日". */
function sinceWhen(now = Date.now()): string {
  return now - Date.parse(`${INTL_TRACKING_SINCE}T00:00:00Z`) < 30 * 86400_000 ? "自11月2日開始追蹤以來" : "過去 30 日";
}

/** The official pages behind a country's lines, in Chinese where the source has a Chinese page (Hong Kong). */
function sources(code: NonUs): { pickupHelp: Source; storeList: Source; tax: Source } {
  if (code === "hk") return {
    pickupHelp: { label: "Apple：付運及送遞 · Apple Store 提取服務（香港）（提取時要帶甚麼）", url: "https://www.apple.com/hk-zh/shop/help/shipping_delivery" },
    storeList: { label: "Apple：零售店列表（香港）", url: "https://www.apple.com/hk/retail/storelist/" },
    tax: { label: "香港稅務局：稅務資料（香港徵收的稅項）", url: "https://www.ird.gov.hk/chi/tax/index.htm" },
  };
  return { pickupHelp: pickupHelp(code), storeList: storeListSource(code), tax: TAX_SOURCES[code] };
}

/* ------------------------------------------------------------------ tax */

function taxSentence(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    if (t) return `256GB iPhone Duo 的 Apple 標價 ${money(cc, duo)} 未連稅；加上${zhPlace(cc, region!)}的 ${n(t.rate)}% ${CA_PROVINCE_TAX[region!].label}，約為 ${money(cc, t.total)}。`;
    return `256GB iPhone Duo 的 Apple 標價 ${money(cc, duo)} 未連稅：視乎分店所在省份，另加 5% 至 15%。`;
  }
  const r = includedRate(c);
  if (r == null) return `256GB iPhone Duo 售 ${money(cc, duo)}；香港不設銷售稅，取貨時付的就是這個價。`;
  return `256GB iPhone Duo 在${cn(cc)}售 ${money(cc, duo)}，已含 ${r}% ${taxNameZh(c)}：apple.com 的標價就是取貨時付的價錢。`;
}

const PRICE_ROWS: [ModelKey, string][] = [["duo", "256GB"], ["duo", "1TB"], ["18-pro-max", "256GB"], ["18-pro-max", "1TB"], ["18-pro", "256GB"]];

function priceSection(cc: CountryCode, placeName: string, region?: string, model: ModelKey = "duo"): KeywordSection {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const base = priceOf(cc, model) ?? 0;
  const place = zhPlace(cc, placeName);
  const src = sources(cc as NonUs).tax;
  const shopPath = cc === "hk" ? "hk-zh" : (c.buyPath ?? c.shopPath);
  const rows: [string, number][] = PRICE_ROWS.flatMap(([k, st]) => { const p = priceOf(cc, k, st); return p == null ? [] : [[`${modelByKey(k)!.name} ${st}`, p] as [string, number]]; });
  if (cc === "ca") {
    const t = region ? CA_PROVINCE_TAX[region] : undefined;
    if (t) {
      const prov = zhPlace(cc, region!);
      const table: Block = {
        t: "table",
        head: ["iPhone", "apple.com 價錢", `連 ${n(t.total)}% ${t.label}`],
        rows: rows.map(([label, p]) => [label, money(cc, p), money(cc, withProvinceTax(p, region!)!.total)]),
        caption: `${prov}：Apple 加拿大定價加上 ${t.label}（${n(t.total)}%）`,
        source: `[${src.label}](${src.url})；價錢取自 apple.com/ca`,
      };
      const parts = t.hst ? `${n(t.hst)}% HST` : t.pst ? `${t.gst}% GST 及 ${n(t.pst)}% ${t.label.split(" + ")[1]}` : `${t.gst}% GST（不設省銷售稅）`;
      return {
        id: "price-with-tax",
        h2: `${m.name} 在${place}連銷售稅的價錢`,
        lead: `256GB ${m.name} **未連稅 ${money(cc, base)}**；加上${prov}的 ${parts}，在${place}的分店取貨約為 **${money(cc, withProvinceTax(base, region!)!.total)}**。`,
        blocks: [{ t: "note", text: "**稅項按取貨地點計算：**稅率由分店所在省份決定，與你的住址無關。" }, table],
      };
    }
    const provinces = Object.keys(CA_PROVINCE_TAX).filter((p) => storesOf("ca").some((s) => s.state === p));
    const cheapest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total < CA_PROVINCE_TAX[a].total ? b : a));
    const dearest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total > CA_PROVINCE_TAX[a].total ? b : a));
    return {
      id: "price-with-tax",
      h2: `${m.name} 加拿大連銷售稅價錢（按省份）`,
      lead: `256GB ${m.name} 的 Apple 標價 **${money(cc, base)}** 未連稅；取貨分店所在省份另外加稅，由${zhPlace(cc, cheapest)}的 **${money(cc, withProvinceTax(base, cheapest)!.total)}**（${n(CA_PROVINCE_TAX[cheapest].total)}%）到${zhPlace(cc, dearest)}的 **${money(cc, withProvinceTax(base, dearest)!.total)}**（${n(CA_PROVINCE_TAX[dearest].total)}%）。`,
      blocks: [{
        t: "table",
        head: ["省份", "稅項", "稅率", `${m.short} 256GB 連稅`],
        rows: provinces.map((p) => [zhPlace(cc, p), CA_PROVINCE_TAX[p].label, `${n(CA_PROVINCE_TAX[p].total)}%`, money(cc, withProvinceTax(base, p)!.total)]),
        caption: "設有 Apple Store 的省份：店舖取貨須付的銷售稅",
        source: `[${src.label}](${src.url})；價錢取自 apple.com/ca`,
      }],
    };
  }
  const r = includedRate(c);
  const tn = taxNameZh(c);
  return {
    id: "price",
    h2: r == null ? `${m.name} ${cn(cc)}價錢：${money(cc, base)} 起（不設銷售稅）` : `${m.name} ${cn(cc)}價錢：${money(cc, base)} 起（已含 ${r}% ${tn}）`,
    lead: r == null
      ? `apple.com 上 256GB ${m.name} 售 **${money(cc, base)}**，在${place}取貨時付的就是這個價：香港**不設銷售稅**，亦沒有增值稅。`
      : `256GB ${m.name} 在${cn(cc)}售 **${money(cc, base)}**，**已含 ${r}% ${tn}**（未連稅為 ${money(cc, beforeTax(c, base))}），在${place}取貨時不會另外加錢。`,
    blocks: [{
      t: "table",
      head: r == null ? ["iPhone", "apple.com 價錢"] : ["iPhone", "apple.com 價錢", `未連 ${r}% ${tn}`],
      rows: rows.map(([label, p]) => (r == null ? [label, money(cc, p)] : [label, money(cc, p), money(cc, beforeTax(c, p))])),
      caption: `Apple ${cn(cc)}定價${r == null ? "（不設銷售稅）" : `，已含${tn}`}`,
      source: `[${src.label}](${src.url})；價錢取自 apple.com/${shopPath}`,
    }],
  };
}

function taxFaq(cc: CountryCode, placeName: string, region?: string): FaqItem {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo") ?? 0;
  const place = zhPlace(cc, placeName);
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    return t
      ? { q: `在${place}買 iPhone Duo 連稅要多少錢？`, a: `256GB 約 ${money(cc, t.total)}：Apple 標價 ${money(cc, duo)}，加上${zhPlace(cc, region!)}的 ${n(t.rate)}% ${CA_PROVINCE_TAX[region!].label}，按取貨地點收取。` }
      : { q: "Apple 加拿大的價錢已含稅嗎？", a: `未含。256GB iPhone Duo 未連稅 ${money(cc, duo)}；GST、HST 或省銷售稅按分店所在省份另加，由艾伯塔省的 5% 到魁北克省的 14.975%。` };
  }
  const r = includedRate(c);
  return r == null
    ? { q: "在香港買 iPhone 要付銷售稅嗎？", a: `不用。香港不設銷售稅或增值稅，256GB iPhone Duo 取貨時付 ${money(cc, duo)}，與 apple.com 標價完全一樣。` }
    : { q: `apple.com 的${cn(cc)}價錢已含${taxNameZh(c)}嗎？`, a: `已含。256GB iPhone Duo 的 ${money(cc, duo)} 已包括 ${r}% ${taxNameZh(c)}；到店提取時不會另外加錢。` };
}

/* ------------------------------------------------------------------ region / city pages */

const placeOf = (i: IntlPlaceInput) => zhPlace(i.cc, i.name, i.kind === "city" ? "city" : "region");

function placeTitle(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = placeOf(i);
  return fitW([
    `${w} Apple Store：${k === 2 ? "兩間" : `全部 ${n(k)} 間`}分店 iPhone Duo 即時現貨`,
    `${w} Apple Store：iPhone Duo 即時現貨`,
    `${w} Apple Store：今日 iPhone 現貨`,
    `${w} Apple Store iPhone 現貨`,
  ]);
}

function priceBit(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") { const t = region ? withProvinceTax(duo, region) : null; return t ? `；iPhone Duo 連${zhPlace(cc, region!)}稅項約 ${money(cc, t.total)}` : `；iPhone Duo 未連稅 ${money(cc, duo)} 起`; }
  return `；iPhone Duo ${money(cc, duo)} 起（${taxNoteZh(c)}）`;
}

function placeDescription(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = placeOf(i);
  return fitW([
    `${w}共 ${n(k)} 間 Apple Store：現時 ${n(i.stockNow.duo)} 間可即時取貨 iPhone Duo，${n(i.stockNow["18-pro-max"])} 間有 18 Pro Max。逐店即時現貨、補貨時間${priceBit(i.cc, i.region)}。`,
    `${w}共 ${n(k)} 間 Apple Store：${n(i.stockNow.duo)} 間現有 iPhone Duo 可取貨，${n(i.stockNow["18-pro-max"])} 間有 18 Pro Max。逐店即時現貨及補貨時間。`,
  ], 155);
}

function placeIntro(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? `，分佈於 ${n(i.cities)} 個${cityNoun(i.cc)}` : "";
  return `${placeOf(i)}共有 **${n(k)} 間 Apple Store**${cities}：現時 **${n(i.stockNow.duo)}** 間可取貨 iPhone Duo，**${n(i.stockNow["18-pro-max"])}** 間有 18 Pro Max，**${n(i.stockNow["18-pro"])}** 間有 18 Pro。`;
}

function duoLead(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const have = duoStoresNow(i);
  if (have.length > 0) return `**${n(k)} 間中有 ${n(have.length)} 間**現在有 iPhone Duo 可取貨：${lw(have.map((s) => apple(s)), 4)}。`;
  if (i.duo.month > 0) return `**${n(k)} 間現時都沒有** iPhone Duo，但${sinceWhen()}已補貨 **${n(i.duo.month)} 次**。`;
  return `**${n(k)} 間現時都沒有** iPhone Duo，${sinceWhen()}亦未錄得任何一次 Duo 補貨。`;
}

function duoPoints(i: IntlPlaceInput, w: string, alert: string): Block[] {
  const k = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const items: string[] = [];
  if (have.length > 0 && st.month > 0) items.push(`**已記錄：**${sinceWhen()}，這裏的分店共補貨 Duo ${n(st.month)} 次`);
  if (st.lastRestock && last) items.push(`**最近一次補貨：**${zoneStampZh(st.lastRestock.at, i.cc)}，${apple(last)}`);
  if (st.medianMs != null) items.push(`**一般上架時間：**補貨後的 Duo 通常只上架約 ${fmtDuration(st.medianMs, L)}（中位數）`);
  items.push(`**最快方法：**[在${w}設定 iPhone Duo 提醒](${alert})，${k <= 3 ? `剔選${k === 2 ? "兩間" : k === 1 ? "這間" : "三間"}分店` : `剔選你去得到、最近的 ${n(Math.min(k, 5))} 間分店`}`);
  items.push("**一個提醒** = 一間分店 × 一款指定配置；分店一上架，推送幾秒內送到");
  const blocks: Block[] = [];
  if (have.length === 0 && st.month === 0) blocks.push({ t: "note", text: "**情況一分鐘內就可能改變：**想買到，靠的是提醒，而不是不停重新整理 apple.com。" });
  blocks.push({ t: "ul", items });
  return blocks;
}

function placeSections(i: IntlPlaceInput): KeywordSection[] {
  const k = i.stores.length;
  const w = placeOf(i);
  const alert = alertHref({ model: "duo", state: i.regionSlug, city: i.kind === "city" ? i.citySlug : undefined, country: i.cc });
  const scarce = scarcest(i, "18-pro-max");
  const pm = catalogFor("18-pro-max", i.cc).length;
  return [
    {
      id: "iphone-duo",
      h2: `${w}哪間 Apple Store 現在有 iPhone Duo？`,
      lead: duoLead(i),
      blocks: duoPoints(i, w, alert),
    },
    {
      id: "iphone-18-pro-max",
      h2: `${w}的 iPhone 18 Pro Max：各分店現貨`,
      lead: `**${n(k)} 間中有 ${n(i.stockNow["18-pro-max"])} 間**有 iPhone 18 Pro Max，${w}合共 ${n(k * pm)} 個「分店 × 款式」組合中，**${pairsPct(i, "18-pro-max")}%** 有貨。`,
      blocks: [{ t: "ul", items: [
        ...(scarce.length ? [`**現時最缺：**${lw(scarce.map((x) => `${zhCfg(x.label)}（${x.stores === 0 ? `${n(k)} 間都沒有` : `${n(k)} 間中 ${n(x.stores)} 間有貨`}）`))}`] : []),
        `**iPhone 18 Pro：**${n(k)} 間中 ${n(i.stockNow["18-pro"])} 間有貨，${pairsPct(i, "18-pro")}% 的組合有貨`,
        `**已記錄（${sinceWhen()}）：**${i.max.month ? `18 Pro Max 補貨 ${n(i.max.month)} 次` : "暫未有 18 Pro Max 補貨"}`,
        ...(i.max.medianMs != null ? [`**一般上架時間：**補貨後的 Pro Max 通常上架約 ${fmtDuration(i.max.medianMs, L)}（中位數）`] : []),
      ] }],
    },
    priceSection(i.cc, w, i.cc === "ca" ? i.region : undefined),
  ];
}

/* ------------------------------------------------------------------ country: store index and home */

function storesIndexTitle(cc: CountryCode): string {
  const k = storesOf(cc).length;
  const w = cn(cc);
  return fitW([
    `${w} Apple Store 一覽：${k === 2 ? "兩間" : `全部 ${n(k)} 間`}分店 iPhone Duo 即時現貨`,
    `${w} Apple Store 一覽：iPhone Duo 即時現貨`,
    `${w} Apple Store：iPhone 即時現貨`,
  ], 70);
}

function homeTitle(cc: CountryCode): string {
  const k = storesOf(cc).length;
  return `${cn(cc)} iPhone 現貨查詢：${k === 1 ? "" : `${n(k)} 間 `}Apple Store 每 15 秒檢查`;
}

function homeH1(cc: CountryCode): string {
  const k = storesOf(cc).length;
  return k === 1 ? `${cn(cc)} Apple Store 的 iPhone 現貨查詢` : `${cn(cc)}全部 ${n(k)} 間 Apple Store 的 iPhone 現貨查詢`;
}

function allStoresPhrase(cc: CountryCode): string {
  const k = storesOf(cc).length;
  return k === 1 ? `${cn(cc)}唯一一間 Apple Store` : `${cn(cc)}全部 ${n(k)} 間 Apple Store`;
}

function spreadPhrase(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const regions = statesWithStores(cc);
  const cities = citiesWithStores(cc);
  const k = storesOf(cc).length;
  const one = (x: { name: string }) => cityLabel(cc, x.name, L);
  if (k === 1) return `位於${one(cities[0])}`;
  if (cities.length === 1) return `全部位於${one(cities[0])}`;
  if (!c.regionNoun || regions.length === 1) return `分佈於 ${n(cities.length)} 個${cityNoun(cc)}`;
  return `分佈於 ${n(regions.length)} 個${rn(c)}的 ${n(cities.length)} 個城市`;
}

function modelPageTitles(cc: CountryCode, model: ModelKey): { title: string; h2: string[] } {
  const m = modelByKey(model)!;
  const k = storesOf(cc).length;
  const w = cn(cc);
  return {
    title: fitW([`${m.name} 現貨：${w} ${k === 1 ? "" : `${n(k)} 間 `}Apple Store 即時查詢`, `${m.name} 現貨：${w} Apple Store 即時查詢`, `${m.name} ${w}現貨`], 70),
    h2: [`${m.name} 哪裏有貨？${w}現時有貨的分店`, priceSection(cc, w, undefined, model).h2],
  };
}

function modelIntro(cc: CountryCode, model: ModelKey, inStock: number): string {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const k = storesOf(cc).length;
  const r = priceRange(cc, model);
  const p = cc === "ca" ? `**${money(cc, r.low)}** 起（未連稅）` : `**${money(cc, r.low)}** 起，${taxNoteZh(c)}`;
  const now = inStock === 0
    ? (k === 1 ? `${cn(cc)}唯一一間 Apple Store 現時**沒有** ${m.name} 可供取貨` : `${cn(cc)} ${n(k)} 間 Apple Store 現時**都沒有** ${m.name} 可供取貨`)
    : `${cn(cc)} ${n(k)} 間 Apple Store 中，現時有 **${n(inStock)} 間**可取貨 ${m.name}`;
  return `${now}（**每 15 秒**檢查一次）；售價 ${p}。`;
}

function modelDescription(cc: CountryCode, model: ModelKey, inStock: number): string {
  const m = modelByKey(model)!;
  const k = storesOf(cc).length;
  const r = priceRange(cc, model);
  return fitW([
    `${m.name} ${cn(cc)}有貨嗎？${n(k)} 間 Apple Store 中現有 ${n(inStock)} 間可取貨。逐店逐款即時現貨，${money(cc, r.low)} 起${cc === "ca" ? "（未連稅）" : ""}，附補貨時間。`,
    `${m.name} ${cn(cc)}：${n(k)} 間 Apple Store 中 ${n(inStock)} 間現在有貨。逐店逐款即時取貨現貨、補貨時間及提醒。`,
  ], 155);
}

/* ------------------------------------------------------------------ country home */



function homeDescription(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const k = storesOf(cc).length;
  return `即時查看${allStoresPhrase(cc)}的 iPhone Duo、18 Pro 及 18 Pro Max 取貨現貨，每 15 秒更新。${k === 1 ? "" : "補貨時間、"}${CURRENCY[c.currency] ?? c.currency}價錢一目了然；你的分店一補貨即推送通知。`;
}

function homeIntro(cc: CountryCode): string {
  const k = storesOf(cc).length;
  if (k === 1) return `現時${cn(cc)}唯一一間 Apple Store 的取貨現貨：iPhone Duo **{{duo.storesNow}}/1**，iPhone 18 Pro **{{pro.storesNow}}/1**，iPhone 18 Pro Max **{{pm.storesNow}}/1**。`;
  return `現時${cn(cc)} ${n(k)} 間 Apple Store 中，有 **{{duo.storesNow}}** 間可取貨 iPhone Duo，iPhone 18 Pro 有 **{{pro.storesNow}}** 間，iPhone 18 Pro Max 有 **{{pm.storesNow}}** 間。`;
}

function homeSections(i: HomeCopyInput): KeywordSection[] {
  const cc = i.cc;
  const c = COUNTRIES[cc];
  const k = storesOf(cc).length;
  const stores = storesOf(cc);
  const w = cn(cc);
  const by = k > 1 ? `、按${c.regionNoun ? rn(c) : cityNoun(cc)}` : "";
  return [
    {
      id: "iphone-stock",
      h2: `${w}哪間 Apple Store 有 iPhone 現貨？Duo、18 Pro 及 Pro Max 逐店看`,
      lead: `PickupChecker 每 15 秒讀取一次 apple.com 上${allStoresPhrase(cc)}每一款配置的店舖取貨狀態，按分店${by}及按款式列出。`,
      blocks: [
        { t: "table", head: ["型號", "款式數目", "現時有貨分店", "已記錄補貨"], rows: modelRows(cc, i.storesNow, i.restocks), caption: `${w}的查詢範圍，截至 {{asOf}}` },
        { t: "ul", items: [
          `**覆蓋範圍：**${spreadPhrase(cc)} · 價錢及零件編號均採用 Apple ${w}官方資料`,
          "**每間分店每 15 秒**檢查一次，你設了提醒的分店每 5 秒一次",
          "**兩次確認才算數：**apple.com 偶爾一次異常回應，不會變成假補貨或假售罄",
          `**每個確認的變化**都寫入[補貨記錄](${i.restocksPath})，再匯成${i.index?.indexable ? `[各分店頁](${i.index.path})` : "分店頁"}上的補貨圖表`,
        ] },
        { t: "img", id: "phone-notification" },
      ],
    },
    priceSection(cc, w),
    {
      id: "alerts",
      h2: `怎樣第一時間知道${w} Apple Store 補貨？`,
      lead: `查看現貨免費；要付費的，是「不用再自己查」。揀選你去得到的 Apple Store 和想要的那一款手機，${k === 1 ? "分店" : "任何一間"}一開放店舖取貨，幾秒內你的手機就收到推送。`,
      blocks: [
        { t: "ol", items: [
          "按「**提醒我**」，揀選 iPhone、容量及顏色。",
          k === 1 ? `剔選分店：${apple(stores[0])}（${cityLabel(cc, stores[0].city, L)}）。` : "剔選你去得到的分店；最近的排最前，附行車距離（公里）及車程。",
          "在 iPhone 上把 PickupChecker 加至主畫面，並允許通知（[安裝方法](/install)）。",
          "推送一到，直接由通知打開 apple.com，在結帳時選擇於該分店「提取」。",
        ] },
        { t: "table", head: ["方案", "月費（美元）", "提醒數目"], rows: [["Plus", "$5 / 月", "10"], ["Pro", "$10 / 月", "20"], ["Max", "$20 / 月", "50"]], caption: "一個提醒 = 一間分店 × 一款指定配置 · 瀏覽免費（[收費詳情](/pricing)）" },
        { t: "note", text: "**我們的看法：**Duo 值得在每一間你去得到的分店都設提醒；18 Pro 和 Pro Max 先看即時數字再決定。" },
        { t: "img", id: "apple-store-pickup-counter" },
      ],
    },
  ];
}

function homeFaq(cc: CountryCode, rt: RestockTimesBrief): Faq[] {
  const k = storesOf(cc).length;
  const w = cn(cc);
  const p = `/${cc}`;
  const when = rt.n === 0
    ? `自11月2日開始追蹤以來，暫未確認任何一次補貨。[${w}的 iPhone Duo 幾時補貨？](${rt.path})會按當地鐘點和星期，逐次統計。`
    : rt.peakHour != null
      ? `大多在**當地時間${hr(rt.peakHour)}左右**：自11月2日以來，${n(rt.storesTotal)} 間中有 ${n(rt.stores)} 間共確認補貨 ${n(rt.n)} 次。[逐小時、逐日數據](${rt.path})。`
      : `自11月2日以來，${n(rt.storesTotal)} 間中有 ${n(rt.stores)} 間共確認補貨 ${n(rt.n)} 次，但日子仍太少，未能指出慣常時段。[逐小時、逐日數據](${rt.path})。`;
  return [
    { q: `${w}哪間 Apple Store 現在有 iPhone Duo？`, a: `最近一次檢查（{{asOf}}）${n(k)} 間中有 {{duo.storesNow}} 間。[${w} iPhone Duo 現貨](${p}/stock/iphone-duo)逐店逐款列出，每 15 秒更新。` },
    { q: `Apple 幾時在${w}補貨 iPhone Duo？`, a: when },
    { q: "提醒有幾快？", a: `你設了提醒的分店每 5 秒檢查一次，${w}每間 Apple Store 每 15 秒一次。首次出現「有貨」會在一秒內再查一次，免得 Apple 的偶發異常變成誤報；確認後約 3 秒推送到你的手機。` },
    { q: "收費多少？", a: "即時現貨、地圖和補貨記錄全部免費。提醒方案：Plus 每月 $5 有 10 個、Pro $10 有 20 個、Max $20 有 50 個，以美元收費，隨時取消（[收費詳情](/pricing)）。" },
    taxFaq(cc, w),
    { q: "可以幫我留貨嗎？", a: `不可以。分店一上架我們即時通知你；你在 apple.com 選擇店舖提取並付款，Apple 便會為你保留（[Apple 提取服務說明](${sources(cc as NonUs).pickupHelp.url})）。` },
  ];
}

const home: Dict["place"]["home"] = {
  appName: (cc: CountryCode) => `PickupChecker ${cn(cc)} iPhone 現貨查詢`,
  offer: "即時現貨、地圖及補貨記錄免費；提醒每月 $5（美元）起",
  itemList: (cc: CountryCode) => `${cn(cc)} Apple Store`,
  restockTimesChip: "幾時補貨",
  storesByRegion: (cc: CountryCode) => `按${rn(COUNTRIES[cc])}查看分店`,
  browse: (cc: CountryCode) => `瀏覽${cn(cc)}現貨`,
  selloutH2: (cc: CountryCode) => `${cn(cc)}的 iPhone 補貨幾快售罄？`,
  selloutLabel: (cc: CountryCode) => `${cn(cc)}各間 Apple Store`,
  last24Label: (cc: CountryCode) => cn(cc),
  newsroom: "Apple Newsroom：iPhone Duo 登陸全球 Apple Store（2026 年 10 月 23 日）",
};


function storeTitle(s: Store, region?: string): string {
  const own = HK_TITLE[s.storeNumber];
  const name = own ? own[0] : apple(s);
  const where = own ? own[1] : region && !name.includes(region) ? region : null;
  const r = where ? `（${where}）` : "";
  return fitW([
    `${name}${r}：iPhone 現貨・取貨・營業時間`,
    `${name}${r}：iPhone 現貨及營業時間`,
    `${name}：iPhone 現貨・取貨・營業時間`,
    `${name}：iPhone 現貨及營業時間`,
    `${name}：iPhone 現貨`,
  ]);
}

export const place: Dict["place"] = {
  sinceWhen,
  placeLabel: (cc: CountryCode, name: string) => zhPlace(cc, name),
  whenIn: (cc: CountryCode, iso: string | Date) => zoneStampZh(iso, cc),
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
  modelRows,
  homeDescription,
  homeIntro,
  homeSections,
  homeFaq,
  home,
  storeTitle,
  sources,
};
