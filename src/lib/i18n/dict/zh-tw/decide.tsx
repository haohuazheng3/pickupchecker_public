/**
 * 台灣中文：decide —— 四個決策頁（seo.md §16）：哪個 iPhone Duo 規格最容易買到、缺貨緩解了嗎、Apple 直營店／
 * 電信商／經銷商該選哪個、公開的現貨 API。每個問題下先給一句帶數字的答案；數字全部來自 lib/content/duoDecide.ts
 * 與 channels.ts。規格、顏色、店名、門市時間由頁面元件以 Apple 台灣的寫法傳入（x.cfg、x.colour、x.storeName、
 * x.storeWhen），國名用 places.countryLabel；`c.inName`／`c.short` 是英文資料，句子裡不用。
 * 事實口徑不變：檢查間隔只寫 15 秒與 5 秒（SPEED）；API 快取 30 秒一律寫成「間隔 30 秒」；機型名、容量、品牌、
 * 電信商與經銷商名稱、URL、欄位名不翻譯；不提退款（Apple 的是「退換貨期限」）。
 */
import type { Faq } from "@/lib/content/types";
import type { Country } from "@/lib/apple/countries";
import type { DuoSupply } from "@/lib/content/duoDecide";
import { exposureHours } from "@/lib/content/duoDecide";
import { SPEED } from "@/lib/plans";
import type { ChannelsView, DecideCtx, DecideDict } from "../en/decide";
import { fitTitleW, list } from "../../format";
import { L, cn, longYmdZh, n, ymdZh, zs as zs0 } from "./util";

/** 中英混排補空格（util.zs），並去掉兩個中文字之間多出來的空格（「Apple 直營店 的」→「Apple 直營店的」）。 */
const HAN = "⺀-⿿぀-ヺー-ヿ㐀-䶿一-鿿豈-﫿";
const GAP = new RegExp(`([${HAN}]) +(?=[${HAN}])`, "g");
const zs = (s: string) => zs0(s).replace(GAP, "$1");

/* ---------------------------------------------------------------- 小工具 */

/** 國名：「台灣」。 */
const C = (c: Country) => cn(c.cc);
/** 百分比；不到 0.5% 寫「<1%」。 */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
/** 帶正負號的變化：「+12%」「−8%」。 */
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.round(Math.abs(x) * 100)}%`;
/** 累計上架時間：「38.4 小時」，不到一小時「41 分鐘」。 */
const hours = (sec: number) => (sec >= 3600 ? `${n(exposureHours(sec))} 小時` : `${Math.max(1, Math.round(sec / 60))} 分鐘`);
/** 在架秒數：「79 秒」，兩分鐘以上「3 分鐘」。 */
const secs = (s: number) => (s >= 120 ? `${Math.round(s / 60)} 分鐘` : `${Math.round(s)} 秒`);
/** 「1.6 倍」。 */
const ratio = (a: number, b: number) => (b > 0 ? `${n(Math.round((a / b) * 10) / 10)} 倍` : "—");
/** 「甲、乙和丙」（Intl）。 */
const li = (items: string[]) => list(L, items);
/** 「Apple Store」（美國）／「Apple 直營店」（其他國家），沿用 views.tsx 的寫法。 */
const AS = (c: Country) => (c.cc === "us" ? "Apple Store" : "Apple 直營店");
/** 「台灣唯一的 Apple 直營店」／「台灣全部 2 家 Apple 直營店」。 */
const storesPhrase = (x: DecideCtx) => (x.one ? `${C(x.c)}唯一的 ${AS(x.c)}` : `${C(x.c)}全部 ${n(x.stores)} 家 ${AS(x.c)}`);
/** 「2 家 Apple 直營店」。 */
const kStores = (x: DecideCtx, k: number) => `${n(k)} 家 ${AS(x.c)}`;
/** 本週補貨相對上週：「比上週多」「比上週少」「和上週差不多」。 */
const trendWord = (d: DuoSupply) => (d.trend === "up" ? "比上週多" : d.trend === "down" ? "比上週少" : "和上週差不多");
/** 「Apple 的 14 天退換貨期限」；香港：Apple 不接受非瑕疵退貨；未確認時用中性寫法。 */
const returnPhrase = (days: number | null) => (days ? `Apple 的 ${days} 天退換貨期限` : days === 0 ? "Apple 在當地的不退貨政策（只有瑕疵品能換貨）" : "Apple 的退換貨政策");
/**
 * 電信商鎖機一句話：台灣用中文寫定（事實同 channels.ts 的 tw.carrierLock）；其他國家沿用 channels.ts 的英文原句
 * （資料層，不在字典裡翻），沒有時用 fallback。
 */
const lockLine = (x: ChannelsView, fallback: string) =>
  x.c.cc === "tw" ? "Apple 在台灣賣的 iPhone 都是無鎖版；電信商通路賣的機器有沒有綁約鎖，我們沒有查證。" : x.ch.carrierLock ?? fallback;

/**
 * 單複數標籤：英文型別把 `(one) => "a" | "b"` 推成字面量聯集，中文字串放不進去；這裡轉成同一個函式型別
 * （執行期就是原函式）。
 */
const ol = <T,>(f: (one: boolean) => string) => f as unknown as T;

/* ================================================================== 哪個規格最容易買到 */
const configs: DecideDict["configs"] = {
  crumb: "哪個規格？",
  title: (c) => {
    const w = C(c);
    return fitTitleW([
      zs(`${w}哪個 iPhone Duo 規格最常補貨？容量與顏色的機率`),
      zs(`${w}哪個 iPhone Duo 規格最常補貨、最容易買到？`),
      zs(`${w}哪個 iPhone Duo 規格最容易買到？`),
      "哪個 iPhone Duo 規格最容易買到？",
    ], 49);
  },
  metaDescription: (x) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, w = C(x.c);
    return e && h
      ? fitTitleW([
        zs(`${w}最容易買到的 iPhone Duo 是 ${x.cfg(e)}：自 ${longYmdZh(d.since)}起 ${kStores(x, x.stores)} 經確認的 ${n(d.n)} 次補貨中佔 ${n(e.restocks)} 次，累計上架 ${hours(e.exposureSec)}；最難買到的是 ${x.cfg(h)}（${n(h.restocks)} 次）。每個規格依容量與顏色排名，每次補貨即更新。`),
        zs(`${w}最容易買到的 iPhone Duo 是 ${x.cfg(e)}（自 ${longYmdZh(d.since)}起 ${n(d.n)} 次補貨中佔 ${n(e.restocks)} 次）；最難的是 ${x.cfg(h)}。每個規格依容量與顏色排名。`),
      ], 160)
      : zs(`${w}每個 iPhone Duo 規格，依 ${AS(x.c)} 自 ${longYmdZh(d.since)}起經確認的補貨次數排名：容量、顏色、在架時間，以及現在哪些門市有上架。`);
  },
  h1: (x) => zs(`${C(x.c)}哪個 iPhone Duo 規格最常補貨、最容易買到？`),
  intro: (x) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, w = C(x.c);
    if (!e) return zs(`自 ${longYmdZh(d.since)}起，PickupChecker 在${storesPhrase(x)}確認了 ${n(d.n)} 次 iPhone Duo 補貨——次數還太少，排不出各規格的名次。下方表格會隨每一次補貨補齊；美國頁面已經看得出規律。`);
    const st = d.byStorage, co = d.byColor;
    const last = st[st.length - 1];
    const storageBit = st.length > 1
      ? `補貨次數受容量影響遠大於顏色：${last.restocks > 0 ? `${st[0].key} 機型的補貨次數是 ${last.key} 的 ${ratio(st[0].restocks, last.restocks)}` : `${st[0].key} 機型佔了 ${pct(st[0].share)} 的補貨，${last.key} 則一次都還沒補過`}${co.length > 1 ? `；${x.colour(co[0].key)}只比${x.colour(co[1].key)}多 ${Math.abs(Math.round((co[0].share - co[1].share) * 100))} 個百分點` : ""}。`
      : "";
    return zs(`${w}累計上架時間最長的 iPhone Duo 規格是 ${x.cfg(e)}：自 ${longYmdZh(d.since)}起，PickupChecker 在${storesPhrase(x)}確認的 ${n(d.n)} 次補貨中，它佔 ${n(e.restocks)} 次，出現在 ${n(e.stores)} 家門市，累計上架 ${hours(e.exposureSec)}${e.lifetimes ? `，每次上架中位數維持 ${secs(e.lifetimes.medianSec)} 才賣完` : ""}。${h ? `上架時間最短的是 ${x.cfg(h)}：補貨 ${n(h.restocks)} 次、累計上架 ${hours(h.exposureSec)}。` : ""}${storageBit}沒有人能告訴你最後買得到哪一個；量得到的是過去的取貨時段，這一頁排的就是它。`);
  },
  updated: (x, stamp) => zs(`更新於 ${stamp} · 資料自 ${longYmdZh(x.d.since)}起 · ${kStores(x, x.stores)} · 每 ${SPEED.checkSec} 秒檢查一次（有通知的門市每 ${SPEED.fastSec} 秒）`),
  nav: { easiest: "上架最久", storage: "容量", colour: "顏色", shelf: "搶購時間", week: "本週", alerts: "該盯什麼", method: "怎麼計算" },
  h2: (x) => ({
    easiest: zs(`${C(x.c)}哪個 iPhone Duo 規格累計上架最久？`),
    storage: "容量大小會改變補貨次數嗎？",
    colour: `${x.d.byColor.length > 1 ? `${x.colour(x.d.byColor[0].key)}還是${x.colour(x.d.byColor[1].key)}` : "哪個顏色"}：哪個顏色比較常補貨？`,
    shelf: "哪個規格留給你最多時間搶？",
    week: "最近七天有什麼變化？",
    alerts: "我應該為哪些規格設通知？",
    method: "我們怎麼計算一次補貨與在架時間",
  }),
  hero: {
    restocks: (label) => zs(`${label} 經確認的補貨次數`),
    exposure: "累計上架小時數，全部門市加總",
    now: ol((one) => (one ? "這家店現在有上架" : "家門市現在有上架")),
    median: "在架秒數中位數",
    total: "全部規格的補貨次數",
  },
  easiestLead: (x) => {
    const e = x.d.easiest!;
    return zs(`${x.cfg(e)} 在兩個量得到的指標上都領先：補貨最多次（${n(e.restocks)} 次，佔全部的 ${pct(e.restocks / x.d.n)}），累計上架時間也最長（${hours(e.exposureSec)}）——也就是可以預約取貨的時間。${e.nowStores > 0 ? `你讀到這裡的此刻，有 ${n(e.nowStores)} 家門市上架中。` : "此刻沒有門市上架；下一次補貨幾秒內就會出現在這裡。"}`);
  },
  easiestKeys: (x) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      zs(`累計上架時間前三名：${li(top3.map((r) => `${x.cfg(r)}（${hours(r.exposureSec)}）`))}。`),
      d.never.length ? zs(`自 ${longYmdZh(d.since)}起在${C(x.c)}從未補貨：${li(d.never.map((r) => x.cfg(r)))}。`) : zs(`自 ${longYmdZh(d.since)}起，每個規格都至少補過一次。`),
      d.lifetimes ? zs(`所有規格合計，一次補貨在架中位數 ${secs(d.lifetimes.medianSec)}；${pct(d.lifetimes.within2min)} 在 2 分鐘內就沒了。`) : "某個規格累積十次有明確售完時間的補貨後，才會顯示在架時間。",
    ];
  },
  rankCaption: (x) => zs(`${C(x.c)}每個 iPhone Duo 規格，累計上架時間最長的排前面 · ${longYmdZh(x.d.since)}至今`),
  rankHead: ["規格", "補貨次數", "門市數", "累計上架", "在架中位數", "現在上架", "上次補貨"],
  none: "還沒有",
  storageLead: (x) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return "有補貨進來後才會比較各容量；下方表格即時更新。";
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return zs(`會，而且比其他任何因素都重要：${st[0].key} 佔了 ${pct(st[0].share)} 的補貨，${st[1].key} 佔 ${pct(st[1].share)}${big ? `，1TB 與 2TB 機型合計只有 ${pct(big / x.d.n)}` : ""}。Apple 出貨以多數人下單的容量為主；最熱門的容量，也是門市一次到貨會拿到好幾台的容量。`);
  },
  groupCaption: (what) => (what === "storage" ? "依容量的補貨次數，全部門市加總" : "依顏色的補貨次數，全部門市加總"),
  groupHead: (what) => [what === "Storage" ? "容量" : "顏色", "補貨次數", "占比", "門市數", "累計上架", "在架中位數", "現在上架"],
  storageSwaps: (x) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: zs(`只為 ${last} 設通知`), yes: zs(`先設 ${top}，${last} 也一起設`), why: zs(`${last} 只佔 ${pct(st[st.length - 1].share)} 的補貨，${top} 佔 ${pct(st[0].share)}。兩則通知各佔一個名額。`) },
      { no: "死等想要的那個容量", yes: zs(`${top} 或 ${second} 一來就先拿`), why: zs(`這兩個容量佔了${C(x.c)}全部補貨的 ${pct(st[0].share + st[1].share)}；有保護殼和 iCloud 在，容量的差別遠比多等幾週小。`) },
    ];
  },
  colourLead: (x) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return "有補貨進來後才會比較顏色。";
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return zs(`${x.colour(co[0].key)}，但差距不大：佔 ${pct(co[0].share)} 的補貨，${x.colour(co[1].key)}佔 ${pct(co[1].share)}，差 ${gap} 個百分點${co[0].medianSec && co[1].medianSec ? `；在架中位數分別是 ${secs(co[0].medianSec)} 與 ${secs(co[1].medianSec)}` : ""}。顏色對補貨次數的影響遠小於容量。多盯一個顏色，就多了那個顏色的取貨時段：${co[1].restocks > 0 ? `自 ${longYmdZh(x.d.since)}起，${C(x.c)}的${x.colour(co[1].key)}多了 ${n(co[1].restocks)} 次補貨、${hours(co[1].exposureSec)}上架時間，加在${x.colour(co[0].key)}的 ${n(co[0].restocks)} 次、${hours(co[0].exposureSec)}之上（所有容量合計）` : `自 ${longYmdZh(x.d.since)}起，${C(x.c)}的${x.colour(co[1].key)}一次都還沒補貨，所以到目前為止不會多出任何時段`}。`);
  },
  colourKeys: (x) => x.d.byColor.map((g) => zs(`${x.colour(g.key)}：補貨 ${n(g.restocks)} 次、${n(g.stores)} 家門市，累計上架 ${hours(g.exposureSec)}${g.nowStores ? `，現在 ${n(g.nowStores)} 家門市上架中` : ""}。`)),
  shelfLead: (x) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return "一次補貨的在架時間，從補貨算到下一次檢查顯示售完為止；某個規格累積十次已結束的補貨後，才會出現第一批數字。";
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return zs(`${x.cfg(slow)} 留給你最多時間：售完前在架中位數 ${secs(slow.lifetimes!.medianSec)}，${x.cfg(fast)} 只有 ${secs(fast.lifetimes!.medianSec)}。賣得慢的是貴的大容量——要的人少——所以「最有時間搶」和「補貨最多」指向不同的規格，上方的排名兩者都納入了。`);
  },
  shelfCaption: "各規格的在架時間（補貨 → 下一次檢查顯示售完）",
  shelfHead: ["規格", "有明確結束的補貨", "中位數", "2 分鐘內售完", "20 分鐘內售完", "最快"],
  shelfKeys: (x) => [
    zs(`一半的補貨在${x.d.lifetimes ? ` ${secs(x.d.lifetimes.medianSec)} ` : "大約一分鐘"}內就沒了；我們確認補貨後約 ${SPEED.alertSec} 秒送出推播，剩下的時間夠不夠，取決於你的手機和事先準備好的結帳流程。`),
    zs(`這個時間是上限：售完狀態要到下一次檢查才看得到，最多晚 ${SPEED.checkSec} 秒（有通知的門市 ${SPEED.fastSec} 秒）。`),
    "這裡的「售完」指的是 Apple 取貨頁面不再在該門市列出這個規格；當時有幾支，Apple 不會公布。",
  ],
  weekLead: (x) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return zs(`${C(x.c)}最近十四天沒有補貨；下一次補貨後，週對週的表格就會開始。`);
    const lead = rows[0];
    return zs(`最近七天補貨 ${n(tot7)} 次${totP ? `，前一週 ${n(totP)} 次（${signed(tot7 / totP - 1)}）` : ""}，領先的是 ${x.cfg(lead)}，${n(lead.last7)} 次。${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `這和累計榜首（${x.cfg(x.d.easiest)}）不是同一個規格：每批到貨的組合都會變，決定為哪個規格設通知前，先看這張表。` : "累計榜首本週仍然領先。"}`);
  },
  weekCaption: "各規格補貨次數：最近 7 天 vs 前 7 天",
  weekHead: ["規格", "最近 7 天", "前 7 天", "變化"],
  alertsLead: (x) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? zs(`在你最快到得了的兩三家門市，為 ${li(top.map((r) => x.cfg(r)))} 設通知；這幾個規格涵蓋了${C(x.c)}目前 ${pct(top.reduce((a, r) => a + r.restocks, 0) / x.d.n)} 的補貨。再把你真正想要的那個規格加成第四則，哪個先來就拿哪個。`)
      : zs(`在${C(x.c)}有補貨之前，先在離你最近的門市為你要的容量兩個顏色都設通知。`);
  },
  alertsKeys: (x) => [
    "通知以「門市 × 規格」計，三家門市 × 三個規格就是 9 則通知。",
    zs(`有通知的門市每 ${SPEED.fastSec} 秒檢查一次，確認補貨後才推播；推播約 ${SPEED.alertSec} 秒後送出，橫幅何時出現在你的手機上，取決於手機和網路，我們沒有量測。`),
    `${x.one ? "" : "挑門市看距離，不要看補貨次數："}最忙的門市，也是最多人盯著的門市。`,
  ],
  methodLead: "一次補貨 = 某個規格在某家門市從售完變成可取貨，且連續兩次檢查一致才算；追蹤中斷後的首次出現不計。在架時間從補貨算到第一次顯示售完的檢查為止，所以是上限。「累計上架」把該規格每次補貨的在架時間加總——這是衡量「可以預約取貨多久」最直接的指標。它是過去上架的紀錄，不是買到的機率，也不是賣出的數量：兩者 Apple 都不公布。",
  methodKeys: (x) => [
    zs(`來源：${storesPhrase(x)}在 Apple 自家取貨供應頁的資料，自 ${longYmdZh(x.d.since)}起每家門市每 ${SPEED.checkSec} 秒讀一次（有通知的門市每 ${SPEED.fastSec} 秒）。`),
    "「現在上架」與上次補貨時間是即時的；其餘數字在五分鐘內重算。",
    "歡迎引用，請附連結：數字會變，請註明你讀取的日期。",
  ],
  faq: (x): Faq[] => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor, w = C(x.c);
    const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage));
    const bn = big.reduce((a, r) => a + r.restocks, 0);
    const maxStores = big.length ? Math.max(...big.map((r) => r.stores)) : 0;
    return [
      { q: zs(`${w}最容易買到的 iPhone Duo 是哪個？`), a: e ? zs(`沒有人能告訴你會買到哪一款：Apple 不公布配貨量，也不公布有多少人在搶。能量測的是過去的取貨時段。自 ${longYmdZh(d.since)}起，${storesPhrase(x)}經確認的 ${n(d.n)} 次補貨中，累計上架最久的是 ${x.cfg(e)}（在 ${kStores(x, e.stores)} 補貨 ${n(e.restocks)} 次，共 ${hours(e.exposureSec)}）${h ? `，最短的是 ${x.cfg(h)}（補貨 ${n(h.restocks)} 次，共 ${hours(h.exposureSec)}）` : ""}。這是過去上架的紀錄，不是對你能否買到的預測；想知道多加一個顏色或一家門市能多出多少時段，可以在通知設定的「加什麼最能增加取貨時段？」查看。`) : zs(`${w}經確認的補貨還太少，說不準；一有補貨進來，本頁就會為每個規格排名。`) },
      { q: co.length > 1 ? `${x.colour(co[1].key)}比${x.colour(co[0].key)}難找嗎？` : "某個顏色比另一個難找嗎？", a: co.length > 1 && d.n ? zs(`稍微：${x.colour(co[0].key)}佔 ${pct(co[0].share)} 的補貨，${x.colour(co[1].key)}佔 ${pct(co[1].share)}。容量之間的差距大得多，所以先選容量，再把它的兩個顏色都設通知。`) : "有補貨進來後才會比較顏色。" },
      { q: zs(`${w}的 1TB 或 2TB iPhone Duo 有過現貨嗎？`), a: bn ? zs(`有，但很少：${n(d.n)} 次補貨中，1TB 與 2TB 機型佔 ${n(bn)} 次（${pct(bn / d.n)}），單一規格最多出現在 ${maxStores ? `${n(maxStores)} 家門市` : "零家門市"}。它們一出現會留得比較久（要的人少），所以就算很少觸發，為它設一則通知也值得佔一個名額。`) : zs(`我們的資料裡還沒有：自 ${longYmdZh(d.since)}起，${w}沒有任何 1TB 或 2TB 機型經確認的補貨。`) },
      { q: "通知該設一個規格還是好幾個？", a: zs(`好幾個，但門市少一點：前三名規格佔了${w}${d.n ? ` ${pct(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n)} ` : "大部分"}的補貨。三個規格 × 三家附近門市 = 9 則通知，Plus 方案放得下；再把你真正想要的那個加成第四則。`) },
      { q: "其他國家的組合也一樣嗎？", a: zs(`不一定：每個國家有自己的配貨，各國頁面的排名可能不同。「其他國家／地區」下方的連結會打開 PickupChecker 追蹤的另外 18 個國家的同一頁；美國頁面的紀錄最長（自 ${longYmdZh("2026-10-29")}起）。`) },
    ];
  },
  sources: { apple: "Apple：iPhone Duo 規格與價格", pickup: "Apple：門市取貨", log: "PickupChecker：本頁據以計算的補貨紀錄" },
  ld: (x) => ({
    datasetName: zs(`${C(x.c)} ${AS(x.c)} 的 iPhone Duo 各規格補貨`),
    description: zs(`自 ${longYmdZh(x.d.since)}起${storesPhrase(x)}每一次經確認的 iPhone Duo 補貨，依規格（容量 × 顏色）統計：次數、門市數、累計上架時間、在架中位數、現在上架的門市數。`),
    measured: ["各規格補貨次數", "有補貨的門市數", "上架時間（秒）", "在架時間中位數", "現在上架的門市數"],
  }),
  related: "其他 iPhone Duo 問題",
  sameData: "用同一份數據回答",
  otherCountries: "其他國家／地區",
  questions: { restockTimes: "Apple 什麼時候補貨 iPhone Duo？", sellOut: "一次補貨多快賣完？", shortage: "缺貨緩解了嗎？", channels: "Apple、電信商還是經銷商？", alerts: "最快收到通知的方法", api: "免費現貨 API" },
  setUpAlert: "設定補貨通知",
  logLive: "即時補貨紀錄",
  faqTitle: "常見問題",
  onThisPage: "本頁內容",
};

/* ================================================================== 缺貨緩解了嗎 */
const supply: DecideDict["supply"] = {
  crumb: "缺貨緩解了嗎？",
  title: (c) => {
    const w = C(c);
    return fitTitleW([
      zs(`${w}的 iPhone Duo 缺貨緩解了嗎？每週趨勢`),
      zs(`${w}的 iPhone Duo 缺貨緩解了嗎？`),
      "iPhone Duo 缺貨緩解了嗎？",
    ], 49);
  },
  metaDescription: (x) => {
    const { d } = x;
    const w = d.last7, where = C(x.c);
    return d.trend !== "insufficient"
      ? fitTitleW([
        zs(`${where}本週 iPhone Duo 補貨${trendWord(d)}：7 天內 ${kStores(x, w.stores)} 補貨 ${n(w.restocks)} 次（較前一週 ${signed(d.change!)}）${w.medianSec ? `，每次中位數 ${secs(w.medianSec)} 就沒了` : ""}。逐日供應量、「緩解」會是什麼樣子，以及該不該再等。`),
        zs(`${where}最近 7 天 iPhone Duo 補貨 ${n(w.restocks)} 次（週對週 ${signed(d.change!)}）。逐日供應量，以及缺貨是否在緩解。`),
      ], 160)
      : zs(`${where}的 iPhone Duo 缺貨緩解了嗎？自 ${longYmdZh(d.since)}起 ${AS(x.c)} 經確認的補貨 ${n(d.n)} 次，逐日列出，附「緩解」會是什麼樣子，以及該等還是現在買。`);
  },
  h1: (x) => zs(`${C(x.c)}的 iPhone Duo 缺貨有好轉嗎？還會缺多久？`),
  intro: (x) => {
    const { d } = x;
    const w = d.last7, where = C(x.c);
    if (d.trend === "insufficient") {
      return zs(`${where}現在還說不準：PickupChecker 從 ${longYmdZh(d.since)}開始追蹤，到今天 ${n(d.days)} 天，第一次完整的週對週比較要到 ${longYmdZh(d.comparableFrom)}才會出現。目前為止 ${kStores(x, x.stores)} 中有 ${n(d.storesEver)} 家、共 ${n(d.n)} 次經確認的補貨${d.lifetimes ? `，每次上架中位數維持 ${secs(d.lifetimes.medianSec)} 就賣完` : ""}；此刻 ${n(d.storesNow)} 家門市有 Duo 上架。沒有人能預測缺貨何時結束；本頁放的是最先會透露答案的兩個數字——每週補貨次數與在架秒數——每次補貨都更新。`);
    }
    const verdict = d.trend === "up" ? "供應在改善" : d.trend === "down" ? "供應在收緊" : "供應持平";
    const demand = w.medianSec
      ? (w.medianSec <= 120
        ? `但需求照樣秒殺：本週一次補貨中位數維持 ${secs(w.medianSec)}${d.prev7.medianSec ? `（上週 ${secs(d.prev7.medianSec)}）` : ""}，所以手動搶還沒有變容易`
        : `而且在架時間在拉長：本週中位數 ${secs(w.medianSec)}${d.prev7.medianSec ? `，上週 ${secs(d.prev7.medianSec)}` : ""}，這是緩解的第一個跡象`)
      : "";
    return zs(`${where}${verdict}：最近七天 ${AS(x.c)} 補貨 iPhone Duo ${n(w.restocks)} 次，較前一週（${n(d.prev7.restocks)} 次）${signed(d.change!)}，${n(x.stores)} 家中有 ${n(w.stores)} 家補過貨${demand ? `——${demand}` : ""}。此刻 ${n(d.storesNow)} 家門市有上架。沒有人能預測結束時間；最先透露答案的兩個數字就在本頁，每次補貨都更新。`);
  },
  updated: (x, stamp) => zs(`更新於 ${stamp} · 資料自 ${longYmdZh(x.d.since)}起 · ${kStores(x, x.stores)} · 每 ${SPEED.checkSec} 秒檢查一次`),
  nav: { trend: "本週", easier: "更好買了嗎", stores: "幾家門市", howlong: "還要多久", christmas: "等還是買", world: "其他國家", method: "怎麼計算" },
  h2: (x) => ({
    trend: zs(`${C(x.c)}的 iPhone Duo 補貨在增加還是減少？`),
    easier: "真的變得比較好買了嗎？",
    stores: zs(`${C(x.c)}有幾家 ${AS(x.c)} 曾經有過 iPhone Duo？`),
    howlong: "iPhone Duo 的缺貨還會持續多久？",
    christmas: "該繼續等補貨，還是換個方式買？",
    world: x.us ? "其他國家的缺貨緩解得比較快嗎？" : `其他國家的缺貨比${C(x.c)}緩解得更快嗎？`,
    method: "怎麼計算",
  }),
  weekBefore: "前一週",
  goneIn2: "2 分鐘內售完",
  storesEverLabel: ol((one) => (one ? "目前經確認的補貨次數" : "至少補過一次貨的門市")),
  hero: { last7: "最近 7 天補貨次數", change: "與前 7 天相比", stores: ol((one) => (one ? "有補貨的天數" : "最近 7 天補過貨的門市")), median: "最近 7 天在架秒數中位數", now: ol((one) => (one ? "這家店現在有上架" : "家門市現在有上架")), sinceLast: "距上次補貨的小時數" },
  trendLead: (x) => {
    const { d } = x;
    if (d.trend === "insufficient") return zs(`逐日表格就是目前的全部紀錄：${n(d.days)} 天內補貨 ${n(d.n)} 次。週對週的比較要到 ${longYmdZh(d.comparableFrom)}才會出現；在那之前，請逐日看方向。`);
    const w = d.last7, p = d.prev7;
    const gap = w.longestGapHours != null ? `本週兩次補貨之間最長間隔 ${n(w.longestGapHours)} 小時${p.longestGapHours != null ? `（上週 ${n(p.longestGapHours)} 小時）` : ""}。` : "";
    return zs(`本週${trendWord(d)}：補貨 ${n(w.restocks)} 次（每家門市 ${(w.perStoreDay * 7).toFixed(1)} 次），前一週 ${n(p.restocks)} 次，${signed(d.change!)}。${gap}補貨跟著到貨一波一波來，單一天安靜不代表什麼；該看的是七天的總數。`);
  },
  dailyCaption: (x) => zs(`${C(x.c)}每個當地日經確認的補貨，最新的在上（最近 14 天）`),
  dailyHead: ["日期", "補貨次數", "門市數", "在架中位數"],
  trendKeys: (x) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? zs(`目前最忙的一天：${ymdZh(best.date)}，${n(best.stores)} 家門市補貨 ${n(best.restocks)} 次。`) : "還沒有補貨；最忙的一天會顯示在這裡。",
      x.d.sinceLastHours != null && x.d.latest ? zs(`上次補貨在${x.d.sinceLastHours < 1 ? "不到 1 小時" : `${n(x.d.sinceLastHours)} 小時`}前：${x.storeName(x.d.latest.storeNumber)}，${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}。`) : "還沒有補貨紀錄。",
      zs(`「增加」指比前一週至少多 ${Math.round(0.15 * 100)}%；「減少」指至少少 ${Math.round(0.15 * 100)}%；介於中間算持平。`),
    ];
  },
  easierLead: (x) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return "「好買」同時要看兩件事：補貨更多，而且每次上架留得更久。這段期間內有十次補貨有明確售完時間後，才會顯示在架時間。";
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return zs(`${longer ? "有一點" : shorter ? "沒有——反而相反" : "還沒有"}：本週一次補貨在架中位數 ${secs(w.medianSec)}${p.medianSec ? `，上週 ${secs(p.medianSec)}` : ""}，${pct(w.within2min!)} 在兩分鐘內就沒了${p.within2min != null ? `（上週 ${pct(p.within2min)}）` : ""}。緩解是兩個數字一起動——補貨更多、在架更久；只有補貨變多，表示 Apple 出得更多，但等的人也一樣多。`);
  },
  easierKeys: (x) => [
    "在這裡「緩解」會是什麼樣子：在架中位數超過 20 分鐘、多數門市同時有上架、apple.com 的送貨預估縮到一週以內。",
    zs(`在那之前，買到的方法仍然是通知：我們確認補貨後約 ${SPEED.alertSec} 秒送出推播，遠在中位數的在架時間之內。`),
    x.d.lifetimes ? zs(`${C(x.c)}累計：${n(x.d.lifetimes.n)} 次有明確結束的補貨，中位數 ${secs(x.d.lifetimes.medianSec)}，${pct(x.d.lifetimes.within2min)} 在 2 分鐘內售完。`) : "累計十次已結束的補貨後，會顯示整體的在架時間。",
  ],
  storesLead: (x) => {
    const { d } = x;
    const never = x.stores - d.storesEver, w = C(x.c);
    return x.one
      ? zs(`${d.storesEver ? `有：${w}唯一的 ${AS(x.c)} 自 ${longYmdZh(d.since)}起有 ${n(d.n)} 次經確認的補貨` : `還沒有：自 ${longYmdZh(d.since)}起，${w}唯一的 ${AS(x.c)} 沒有經確認的補貨`}${d.storesNow ? "，而且此刻就有 Duo 上架" : ""}。`)
      : zs(`${w} ${kStores(x, x.stores)} 中有 ${n(d.storesEver)} 家（${pct(d.storesEver / x.stores)}）自 ${longYmdZh(d.since)}起至少有一次經確認的 iPhone Duo 補貨${never ? `；${n(never)} 家還沒有` : ""}。此刻 ${n(d.storesNow)} 家有上架。供應分布不均：旗艦店與大型商場店補貨最多，所以設通知時挑哪家門市，和挑哪個規格一樣重要。`);
  },
  storesKeys: (x) => [
    zs(`各門市補貨次數與當地時間：見${C(x.c)}補貨時段頁的「哪幾家」一節。`),
    "從沒補過貨的門市，不代表 Apple 跳過它：配貨跟著到貨來，有幾家門市到第二週才拿到第一台 Duo。",
  ],
  howlongLead: (x) => zs(`Apple 以外沒有人知道，我們也不做預測。${C(x.c)}的紀錄顯示：${n(x.d.days)} 天內補貨 ${n(x.d.n)} 次，${x.d.trend === "insufficient" ? `週對週趨勢自 ${longYmdZh(x.d.comparableFrom)}起才有` : `本週補貨${trendWord(x.d)}`}，在架時間${x.d.last7.medianSec ? `約 ${secs(x.d.last7.medianSec)}` : "不到幾分鐘"}。缺貨結束有一套可以在這裡盯著看的順序：每週補貨次數上升、在架時間從幾秒拉長到幾小時、接著多數門市同時有上架，apple.com 的送貨預估縮到幾天。`),
  howlongKeys: () => [
    "訊號 1——每週補貨次數連續兩三週上升（上方表格）。",
    "訊號 2——在架中位數超過 20 分鐘：補貨撐得比刷頁面的人久。",
    "訊號 3——apple.com 的送貨預估縮到一週以內，而且多數門市同時有上架。",
    "新顏色或新容量上市會讓一切重來；在訊號 3 出現前，通知先別關。",
  ],
  christmasLead: (x) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return zs(`通知繼續開著，同時在 apple.com 排一張宅配訂單——兩個都要，不是選一個。以目前的速度（${perDay >= 1 ? `${C(x.c)}一天約補貨 ${n(Math.round(perDay))} 次` : `${C(x.c)}一天不到一次補貨`}${w.medianSec ? `，每次在架中位數 ${secs(w.medianSec)}` : ""}），你附近有在盯的門市幾天內就會輪到，而一次經確認的補貨，我們看到後約 ${SPEED.alertSec} 秒就會送出推播。到別處加價買，只有在「等待本身比加價更貴」時才划算；通路比較頁會誠實地替你算這筆帳。`);
  },
  christmasKeys: () => [
    "先在 apple.com 下宅配訂單：它替你保住順位，門市取貨搶到後可以取消。",
    "在離你最近的門市，為補貨最多的兩三個規格設通知（規格頁會告訴你是哪幾個）。",
    "Apple Store App 先登入、Duo 先放進購物袋、卡片存好：在架中位數大約一分鐘。",
  ],
  worldLead: (x) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return "等每個國家都有完整一週的資料後，這裡會比較各國每家門市的每週補貨次數。";
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return zs(`最近七天每家門市補貨最多的是${top.name}（每店 ${(top.perStoreDay * 7).toFixed(1)} 次），最少的是${bottom.name}（${(bottom.perStoreDay * 7).toFixed(1)} 次）${mine ? `；${C(x.c)}是 ${(mine.perStoreDay * 7).toFixed(1)} 次` : ""}。配貨量與上市日期因國家而異，所以緩解不會同時出現；美國的紀錄最長。`);
  },
  worldCaption: "各國最近 7 天：補貨次數、每店補貨、在架中位數、現在上架的門市",
  worldHead: ["國家／地區", "門市", "補貨（7 天）", "每店", "在架中位數", "現在上架"],
  methodLead: zs(`一次補貨 = 某個規格在某家門市從售完變成可取貨，且間隔 ${SPEED.checkSec} 秒的兩次檢查一致才算（有通知的門市 ${SPEED.fastSec} 秒）；追蹤中斷後的首次出現不計。「日」以門市當地日計。在架時間從補貨算到第一次顯示售完的檢查——是上限，以下一次檢查為準。「週」是最近七個當地日對再前七日；兩邊都完整才比較。`),
  methodKeys: (x) => [
    zs(`來源：${storesPhrase(x)}在 Apple 取貨供應頁的資料，自 ${longYmdZh(x.d.since)}起。`),
    "本頁所有數字在補貨後五分鐘內重算；「現在上架」是即時的。",
    "引用請附連結與日期：這些數字會動。",
  ],
  faq: (x): Faq[] => {
    const { d } = x;
    const w = d.last7, where = C(x.c);
    return [
      { q: zs(`Apple 還在${where}補貨 iPhone Duo 嗎？`), a: d.n ? zs(`還在：最近七天${where} ${kStores(x, w.stores)} 經確認補貨 ${n(w.restocks)} 次，自 ${longYmdZh(d.since)}起共 ${n(d.n)} 次。上一次是${d.sinceLastHours != null && d.sinceLastHours < 1 ? "不到 1 小時前" : d.sinceLastHours != null ? `${n(d.sinceLastHours)} 小時前` : "尚未記錄到"}。`) : zs(`自 ${longYmdZh(d.since)}開始追蹤以來，${where}還沒有經確認的補貨；第一次出現後五分鐘內本頁就會更新。`) },
      { q: zs(`${where}的 iPhone Duo 缺貨有好轉嗎？`), a: d.trend === "insufficient" ? zs(`還太早：第一次完整的週對週比較要到 ${longYmdZh(d.comparableFrom)}才會出現。盯兩個數字——每週補貨次數與在架秒數；兩個都上升才叫緩解。`) : zs(`本週補貨${trendWord(d)}（${signed(d.change!)}）${w.medianSec ? `，一次補貨中位數維持 ${secs(w.medianSec)}` : ""}。緩解要補貨更多、在架更久同時發生；目前${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "兩者都朝對的方向走" : "只做到了一部分"}。`) },
      { q: "iPhone Duo 什麼時候會變好買？", a: "Apple 以外沒有人說得準，PickupChecker 也不預測。該盯的順序：每週補貨連續兩三週上升、在架中位數超過 20 分鐘、接著多數門市同時有上架，apple.com 的送貨預估縮到一週以內。" },
      { q: "與其等，該不該加價買？", a: zs(`只有在等待比加價更貴時才值得：以目前的速度，你附近有在盯的門市幾天內就會輪到，而通知在經確認的補貨後約 ${SPEED.alertSec} 秒送出。轉售也沒有退換貨期限，還有一般的風險；通路比較頁有完整的權衡。`) },
      { q: "年末旺季會改變機率嗎？", a: "需求一路升到十二月，而到貨維持原有的節奏，所以在架時間往往變短而不是變長。留一張宅配訂單當後盾，讓通知替你搶門市取貨；哪個不需要就取消哪個。" },
    ];
  },
  sources: { newsroom: "Apple Newsroom：iPhone Duo 抵達全球 Apple 直營店", pickup: "Apple：門市取貨", log: "PickupChecker：本頁據以計算的補貨紀錄", restockTimes: "PickupChecker：Apple 什麼時候補貨 iPhone Duo" },
  ld: (x) => ({
    datasetName: zs(`${C(x.c)} ${AS(x.c)} 的 iPhone Duo 供應趨勢`),
    description: zs(`自 ${longYmdZh(x.d.since)}起${storesPhrase(x)}每天經確認的 iPhone Duo 補貨：次數、門市數、在架中位數、週對週變化。`),
    measured: ["每日補貨次數", "有補貨的門市數", "在架時間中位數", "週對週變化", "現在上架的門市數"],
  }),
  related: "其他 iPhone Duo 問題",
  sameData: "用同一份數據回答",
  otherCountries: "其他國家的同一頁",
  questions: { restockTimes: "Apple 什麼時候補貨 iPhone Duo？", configs: "哪個規格最容易買到？", channels: "Apple、電信商還是經銷商？", sellOut: "一次補貨多快賣完？", howToGet: "怎麼買到 iPhone Duo", alerts: "最快收到通知的方法" },
  setUpAlert: "設定補貨通知",
  logLive: "即時補貨紀錄",
  faqTitle: "常見問題",
  onThisPage: "本頁內容",
};

/* ================================================================== Apple 直營店、電信商還是經銷商 */
const channels: DecideDict["channels"] = {
  crumb: "Apple、電信商還是經銷商？",
  title: (c, retailer) => fitTitleW([
    zs(`iPhone Duo 要在 Apple、${retailer} 還是電信商買？`),
    zs(`${C(c)} iPhone Duo：Apple 直營店、電信商還是經銷商？`),
    "iPhone Duo：Apple、電信商還是經銷商？",
  ], 49),
  metaDescription: (x) => fitTitleW([
    zs(`${C(x.c)}到底要去哪裡買 iPhone Duo：${AS(x.c)} 門市取貨（自 ${longYmdZh(x.sup.since)}起 ${kStores(x, x.stores)} 經確認補貨 ${n(x.sup.n)} 次）、apple.com 宅配、${li(x.ch.carriers.slice(0, 3))}、${li(x.ch.retailers.slice(0, 2))} 與轉售平台——每個通路能告訴你什麼、不能告訴你什麼，以及該盯哪個。`),
    zs(`iPhone Duo 在${C(x.c)}：${AS(x.c)} 門市取貨 vs apple.com 宅配 vs ${li(x.ch.carriers.slice(0, 2))} vs ${x.ch.retailers[0] ?? "經銷商"} vs 轉售——每個通路能告訴你什麼，以及該盯哪個。`),
  ], 160),
  h1: (x) => zs(`${AS(x.c)}、電信商還是經銷商：在${C(x.c)}到底要去哪裡買 iPhone Duo？`),
  intro: (x) => zs(`${AS(x.c)} 門市取貨是${C(x.c)}唯一一個供應量量得出來的 iPhone Duo 通路：自 ${longYmdZh(x.sup.since)}起，PickupChecker 在${storesPhrase(x)}確認了 ${n(x.sup.n)} 次補貨，其中 ${n(x.sup.last7.restocks)} 次在最近七天，每一次都是每 ${SPEED.checkSec} 秒讀一次 Apple 自家取貨頁得來的。電信商（${li(x.ch.carriers)}）與經銷商（${li(x.ch.retailers)}）各有自己的配貨，但不公開任何庫存資料，所以沒有人——我們不能，別人也不能——誠實地告訴你它們幾點補貨。下面是每個通路能告訴你什麼、不能告訴你什麼、各自的取捨，以及該按什麼順序盯。`),
  updated: (x, stamp) => zs(`更新於 ${stamp} · ${AS(x.c)} 資料自 ${longYmdZh(x.sup.since)}起 · ${kStores(x, x.stores)} · 每 ${SPEED.checkSec} 秒檢查一次`),
  nav: { compare: "逐一比較", pickup: "取貨 vs 宅配", carriers: "電信商", retailers: "經銷商", resale: "轉售加價", abroad: "出國買", method: "我們怎麼知道" },
  h2: (x) => ({
    compare: zs(`${C(x.c)}哪個通路最常補貨 iPhone Duo？`),
    pickup: zs(`${AS(x.c)} 門市取貨比在 apple.com 訂宅配快嗎？`),
    carriers: zs(`我該改向 ${x.ch.carriers.length ? li(x.ch.carriers.slice(0, 3)) : "電信商"} 買 iPhone Duo 嗎？`),
    retailers: zs(`${x.ch.retailers.length ? li(x.ch.retailers.slice(0, 2)) : "經銷商"} 值得查嗎？`),
    resale: zs(`在 ${x.ch.resale[0] ?? "轉售平台"} 加價買值得嗎？`),
    abroad: "可以在國外買 iPhone Duo 帶回來用嗎？",
    method: "我們怎麼知道這些",
  }),
  hero: { restocks: "Apple 直營店經確認的補貨次數", last7: "最近 7 天", now: ol((one) => (one ? "這家 Apple 直營店現在有上架" : "家 Apple 直營店現在有上架")), channels: "個其他通路，沒有公開的庫存資料" },
  compareLead: (x) => zs(`${AS(x.c)} 門市取貨——以唯一量得出來的指標來看：最近七天${C(x.c)} ${n(x.sup.last7.stores)} 家門市經確認補貨 ${n(x.sup.last7.restocks)} 次${x.sup.last7.medianSec ? `，每次上架中位數 ${secs(x.sup.last7.medianSec)}` : ""}。電信商與經銷商幾乎肯定也會補貨——它們的配貨來自同一批 Apple 出貨——但它們只在商品頁顯示「有／沒有」，不提供資料流，所以下面的比較是「你能盯什麼」，不是「誰拿得比較多」。`),
  compareCaption: "iPhone Duo 的各個通路，誠實比較",
  compareHead: ["通路", "它的庫存我們知道多少", "怎麼盯", "缺點"],
  compareRows: (x) => {
    const r = x.ch;
    return [
      { channel: zs(`${AS(x.c)} 門市取貨`), known: zs(`自 ${longYmdZh(x.sup.since)}起 ${n(x.sup.n)} 次經確認的補貨；每一次、每一家門市，都有時間。`), watch: zs(`在這裡設通知（確認後約 ${SPEED.alertSec} 秒送出），或用 Apple Store App 的取貨門市選擇器。`), catch: "上架大約只有一分鐘；App 要開著、卡片要先存好。" },
      { channel: "apple.com 宅配", known: "Apple 在結帳時顯示送貨預估；它每天變動，從來不是庫存數字。", watch: "先下單；訂單頁的預估會隨 Apple 出貨更新。", catch: "以週計，不是以分計——但你的順位保得住。" },
      { channel: zs(`電信商（${li(r.carriers)}）`), known: "自有配貨；線上依規格顯示有貨／缺貨。沒有歷史紀錄，沒有資料流。", watch: "它們的 App 與門市查詢；打電話問門市也行。", catch: lockLine(x, "資費方案、分期與開通規定各不相同；庫存依門市而異。") },
      { channel: zs(`經銷商（${li(r.retailers)}）`), known: "自有配貨，新品常常只在線上賣；商品頁依規格顯示。", watch: "它們的商品頁與 App；少數會寄補貨通知信。", catch: "配貨量比 Apple 小，也是幾分鐘內賣完。" },
      { channel: zs(`轉售（${li(r.resale)}）`), known: "只要出得起價，隨時都有。", watch: "—", catch: zs(`要加價、沒有原廠購買紀錄，${r.returnDays ? `也沒有${returnPhrase(r.returnDays)}` : "而且完全沒有退換貨期限"}。`) },
    ];
  },
  compareKeys: (x) => [
    zs(`${C(x.c)}有 ${n(x.ch.carriers.length + x.ch.retailers.length)} 個其他賣家，沒有一個公開庫存歷史：任何號稱知道電信商補貨時間的網站都是在猜。`),
    "我們的立場：用通知盯 Apple 直營店的門市取貨，apple.com 宅配訂單當後盾，經銷商的頁面順路時看一眼就好。",
  ],
  pickupLead: (x) => zs(`比速度，門市取貨贏：取貨頁一出現某個規格，當下就能預約、當天取貨，宅配訂單則要等 Apple 的預估。比確定性，宅配贏：訂單替你保住順位，架上發生什麼都不影響。${x.sup.lifetimes ? `${C(x.c)}的取貨上架中位數只有 ${secs(x.sup.lifetimes.medianSec)}，${pct(x.sup.lifetimes.within2min)} 在兩分鐘內就沒了——這正是通知存在的理由。` : ""}正確答案是兩個都做：今天先訂宅配、設好取貨通知，哪個不需要就取消哪個。`),
  pickupSwaps: () => [
    { no: "取消宅配訂單「重新開始」", yes: "留著，直到取貨的手機拿到手", why: "Apple 不公布排隊順位；新訂單拿到的只是今天的預估，很少比你手上那張早。" },
    { no: "自己手動刷取貨頁", yes: "讓通知替你盯", why: zs(`有通知的門市我們每 ${SPEED.fastSec} 秒檢查一次，確認後約 ${SPEED.alertSec} 秒推播；人手刷新看到的，多半是已經沒了的上架。`) },
    { no: "之後再把訂單改成門市取貨", yes: "通知響了就另外下一張取貨訂單", why: "取貨預約吃的是門市庫存，宅配訂單吃的是倉庫：兩條不同的隊伍，而取貨那條是快的。" },
  ],
  pickupKeys: (x) => [
    zs(`Apple 自家頁面說明取貨與送貨選項${x.ch.returnDays ? `，以及兩者都適用的 ${x.ch.returnDays} 天退換貨期限` : x.ch.returnDays === 0 ? "；注意香港的 Apple 不接受非瑕疵退貨，只能換瑕疵品" : ""}（來源見下方）。`),
    "取貨預約就是一張指定那家門市的訂單；Apple 替你保留，並通知你何時去取。",
  ],
  carriersLead: (x) => zs(`如果你要分期、要搭資費方案折抵舊機，或者你人已經在 ${x.ch.carriers[0] ?? "電信商"} 門市、架上剛好有一台——可以。如果你要的是最快拿到手機，電信商是另一場機率更低、而且沒辦法盯的樂透。${lockLine(x, "買之前先確認鎖機與資費條款。")}它們的線上商店依規格顯示有無庫存，看一眼不花錢；只是別期待有歷史紀錄或通知。`),
  carriersKeys: (x) => [
    zs(`${C(x.c)}的電信商：${li(x.ch.carriers)}。`),
    "電信商的庫存以門市計；線上顯示有貨的門市，可能只限到店取貨。",
    "電信商賣的 iPhone 是同一台硬體；差別在綁在上面的合約。",
  ],
  retailersLead: (x) => zs(`順路時看一眼值得，專門盯不值得：${li(x.ch.retailers)} 依規格列出 iPhone Duo，自己的配貨幾分鐘內就在線上賣完，也沒有可以訂閱的資料流。它們的優勢是付款方式與回饋點數；劣勢是配貨量比 Apple 自家門市小。`),
  retailersKeys: (x) => [
    zs(`${C(x.c)}的經銷商：${li(x.ch.retailers)}。`),
    "看商品頁的規格選擇器：灰掉代表線上缺貨，但說不了它們實體店的情況。",
  ],
  resaleLead: (x) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return zs(`很少值得。把加價和它替你省下的等待放在一起算：${C(x.c)}的 ${AS(x.c)} 本週${perDay >= 1 ? `一天約補貨 ${n(Math.round(perDay))} 次` : "一天不到一次補貨"}，通知在經確認的補貨後約 ${SPEED.alertSec} 秒送出，所以你附近有在盯的門市通常幾天內就會輪到。相對地，${li(x.ch.resale)} 沒有原廠購買紀錄，${x.ch.returnDays ? `沒有${returnPhrase(x.ch.returnDays)}` : "完全沒有退換貨期限"}，還有一般的風險——啟用鎖沒解、盒子被換過、「全新未拆」其實是退貨。`);
  },
  resaleKeys: () => [
    "真要買二手：當面交易、開機、到「設定 → 一般 → 關於本機」核對序號，付錢前先登入。",
    "Apple 的保固跟著機器，不跟著收據——但可能被要求出示購買證明；私人交易給不了 Apple 的那份。",
    "加價超過一週等待的價值，就是在為沒耐心付錢；想清楚再決定。",
  ],
  abroadLead: (x) => zs(`通常可以，但要查幾件事：Apple 賣的 iPhone 在多數國家都是無鎖版，Apple 的保固服務跨國可用但有例外，而機型必須支援你家電信商的頻段——還有 eSIM，因為 Apple 各國購買頁都把 iPhone Duo 列為只支援 eSIM。真正的成本是稅：${x.c.pricesIncludeTax ? "你在國外付的價格含當地稅，可能退不回來" : "銷售稅在結帳時另加"}，回國時海關還可能課稅。PickupChecker 追蹤${x.us ? "另外 18 個國家" : "美國與另外 17 個國家"}，所以「有沒有貨」這個問題本身，各國頁面就能回答。`),
  abroadKeys: () => [
    "買之前：查 Apple 保固頁的服務地區、機型的頻段與 SIM 清單、你家電信商的 eSIM 支援。",
    "收據留好：維修與任何退換貨都依購買國的規定走。",
    "幫家人帶回來的手機，一樣是在國外買的；同樣的檢查都適用。",
  ],
  methodLead: (x) => zs(`本頁的 ${AS(x.c)} 數字來自 PickupChecker 自 ${longYmdZh(x.sup.since)}起每 ${SPEED.checkSec} 秒對${storesPhrase(x)}的檢查；連續兩次觀察一致才算一次補貨。電信商與經銷商名單是 Apple 自己為該國列出的賣家，加上最大的幾家經銷商，以它們自己的頁面為來源；我們對它們庫存的描述，就是它們頁面顯示的——是一個切面，不是歷史。我們不抓取它們的頁面，也不對它們的補貨時間做任何宣稱。`),
  methodKeys: () => ["歡迎更正：如果本頁某個賣家已經不賣 iPhone Duo，告訴我們，我們就拿掉。", "引用請附連結與日期。"],
  faq: (x): Faq[] => [
    { q: zs(`${C(x.c)}哪個通路補貨 iPhone Duo 最快？`), a: zs(`唯一有可量測紀錄的通路是 ${AS(x.c)} 門市取貨：最近七天${C(x.c)}經確認補貨 ${n(x.sup.last7.restocks)} 次${x.sup.last7.medianSec ? `，每次上架中位數 ${secs(x.sup.last7.medianSec)}` : ""}。電信商與經銷商也會補貨，但不公開資料，所以沒有人能誠實地替它們排名。`) },
    { q: "取消 apple.com 訂單再重訂，會失去順位嗎？", a: "你會拿到一張帶著今天送貨預估的新訂單；Apple 不公布排隊順位。取消前，把結帳頁顯示的預估和你現有訂單的比一比——新的很少比較早。" },
    { q: "電信商賣的 iPhone Duo 和 Apple 賣的有差嗎？", a: zs(`同一台硬體。${lockLine(x, "差別在資費方案，以及附帶的鎖機或分期條款。")}電信商的庫存和 Apple 分開，而且依門市顯示。`) },
    { q: "向經銷商買，能享有 Apple 的退換貨期限嗎？", a: x.ch.returnDays ? zs(`不能——適用的是經銷商自己的政策。Apple 的 ${x.ch.returnDays} 天期限只適用於向 Apple 購買（apple.com 與 ${AS(x.c)}）。`) : x.ch.returnDays === 0 ? "香港的 Apple 本身就不接受非瑕疵退貨（只換瑕疵品），所以要比較經銷商自己的政策——有些在當地比 Apple 寬鬆。" : "不能——適用的是經銷商自己的政策；Apple 的退換貨期限只涵蓋向 Apple 購買的商品。" },
    { q: "Apple 為 iPhone Duo 列了哪些電信商？", a: x.c.cc === "us" || x.c.cc === "jp" ? zs(`Apple ${C(x.c)}的購買頁列出 ${li(x.ch.carriers)}；其他每個國家的購買頁都以無鎖版販售，沒有選電信商的步驟。`) : zs(`Apple ${C(x.c)}的購買頁以無鎖版販售 iPhone Duo，沒有列任何電信商；${li(x.ch.carriers)} 是 Apple 列為支援 iPhone 的業者，它們依自己的條件販售。`) },
    { q: "在國外買的 iPhone Duo 可以用我家的電信商嗎？", a: "通常可以，前提是機型支援你電信商的頻段、你的電信商提供 eSIM（iPhone Duo 在各國都只支援 eSIM），而且是無鎖版——Apple 自己賣的在多數國家都是。保固服務跨國可用但有例外；稅與關稅才是真正多出來的成本。" },
  ],
  sources: { buy: "Apple：購買 iPhone Duo", pickup: "Apple：門市取貨與送貨", returns: "Apple：退貨與退換貨期限", warranty: "Apple：各國保固服務", log: "PickupChecker：本頁據以計算的補貨紀錄" },
  ld: (x) => ({
    description: zs(`iPhone Duo 在${C(x.c)}：${AS(x.c)} 門市取貨 vs apple.com 宅配 vs 電信商 vs 經銷商 vs 轉售——量得出來的 ${AS(x.c)} 補貨，以及其他通路能告訴你什麼、不能告訴你什麼。`),
  }),
  related: "其他 iPhone Duo 問題",
  sameData: "用同一份數據回答",
  otherCountries: "其他國家的同一頁",
  questions: { howToGet: "怎麼買到 iPhone Duo", whereToBuy: "今天去哪裡買", shortage: "缺貨緩解了嗎？", configs: "哪個規格最容易買到？", restockTimes: "Apple 什麼時候補貨 iPhone Duo？", alerts: "最快收到通知的方法" },
  setUpAlert: "設定補貨通知",
  logLive: "即時補貨紀錄",
  faqTitle: "常見問題",
  onThisPage: "本頁內容",
};

/* ================================================================== 公開 API */
const api: DecideDict["api"] = {
  crumb: "現貨 API",
  title: (c) => {
    const w = C(c);
    return fitTitleW([
      zs(`${w} iPhone Duo 免費現貨 API：Apple 直營店即時資料`),
      zs(`${w} iPhone Duo 現貨 API（免費 JSON）`),
      zs(`iPhone Duo 現貨 API（${w}）`),
    ], 49);
  },
  metaDescription: (x) => fitTitleW([
    zs(`免費、唯讀的 JSON API：${C(x.c)} ${kStores(x, x.stores)}（全球 ${n(x.worldStores)} 家、${n(x.countries)} 個國家）的 iPhone Duo 門市取貨現貨——各門市、各規格的即時供應，最近 24 小時經確認的補貨，不需金鑰，快取 30 秒。端點、curl／Python／JavaScript 範例、限制，以及什麼時候寫腳本比設通知好。`),
    zs(`${C(x.c)} ${kStores(x, x.stores)} 的 iPhone Duo 現貨免費 JSON API：各門市供應、最近 24 小時補貨，不需金鑰。端點、範例與限制。`),
  ], 160),
  h1: (x) => zs(`有沒有 API 或腳本可以監控${C(x.c)} ${AS(x.c)} 的 iPhone Duo 現貨？`),
  intro: (x) => zs(`有：PickupChecker 公開一個免費、唯讀的 JSON API，涵蓋${storesPhrase(x)}（全球共 ${n(x.worldStores)} 家門市、${n(x.countries)} 個國家），資料來自每家門市每 ${SPEED.checkSec} 秒一次的檢查，在邊緣節點快取 30 秒，不需金鑰、不用註冊。一個請求回傳每家門市目前 iPhone Duo 各規格的門市取貨供應；另一個回傳最近 24 小時經確認的補貨。此刻${C(x.c)} ${n(x.stores)} 家門市中有 ${n(x.storesNow)} 家有上架，最近 24 小時確認了 ${n(x.restocks24)} 次補貨。下面是端點、可以直接執行的 curl、Python 與 JavaScript 範例、欄位說明、限制——以及為什麼以 30 秒快取間隔輪詢的腳本，還是比推播通知慢。`),
  updated: (x, stamp) => zs(`更新於 ${stamp} · ${C(x.c)} ${kStores(x, x.stores)} · 每 ${SPEED.checkSec} 秒檢查一次 · API 快取 30 秒`),
  nav: { endpoints: "端點", examples: "範例", fields: "欄位", limits: "限制與條款", script: "腳本還是通知？", apple: "直接抓 apple.com", method: "資料從哪來" },
  h2: (x) => ({
    endpoints: zs(`${C(x.c)}的 iPhone Duo 現貨 API 會回傳什麼？`),
    examples: "怎麼用 curl、Python 或 JavaScript 呼叫？",
    fields: "各欄位是什麼意思？",
    limits: "可以多頻繁輪詢？使用條款是什麼？",
    script: "該自己寫腳本，還是直接用通知？",
    apple: "我可以自己去抓 apple.com 嗎？",
    method: "資料從哪裡來",
  }),
  hero: { stores: ol((one) => (one ? "家 Apple 直營店，已涵蓋" : "家 Apple 直營店，全部涵蓋")), now: "家門市現在有 iPhone Duo 上架", restocks24: "最近 24 小時經確認的補貨", cache: "API 快取秒數" },
  perMinute: "每個位址每分鐘的請求上限",
  keysNeeded: "需要的 API 金鑰數",
  endpointsLead: (x) => zs(`三個 GET 端點，全部回 JSON，全部在 https://pickupchecker.com/api/v1 之下：\`stock\` 回傳${C(x.c)}每家 ${AS(x.c)} 目前可取貨的規格與上次檢查時間；\`restocks\` 回傳最近 1–168 小時經確認的補貨，最新的在前，並註明是否仍在架上；\`iphone-duo\` 是 \`stock?model=duo\` 的捷徑。國家代碼放在路徑裡（${x.c.cc}${x.c.cc === "uk" ? "，也接受 gb" : ""}）；機型是 duo、18-pro 與 18-pro-max。`),
  endpointsCaption: "端點（把 {country} 換成 us、ca、uk、au、de、fr、it、es、jp、kr、hk、sg、ae、ch、nl、se、tw、at 或 be）",
  endpointsHead: ["端點", "回傳", "參數"],
  endpointsRows: (x) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: "每家門市：in_stock、可取貨的規格、last_checked_at、last_in_stock_at；另有含 stores_in_stock 的摘要。", params: "model（duo | 18-pro | 18-pro-max）、storage（例如 512GB）、color（例如 night-sky）" },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: "經確認的補貨，最新的在前：at、store、configuration、still_listed。", params: "model、hours（1–168，預設 24）、limit（1–200，預設 100）" },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: "轉向 stock?model=duo。", params: "—" },
    { path: "/api/v1", returns: "這份清單、國家與機型、限制。", params: "—" },
  ],
  examplesLead: "複製其中一段；每段都會印出現在有 iPhone Duo 上架的門市。不需金鑰，除了一個寫明你腳本名稱的 User-Agent 之外不需任何標頭（這樣它出問題時我們才能聯絡你）。",
  exampleTitles: { curl: "curl（任何 shell）", python: "Python 3，只用標準函式庫", node: "JavaScript（Node 18+ 或瀏覽器）" },
  fieldsLead: "所有欄位都是 snake_case，所有時間都是 UTC 的 ISO 8601。門市識別碼用 Apple 自己的（R 編號），和 Apple 的門市頁面與本站的網址一致。",
  fieldsCaption: "欄位說明",
  fieldsHead: ["欄位", "型別", "意思"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "這份回應計算的時間；CDN 最多可能快取 30 秒。" },
    { f: "country.code / name / currency", t: "string", m: "門市所在的國家。" },
    { f: "configurations[]", t: "object", m: "這次查詢涵蓋的零件編號，storage 與 color 以 Apple 的寫法呈現。" },
    { f: "summary.stores_in_stock", t: "integer", m: "現在至少有一個涵蓋規格可取貨的門市數。" },
    { f: "stores[].store_number", t: "string", m: "Apple 的門市編號，例如 R085。" },
    { f: "stores[].in_stock", t: "boolean", m: "至少有一個涵蓋的規格可取貨。" },
    { f: "stores[].available[]", t: "object", m: "可取貨的規格：part_number、storage、color。" },
    { f: "stores[].last_checked_at", t: "string | null", m: zs(`我們上次讀取這家門市 Apple 取貨頁的時間（通常在 ${SPEED.checkSec} 秒內）。`) },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "這家門市最後一次有涵蓋規格可取貨的時刻。" },
    { f: "restocks[].at", t: "string", m: "該規格從售完變成可取貨的時間（經兩次檢查確認）。" },
    { f: "restocks[].still_listed", t: "boolean | null", m: "回應當下那家門市是否仍有上架。" },
    { f: "attribution", t: "object", m: "來源、授權聲明與本頁。" },
  ],
  limitsLead: "每個端點的輪詢間隔請拉到 30 秒以上——回應在邊緣節點就快取這麼久，更短的間隔只會拿到同一份 JSON——而且單一位址每分鐘不要超過 60 次請求，這是真正打到我們伺服器的上限。資料可以自由使用，包括商業用途，只有一個條件：在數字出現的地方標示「Source: PickupChecker」並連回 pickupchecker.com（或對應的門市／國家頁）。不需金鑰、不用註冊、CORS 開放，瀏覽器頁面可以直接呼叫。",
  limitsKeys: () => [
    "收到 429 表示你的位址一分鐘內超過 60 次請求；請等 Retry-After 指定的秒數。",
    "不相容的變更會用新的版本路徑（/api/v2）；v1 之下只會新增欄位，不會改名。",
    "請設定寫明專案名稱與聯絡方式的 User-Agent；我們從沒封鎖過有禮貌的腳本。",
  ],
  scriptLead: (x) => zs(`如果你要做儀表板、Discord 機器人、試算表或研究，就寫腳本——API 就是為此而生。如果你要的是真的買到一台 iPhone Duo，腳本是比較慢的工具：它要到下一次輪詢才看得到補貨，最多晚 30 秒，然後還得想辦法通知你；我們的推播通知每 ${SPEED.fastSec} 秒讀同樣的門市，確認補貨後約 ${SPEED.alertSec} 秒就送出——${x.storesNow !== undefined ? "在大約一分鐘的在架中位數之內" : "在在架中位數之內"}。很多人兩個都用：通知用來買，API 用來看。`),
  scriptCaption: "輪詢腳本 vs 推播通知",
  scriptHead: ["", "你在這個 API 上寫的腳本", "PickupChecker 通知"],
  scriptRows: () => [
    { k: "多久後看到補貨", a: "最多 30 秒（快取）＋你的輪詢間隔", b: zs(`我們看到後約 ${SPEED.alertSec} 秒送出推播`) },
    { k: "怎麼到你手機", a: "你自己接（Email、機器人、簡訊）", b: "主畫面 App 的通知" },
    { k: "盯哪些門市", a: "全部，每次呼叫", b: zs(`你選的門市每 ${SPEED.fastSec} 秒，全部門市每 ${SPEED.checkSec} 秒`) },
    { k: "費用", a: "免費", b: "通知要訂方案；本站閱讀免費" },
  ],
  appleLead: "可以，但有限度：apple.com 的取貨頁依門市與規格回答，這正是我們讀的東西。一次性的腳本缺的是細節——IPv6 輪替讓 Apple 持續回應、「兩次觀察」規則讓一次閃爍的「無法取貨」不會變成假補貨、每家門市的時區處理，以及從上市日保留至今的紀錄。如果你只要答案，API 就是這些工作的成品；如果你想學，運作方式頁逐項說明。",
  appleKeys: () => [
    "Apple 的頁面是一個切面：它告訴你現在，從不告訴你一次上架維持了多久、上一次是什麼時候。",
    zs(`我們對每家門市的檢查間隔是 ${SPEED.checkSec} 秒，最快不超過 ${SPEED.fastSec} 秒；比這更猛地抓 apple.com 的腳本會被封鎖，什麼也學不到。`),
  ],
  methodLead: (x) => zs(`每個數字都來自 PickupChecker 每 ${SPEED.checkSec} 秒（有通知的門市每 ${SPEED.fastSec} 秒）讀取${storesPhrase(x)}在 Apple 自家門市取貨供應頁的資料。變化要連續兩次觀察一致才寫入；中斷後的首次出現不算補貨。API 提供的就是本站各頁面讀的同一組表格；沒有任何抽樣或估算。`),
  methodKeys: () => ["完整方法：運作方式頁。", "標示來源就是全部的代價；一個連回來的連結，讓這一切保持免費。"],
  faq: (x): Faq[] => [
    { q: zs(`有沒有${C(x.c)} ${AS(x.c)} iPhone Duo 現貨的免費 API？`), a: zs(`有——PickupChecker 的，在 https://pickupchecker.com/api/v1/${x.c.cc}/stock：${C(x.c)}每家 ${AS(x.c)} 現在可取貨的規格，JSON、不需金鑰、快取 30 秒。另一個端點回傳最近 24 小時經確認的補貨。`) },
    { q: "Apple 有官方的庫存 API 嗎？", a: "沒有公開的。apple.com 的取貨頁可以依門市與規格讀取，本站就是這樣做的，而且做得仔細（輪替、確認、時區）；這裡的 API 就是把這些工作以 JSON 開放出來。" },
    { q: "資料有多新？", a: zs(`每家門市每 ${SPEED.checkSec} 秒檢查一次（有通知的門市每 ${SPEED.fastSec} 秒），API 回應快取 30 秒，所以一個數字最多約 45 秒舊；last_checked_at 會告訴你確切時間。`) },
    { q: "可以用在商業產品裡嗎？", a: "可以，條件是標示來源：在顯示資料的地方寫「Source: PickupChecker」並連回 pickupchecker.com，輪詢間隔 30 秒以上。不需金鑰。" },
    { q: "寫腳本會比通知更快買到 iPhone Duo 嗎？", a: zs(`不會：腳本要到下一次輪詢才看到補貨，最多晚 30 秒；通知在我們看到補貨後確認、約 ${SPEED.alertSec} 秒就送出。腳本用來看，通知用來買。`) },
  ],
  sources: { pickup: "Apple：門市取貨", method: "PickupChecker：檢查怎麼運作", log: "PickupChecker：補貨紀錄" },
  ld: (x) => ({
    description: zs(`${storesPhrase(x)} iPhone Duo 門市取貨供應的免費 JSON API：各門市、各規格的目前現貨，最近 24 小時經確認的補貨。`),
  }),
  related: "其他 iPhone Duo 問題",
  sameData: "用同一份數據回答",
  otherCountries: "其他國家的同一頁",
  questions: { alerts: "最快收到通知的方法", howItWorks: "檢查怎麼運作", restockTimes: "Apple 什麼時候補貨 iPhone Duo？", shortage: "缺貨緩解了嗎？", configs: "哪個規格最容易買到？", stockChecker: "iPhone Duo 現貨查詢" },
  setUpAlert: "設定補貨通知",
  tryIt: "打開即時 JSON",
  faqTitle: "常見問題",
  onThisPage: "本頁內容",
};

export const decide: DecideDict = { configs, supply, channels, api };
