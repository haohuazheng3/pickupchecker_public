/**
 * 繁體中文（香港）: decide — the four decision pages (seo.md §16): which configuration is easiest to get, is the
 * shortage easing, Apple vs carriers vs retailers, and the public API. Same keys, parameters and shapes as
 * en/decide.tsx; every sentence answer-first with its numbers. Hong Kong usage: 分店 / 門市 (carrier shops), 現貨,
 * 補貨, 售罄, 上架, 取貨, 款／配置, 電訊商, 零售商, 轉售, 保養, 退貨／換貨 (Apple Hong Kong takes no change-of-mind
 * returns: returnDays 0). Only 15 s and 5 s check intervals; the API cache is "快取 30 秒", never phrased as a 30-second check interval.
 */
import type { Faq } from "@/lib/content/types";
import type { Country } from "@/lib/apple/countries";
import type { DuoSupply } from "@/lib/content/duoDecide";
import { exposureHours } from "@/lib/content/duoDecide";
import { listWords } from "@/lib/seo/enrich";
import { SPEED } from "@/lib/plans";
import type { ApiView, ChannelsView, ConfigsView, DecideCtx, DecideDict, SupplyView } from "../en/decide";
import { L, cn, fitW, longYmd, n, ymd } from "./common";

/** Whole-percent shares; under half a percent "<1%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
/** "+12%" / "−8%" / "0%". */
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.round(Math.abs(x) * 100)}%`;
/** "38.4 小時" of listing time, "41 分鐘" under an hour. */
const hours = (sec: number) => (sec >= 3600 ? `${n(exposureHours(sec))} 小時` : `${n(Math.max(1, Math.round(sec / 60)))} 分鐘`);
/** "75 秒", "3 分鐘" from two minutes up. */
const secs = (s: number) => (s >= 120 ? `${n(Math.round(s / 60))} 分鐘` : `${n(Math.round(s))} 秒`);
/** "2.5 倍". */
const ratio = (a: number, b: number) => (b > 0 ? `${n(Math.round((a / b) * 10) / 10)} 倍` : "—");
/** "A、B 及 C" (Intl zh-HK joins with 及; a space before a digit that follows it, "及 1TB"). */
const lw = (items: string[], max = 6) => listWords(items, max, L).replace(/([一-鿿])(\d)/g, "$1 $2");
/** "2.0" per store per week, as the table prints it. */
const perWeek = (perStoreDay: number) => (perStoreDay * 7).toFixed(1);

/** "香港" — the US pages name no country, as in English. */
const at = (c: Country) => (c.cc === "us" ? "" : cn(c.cc));
/** "在香港" / "". */
const inAt = (c: Country) => (c.cc === "us" ? "" : `在${cn(c.cc)}`);
/** "香港的" / "". */
const ofAt = (c: Country) => (c.cc === "us" ? "" : `${cn(c.cc)}的`);
/** "香港的 " before a number / "". */
const ofAtN = (c: Country) => (c.cc === "us" ? "" : `${cn(c.cc)}的 `);
const storesPhrase = (x: DecideCtx) => (x.one ? `${cn(x.c.cc)}唯一一間 Apple Store` : `${cn(x.c.cc)}全部 ${n(x.stores)} 間 Apple Store`);
/** "比上週多" / "比上週少" / "與上週差不多". */
const vsLastWeek = (d: DuoSupply) => (d.trend === "up" ? "比上週多" : d.trend === "down" ? "比上週少" : "與上週差不多");
/** "Apple 的 14 日退貨期"; Hong Kong (0): no change-of-mind returns, exchanges for defects only; null: a neutral phrase. */
const returnPhrase = (days: number | null) => (days ? `Apple 的 ${n(days)} 日退貨期` : days === 0 ? "Apple 在當地不設無理由退貨（只為有瑕疵的貨品換貨）" : "Apple 的退貨政策");
/** channels.ts carries the carrier-lock sentence in English; Hong Kong's in Chinese, elsewhere a neutral line. */
const lockZh = (x: ChannelsView) => (x.c.cc === "hk" ? "Apple 在香港出售的 iPhone 不鎖台；電訊商賣出的機有否鎖台，我們未有核實。" : "購買前先查清楚鎖台及合約條款。");
/** How Hong Kong knows the sellers channels.ts names in English (first full listing only); others as given. */
const BRAND: Record<string, string> = { "3 Hong Kong": "3 Hong Kong（3香港）", "China Mobile Hong Kong": "China Mobile Hong Kong（中國移動香港）", Fortress: "Fortress（豐澤）", Broadway: "Broadway（百老匯）" };
const brand = (s: string) => BRAND[s] ?? s;
const hoursAgo = (h: number) => (h < 1 ? "不足一小時" : `${n(h)} 小時`);

/* ================================================================== which configuration is easiest to get */
const configs: DecideDict["configs"] = {
  crumb: "哪款最常補貨？",
  title: (c: Country) => fitW([`哪款 iPhone Duo 在${cn(c.cc)}最常補貨？容量與顏色`, `哪款 iPhone Duo 在${cn(c.cc)}最常補貨？`, `哪款 iPhone Duo 最常補貨？（${cn(c.cc)}）`], 49),
  metaDescription: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    return e && h
      ? fitW([
        `${x.cfg(e)}是${inAt(x.c)}最容易買到的 iPhone Duo：自${longYmd(d.since)}起 ${n(x.stores)} 間 Apple Store 確認的 ${n(d.n)} 次補貨中佔 ${n(e.restocks)} 次，累計上架 ${hours(e.exposureSec)}；最難買到的是 ${x.cfg(h)}（${n(h.restocks)} 次）。全部款式按容量及顏色排名，每次補貨即時更新。`,
        `${x.cfg(e)}是${inAt(x.c)}最容易買到的 iPhone Duo（自${longYmd(d.since)}起 ${n(d.n)} 次補貨中佔 ${n(e.restocks)} 次）；最難買到的是 ${x.cfg(h)}。全部款式按容量及顏色排名。`,
      ], 160)
      : `${ofAt(x.c)}每款 iPhone Duo 配置，按自${longYmd(d.since)}起 Apple Store 已確認的補貨排名：容量、顏色、上架時間，以及現時有貨的款式。`;
  },
  h1: (x: ConfigsView) => `哪款 iPhone Duo 配置${inAt(x.c)}最常補貨？哪款最容易買到？`,
  intro: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    if (!e) return `自${longYmd(d.since)}起，PickupChecker 在${storesPhrase(x)}確認了 ${n(d.n)} 次 iPhone Duo 補貨——仍然太少，未能為各款排名。下表會隨每次補貨補上；美國版頁面已有可參考的規律。`;
    const st = d.byStorage, co = d.byColor;
    const last = st[st.length - 1];
    return `${x.cfg(e)}是${inAt(x.c)}最容易買到的 iPhone Duo：自${longYmd(d.since)}起 PickupChecker 在${storesPhrase(x)}確認的 ${n(d.n)} 次補貨中，它佔 ${n(e.restocks)} 次，遍及 ${n(e.stores)} 間分店，累計上架 ${hours(e.exposureSec)}${e.lifetimes ? `，上架時間中位數 ${secs(e.lifetimes.medianSec)}` : ""}。${h ? `最難買到的是 ${x.cfg(h)}：只有 ${n(h.restocks)} 次補貨，累計上架 ${hours(h.exposureSec)}。` : ""}${st.length > 1 ? `容量比顏色重要得多：${last.restocks > 0 ? `${st[0].key} 的補貨次數是 ${last.key} 的 ${ratio(st[0].restocks, last.restocks)}` : `${st[0].key} 佔了 ${pct(st[0].share)} 的補貨，${last.key} 則一次都未補過`}${co.length > 1 ? `；至於顏色，${x.colour(co[0].key)}只比${x.colour(co[1].key)}多 ${n(Math.abs(Math.round((co[0].share - co[1].share) * 100)))} 個百分點` : ""}。` : ""}`;
  },
  updated: (x: ConfigsView, stamp: string) => `更新於 ${stamp} · 數據自${longYmd(x.d.since)}起 · ${n(x.stores)} 間 Apple Store · 每 ${SPEED.checkSec} 秒檢查一次（有提醒的分店每 ${SPEED.fastSec} 秒）`,
  nav: { easiest: "現時最易買", storage: "容量", colour: "顏色", shelf: "下單時間", week: "本週", alerts: "設哪些提醒", method: "計算方法" },
  h2: (x: ConfigsView) => ({
    easiest: `${inAt(x.c)}現時哪款 iPhone Duo 配置最容易買到？`,
    storage: "容量大小會影響機會嗎？",
    colour: `${x.d.byColor.length > 1 ? `${x.colour(x.d.byColor[0].key)}還是${x.colour(x.d.byColor[1].key)}` : "哪種顏色"}：哪種顏色較常補貨？`,
    shelf: "哪款配置給你最多時間下單？",
    week: "過去七日有甚麼變化？",
    alerts: "我應該為哪幾款設提醒？",
    method: "我們怎樣計算補貨及上架時間",
  }),
  hero: {
    restocks: (label: string) => `${label}的已確認補貨次數`,
    exposure: "累計上架小時數（全部分店合計）",
    now: ((one: boolean) => (one ? "現時有貨" : "現時有貨的分店")) as unknown as DecideDict["configs"]["hero"]["now"],
    median: "上架秒數中位數",
    total: "全部款式的補貨次數",
  },
  easiestLead: (x: ConfigsView) => {
    const e = x.d.easiest!;
    return `${x.cfg(e)}在兩個最關鍵的指標都領先：補貨最多（${n(e.restocks)} 次，佔全部 ${pct(e.restocks / x.d.n)}），累計上架時間也最長（${hours(e.exposureSec)}）——這就是你打開 App、落單預留的時間。${e.nowStores > 0 ? `你讀到這一句時，有 ${n(e.nowStores)} 間分店正列出有貨。` : "此刻沒有分店列出有貨；下一次補貨幾秒內就會在這裏顯示。"}`;
  },
  easiestKeys: (x: ConfigsView) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      `累計上架時間最長的三款：${lw(top3.map((r) => `${x.cfg(r)}（${hours(r.exposureSec)}）`))}。`,
      d.never.length ? `自${longYmd(d.since)}起${inAt(x.c)}從未補貨： ${lw(d.never.map((r) => x.cfg(r)))}。` : `自${longYmd(d.since)}起，每款配置都至少補貨過一次。`,
      d.lifetimes ? `計算所有款式，一次補貨上架時間的中位數為 ${secs(d.lifetimes.medianSec)}；${pct(d.lifetimes.within2min)} 在 2 分鐘內售罄。` : "某款有 10 次補貨有明確的售罄時間後，才會顯示上架時間。",
    ];
  },
  rankCaption: (x: ConfigsView) => `${ofAt(x.c)}每款 iPhone Duo 配置，累計上架時間最長的排最前 · ${longYmd(x.d.since)}至今日`,
  rankHead: ["配置", "補貨", "分店", "累計上架", "上架中位數", "現時有貨", "最近補貨"],
  none: "暫未有",
  storageLead: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return "有補貨後才會比較各容量；下表即時更新。";
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return `會，而且影響最大：${st[0].key} 佔了 ${pct(st[0].share)} 的補貨，${st[1].key} 佔 ${pct(st[1].share)}${big ? `，1TB 及 2TB 合計只佔 ${pct(big / x.d.n)}` : ""}。Apple 出貨最多的是最多人訂的容量；最熱門的容量，也是分店一次到貨會有好幾部的款式。`;
  },
  groupCaption: (what: "storage" | "colour") => `按${what === "storage" ? "容量" : "顏色"}的補貨次數，全部分店合計`,
  groupHead: (what: "Storage" | "Colour") => [what === "Storage" ? "容量" : "顏色", "補貨", "佔比", "分店", "累計上架", "上架中位數", "現時有貨"],
  storageSwaps: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: `只為 ${last} 設提醒`, yes: `先設 ${top}，${last} 也一併設`, why: `${last} 只佔 ${pct(st[st.length - 1].share)} 的補貨；${top} 佔 ${pct(st[0].share)}。兩個提醒各用一個名額。` },
      { no: "死守想要的那個容量", yes: `${top} 或 ${second} 一來就買`, why: `這兩個容量佔了${inAt(x.c)}全部補貨的 ${pct(st[0].share + st[1].share)}；配個機套、加 iCloud 空間，容量的分別遠不及等候的代價。` },
    ];
  },
  colourLead: (x: ConfigsView) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return "有補貨後才會比較顏色。";
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return `${x.colour(co[0].key)}，但差距不大：佔 ${pct(co[0].share)} 的補貨，${x.colour(co[1].key)}佔 ${pct(co[1].share)}，只差 ${n(gap)} 個百分點${co[0].medianSec && co[1].medianSec ? `；上架時間中位數分別為 ${secs(co[0].medianSec)} 及 ${secs(co[1].medianSec)}` : ""}。顏色對機會的影響遠小於容量，所以為你想要的容量兩種顏色都設提醒，機會大約翻一倍。`;
  },
  colourKeys: (x: ConfigsView) => x.d.byColor.map((g) => `${x.colour(g.key)}：${n(g.restocks)} 次補貨，遍及 ${n(g.stores)} 間分店，累計上架 ${hours(g.exposureSec)}${g.nowStores ? `，現時 ${n(g.nowStores)} 間分店有貨` : ""}。`),
  shelfLead: (x: ConfigsView) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return "一次補貨的上架時間，由補貨那一刻量到下一次顯示售罄的檢查；某款有 10 次補貨有明確結束時間後，才會出現第一組數字。";
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return `${x.cfg(slow)}給你最多時間：由上架到售罄的中位數為 ${secs(slow.lifetimes!.medianSec)}，而 ${x.cfg(fast)}只有 ${secs(fast.lifetimes!.medianSec)}。賣得慢的是貴價大容量——想要的人較少——所以「最多時間下單」和「補貨最多」指向不同的款式，上面的排名兩者都計算在內。`;
  },
  shelfCaption: "每款配置的上架時間（補貨 → 下一次顯示售罄的檢查）",
  shelfHead: ["配置", "有明確結束的補貨", "中位數", "2 分鐘內售罄", "20 分鐘內售罄", "最快"],
  shelfKeys: (x: ConfigsView) => [
    `我們確認補貨後約 ${SPEED.alertSec} 秒，推送就到你手機；上架時間中位數${x.d.lifetimes ? `為 ${secs(x.d.lifetimes.medianSec)}` : "約一分鐘"}，所以只要 Apple Store App 已開到 Duo、付款卡已儲存，大多數補貨都趕得及。`,
    `這個時間是上限：售罄要等到下一次檢查才看得見，最多相隔 ${SPEED.checkSec} 秒（有提醒的分店 ${SPEED.fastSec} 秒）。`,
  ],
  weekLead: (x: ConfigsView) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return `${inAt(x.c)}過去十四日沒有補貨；下一次補貨起，下表會開始逐週對比。`;
    const lead = rows[0];
    return `過去七日補貨 ${n(tot7)} 次${totP ? `，上一週是 ${n(totP)} 次（${signed(tot7 / totP - 1)}）` : ""}，以 ${x.cfg(lead)}的 ${n(lead.last7)} 次最多。${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `這與整體排名第一的 ${x.cfg(x.d.easiest)}不同：每批到貨的組合都會變，所以揀選提醒款式前先看看這張表。` : "整體排名第一的款式，本週仍然領先。"}`;
  },
  weekCaption: "每款配置的補貨次數：過去 7 日與再前 7 日",
  weekHead: ["配置", "過去 7 日", "再前 7 日", "變化"],
  alertsLead: (x: ConfigsView) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? `在你最快去到的兩三間分店，為 ${lw(top.map((r) => x.cfg(r)))}設提醒；這幾款合計佔了${inAt(x.c)}至今 ${pct(top.reduce((a, r) => a + r.restocks, 0) / x.d.n)} 的補貨。再把你真正想要的那一款加作第四個提醒，哪個先到就買哪個。`
      : `${inAt(x.c)}有補貨之前，先在最近的分店為你想要的容量兩種顏色都設提醒。`;
  },
  alertsKeys: (x: ConfigsView) => [
    "提醒以「分店 × 配置」計，三間分店 × 三款配置就是 9 個提醒。",
    `有提醒的分店每 ${SPEED.fastSec} 秒檢查一次，確認補貨後才推送；橫幅約 ${SPEED.alertSec} 秒後到你手機。`,
    `${x.one ? "" : "分店按距離揀，不要按補貨次數揀："}補貨最多的分店，也是最多人盯着的分店。`,
  ],
  methodLead: "一次補貨，是指某款配置在一間分店由售罄變為有貨，並經兩次一致的檢查確認；追蹤中斷後的首次出現不計。上架時間由補貨起計，到第一次再顯示售罄的檢查為止，所以是上限。「累計上架」把該款每次補貨的時間加起來——這是衡量「有多少機會買到」最直接的一把尺。",
  methodKeys: (x: ConfigsView) => [
    `來源：Apple 自家的${storesPhrase(x)}取貨現貨，自${longYmd(x.d.since)}起每間分店每 ${SPEED.checkSec} 秒讀取一次（有提醒的分店每 ${SPEED.fastSec} 秒）。`,
    "現時有貨的分店及最近補貨時間是即時的；其餘數字每五分鐘內重新計算。",
    "歡迎引用，請附連結：數字會變，請註明你讀取的日期。",
  ],
  faq: (x: ConfigsView): Faq[] => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor;
    return [
      { q: `${inAt(x.c)}哪款 iPhone Duo 最容易買到？`, a: e ? `${x.cfg(e)}：自${longYmd(d.since)}起在 ${n(e.stores)} 間 Apple Store 確認補貨 ${n(e.restocks)} 次，累計上架 ${hours(e.exposureSec)}，比任何一款都多。${h ? `最難買到的是 ${x.cfg(h)}，只有 ${n(h.restocks)} 次補貨。` : ""}` : `${inAt(x.c)}已確認的補貨仍然太少，未能下結論；一有補貨，本頁會為每款排名。` },
      { q: `${co.length > 1 ? x.colour(co[1].key) : "其中一種顏色"}是否比${co.length > 1 ? x.colour(co[0].key) : "另一種"}難找？`, a: co.length > 1 && d.n ? `略難：${x.colour(co[0].key)}佔 ${pct(co[0].share)} 的補貨，${x.colour(co[1].key)}佔 ${pct(co[1].share)}。容量之間的差距大得多，所以先揀容量，再為該容量的兩種顏色都設提醒。` : "有補貨後才會比較顏色。" },
      { q: `${inAt(x.c)}1TB 或 2TB 的 iPhone Duo 有過現貨嗎？`, a: (() => { const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage)); const bn = big.reduce((a, r) => a + r.restocks, 0); const most = big.some((r) => r.stores) ? Math.max(...big.map((r) => r.stores)) : 0; return bn ? `有，但很少：${n(d.n)} 次補貨中，1TB 及 2TB 只佔 ${n(bn)} 次（${pct(bn / d.n)}），${most ? `最多出現在 ${n(most)} 間分店` : "沒有分店"}。它們一出現會上架較久（想要的人少），所以即使很少觸發，為它設一個提醒也值得。` : `我們的數據暫未見：自${longYmd(d.since)}起${inAt(x.c)}未確認過任何 1TB 或 2TB 的補貨。`; })() },
      { q: "提醒應該設一款還是幾款？", a: `幾款，但分店要少：補貨最多的三款合計佔了${inAt(x.c)}${d.n ? ` ${pct(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n)} ` : "大部分"}的補貨。三款配置 × 三間附近分店 = 9 個提醒，Plus 方案剛好夠用；再把你真正想要的那一款加作第四個。` },
      { q: "其他國家／地區的組合一樣嗎？", a: `不一定：每個國家／地區有自己的配貨，排名可以不同。「其他國家／地區」下的連結會打開 PickupChecker 追蹤的其餘 18 個國家／地區的同一頁；美國版的記錄最長（自${longYmd("2026-10-29")}起）。` },
    ];
  },
  sources: { apple: "Apple – iPhone Duo 配置及價錢", pickup: "Apple – 店舖取貨", log: "PickupChecker – 本頁數據所依據的補貨記錄" },
  ld: (x: ConfigsView) => ({
    datasetName: `iPhone Duo 按配置的補貨次數，${cn(x.c.cc)} Apple Store`,
    description: `自${longYmd(x.d.since)}起${storesPhrase(x)}已確認的 iPhone Duo 補貨，按配置（容量 × 顏色）統計：次數、分店數、累計上架時間、上架時間中位數、現時有貨的分店。`,
    measured: ["每款配置的補貨次數", "有補貨的分店", "上架時間（秒）", "上架時間中位數", "現時有貨的分店"],
  }),
  related: "繼續閱讀",
  sameData: "同一組數據，其他問題",
  otherCountries: "其他國家／地區",
  questions: { restockTimes: "Apple 幾時補貨 iPhone Duo？", sellOut: "補貨後幾快售罄？", shortage: "缺貨有改善嗎？", channels: "Apple、電訊商還是零售商？", alerts: "最快收到通知的方法", api: "免費現貨 API" },
  setUpAlert: "設定提醒",
  logLive: "補貨記錄（即時）",
  faqTitle: "常見問題",
  onThisPage: "本頁內容",
};

/* ================================================================== is the shortage easing */
const supply: DecideDict["supply"] = {
  crumb: "缺貨有改善嗎？",
  title: (c: Country) => fitW([`iPhone Duo ${cn(c.cc)}缺貨有改善嗎？每週趨勢`, `iPhone Duo ${cn(c.cc)}缺貨有改善嗎？`, `iPhone Duo 缺貨有改善嗎？（${cn(c.cc)}）`], 49),
  metaDescription: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    return d.trend !== "insufficient"
      ? fitW([
        `${ofAt(x.c)}iPhone Duo 本週補貨${vsLastWeek(d)}：7 日內 ${n(w.stores)} 間 Apple Store 補貨 ${n(w.restocks)} 次（較上週 ${signed(d.change!)}）${w.medianSec ? `，每次上架中位數 ${secs(w.medianSec)}便售罄` : ""}。逐日供應、「紓緩」會是甚麼樣子，以及該等還是另找途徑。`,
        `${ofAt(x.c)}過去 7 日 iPhone Duo 補貨 ${n(w.restocks)} 次，${n(w.stores)} 間 Apple Store（按週 ${signed(d.change!)}）${w.medianSec ? `，每次上架中位數 ${secs(w.medianSec)}` : ""}。逐日供應、紓緩的徵兆，以及該等還是另找途徑。`,
        `${ofAt(x.c)}過去 7 日 iPhone Duo 補貨 ${n(w.restocks)} 次（按週 ${signed(d.change!)}）。逐日供應及缺貨有否改善。`,
      ], 160)
      : fitW([
        `${ofAt(x.c)}iPhone Duo 缺貨有改善嗎？自${longYmd(d.since)}起 Apple Store 已確認補貨 ${n(d.n)} 次，逐日列出，並說明紓緩會是甚麼樣子、該等還是現在買。`,
        `${ofAt(x.c)}iPhone Duo 缺貨有改善嗎？自${longYmd(d.since)}起 Apple Store 已確認補貨 ${n(d.n)} 次，逐日列出。`,
      ], 160);
  },
  h1: (x: SupplyView) => `${ofAt(x.c)}iPhone Duo 缺貨有改善嗎？還要持續多久？`,
  intro: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    if (d.trend === "insufficient") {
      return `${x.us ? "" : `在${cn(x.c.cc)}，`}現在言之尚早：PickupChecker 由${longYmd(d.since)}開始追蹤，至今 ${n(d.days)} 日，第一次完整的按週比較要到${longYmd(d.comparableFrom)}才會出現。目前已在 ${n(x.stores)} 間 Apple Store 中的 ${n(d.storesEver)} 間確認補貨 ${n(d.n)} 次${d.lifetimes ? `，每次上架中位數 ${secs(d.lifetimes.medianSec)}便售罄` : ""}；此刻有 ${n(d.storesNow)} 間分店列出 Duo 有貨。沒有人能預測缺貨幾時結束；本頁顯示最先會透露答案的兩個數字——每週補貨次數及上架秒數——每次補貨即時更新。`;
    }
    const verdict = d.trend === "up" ? "供應在改善" : d.trend === "down" ? "供應在收緊" : "供應持平";
    const demand = w.medianSec
      ? (w.medianSec <= 120
        ? `但需求仍然把貨掃光：本週一次補貨上架中位數 ${secs(w.medianSec)}${d.prev7.medianSec ? `（上週 ${secs(d.prev7.medianSec)}）` : ""}，所以靠手動刷新買到一部，仍未變得容易`
        : `而且上架時間在拉長：本週中位數 ${secs(w.medianSec)}${d.prev7.medianSec ? `，上週 ${secs(d.prev7.medianSec)}` : ""}，這是紓緩的第一個跡象`)
      : "";
    return `${ofAt(x.c)}${verdict}：過去七日 Apple Store 補貨 iPhone Duo ${n(w.restocks)} 次，較上週（${n(d.prev7.restocks)} 次）${signed(d.change!)}，涉及 ${n(x.stores)} 間分店中的 ${n(w.stores)} 間${demand ? `——${demand}` : ""}。此刻有 ${n(d.storesNow)} 間分店列出有貨。沒有人能預測幾時結束；最先會透露答案的兩個數字都在本頁，每次補貨即時更新。`;
  },
  updated: (x: SupplyView, stamp: string) => `更新於 ${stamp} · 數據自${longYmd(x.d.since)}起 · ${n(x.stores)} 間 Apple Store · 每 ${SPEED.checkSec} 秒檢查一次`,
  nav: { trend: "本週", easier: "容易買到了嗎？", stores: "多少間分店", howlong: "持續多久", christmas: "等還是買", world: "其他國家／地區", method: "計算方法" },
  h2: (x: SupplyView) => ({
    trend: `${ofAt(x.c)}iPhone Duo 補貨在增加還是減少？`,
    easier: "真的變得容易買到了嗎？",
    stores: `${ofAt(x.c)}Apple Store 有多少間曾經有過 iPhone Duo？`,
    howlong: "iPhone Duo 缺貨會持續多久？",
    christmas: "應該繼續等補貨，還是另找途徑？",
    world: `其他國家／地區的缺貨${x.us ? "" : `比${at(x.c)}`}紓緩得更快嗎？`,
    method: "計算方法",
  }),
  weekBefore: "上週",
  goneIn2: "2 分鐘內售罄",
  storesEverLabel: ((one: boolean) => (one ? "至今已確認的補貨" : "至少補貨一次的分店")) as unknown as DecideDict["supply"]["storesEverLabel"],
  hero: { last7: "過去 7 日補貨次數", change: "較再前 7 日", stores: ((one: boolean) => (one ? "有補貨的日數" : "過去 7 日有補貨的分店")) as unknown as DecideDict["supply"]["hero"]["stores"], median: "過去 7 日上架秒數中位數", now: ((one: boolean) => (one ? "現時有貨" : "現時有貨的分店")) as unknown as DecideDict["supply"]["hero"]["now"], sinceLast: "距上次補貨的小時數" },
  trendLead: (x: SupplyView) => {
    const { d } = x;
    if (d.trend === "insufficient") return `逐日表就是至今的全部記錄：${n(d.days)} 日內補貨 ${n(d.n)} 次。按週對比會在${longYmd(d.comparableFrom)}出現；在此之前請逐日看方向。`;
    const w = d.last7, p = d.prev7;
    const gap = w.longestGapHours != null ? `本週兩次補貨之間最長相隔 ${n(w.longestGapHours)} 小時${p.longestGapHours != null ? `（上週 ${n(p.longestGapHours)} 小時）` : ""}。` : "";
    return `本週${vsLastWeek(d)}：補貨 ${n(w.restocks)} 次（平均每間分店 ${perWeek(w.perStoreDay)} 次），上週 ${n(p.restocks)} 次，${signed(d.change!)}。${gap}補貨跟着到貨批次一浪一浪地來，所以單日靜了意義不大；要看的是七日總數。`;
  },
  dailyCaption: (x: SupplyView) => `${ofAt(x.c)}每個當地日子的已確認補貨，最新的排最前（過去 14 日）`,
  dailyHead: ["日期", "補貨", "分店", "上架中位數"],
  trendKeys: (x: SupplyView) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? `至今補貨最多的一日：${ymd(best.date)}，${n(best.stores)} 間分店共 ${n(best.restocks)} 次。` : "暫未有補貨；最多的一日會在這裏顯示。",
      x.d.sinceLastHours != null && x.d.latest ? `上次補貨在${hoursAgo(x.d.sinceLastHours)}前：${x.storeName(x.d.latest.storeNumber)}，${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}。` : "暫未有補貨記錄。",
      `「增加」指補貨比上週多至少 ${Math.round(0.15 * 100)}%；「減少」指少至少 ${Math.round(0.15 * 100)}%；介乎兩者之間算持平。`,
    ];
  },
  easierLead: (x: SupplyView) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return "「容易買到」包含兩層意思：補貨更多，而且每次上架更久。該週有 10 次補貨有明確結束時間後，才會顯示上架時間。";
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return `${longer ? "有一點" : shorter ? "沒有——反而更難" : "仍未"}：本週一次補貨上架中位數 ${secs(w.medianSec)}${p.medianSec ? `，上週 ${secs(p.medianSec)}` : ""}，${pct(w.within2min!)} 在兩分鐘內售罄${p.within2min != null ? `（上週 ${pct(p.within2min)}）` : ""}。紓緩的樣子是兩個數字一起動——補貨更多、上架更久；只有補貨增加，代表 Apple 出貨多了，但等的人一樣多。`;
  },
  easierKeys: (x: SupplyView) => [
    "在這裏「紓緩」會是這樣：上架時間中位數超過 20 分鐘、大部分分店同時有貨、apple.com 的送貨預計縮至一星期內。",
    `在此之前，買到一部的方法仍然是提醒：我們確認補貨後約 ${SPEED.alertSec} 秒推送，遠在上架中位數之內。`,
    x.d.lifetimes ? `${inAt(x.c)}至今：${n(x.d.lifetimes.n)} 次有明確結束的補貨，中位數 ${secs(x.d.lifetimes.medianSec)}，${pct(x.d.lifetimes.within2min)} 在 2 分鐘內售罄。` : "有 10 次已結束的補貨後，才會顯示整體的上架時間數字。",
  ],
  storesLead: (x: SupplyView) => {
    const { d } = x;
    const never = x.stores - d.storesEver;
    return x.one
      ? `${d.storesEver ? `有：${cn(x.c.cc)}唯一一間 Apple Store 自${longYmd(d.since)}起已確認補貨 ${n(d.n)} 次` : `暫時未有：${cn(x.c.cc)}唯一一間 Apple Store 自${longYmd(d.since)}起未有已確認的補貨`}${d.storesNow ? "，而且此刻正列出 Duo 有貨" : ""}。`
      : `${ofAtN(x.c)}${n(x.stores)} 間 Apple Store 中有 ${n(d.storesEver)} 間（${pct(d.storesEver / x.stores)}）自${longYmd(d.since)}起至少確認過一次 iPhone Duo 補貨${never ? `；${n(never)} 間未有` : ""}。此刻 ${n(d.storesNow)} 間有貨。供應分佈並不平均：旗艦店和大商場的分店補貨最多，所以揀哪間分店設提醒，與揀哪款配置一樣重要。`;
  },
  storesKeys: (x: SupplyView) => [
    `各分店的補貨次數及當地時間：見${ofAt(x.c)}補貨時間頁的「哪裏」一節。`,
    "從未補貨的分店不代表 Apple 跳過了它：配貨按批次到達，有幾間分店到第二週才收到第一部 Duo。",
  ],
  howlongLead: (x: SupplyView) => `Apple 以外沒有人知道，我們也不作預測。${inAt(x.c)}記錄顯示的是：${n(x.d.days)} 日內補貨 ${n(x.d.n)} 次，${x.d.trend === "insufficient" ? `按週趨勢由${longYmd(x.d.comparableFrom)}起` : `本週補貨${vsLastWeek(x.d)}`}，上架時間${x.d.last7.medianSec ? `約 ${secs(x.d.last7.medianSec)}` : "只有幾分鐘"}。缺貨結束有一個可以在這裏看着發生的次序：每週補貨次數上升，上架時間由幾秒拉長到幾小時，然後大部分分店同時有貨、apple.com 的送貨預計縮至幾日。`,
  howlongKeys: () => [
    "訊號一——每週補貨次數連續兩三週上升（上表）。",
    "訊號二——上架時間中位數超過 20 分鐘：補貨撐得過不停刷新的人。",
    "訊號三——apple.com 的送貨預計縮至一星期內，而且大部分分店同時有貨。",
    "新顏色或新容量推出會把時鐘重設；在訊號三出現前，提醒不要關。",
  ],
  christmasLead: (x: SupplyView) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `提醒要開着，apple.com 的送貨訂單也要排着——兩樣都做，不是二揀一。以目前的速度（${perDay >= 1 ? `${inAt(x.c)}每日約 ${n(Math.round(perDay))} 次補貨` : `${inAt(x.c)}每日不足一次補貨`}${w.medianSec ? `，每次上架中位數 ${secs(w.medianSec)}` : ""}），你附近有提醒的分店幾日內就會輪到，而確認補貨後約 ${SPEED.alertSec} 秒，推送就到你手機。到別處付溢價，只有在等候本身比加價更昂貴時才划算；渠道比較頁會老實地幫你衡量。`;
  },
  christmasKeys: () => [
    "先在 apple.com 落送貨訂單：它替你排着隊，取貨買到了隨時可以取消。",
    "在最近的分店為補貨最多的兩三款設提醒（哪幾款見配置頁）。",
    "Apple Store App 先登入，Duo 放進購物袋，付款卡儲存好：上架中位數大約只有一分鐘。",
  ],
  worldLead: (x: SupplyView) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return "每個國家／地區都有完整一週的數據後，這裏會比較各地每間分店的每週補貨次數。";
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return `過去七日每間分店補貨最多的是${top.name}（每店 ${perWeek(top.perStoreDay)} 次），最少的是${bottom.name}（${perWeek(bottom.perStoreDay)} 次）${mine ? `；${cn(x.c.cc)}為 ${perWeek(mine.perStoreDay)} 次` : ""}。各地配貨與發售日期不同，紓緩的步伐也不一樣；美國的記錄最長。`;
  },
  worldCaption: "過去 7 日按國家／地區：補貨次數、每店補貨、上架中位數、現時有貨的分店",
  worldHead: ["國家／地區", "分店", "補貨（7 日）", "每店", "上架中位數", "現時有貨"],
  methodLead: `一次補貨，是指某款配置在一間分店由售罄變為有貨，並經相隔 ${SPEED.checkSec} 秒的兩次一致檢查確認（有提醒的分店 ${SPEED.fastSec} 秒）；追蹤中斷後的首次出現不計。日子以分店當地日計。上架時間由補貨起計，到第一次再顯示售罄的檢查為止——是上限，以下一次檢查為界。週對週是過去七個當地日與再前七日的比較；兩個窗口都完整才比。`,
  methodKeys: (x: SupplyView) => [
    `來源：Apple 的${storesPhrase(x)}取貨現貨，自${longYmd(x.d.since)}起。`,
    "本頁所有數字在補貨後五分鐘內重新計算；現時有貨的分店是即時的。",
    "引用請附連結及日期：這些數字一直在變。",
  ],
  faq: (x: SupplyView): Faq[] => {
    const { d } = x;
    const w = d.last7;
    return [
      { q: `Apple ${inAt(x.c)}仍在補貨 iPhone Duo 嗎？`, a: d.n ? `仍在：過去七日${inAt(x.c)} ${n(w.stores)} 間 Apple Store 確認補貨 ${n(w.restocks)} 次，自${longYmd(d.since)}起共 ${n(d.n)} 次。上一次是${d.sinceLastHours != null ? `${hoursAgo(d.sinceLastHours)}前` : "暫未記錄"}。` : `自${longYmd(d.since)}開始追蹤以來，${inAt(x.c)}未有已確認的補貨；第一次出現後五分鐘內本頁會更新。` },
      { q: `${ofAt(x.c)}iPhone Duo 缺貨有改善嗎？`, a: d.trend === "insufficient" ? `言之尚早：第一次完整的按週比較要到${longYmd(d.comparableFrom)}才會出現。留意兩個數字——每週補貨次數及上架秒數；兩個都上升才算紓緩。` : `本週補貨${vsLastWeek(d)}（${signed(d.change!)}）${w.medianSec ? `，一次補貨上架中位數 ${secs(w.medianSec)}` : ""}。紓緩是補貨更多兼上架更久；目前${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "兩個數字都朝對的方向走" : "只有其中一部分在發生"}。` },
      { q: "iPhone Duo 幾時才會容易買到？", a: "Apple 以外沒有人說得準，PickupChecker 也不作預測。可以留意的次序：每週補貨連續兩三週上升，上架時間中位數超過 20 分鐘，然後大部分分店同時有貨、apple.com 的送貨預計縮至一星期內。" },
      { q: "與其等，不如付溢價買？", a: `只有在等候的代價高過溢價時才值得：以目前速度，附近有提醒的分店幾日內就會輪到，確認補貨後約 ${SPEED.alertSec} 秒提醒就到。轉售還代表沒有退貨期，以及一般的風險；渠道比較頁會逐一衡量。` },
      { q: "聖誕檔期會改變機會嗎？", a: "踏入 12 月需求上升，而到貨維持原有節奏，所以上架時間傾向縮短而非拉長。留一張送貨訂單作後備，讓提醒去搶取貨；哪個不需要就取消哪個。" },
    ];
  },
  sources: { newsroom: "Apple Newsroom – iPhone Duo 在全球 Apple Store 登場", pickup: "Apple – 店舖取貨", log: "PickupChecker – 本頁數據所依據的補貨記錄", restockTimes: "PickupChecker – Apple 幾時補貨 iPhone Duo" },
  ld: (x: SupplyView) => ({
    datasetName: `iPhone Duo 供應趨勢，${cn(x.c.cc)} Apple Store`,
    description: `自${longYmd(x.d.since)}起${storesPhrase(x)}每日已確認的 iPhone Duo 補貨：次數、分店、上架時間中位數、按週變化。`,
    measured: ["每日補貨次數", "有補貨的分店", "上架時間中位數", "按週變化", "現時有貨的分店"],
  }),
  related: "繼續閱讀",
  sameData: "同一組數據，其他問題",
  otherCountries: "其他國家／地區的同一頁",
  questions: { restockTimes: "Apple 幾時補貨 iPhone Duo？", configs: "哪款配置最容易買到？", channels: "Apple、電訊商還是零售商？", sellOut: "補貨後幾快售罄？", howToGet: "怎樣買到 iPhone Duo", alerts: "最快收到通知的方法" },
  setUpAlert: "設定提醒",
  logLive: "補貨記錄（即時）",
  faqTitle: "常見問題",
  onThisPage: "本頁內容",
};

/* ================================================================== Apple vs carriers vs retailers */
const channels: DecideDict["channels"] = {
  crumb: "Apple、電訊商還是零售商？",
  title: (c: Country, retailer: string) => (c.cc === "us"
    ? fitW([`iPhone Duo：Apple、${retailer} 還是電訊商？`, "iPhone Duo：Apple、零售商還是電訊商？"], 49)
    : fitW([`iPhone Duo ${cn(c.cc)}：Apple、電訊商還是零售商？`, `iPhone Duo：Apple、電訊商還是零售商？（${cn(c.cc)}）`, "iPhone Duo：Apple、電訊商還是零售商？"], 49)),
  metaDescription: (x: ChannelsView) => fitW([
    `${inAt(x.c)}究竟去哪裏才買得到 iPhone Duo：Apple Store 取貨（自${longYmd(x.sup.since)}起 ${n(x.stores)} 間分店確認補貨 ${n(x.sup.n)} 次）、apple.com 送貨、${lw(x.ch.carriers.slice(0, 3))}、${lw(x.ch.retailers.slice(0, 2))} 及轉售——每個渠道能告訴你甚麼、不能告訴你甚麼，以及該盯哪個。`,
    `${inAt(x.c)}買 iPhone Duo：Apple Store 取貨、apple.com 送貨、${lw(x.ch.carriers.slice(0, 2))}、${x.ch.retailers[0] ?? "零售商"} 及轉售的比較——每個渠道能告訴你甚麼，該盯哪個。`,
    `${inAt(x.c)}買 iPhone Duo：Apple Store 取貨、apple.com 送貨、電訊商、零售商及轉售的比較，以及該盯哪個。`,
  ], 160),
  h1: (x: ChannelsView) => `Apple Store、電訊商還是零售商：${inAt(x.c)}究竟去哪裏才買得到 iPhone Duo？`,
  intro: (x: ChannelsView) => `Apple Store 取貨是${inAt(x.c)}唯一可以量度供應的 iPhone Duo 渠道：自${longYmd(x.sup.since)}起，PickupChecker 在${storesPhrase(x)}確認補貨 ${n(x.sup.n)} 次，其中 ${n(x.sup.last7.restocks)} 次在過去七日，每個數字都是每 ${SPEED.checkSec} 秒從 Apple 自家取貨頁讀回來的。電訊商（${lw(x.ch.carriers)}）和零售商（${lw(x.ch.retailers)}）各有自己的配貨，但不公開任何存貨資訊，所以沒有人——我們不能，任何人都不能——誠實地告訴你它們幾時補貨。下面是每個渠道能告訴你甚麼、不能告訴你甚麼、各自的取捨，以及該按甚麼次序去盯。`,
  updated: (x: ChannelsView, stamp: string) => `更新於 ${stamp} · Apple Store 數據自${longYmd(x.sup.since)}起 · ${n(x.stores)} 間 Apple Store · 每 ${SPEED.checkSec} 秒檢查一次`,
  nav: { compare: "逐個渠道", pickup: "取貨 vs 送貨", carriers: "電訊商", retailers: "零售商", resale: "轉售溢價", abroad: "外地購買", method: "我們怎樣知道" },
  h2: (x: ChannelsView) => ({
    compare: `${inAt(x.c)}哪個渠道最常補貨 iPhone Duo？`,
    pickup: "Apple Store 取貨比 apple.com 訂購送貨快嗎？",
    carriers: `應該改為在 ${x.ch.carriers.length ? lw(x.ch.carriers.slice(0, 3), 3) : "電訊商"} 買 iPhone Duo 嗎？`,
    retailers: `${x.ch.retailers.length ? lw(x.ch.retailers.slice(0, 2), 2) : "零售商"} 值得看看嗎？`,
    resale: `在 ${x.ch.resale[0] ?? "二手平台"} 付溢價值得嗎？`,
    abroad: "可以在外地買 iPhone Duo 回來用嗎？",
    method: "我們怎樣知道這些",
  }),
  hero: { restocks: "Apple Store 已確認補貨", last7: "過去 7 日", now: ((one: boolean) => (one ? "Apple Store 現時有貨" : "現時有貨的 Apple Store")) as unknown as DecideDict["channels"]["hero"]["now"], channels: "其他渠道，沒有公開存貨資訊" },
  compareLead: (x: ChannelsView) => `Apple Store 取貨——以唯一可以量度的尺計：過去七日${inAt(x.c)} ${n(x.sup.last7.stores)} 間分店確認補貨 ${n(x.sup.last7.restocks)} 次${x.sup.last7.medianSec ? `，每次上架中位數 ${secs(x.sup.last7.medianSec)}` : ""}。電訊商和零售商幾乎肯定也有補貨——它們的配貨來自同一批 Apple 出貨——但它們只在產品頁顯示有或沒有，沒有任何記錄可供追蹤，所以下面比較的是「你盯得到甚麼」，而不是「誰拿得更多」。`,
  compareCaption: "iPhone Duo 各渠道，老實比較",
  compareHead: ["渠道", "存貨已知多少", "怎樣盯", "代價"],
  compareRows: (x: ChannelsView) => {
    const r = x.ch;
    return [
      { channel: "Apple Store 取貨", known: `自${longYmd(x.sup.since)}起 ${n(x.sup.n)} 次已確認補貨；每一次、每一間分店都有時間記錄。`, watch: `這裏的提醒（確認後約 ${SPEED.alertSec} 秒），或 Apple Store App 的取貨分店選擇器。`, catch: "上架大約只有一分鐘；App 要開着，付款卡要儲存好。" },
      { channel: "apple.com 送貨", known: "Apple 在結帳時顯示送貨預計日期；每日變動，從來不是存貨數字。", watch: "先落單；訂單頁的預計日期會隨 Apple 出貨更新。", catch: "以星期計，不是分鐘——但你的位置保得住。" },
      { channel: `電訊商（${lw(r.carriers)}）`, known: "各有配貨；網上按款式顯示有貨／缺貨。沒有歷史，沒有資訊源。", watch: "它們的 App 和門市搜尋；打電話去門市仍然有用。", catch: x.c.cc === "hk" ? lockZh(x) : "要受月費計劃、分期及啟用條款約束；存貨因門市而異。" },
      { channel: `零售商（${lw(r.retailers)}）`, known: "各有配貨，新機往往只在網上賣；產品頁按款式顯示。", watch: "它們的產品頁和 App；少數會發補貨電郵。", catch: "配貨比 Apple 少，同樣幾分鐘內售罄。" },
      { channel: `轉售（${lw(r.resale)}）`, known: "有價就一直有貨。", watch: "—", catch: `要付溢價，沒有原廠購買記錄，${r.returnDays ? `也沒有${returnPhrase(r.returnDays)}` : "也完全沒有退貨期"}。` },
    ];
  },
  compareKeys: (x: ChannelsView) => [
    `${inAt(x.c)}有 ${n(x.ch.carriers.length + x.ch.retailers.length)} 個其他賣家，卻沒有一個公開存貨歷史：任何網站聲稱知道電訊商幾時補貨，都是在猜。`,
    "我們的立場：用提醒盯 Apple Store 取貨，留一張 apple.com 送貨訂單作後備，路過零售商時順便看看它的頁面。",
  ],
  pickupLead: (x: ChannelsView) => `要快，取貨：在取貨頁出現的款式當分鐘就可以預留，即日取機；送貨訂單則要等 Apple 的預計日期。要穩，送貨：不論貨架上發生甚麼，訂單都替你保着位置。${x.sup.lifetimes ? `${inAt(x.c)}取貨上架的中位數為 ${secs(x.sup.lifetimes.medianSec)}，${pct(x.sup.lifetimes.within2min)} 在兩分鐘內售罄——這正是提醒存在的原因。` : ""}正確答案是兩樣都做：今日落送貨訂單，設好取貨提醒，哪個不需要就取消哪個。`,
  pickupSwaps: () => [
    { no: "取消送貨訂單「重新開始」", yes: "等取貨到手才取消", why: "Apple 不公開排隊位置；新訂單只會拿到今日的預計日期，很少早過你手上那張。" },
    { no: "自己手動刷新取貨頁", yes: "交給提醒去盯", why: `有提醒的分店每 ${SPEED.fastSec} 秒檢查一次，確認後約 ${SPEED.alertSec} 秒推送；人手刷新看到的，大多是已經賣完的。` },
    { no: "之後在結帳時把訂單改為取貨", yes: "提醒一響，另開一張取貨訂單預留", why: "取貨預留用的是分店存貨，送貨訂單用的是倉庫：兩條隊，取貨那條才是快的。" },
  ],
  pickupKeys: (x: ChannelsView) => [
    `Apple 自家頁面說明了取貨及送貨選項${x.ch.returnDays ? `，以及兩者均適用的 ${n(x.ch.returnDays)} 日退貨期` : x.ch.returnDays === 0 ? "；請注意 Apple 香港不接受無理由退貨，只為有瑕疵的貨品換貨" : ""}（來源見下）。`,
    "取貨預留本身就是一張指定分店的訂單；Apple 會替你保留，並通知你幾時來取。",
  ],
  carriersLead: (x: ChannelsView) => `如果你想分期、想連同月費計劃一併以舊機換新，或者你已經身在 ${x.ch.carriers[0] ?? "電訊商"} 門市而貨就在架上——可以。如果你想最快拿到手機，電訊商是另一場抽獎，機會更小，而且沒有辦法盯着。${lockZh(x)}它們的網店按款式顯示有沒有貨，看一眼不費事；只是別期望有歷史記錄或通知。`,
  carriersKeys: (x: ChannelsView) => [
    `${ofAt(x.c)}電訊商：${lw(x.ch.carriers.map(brand))}。`,
    "電訊商的存貨以門市計；網上顯示有貨的門市，可能只限到店取貨。",
    "電訊商賣的 iPhone 是同一部硬件；分別在於綁在上面的合約。",
  ],
  retailersLead: (x: ChannelsView) => `你已經在那裏購物時值得看一眼，但不值得盯：${lw(x.ch.retailers)} 按款式列出 iPhone Duo，自己那份配貨在網上幾分鐘內賣完，也沒有可以訂閱的資訊源。它們的優勢是付款方式和積分；劣勢是配貨比 Apple 自家分店少。`,
  retailersKeys: (x: ChannelsView) => [
    `${ofAt(x.c)}零售商：${lw(x.ch.retailers.map(brand))}。`,
    "看產品頁的款式選擇器：灰掉代表網上缺貨，與門市存貨無關。",
  ],
  resaleLead: (x: ChannelsView) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `很少值得。把溢價和它買回來的時間放在一起衡量：本週${ofAt(x.c)}Apple Store ${perDay >= 1 ? `每日補貨約 ${n(Math.round(perDay))} 次` : "每日補貨不足一次"}，確認補貨後約 ${SPEED.alertSec} 秒提醒就到你手機，所以你附近有提醒的分店通常幾日內就會輪到。相對地，${lw(x.ch.resale)} 沒有原廠購買記錄，${x.ch.returnDays ? `沒有${returnPhrase(x.ch.returnDays)}` : "完全沒有退貨期"}，還有一般的風險——被啟用鎖鎖住的機、換過的盒、「未開封」的退貨。`;
  },
  resaleKeys: () => [
    "真的要買二手：當面交收，開機，在「設定 → 一般 → 關於本機」核對序號，付款前先登入。",
    "Apple 的保養跟機不跟單——但可能會被要求出示購買證明；私人買賣給不了 Apple 的那一張。",
    "超過一星期等候代價的溢價，是為不耐煩付的錢；想清楚再決定。",
  ],
  abroadLead: (x: ChannelsView) => `多數可以，但要核對：在 Apple 買的 iPhone 在大部分國家／地區都不鎖台，Apple 的保養服務在國際間通用（有例外），機型要支援你本地電訊商的頻段——還有 eSIM，因為 Apple 每個國家／地區的購買頁都把 iPhone Duo 列為只支援 eSIM。真正的成本是稅：${x.c.pricesIncludeTax ? "你在外地付的價錢已包含當地稅項，未必能夠免除" : "銷售稅在付款時另加"}，回程時本地海關也可能徵收關稅。PickupChecker 追蹤${x.us ? "另外 18 個國家／地區" : "美國及另外 17 個國家／地區"}，所以「有沒有貨」這個問題本身，在各地頁面都找得到答案。`,
  abroadKeys: () => [
    "購買前：看 Apple 的保養頁有哪些地方提供服務、機型的頻段及 SIM 列表、你本地電訊商的 eSIM 支援。",
    "保留收據：維修及任何退貨都按購買地的規則處理。",
    "替家人買的機同樣是在外地買的機；同一套核對照做。",
  ],
  methodLead: (x: ChannelsView) => `本頁的 Apple Store 數字來自 PickupChecker 自${longYmd(x.sup.since)}起每 ${SPEED.checkSec} 秒對${storesPhrase(x)}的檢查；兩次一致的觀測後才算一次補貨。電訊商及零售商名單是 Apple 自己為該地列出的賣家，加上最大的轉售平台，以它們自己的頁面為來源；我們對它們存貨的描述，就是它們頁面顯示的——是一個快照，不是歷史。我們不抓取它們的網站，也不對它們的補貨時間作任何聲稱。`,
  methodKeys: () => ["歡迎更正：如果本頁某個賣家已不再售賣 iPhone Duo，告訴我們，我們會把它移除。", "引用請附連結及日期。"],
  faq: (x: ChannelsView): Faq[] => [
    { q: `${inAt(x.c)}哪個渠道補貨 iPhone Duo 最快？`, a: `唯一有可量度記錄的渠道是 Apple Store 取貨：過去七日${inAt(x.c)}確認補貨 ${n(x.sup.last7.restocks)} 次${x.sup.last7.medianSec ? `，每次上架中位數 ${secs(x.sup.last7.medianSec)}` : ""}。電訊商和零售商也會補貨，但不公開任何資訊，所以沒有人能老實地替它們排名。` },
    { q: "取消 apple.com 訂單再重新落單，會失去排隊位置嗎？", a: "你會拿到一張新訂單，預計日期是今日的；Apple 不公開排隊位置。取消前，先把結帳時顯示的預計日期與你現有訂單的比較一下——新的很少會早過舊的。" },
    { q: "電訊商賣的 iPhone Duo 和 Apple 的有分別嗎？", a: `同一部硬件。${lockZh(x)}電訊商的存貨與 Apple 的分開，按門市顯示。` },
    { q: "在零售商買，可以享用 Apple 的退貨期嗎？", a: x.ch.returnDays ? `不可以——適用的是該零售商自己的政策。Apple 的 ${n(x.ch.returnDays)} 日退貨期只適用於向 Apple 購買（apple.com 及 Apple Store）。` : x.ch.returnDays === 0 ? "Apple 香港本身就不接受無理由退貨（只為有瑕疵的貨品換貨），所以要看該零售商自己的政策——有些在這一點上比 Apple 寬鬆。" : "不可以——適用的是該零售商自己的政策；Apple 的退貨期只涵蓋向 Apple 購買的產品。" },
    { q: "Apple 為 iPhone Duo 列出了哪些電訊商？", a: x.c.cc === "us" || x.c.cc === "jp" ? `Apple ${inAt(x.c)}的購買頁列出 ${lw(x.ch.carriers)}；其他國家／地區的購買頁都以不鎖台的形式出售，沒有電訊商步驟。` : `Apple ${inAt(x.c)}的購買頁以不鎖台的形式出售 iPhone Duo，沒有列出任何電訊商；${lw(x.ch.carriers)} 是 Apple 列為在當地支援 iPhone 的網絡，它們按自己的條款出售。` },
    { q: "在外地買的 iPhone Duo，可以配本地電訊商使用嗎？", a: "通常可以，只要機型支援你電訊商的頻段、你的電訊商提供 eSIM（iPhone Duo 在所有地方都只支援 eSIM），而且手機不鎖台——Apple 自家出售的在大部分國家／地區都是如此。保養服務國際通用但有例外；稅項和關稅才是真正的額外成本。" },
  ],
  sources: { buy: "Apple – 購買 iPhone Duo", pickup: "Apple – 店舖取貨及送貨", returns: "Apple – 退貨及換貨政策", warranty: "Apple – 各國家／地區的保養服務", log: "PickupChecker – 本頁數據所依據的補貨記錄" },
  ld: (x: ChannelsView) => ({
    description: `${inAt(x.c)}買 iPhone Duo：Apple Store 取貨、apple.com 送貨、電訊商、零售商及轉售的比較——已量度的 Apple Store 補貨，以及其他渠道能告訴你甚麼、不能告訴你甚麼。`,
  }),
  related: "繼續閱讀",
  sameData: "同一組數據，其他問題",
  otherCountries: "其他國家／地區的同一頁",
  questions: { howToGet: "怎樣買到 iPhone Duo", whereToBuy: "今日去哪裏買", shortage: "缺貨有改善嗎？", configs: "哪款配置最容易買到？", restockTimes: "Apple 幾時補貨 iPhone Duo？", alerts: "最快收到通知的方法" },
  setUpAlert: "設定提醒",
  logLive: "補貨記錄（即時）",
  faqTitle: "常見問題",
  onThisPage: "本頁內容",
};

/* ================================================================== the public API */
const api: DecideDict["api"] = {
  crumb: "現貨 API",
  title: (c: Country) => fitW([`iPhone Duo ${cn(c.cc)}現貨 API：免費 JSON 即時數據`, `iPhone Duo ${cn(c.cc)}現貨 API（免費 JSON）`, `iPhone Duo 現貨 API（${cn(c.cc)}）`], 49),
  metaDescription: (x: ApiView) => fitW([
    `免費、只讀的 JSON API，提供${x.c.cc === "us" ? " " : ofAtN(x.c)}${n(x.stores)} 間 Apple Store 的 iPhone Duo 取貨現貨（全球 ${n(x.worldStores)} 間、${n(x.countries)} 個國家／地區）：每間分店每款配置的現時狀態、過去 24 小時已確認的補貨，無需金鑰，快取 30 秒。端點、curl／Python／JavaScript 範例、限額，以及甚麼時候腳本勝過提醒。`,
    `${ofAtN(x.c)}${n(x.stores)} 間 Apple Store 的 iPhone Duo 現貨免費 JSON API：逐店現貨、過去 24 小時補貨，無需金鑰。端點、範例及限額。`,
  ], 160),
  h1: (x: ApiView) => `有沒有 API 或腳本可以監察${at(x.c)} Apple Store 的 iPhone Duo 現貨？`,
  intro: (x: ApiView) => `有：PickupChecker 公開一個免費、只讀的 JSON API，涵蓋${storesPhrase(x)}（全球共 ${n(x.worldStores)} 間分店、${n(x.countries)} 個國家／地區），數據來自每間分店每 ${SPEED.checkSec} 秒一次的檢查，在邊緣節點快取 30 秒，無需金鑰，無需註冊。一個請求回傳每間分店按配置的 iPhone Duo 現時取貨狀態；另一個回傳過去 24 小時已確認的補貨。此刻${inAt(x.c)} ${n(x.stores)} 間分店中有 ${n(x.storesNow)} 間有貨，過去 24 小時確認補貨 ${n(x.restocks24)} 次。下面有：端點、可直接運行的 curl、Python 及 JavaScript 範例、欄位說明、限額——以及為甚麼以 30 秒快取間隔輪詢的腳本，始終比推送提醒慢。`,
  updated: (x: ApiView, stamp: string) => `更新於 ${stamp} · ${ofAtN(x.c)}${n(x.stores)} 間 Apple Store · 每 ${SPEED.checkSec} 秒檢查一次 · API 快取 30 秒`,
  nav: { endpoints: "端點", examples: "範例", fields: "欄位", limits: "限額與條款", script: "腳本還是提醒？", apple: "抓取 apple.com", method: "數據來源" },
  h2: (x: ApiView) => ({
    endpoints: `${ofAt(x.c)}iPhone Duo 現貨 API 回傳甚麼？`,
    examples: "怎樣用 curl、Python 或 JavaScript 呼叫？",
    fields: "各欄位是甚麼意思？",
    limits: "可以多頻密輪詢？有甚麼條款？",
    script: "自己寫腳本，還是直接用提醒？",
    apple: "可以自己輪詢 apple.com 嗎？",
    method: "數據來源",
  }),
  hero: { stores: ((one: boolean) => (one ? "涵蓋的 Apple Store" : "涵蓋的 Apple Store 數目")) as unknown as DecideDict["api"]["hero"]["stores"], now: "現時有 iPhone Duo 的分店", restocks24: "過去 24 小時已確認補貨", cache: "API 快取秒數" },
  perMinute: "每個 IP 每分鐘的請求上限",
  keysNeeded: "需要的 API 金鑰",
  endpointsLead: (x: ApiView) => `三個 GET 端點，全部回傳 JSON，全部在 https://pickupchecker.com/api/v1 之下：\`stock\` 回傳${ofAt(x.c)}每間 Apple Store 現時可供取貨的配置及最後檢查時間；\`restocks\` 回傳過去 1–168 小時已確認的補貨，最新的排最前，並註明是否仍在上架；\`iphone-duo\` 是 \`stock?model=duo\` 的捷徑。國家／地區代碼放在路徑中（${x.c.cc}${x.c.cc === "uk" ? "，亦接受 gb" : ""}）；型號為 duo、18-pro 及 18-pro-max。`,
  endpointsCaption: "端點（把 {country} 換成 us、ca、uk、au、de、fr、it、es、jp、kr、hk、sg、ae、ch、nl、se、tw、at 或 be）",
  endpointsHead: ["端點", "回傳", "參數"],
  endpointsRows: (x: ApiView) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: "每間分店：in_stock、現有配置、last_checked_at、last_in_stock_at；另有含 stores_in_stock 的摘要。", params: "model（duo | 18-pro | 18-pro-max）、storage（例如 512GB）、color（例如 night-sky）" },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: "已確認補貨，最新排最前：at、store、配置、still_listed。", params: "model、hours（1–168，預設 24）、limit（1–200，預設 100）" },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: "重新導向至 stock?model=duo。", params: "—" },
    { path: "/api/v1", returns: "這個列表、國家／地區與型號、限額。", params: "—" },
  ],
  examplesLead: "複製其中一段；每段都會印出現時有 iPhone Duo 的分店。無需金鑰，除了一個寫明你腳本名稱的 User-Agent 之外不需要其他標頭（這樣它出問題時我們才能聯絡你）。",
  exampleTitles: { curl: "curl（任何 shell）", python: "Python 3，只用標準程式庫", node: "JavaScript（Node 18+ 或瀏覽器）" },
  fieldsLead: "所有欄位都是 snake_case，所有時間都是 UTC 的 ISO 8601。分店識別碼用 Apple 自己的（R 開頭的編號），與 Apple 的分店頁及本站的 URL 一致。",
  fieldsCaption: "欄位說明",
  fieldsHead: ["欄位", "類型", "意思"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "這個回應的計算時間；CDN 最多會沿用 30 秒。" },
    { f: "country.code / name / currency", t: "string", m: "分店所屬的國家／地區。" },
    { f: "configurations[]", t: "object", m: "查詢涵蓋的零件編號，連 Apple 寫法的容量及顏色。" },
    { f: "summary.stores_in_stock", t: "integer", m: "現時至少有一款涵蓋配置可供取貨的分店數。" },
    { f: "stores[].store_number", t: "string", m: "Apple 的分店編號，例如 R085。" },
    { f: "stores[].in_stock", t: "boolean", m: "至少有一款涵蓋配置可供取貨。" },
    { f: "stores[].available[]", t: "object", m: "現時列出的配置：part_number、storage、color。" },
    { f: "stores[].last_checked_at", t: "string | null", m: `我們上次讀取這間分店 Apple 取貨頁的時間（通常在 ${SPEED.checkSec} 秒之內）。` },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "這間分店上一次列出涵蓋配置的時刻。" },
    { f: "restocks[].at", t: "string", m: "該配置由售罄變為有貨的時間（經兩次檢查確認）。" },
    { f: "restocks[].still_listed", t: "boolean | null", m: "回應當刻該分店是否仍列出該款。" },
    { f: "attribution", t: "object", m: "來源、授權說明及本頁。" },
  ],
  limitsLead: "每個端點的輪詢間隔請保持 30 秒或以上——回應在邊緣節點快取這麼久，間隔更短只會拿到同一份 JSON——同一個 IP 每分鐘的請求不要超過 60 次，這是會到達我們伺服器的上限。數據可免費使用，包括商業用途，只有一個條件：在數字出現的地方標示「來源：PickupChecker」並連結至 pickupchecker.com（或對應的分店／國家／地區頁）。無需金鑰，無需註冊，CORS 開放，所以瀏覽器頁面可以直接呼叫。",
  limitsKeys: () => [
    "收到 429 代表你的 IP 一分鐘內超過 60 次請求；請等 Retry-After 指定的秒數。",
    "不相容的改動會用新的版本路徑（/api/v2）；v1 之下只會新增欄位，不會改名。",
    "請設定一個寫明你的專案及聯絡方式的 User-Agent；我們從未封鎖過有禮的腳本。",
  ],
  scriptLead: (x: ApiView) => `如果你想做儀表板、Discord 機械人、試算表或研究，寫腳本——API 就是為此而設。如果你想真正買到一部 iPhone Duo，腳本是較慢的工具：它要到下一次輪詢才看到補貨，最多遲 30 秒，然後還要想辦法通知你；我們的推送提醒每 ${SPEED.fastSec} 秒讀取同一批分店，確認補貨後約 ${SPEED.alertSec} 秒到你手機——${x.storesNow !== undefined ? "在約一分鐘的上架中位數之內" : "在上架中位數之內"}。很多人兩樣都用：提醒用來買，API 用來看。`,
  scriptCaption: "輪詢腳本 vs 推送提醒",
  scriptHead: ["", "你在這個 API 上的腳本", "PickupChecker 提醒"],
  scriptRows: () => [
    { k: "多久後看到補貨", a: "最多 30 秒（快取）+ 你的間隔", b: `約 ${SPEED.alertSec} 秒` },
    { k: "怎樣到你手機", a: "你自己搭的（電郵、機械人、SMS）", b: "主畫面 App 的通知" },
    { k: "盯着的分店", a: "每次呼叫全部分店", b: `你揀選的分店每 ${SPEED.fastSec} 秒，全部分店每 ${SPEED.checkSec} 秒` },
    { k: "費用", a: "免費", b: "提醒需要付費方案；本站內容免費閱讀" },
  ],
  appleLead: "可以，但有限制：apple.com 的取貨頁按分店及配置回答，這正是我們讀的東西。一次性腳本欠的是細節——IPv6 輪換好讓 Apple 持續回應、兩次觀測規則好讓一閃而過的「沒有貨」不會變成假補貨、每間分店的時區處理，以及自發售日起保存的記錄。如果你只想要答案，這個 API 就是做好了的那份工；如果你想學，我們的運作原理頁逐項解釋。",
  appleKeys: () => [
    "Apple 的頁面是一個快照：只告訴你現在，從不告訴你一次上架維持了多久、上一次是幾時。",
    `我們每間分店的檢查相隔 ${SPEED.checkSec} 秒，最密也不會快過 ${SPEED.fastSec} 秒；比這更密地輪詢 apple.com 的腳本會被封鎖，甚麼也學不到。`,
  ],
  methodLead: (x: ApiView) => `每個數字都來自 PickupChecker 每 ${SPEED.checkSec} 秒讀取${storesPhrase(x)}的 Apple 自家店舖取貨現貨（有提醒的分店每 ${SPEED.fastSec} 秒）。狀態變化要兩次一致的觀測才會寫入；中斷後的首次出現不算補貨。API 提供的就是本站頁面讀取的同一批資料表；沒有抽樣，沒有估算。`,
  methodKeys: () => ["完整方法：運作原理頁。", "署名就是全部的代價；一條回連讓它一直免費。"],
  faq: (x: ApiView): Faq[] => [
    { q: `${ofAt(x.c)}Apple Store iPhone Duo 現貨有免費 API 嗎？`, a: `有——PickupChecker 的，在 https://pickupchecker.com/api/v1/${x.c.cc}/stock：${ofAt(x.c)}每間 Apple Store 現時可供取貨的配置，JSON，無需金鑰，快取 30 秒。另一個端點回傳過去 24 小時已確認的補貨。` },
    { q: "Apple 有官方現貨 API 嗎？", a: "沒有公開的。apple.com 的取貨頁可以按分店及配置讀取，本站就是這樣做，而且做得小心（輪換、確認、時區）；這裏的 API 就是把這份工作以 JSON 形式開放出來。" },
    { q: "數據有多新？", a: `每間分店每 ${SPEED.checkSec} 秒檢查一次（有提醒的分店每 ${SPEED.fastSec} 秒），API 回應快取 30 秒，所以一個數字最多約 45 秒前的；last_checked_at 會告訴你準確時間。` },
    { q: "可以用在商業產品嗎？", a: "可以，但要署名：在顯示數據的地方標示「來源：PickupChecker」並連結至 pickupchecker.com，輪詢間隔 30 秒或以上。無需金鑰。" },
    { q: "腳本會比提醒更快買到 iPhone Duo 嗎？", a: `不會：腳本要到下一次輪詢才看到補貨，最多遲 30 秒；提醒則先確認，再在我們看到後約 ${SPEED.alertSec} 秒送到你手機。腳本用來看，提醒用來買。` },
  ],
  sources: { pickup: "Apple – 店舖取貨", method: "PickupChecker – 檢查怎樣運作", log: "PickupChecker – 補貨記錄" },
  ld: (x: ApiView) => ({
    description: `免費 JSON API，提供${storesPhrase(x)}的 iPhone Duo 取貨現貨：每間分店每款配置的現時狀態、過去 24 小時已確認的補貨。`,
  }),
  related: "繼續閱讀",
  sameData: "同一組數據，其他問題",
  otherCountries: "其他國家／地區的同一頁",
  questions: { alerts: "最快收到通知的方法", howItWorks: "檢查怎樣運作", restockTimes: "Apple 幾時補貨 iPhone Duo？", shortage: "缺貨有改善嗎？", configs: "哪款配置最容易買到？", stockChecker: "iPhone Duo 現貨查詢" },
  setUpAlert: "設定提醒",
  tryIt: "打開即時 JSON",
  faqTitle: "常見問題",
  onThisPage: "本頁內容",
};

export const decide: DecideDict = { configs, supply, channels, api };
