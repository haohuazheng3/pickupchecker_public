/**
 * 日本語: place — /ja-jp/… の国ページ群（ホーム、店舗一覧、地域・都市、機種ページ）のタイトル、答え先行の導入文、
 * キーワード節、価格・税の節、FAQ。数字はすべてライブのデータから組み立てる。
 * 検索語（Google 広告・日本・月間）：アップルストア 67.3万、apple 銀座 7.4万、iphone duo 7.4万、アップルストア 店舗 2.2万、
 * アップルストア 在庫 確認 1,000、iphone 在庫 確認 880、iphone duo 価格 2,400、iphone 店頭受け取り 110。
 * タイトルは検索される語を先頭に、幅 60（CJK は 2 幅、fitTitleW）。説明文は幅 155。
 */
import { MODELS, catalogFor, citiesWithStores, statesWithStores, storesOf, modelByKey, type ModelKey, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { CA_PROVINCE_TAX, TAX_SOURCES, beforeTax, includedRate, pickupHelp, storeListSource, taxName, withProvinceTax } from "@/content/country-tax";
import { priceOf, priceRange, scarcest, pairsPct, duoStoresNow, INTL_TRACKING_SINCE, type IntlPlaceInput, type HomeCopyInput, type RestockTimesBrief } from "@/lib/seo/countryCopy";
import { alertHref, fmtDuration, type FaqItem } from "@/lib/seo/enrich";
import type { Block, Faq } from "@/lib/content/types";
import type { KeywordSection } from "@/components/content/KeywordSections";
import { num, price as priceIn, stamp, list, hour, fitTitleW } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, configLabel, countryLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import type { Dict } from "../en";
import { content } from "./content";

const L = "ja" as const;
const N = (n: number) => num(L, n);
const money = (c: Country, v: number) => priceIn(L, c, v);
const country = (cc: CountryCode) => countryLabel(cc, L);
const pctJa = (n: number) => `${n}%`;
const listJa = (items: string[], max = 6) => list(L, items, max, (n) => content.listMore(N(n)));
/** 地域の呼び方（日本：都道府県）。 */
const NOUN: Record<string, string> = { state: "州", province: "州", area: "エリア", department: "県", prefecture: "都道府県", emirate: "首長国", canton: "州", region: "地域", county: "県", city: "市" };
const noun = (c: Country) => NOUN[c.regionNoun ?? "area"] ?? "エリア";
/** 価格に含まれる税の日本語名。 */
const taxJa = (c: Country) => {
  const t = taxName(c);
  return t === "consumption tax" ? "消費税" : t === "VAT" ? "付加価値税" : t === "GST" ? "物品サービス税（GST）" : t;
};
/** 地名を日本語に（すでに日本語ならそのまま）。 */
const placeJa = (i: Pick<IntlPlaceInput, "cc" | "kind" | "name">) => (i.kind === "city" ? cityLabel(i.cc, i.name, L) : regionLabel(i.cc, i.name, L));
const provinceJa = (p: string) => regionLabel("ca", p, L);

/** 「計測を始めた11月2日以降」（30日の窓が計測開始より前に届く間）、その後は「過去30日間」。 */
function sinceWhen(now = Date.now()): string {
  return now - Date.parse(`${INTL_TRACKING_SINCE}T00:00:00Z`) < 30 * 86400_000 ? "計測を始めた11月2日以降" : "過去30日間";
}
/** 「11月2日 15:04 JST」（国の時間帯で）。 */
function whenIn(cc: CountryCode, iso: string | Date): string {
  return stamp(L, iso, COUNTRIES[cc].timeZone, true);
}

/* ------------------------------------------------------------------ 税 */

function taxSentence(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    if (t) return `256GBのiPhone DuoはAppleの価格${money(c, duo)}（税抜）で、${provinceJa(region!)}の${t.rate}%（${CA_PROVINCE_TAX[region!].label}）を加えると約${money(c, t.total)}です。`;
    return `256GBのiPhone DuoはAppleの価格${money(c, duo)}（税抜）で、州に応じて5〜15%の税が上乗せされます。`;
  }
  const r = includedRate(c);
  if (r == null) return `256GBのiPhone Duoは${money(c, duo)}。香港には売上税がないため、受け取り時の支払いもこの金額です。`;
  return `256GBのiPhone Duoは${country(cc)}で${money(c, duo)}（${taxJa(c)}${r}%込み）。apple.comの価格が、そのまま店頭受け取りでの支払額です。`;
}

const PRICE_ROWS: [ModelKey, string][] = [["duo", "256GB"], ["duo", "1TB"], ["18-pro-max", "256GB"], ["18-pro-max", "1TB"], ["18-pro", "256GB"]];

/** Apple の価格と、日本語で読める税の出典。 */
function taxSource(cc: Exclude<CountryCode, "us">) {
  return cc === "jp" ? { label: "国税庁：No.6101 消費税の基本的なしくみ", url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6101.htm" } : TAX_SOURCES[cc];
}

function priceSection(cc: CountryCode, placeName: string, region?: string, model: ModelKey = "duo"): KeywordSection {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const base = priceOf(cc, model) ?? 0;
  const src = taxSource(cc as Exclude<CountryCode, "us">);
  const shop = `apple.com/${c.buyPath ?? c.shopPath}`;
  const rows: [string, number][] = PRICE_ROWS.flatMap(([k, st]) => { const p = priceOf(cc, k, st); return p == null ? [] : [[`${modelByKey(k)!.name} ${st}`, p] as [string, number]]; });
  if (cc === "ca") {
    const t = region ? CA_PROVINCE_TAX[region] : undefined;
    if (t) {
      const pj = provinceJa(region!);
      return {
        id: "price-with-tax",
        h2: `${placeName}での${m.name}の税込価格は？`,
        lead: `256GBの${m.name}は**税抜${money(c, base)}**。${pj}の税（${t.label}、計${t.total}%）を加えると、${placeName}の店舗で約**${money(c, withProvinceTax(base, region!)!.total)}**です。`,
        blocks: [
          { t: "note", text: "**税率は受け取る店舗の州で決まります。**住所の州ではありません。" },
          { t: "table", head: ["iPhone", "apple.comの価格", `税込（${t.total}%）`], rows: rows.map(([label, p]) => [label, money(c, p), money(c, withProvinceTax(p, region!)!.total)]), caption: `${pj}：Appleのカナダ価格＋${t.label}（${t.total}%）`, source: `[${src.label}](${src.url})；価格は${shop}より` },
        ],
      };
    }
    const provinces = Object.keys(CA_PROVINCE_TAX).filter((p) => storesOf("ca").some((s) => s.state === p));
    const cheapest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total < CA_PROVINCE_TAX[a].total ? b : a));
    const dearest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total > CA_PROVINCE_TAX[a].total ? b : a));
    return {
      id: "price-with-tax",
      h2: `カナダでの${m.name}の税込価格は？州ごとに比較`,
      lead: `256GBの${m.name}はAppleの価格で**${money(c, base)}**（税抜）。受け取る店舗の州の税が加わり、${provinceJa(cheapest)}の**${money(c, withProvinceTax(base, cheapest)!.total)}**（${CA_PROVINCE_TAX[cheapest].total}%）から${provinceJa(dearest)}の**${money(c, withProvinceTax(base, dearest)!.total)}**（${CA_PROVINCE_TAX[dearest].total}%）までです。`,
      blocks: [{
        t: "table",
        head: ["州", "税", "税率", `${m.short} 256GB（税込）`],
        rows: provinces.map((p) => [provinceJa(p), CA_PROVINCE_TAX[p].label, `${CA_PROVINCE_TAX[p].total}%`, money(c, withProvinceTax(base, p)!.total)]),
        caption: "アップルストアのある州：店頭受け取りにかかる税",
        source: `[${src.label}](${src.url})；価格は${shop}より`,
      }],
    };
  }
  const r = includedRate(c);
  const tn = taxJa(c);
  return {
    id: "price",
    h2: r == null ? `${m.name}の価格は？${country(cc)}で${money(c, base)}から（税なし）` : `${m.name}の価格は？${country(cc)}で${money(c, base)}から（${tn}込み）`,
    lead: r == null
      ? `256GBの${m.name}はapple.comで**${money(c, base)}**。香港には**売上税も付加価値税もない**ため、${placeName}での受け取り時の支払いもこの金額です。`
      : `256GBの${m.name}は${country(cc)}のapple.comで**${money(c, base)}**、**${tn}${r}%込み**（税抜${money(c, beforeTax(c, base))}）です。${placeName}での店頭受け取り時に、追加で払うものはありません。`,
    blocks: [{
      t: "table",
      head: r == null ? ["iPhone", "apple.comの価格"] : ["iPhone", "apple.comの価格", `税抜（${tn}${r}%）`],
      rows: rows.map(([label, p]) => (r == null ? [label, money(c, p)] : [label, money(c, p), money(c, beforeTax(c, p))])),
      caption: `Appleの${country(cc)}価格${r == null ? "" : `（${tn}込み）`}`,
      source: `[${src.label}](${src.url})；価格は${shop}より`,
    }],
  };
}

function taxFaq(cc: CountryCode, placeName: string, region?: string): FaqItem {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo") ?? 0;
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    return t
      ? { q: `${placeName}でのiPhone Duoの税込価格は？`, a: `256GBで約${money(c, t.total)}です。Appleの価格${money(c, duo)}に${provinceJa(region!)}の${t.rate}%（${CA_PROVINCE_TAX[region!].label}）が加わり、受け取る店舗の州で課税されます。` }
      : { q: "Appleのカナダ価格に税は含まれていますか？", a: `含まれていません。256GBのiPhone Duoは税抜${money(c, duo)}で、店舗の州に応じてGST、HST、州売上税が加わります（アルバータ州の5%からケベック州の14.975%まで）。` };
  }
  const r = includedRate(c);
  return r == null
    ? { q: "香港ではiPhoneに売上税がかかりますか？", a: `かかりません。香港には売上税も付加価値税もないため、256GBのiPhone Duoは受け取り時も${money(c, duo)}で、apple.comの価格そのままです。` }
    : { q: `${country(cc)}のapple.comの価格に${taxJa(c)}は含まれていますか？`, a: `はい。256GBのiPhone Duoの${money(c, duo)}には${taxJa(c)}${r}%が含まれており、店舗で受け取るときに追加で払うものはありません。` };
}

/* ------------------------------------------------------------------ 地域・都市ページ */

function placeTitle(i: IntlPlaceInput): string {
  const n = N(i.stores.length);
  const w = placeJa(i);
  return fitTitleW([
    `${w}のアップルストア（${n}店舗）：iPhone Duo在庫をライブ確認`,
    `${w}のアップルストア（${n}店舗）：iPhone在庫・入荷`,
    `${w}のアップルストア：iPhone在庫`,
    `${w}のアップルストア`,
  ]);
}

/** 説明文の価格部分。 */
function priceBit(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") { const t = region ? withProvinceTax(duo, region) : null; return t ? `、税込約${money(c, t.total)}` : `、税抜${money(c, duo)}`; }
  return includedRate(c) == null ? `、${money(c, duo)}から` : `、${money(c, duo)}（税込）から`;
}

function placeDescription(i: IntlPlaceInput): string {
  const n = N(i.stores.length);
  const w = placeJa(i);
  return fitTitleW([
    `${w}のアップルストア${n}店舗のうち、いまiPhone Duoを店頭受け取りできるのは${N(i.stockNow.duo)}店舗、18 Pro Maxは${N(i.stockNow["18-pro-max"])}店舗。店舗別のライブ在庫と入荷時間${priceBit(i.cc, i.region)}。`,
    `${w}のアップルストア${n}店舗：iPhone Duoの在庫は${N(i.stockNow.duo)}店舗、18 Pro Maxは${N(i.stockNow["18-pro-max"])}店舗。店舗別のライブ在庫と入荷時間。`,
  ], 155);
}

function placeIntro(i: IntlPlaceInput): string {
  const w = placeJa(i);
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? `（${N(i.cities)}都市）` : "";
  return `**${w}のアップルストア${N(i.stores.length)}店舗**${cities}のうち、いまiPhone Duoを店頭受け取りできるのは**${N(i.stockNow.duo)}店舗**、18 Pro Maxは**${N(i.stockNow["18-pro-max"])}店舗**、18 Proは**${N(i.stockNow["18-pro"])}店舗**です。`;
}

/** 「256GB Night Sky」→「256GB ナイトスカイ」。 */
const cfgJa = (label: string) => { const [storage, ...rest] = label.split(" "); return configLabel({ storage, color: rest.join(" ") }, L); };

function duoLead(i: IntlPlaceInput): string {
  const n = N(i.stores.length);
  const have = duoStoresNow(i);
  const st = i.duo;
  if (have.length > 0) return `いまiPhone Duoの在庫があるのは**${n}店舗中${N(have.length)}店舗**：${listJa(have.map((s) => appleStoreLabel(s, L)), 4)}。`;
  if (st.month > 0) return `いまiPhone Duoの在庫がある店舗は**${n}店舗中ゼロ**ですが、${sinceWhen()}に**${N(st.month)}回**入荷しています。`;
  return `いまiPhone Duoの在庫がある店舗は**${n}店舗中ゼロ**で、${sinceWhen()}にDuoの入荷も記録されていません。`;
}

function duoPoints(i: IntlPlaceInput, w: string, alert: string): Block[] {
  const n = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const items: string[] = [];
  if (have.length > 0 && st.month > 0) items.push(`**${sinceWhen()}の記録：**この地域の店舗でDuoが${N(st.month)}回入荷`);
  if (st.lastRestock && last) items.push(`**最新の入荷：**${whenIn(i.cc, st.lastRestock.at)}、${appleStoreLabel(last, L)}`);
  if (st.medianMs != null) items.push(`**在庫が出ている時間：**入荷したDuoは約${fmtDuration(st.medianMs, L)}で消えました（中央値）`);
  items.push(`**いちばん早い方法：**行ける${n <= 3 ? `${N(n)}店舗` : `近い${N(Math.min(n, 5))}店舗`}に[${w}でiPhone Duoの入荷通知を設定](${alert})`);
  items.push("**通知1件**＝1店舗 × 1構成。店舗で在庫が出てから数秒でプッシュ通知が届きます");
  const blocks: Block[] = [];
  if (have.length === 0 && st.month === 0) blocks.push({ t: "note", text: "**状況は1分で変わります：**手に入れるいちばんの近道は、apple.comの再読み込みではなく入荷通知です。" });
  blocks.push({ t: "ul", items });
  return blocks;
}

function placeSections(i: IntlPlaceInput): KeywordSection[] {
  const n = i.stores.length;
  const w = placeJa(i);
  const alert = alertHref({ model: "duo", state: i.regionSlug || undefined, city: i.kind === "city" ? i.citySlug : undefined, country: i.cc });
  const scarce = scarcest(i, "18-pro-max");
  const pm = catalogFor("18-pro-max", i.cc).length;
  return [
    {
      id: "iphone-duo",
      h2: `${w}でいまiPhone Duoの在庫がある店舗は？`,
      lead: duoLead(i),
      blocks: duoPoints(i, w, alert),
    },
    {
      id: "iphone-18-pro-max",
      h2: `${w}のiPhone 18 Pro Max：店舗別の在庫は？`,
      lead: `iPhone 18 Pro Maxの在庫があるのは**${N(n)}店舗中${N(i.stockNow["18-pro-max"])}店舗**。この地域の店舗×構成${N(n * pm)}通りのうち、**${pctJa(pairsPct(i, "18-pro-max"))}**が在庫ありです。`,
      blocks: [{ t: "ul", items: [
        ...(scarce.length ? [`**いま最も品薄：**${listJa(scarce.map((x) => `${cfgJa(x.label)}（${N(n)}店舗中${N(x.stores)}店舗）`))}`] : []),
        `**iPhone 18 Pro：**${N(n)}店舗中${N(i.stockNow["18-pro"])}店舗、組み合わせの${pctJa(pairsPct(i, "18-pro"))}が在庫あり`,
        `**${sinceWhen()}の記録：**${i.max.month ? `18 Pro Maxが${N(i.max.month)}回入荷` : "18 Pro Maxの入荷はまだなし"}`,
        ...(i.max.medianMs != null ? [`**在庫が出ている時間：**入荷したPro Maxは約${fmtDuration(i.max.medianMs, L)}で消えました（中央値）`] : []),
      ] }],
    },
    priceSection(i.cc, w, i.cc === "ca" ? i.region : undefined),
  ];
}

/* ------------------------------------------------------------------ 国：店舗一覧とホーム */

function storesIndexTitle(cc: CountryCode): string {
  const n = N(storesOf(cc).length);
  const head = cc === "jp" ? "アップルストア店舗一覧" : `${country(cc)}のアップルストア一覧`;
  return fitTitleW([`${head}（全${n}店舗）：iPhone Duo在庫をライブ確認`, `${head}（全${n}店舗）：iPhone在庫`, `${country(cc)}のアップルストア：iPhone在庫`], 70);
}

function homeTitle(cc: CountryCode): string {
  const n = N(storesOf(cc).length);
  const head = cc === "jp" ? "アップルストアの在庫確認" : `${country(cc)}のアップルストア在庫確認`;
  return fitTitleW([`${head}｜iPhone在庫を全${n}店舗で15秒ごと`, `${head}｜全${n}店舗のiPhone在庫`, `${head}（全${n}店舗）`, head]);
}

function homeH1(cc: CountryCode): string {
  const n = storesOf(cc).length;
  return n === 1 ? `${country(cc)}のアップルストアのiPhone在庫をチェック` : `${country(cc)}のアップルストア全${N(n)}店舗のiPhone在庫をチェック`;
}

function allStoresPhrase(cc: CountryCode): string {
  const n = storesOf(cc).length;
  return n === 1 ? `${country(cc)}のアップルストア` : `${country(cc)}のアップルストア全${N(n)}店舗`;
}

/** 店舗の分布：「6都道府県の6都市」「すべて東京」「東京」。 */
function spreadPhrase(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const regions = statesWithStores(cc);
  const cities = citiesWithStores(cc);
  const n = storesOf(cc).length;
  if (n === 1) return cityLabel(cc, cities[0].name, L);
  if (cities.length === 1) return `すべて${cityLabel(cc, cities[0].name, L)}`;
  if (!c.regionNoun || regions.length === 1) return `${N(cities.length)}都市`;
  return `${N(regions.length)}${noun(c)}の${N(cities.length)}都市`;
}

function modelPageTitles(cc: CountryCode, model: ModelKey): { title: string; h2: string[] } {
  const m = modelByKey(model)!;
  const n = storesOf(cc).length;
  const all = n === 1 ? "アップルストア" : `アップルストア全${N(n)}店舗`;
  return {
    title: fitTitleW([`${m.name}の在庫：${all}をライブ確認｜価格・入荷`, `${m.name}の在庫：${all}をライブ確認`, `${m.name}の在庫（${country(cc)}）`], 70),
    h2: [`近くで${m.name}の在庫があるアップルストアは？`, priceSection(cc, country(cc), undefined, model).h2],
  };
}

function priceFrom(cc: CountryCode, model: ModelKey): string {
  const c = COUNTRIES[cc];
  const r = priceRange(cc, model);
  if (cc === "ca") return `**${money(c, r.low)}**（税抜）`;
  return includedRate(c) == null ? `**${money(c, r.low)}**` : `**${money(c, r.low)}**（${taxJa(c)}込み）`;
}

function modelIntro(cc: CountryCode, model: ModelKey, inStock: number): string {
  const m = modelByKey(model)!;
  const n = N(storesOf(cc).length);
  const now = inStock === 0
    ? `いま${m.name}を店頭受け取りできる${country(cc)}のアップルストアは**${n}店舗中ゼロ**です`
    : `いま${m.name}を店頭受け取りできるのは、${country(cc)}のアップルストア**${n}店舗中${N(inStock)}店舗**です`;
  return `${now}（**15秒ごと**にチェック）。価格は${priceFrom(cc, model)}から。`;
}

function modelDescription(cc: CountryCode, model: ModelKey, inStock: number): string {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const n = N(storesOf(cc).length);
  const r = priceRange(cc, model);
  const p = `${money(c, r.low)}${cc === "ca" ? "（税抜）" : includedRate(c) == null ? "" : "（税込）"}`;
  return fitTitleW([
    `${m.name}の在庫は？いま${country(cc)}のアップルストア${n}店舗中${N(inStock)}店舗で店頭受け取りできます。店舗・構成別のライブ在庫、価格は${p}から、入荷時間も。`,
    `${m.name}の在庫：${country(cc)}のアップルストア${n}店舗中${N(inStock)}店舗にあり。店舗・構成別のライブ在庫、入荷時間、入荷通知。`,
  ], 155);
}

function modelRows(cc: CountryCode, storesNow: Record<ModelKey, number>, restocks: Record<ModelKey, number>): string[][] {
  const prefix = cc === "us" ? "" : `/${cc}`;
  return MODELS.map((m) => [`[${m.name}](${prefix}/stock/${m.slug})`, N(catalogFor(m.key, cc).length), N(storesNow[m.key] ?? 0), N(restocks[m.key] ?? 0)]);
}

function homeDescription(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const n = storesOf(cc).length;
  const cur = c.currency === "JPY" ? "円" : c.currency;
  return fitTitleW([
    `${allStoresPhrase(cc)}のiPhone Duo・18 Pro・Pro Max店頭受け取り在庫を15秒ごとにライブ確認。${n === 1 ? "価格" : "入荷時間と価格"}（${cur}）も掲載、入荷したらプッシュ通知。`,
    `${allStoresPhrase(cc)}のiPhone店頭受け取り在庫を15秒ごとにライブ確認。${n === 1 ? "価格" : "入荷時間と価格"}も掲載、入荷したらプッシュ通知。`,
  ], 155);
}

function homeIntro(cc: CountryCode): string {
  const n = N(storesOf(cc).length);
  return `いまiPhone Duoを店頭受け取りできるのは${country(cc)}のアップルストア**${n}店舗中{{duo.storesNow}}店舗**、iPhone 18 Proは**{{pro.storesNow}}店舗**、iPhone 18 Pro Maxは**{{pm.storesNow}}店舗**です。`;
}

function homeSections(i: HomeCopyInput): KeywordSection[] {
  const cc = i.cc;
  const c = COUNTRIES[cc];
  const stores = storesOf(cc);
  const n = stores.length;
  return [
    {
      id: "iphone-stock",
      h2: `iPhoneの在庫確認：${country(cc)}のDuo・18 Pro・Pro Maxを店舗別に`,
      lead: `PickupCheckerは、${allStoresPhrase(cc)}のapple.com店頭受け取り在庫を全構成について15秒ごとに読み取り、店舗別${n > 1 ? `・${c.regionNoun ? noun(c) : "都市"}別` : ""}・構成別に表示しています。`,
      blocks: [
        { t: "table", head: ["機種", "構成", "いま在庫のある店舗", "記録した入荷"], rows: modelRows(cc, i.storesNow, i.restocks), caption: `${country(cc)}でのチェック範囲（{{asOf}}時点）` },
        { t: "ul", items: [
          `**対象：**${N(n)}店舗（${spreadPhrase(cc)}） · 価格と型番はAppleの${country(cc)}版`,
          "**全店舗を15秒ごと**、通知を設定した店舗は5秒ごとにチェック",
          "**2回の確認で記録：**apple.comの一時的な誤表示が、偽の入荷や完売として出ることはありません",
          `**確認した変化はすべて**[入荷履歴](${i.restocksPath})に記録し、${i.index?.indexable ? `[各店舗ページ](${i.index.path})` : "店舗ページ"}の入荷グラフに反映`,
        ] },
        { t: "img", id: "phone-notification" },
      ],
    },
    priceSection(cc, country(cc)),
    {
      id: "alerts",
      h2: "アップルストアの在庫確認を、入荷通知で自動化するには？",
      lead: `在庫の確認は無料。有料なのは「確認しなくて済む」ことです。行けるアップルストアと欲しい構成を選んでおけば、${n === 1 ? "その店舗" : "どれかの店舗"}で店頭受け取りが可能になってから数秒で、スマートフォンにプッシュ通知が届きます。`,
      blocks: [
        { t: "ol", items: [
          "**入荷通知**をタップし、iPhone、容量、カラーを選ぶ。",
          n === 1 ? `店舗にチェック：${appleStoreLabel(stores[0], L)}（${cityLabel(cc, stores[0].city, L)}）。` : "行ける店舗にチェック。近い順に、道のりのkmと所要時間つきで並びます。",
          "iPhoneなら、PickupCheckerをホーム画面に追加して通知を許可（[設定方法](/install)）。",
          "通知が届いたらそこからapple.comを開き、その店舗の店頭受け取りで購入。",
        ] },
        { t: "table", head: ["プラン", "料金（米ドル）", "通知"], rows: [["Plus", "$5 / 月", "10件"], ["Pro", "$10 / 月", "20件"], ["Max", "$20 / 月", "50件"]], caption: "通知1件＝1店舗 × 1構成 · 閲覧は無料（[料金](/pricing)）" },
        { t: "note", text: "**私たちの結論：**Duoなら、行ける店舗すべてに通知を。18 Proと18 Pro Maxは、まずライブの数字を見てから決めれば十分です。" },
        { t: "img", id: "apple-store-pickup-counter" },
      ],
    },
  ];
}

function homeFaq(cc: CountryCode, rt: RestockTimesBrief): Faq[] {
  const n = N(storesOf(cc).length);
  const p = cc === "us" ? "" : `/${cc}`;
  const when = rt.n === 0
    ? `11月2日の計測開始以来、確認された入荷はまだありません。[${country(cc)}でiPhone Duoが再入荷するのはいつ？](${rt.path})で、入荷があるたびに現地時間の時間帯・曜日ごとに集計します。`
    : rt.peakHour != null
      ? `多くは**現地時間の${hour(L, rt.peakHour, true)}ごろ**です。11月2日以降、${N(rt.storesTotal)}店舗中${N(rt.stores)}店舗で確認された入荷は${N(rt.n)}回。[時間帯別・日別の詳細](${rt.path})。`
      : `11月2日以降、${N(rt.storesTotal)}店舗中${N(rt.stores)}店舗で${N(rt.n)}回の入荷を確認しましたが、いつもの時間帯を言えるほどの日数はまだありません。[時間帯別・日別の詳細](${rt.path})。`;
  return [
    { q: `いまiPhone Duoの在庫がある${country(cc)}のアップルストアは？`, a: `前回のチェック（{{asOf}}）では${n}店舗中{{duo.storesNow}}店舗。[${country(cc)}のiPhone Duo在庫](${p}/stock/iphone-duo)で店舗と構成ごとに確認でき、15秒ごとに更新されます。` },
    { q: `${country(cc)}でiPhone Duoが再入荷するのはいつ？`, a: when },
    { q: "通知はどれくらい速い？", a: `通知を設定した店舗は5秒ごと、${country(cc)}の全アップルストアは15秒ごとにチェックします。最初の「在庫あり」は1秒以内にもう一度確かめるので、Apple側の不具合が通知になることはありません。プッシュ通知はその約3秒後にスマートフォンに届きます。` },
    { q: "料金は？", a: "ライブ在庫、地図、入荷履歴は無料。通知はPlusが月額$5で10件、Proが$10で20件、Maxが$20で50件（米ドルで請求）。いつでも解約できます（[料金](/pricing)）。" },
    taxFaq(cc, country(cc)),
    { q: "代わりに予約してもらえますか？", a: `いいえ。私たちは店舗に在庫が出た瞬間をお知らせするだけです。購入はapple.comで店頭受け取りを選んで行い、商品はAppleが確保します（[Appleの配送と受取](${pickupHelp(cc).url})）。` },
  ];
}

const homeLabels: Dict["place"]["home"] = {
  appName: (cc: CountryCode) => `PickupChecker iPhone在庫確認（${country(cc)}）`,
  offer: "ライブ在庫・地図・入荷履歴は無料、通知は月額$5から",
  itemList: (cc: CountryCode) => `${country(cc)}のアップルストア`,
  restockTimesChip: "入荷する時間",
  storesByRegion: (cc: CountryCode) => `${noun(COUNTRIES[cc])}別の店舗`,
  browse: (cc: CountryCode) => `${country(cc)}の在庫を見る`,
  selloutH2: (cc: CountryCode) => `${country(cc)}では、iPhoneの入荷はどれくらいで完売する？`,
  selloutLabel: (cc: CountryCode) => `${country(cc)}のアップルストア`,
  last24Label: (cc: CountryCode) => country(cc),
  newsroom: "Apple Newsroom：iPhone Duoが世界のApple Storeに登場（2026年10月23日、英語）",
};

/** 店舗ページの <title> と H1：「Apple 銀座：iPhone在庫・店頭受け取り・営業時間」。`region` はその都市・地域で唯一の店舗のとき。 */
function storeTitle(s: Store, region?: string): string {
  const name = appleStoreLabel(s, L);
  const shown = region && !name.includes(region) && !storeLabel(s, L).includes(region) ? region : null;
  return fitTitleW(content.titles.store(name, shown));
}

export const place: Dict["place"] = {
  sinceWhen,
  placeLabel: (_cc: CountryCode, name: string) => name,
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
  modelRows,
  homeDescription,
  homeIntro,
  homeSections,
  homeFaq,
  home: homeLabels,
  storeTitle,
  sources: (code: Exclude<CountryCode, "us">) => ({
    pickupHelp: { label: "Apple：出荷・配送と受取について（受け取りの流れ）", url: pickupHelp(code).url },
    storeList: { label: code === "jp" ? "Apple：直営店のApple Store一覧（日本）" : `Apple：直営店のApple Store一覧（${country(code)}）`, url: storeListSource(code).url },
    tax: taxSource(code),
  }),
};
