/**
 * 日本語: decide — 4つの「判断」ページ（seo.md §16）：入荷が多い構成はどれか、品薄は緩和してきたか、Apple・キャリア・量販店、
 * 公開API。英語 dict/en/decide.tsx と同じキー・同じ引数・同じ戻り値の形（型 DecideDict が強制）。各問いの直後に答えの一文、
 * 数値はすべて lib/content/duoDecide.ts と channels.ts から。
 * `x.c` は英語データ：国名は countryLabel で引き、`inName` / `short` は文に出さない。構成・カラー・店舗名は view（x.cfg / x.colour /
 * x.storeName / x.storeWhen）からすでに日本語で届く。
 * 機種名・容量・Apple Store・PickupChecker・URL・型番・HTTP用語は訳さない。チェック間隔は 15 秒と 5 秒のみ（APIのキャッシュは
 * 「30秒キャッシュ」「30秒以上の間隔」と書き、毎回型の言い方は使わない）。返金には触れない（Appleの制度は「返品・交換」）。
 */
import type { Faq } from "@/lib/content/types";
import type { Country } from "@/lib/apple/countries";
import type { DuoSupply } from "@/lib/content/duoDecide";
import { exposureHours } from "@/lib/content/duoDecide";
import { SPEED } from "@/lib/plans";
import { num, list, fitTitleW, LANG_TAG } from "@/lib/i18n/format";
import { countryLabel } from "@/lib/i18n/places";
import type { ApiView, ChannelsView, ConfigsView, DecideCtx, DecideDict, SupplyView } from "../en/decide";
import { content } from "./content";

const L = "ja" as const;
const N = (n: number) => num(L, n);
/** 0〜1 の割合を整数％で（0.5% 未満は「<1%」）。 */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.round(Math.abs(x) * 100)}%`;
/** 「2026年11月2日」。 */
const longDate = (ymd: string) => new Intl.DateTimeFormat(LANG_TAG[L], { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** 「11月3日(火)」。 */
const dateLabel = (ymd: string) => new Intl.DateTimeFormat(LANG_TAG[L], { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** 在庫時間の合計：「38.4時間」、1時間未満は「41分」。 */
const hours = (sec: number) => (sec >= 3600 ? `${N(exposureHours(sec))}時間` : `${N(Math.max(1, Math.round(sec / 60)))}分`);
/** 英語と同じ境目：120秒未満は秒、以上は分。 */
const secs = (s: number) => (s >= 120 ? `${N(Math.round(s / 60))}分` : `${N(Math.round(s))}秒`);
const ratio = (a: number, b: number) => (b > 0 ? `${N(Math.round((a / b) * 10) / 10)}倍` : "—");
const listJa = (items: string[], max = 6) => list(L, items, max, (n) => content.listMore(N(n)));
const country = (c: Pick<Country, "cc">) => countryLabel(c.cc, L);
/** 「日本で」「日本の」「日本では」：米国ページでは省く（英語の where() と同じ）。 */
const inJa = (c: Country) => (c.cc === "us" ? "" : `${country(c)}で`);
const ofJa = (c: Country) => (c.cc === "us" ? "" : `${country(c)}の`);
const atJa = (c: Country) => (c.cc === "us" ? "" : `${country(c)}では`);
const storesPhrase = (x: DecideCtx) => (x.one ? `${country(x.c)}にある唯一のアップルストア` : `${country(x.c)}のアップルストア全${N(x.stores)}店舗`);
const trendJa = (d: DuoSupply) => (d.trend === "up" ? "前週より多い" : d.trend === "down" ? "前週より少ない" : "前週とほぼ同じ");
/** 「Appleの14日間の返品期間」、香港は返品なし（不良品の交換のみ）、不明なら中立の語。 */
const returnPhrase = (days: number | null) => (days ? `Appleの${N(days)}日間の返品期間` : days === 0 ? "Appleが現地では自己都合の返品を受け付けていないこと（不良品の交換のみ）" : "Appleの返品ポリシー");
/**
 * channels.ts の carrierLock は英語の一文。日本については同じ事実（総務省ガイドライン、出典は channels.ts の jp）を日本語で書く。
 * 日本語版は日本のページにしか出ないので、ほかの国は原文か、渡された言い換えをそのまま使う。
 */
const JP_LOCK = "日本では2021年10月以降、総務省のガイドラインでキャリアが新規販売する端末にSIMロックをかけることが原則禁止されているため、キャリア版のiPhoneもSIMフリーで販売されます。";
const lockJa = (x: ChannelsView, fallback: string) => (x.c.cc === "jp" && x.ch.carrierLock ? JP_LOCK : x.ch.carrierLock ?? fallback);

type D = DecideDict;

/* ================================================================== 入荷が多い構成はどれか */
const configs: D["configs"] = {
  crumb: "どの構成？",
  title: (c: Country) => fitTitleW([
    `${inJa(c)}入荷が多いiPhone Duoの構成は？容量とカラーの傾向`,
    `${inJa(c)}入荷が多いiPhone Duoの構成は？容量とカラー`,
    `${inJa(c)}入荷が多いiPhone Duoの構成は？`,
    "入荷が多いiPhone Duoの構成は？",
  ], 49),
  metaDescription: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    return e && h
      ? fitTitleW([
        `${inJa(x.c)}いちばん手に入れやすいiPhone Duoは${x.cfg(e)}：${longDate(d.since)}以降にアップルストア${N(x.stores)}店舗で確認した入荷${N(d.n)}回のうち${N(e.restocks)}回、在庫時間の合計は${hours(e.exposureSec)}。最も難しいのは${x.cfg(h)}（${N(h.restocks)}回）。全構成を容量・カラー別に順位づけし、入荷のたびに更新。`,
        `${inJa(x.c)}いちばん手に入れやすいiPhone Duoは${x.cfg(e)}（${longDate(d.since)}以降の入荷${N(d.n)}回のうち${N(e.restocks)}回）、最も難しいのは${x.cfg(h)}。全構成を容量・カラー別に順位づけ。`,
        `${inJa(x.c)}いちばん手に入れやすいiPhone Duoは${x.cfg(e)}（入荷${N(d.n)}回中${N(e.restocks)}回）、最も難しいのは${x.cfg(h)}。全構成を容量・カラー別に順位づけ。`,
      ], 160)
      : `${ofJa(x.c)}アップルストアで${longDate(d.since)}以降に確認した入荷をもとに、iPhone Duoの全構成を順位づけ：容量、カラー、在庫時間、いま掲載中の構成。`;
  },
  h1: (x: ConfigsView) => `${inJa(x.c)}最も入荷が多いiPhone Duoの構成はどれで、いちばん手に入れやすいのはどれ？`,
  intro: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    if (!e) return `PickupCheckerが${longDate(d.since)}以降に${storesPhrase(x)}で確認したiPhone Duoの入荷は${N(d.n)}回。構成を順位づけするには、まだ少なすぎます。下の表は入荷のたびに埋まっていきます。傾向は米国版ページにすでに出ています。`;
    const st = d.byStorage, co = d.byColor;
    const last = st[st.length - 1];
    const storage = st.length > 1
      ? `カラーより容量で差がつきます：${last.restocks > 0 ? `${st[0].key}の入荷は${last.key}の${ratio(st[0].restocks, last.restocks)}` : `${st[0].key}が入荷の${pct(st[0].share)}を占める一方、${last.key}は一度も入荷していません`}${co.length > 1 ? `。一方、${x.colour(co[0].key)}と${x.colour(co[1].key)}の差はわずか${N(Math.abs(Math.round((co[0].share - co[1].share) * 100)))}ポイントです` : ""}。`
      : "";
    return `${inJa(x.c)}いちばん手に入れやすいiPhone Duoは${x.cfg(e)}です。PickupCheckerが${longDate(d.since)}以降に${storesPhrase(x)}で確認した入荷${N(d.n)}回のうち${N(e.restocks)}回がこの構成で、${N(e.stores)}店舗に入荷し、在庫時間の合計は${hours(e.exposureSec)}${e.lifetimes ? `、完売までの中央値は${secs(e.lifetimes.medianSec)}` : ""}。${h ? `最も難しいのは${x.cfg(h)}で、入荷${N(h.restocks)}回、在庫時間の合計は${hours(h.exposureSec)}。` : ""}${storage}`;
  },
  updated: (x: ConfigsView, stamp: string) => `${stamp}更新 · データは${longDate(x.d.since)}から · アップルストア${N(x.stores)}店舗 · 全店舗を${SPEED.checkSec}秒ごと、通知を設定した店舗は${SPEED.fastSec}秒ごとにチェック`,
  nav: { easiest: "いま狙いやすい構成", storage: "容量", colour: "カラー", shelf: "買える猶予", week: "今週の変化", alerts: "通知する構成", method: "数え方" },
  h2: (x: ConfigsView) => ({
    easiest: `${inJa(x.c)}いま、いちばん手に入れやすいiPhone Duoの構成は？`,
    storage: "容量によって確率は変わる？",
    colour: x.d.byColor.length > 1 ? `${x.colour(x.d.byColor[0].key)}と${x.colour(x.d.byColor[1].key)}：よく入荷するのはどちら？` : "よく入荷するカラーはどれ？",
    shelf: "買うまでの猶予が最も長い構成は？",
    week: "この7日間で何が変わった？",
    alerts: "どの構成に入荷通知を設定すべき？",
    method: "入荷と在庫時間の数え方",
  }),
  hero: {
    restocks: (label: string) => `${label}の確認済み入荷`,
    exposure: "掲載されていた時間の合計（全店舗分）",
    now: ((one: boolean) => (one ? "いま掲載中" : "いま掲載している店舗")) as unknown as D["configs"]["hero"]["now"],
    median: "完売までの秒数（中央値）",
    total: "全構成の入荷",
  },
  easiestLead: (x: ConfigsView) => {
    const e = x.d.easiest!;
    return `${x.cfg(e)}が、重要な2つの指標で勝っています。最も多く入荷し（${N(e.restocks)}回、全体の${pct(e.restocks / x.d.n)}）、在庫時間の合計も最長（${hours(e.exposureSec)}）——これはアプリを開いて予約するためにあった時間です。${e.nowStores > 0 ? `いまこの瞬間、${N(e.nowStores)}店舗が掲載しています。` : "いまこの瞬間に掲載している店舗はありません。次の入荷は数秒以内にここに表示されます。"}`;
  },
  easiestKeys: (x: ConfigsView) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      `在庫時間の合計トップ3：${listJa(top3.map((r) => `${x.cfg(r)}（${hours(r.exposureSec)}）`))}。`,
      d.never.length ? `${longDate(d.since)}以降、${inJa(x.c)}一度も入荷していない構成：${listJa(d.never.map((r) => x.cfg(r)))}。` : `${longDate(d.since)}以降、すべての構成が少なくとも1回は入荷しています。`,
      d.lifetimes ? `全構成を合わせると、入荷の在庫時間の中央値は${secs(d.lifetimes.medianSec)}で、${pct(d.lifetimes.within2min)}は2分以内に消えました。` : "在庫時間は、完売を確認した入荷が10回に達すると表示します。",
    ];
  },
  rankCaption: (x: ConfigsView) => `${ofJa(x.c)}iPhone Duoの全構成（在庫時間の合計が長い順）· ${longDate(x.d.since)}〜今日`,
  rankHead: ["構成", "入荷", "店舗", "在庫時間の合計", "完売までの中央値", "いま掲載中", "最新の入荷"],
  none: "まだなし",
  storageLead: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return "容量の比較は、入荷が入ってからです。下の表はライブで更新されます。";
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return `はい、ほかの何よりも容量で差がつきます。${st[0].key}が入荷の${pct(st[0].share)}、${st[1].key}が${pct(st[1].share)}を占め${big ? `、1TBと2TBを合わせても${pct(big / x.d.n)}` : ""}でした。Appleは多くの人が注文する容量を出荷します。上位の容量は、1回の納品で店舗に複数台入る容量でもあります。`;
  },
  groupCaption: (what: "storage" | "colour") => `${what === "storage" ? "容量" : "カラー"}別の入荷（全店舗分）`,
  groupHead: (what: "Storage" | "Colour") => [what === "Storage" ? "容量" : "カラー", "入荷", "割合", "店舗", "在庫時間の合計", "完売までの中央値", "いま掲載中"],
  storageSwaps: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: `${last}だけに通知を設定する`, yes: `まず${top}、${last}も合わせて`, why: `${last}の入荷は全体の${pct(st[st.length - 1].share)}、${top}は${pct(st[0].share)}。通知はどちらも1件ずつで済みます。` },
      { no: "希望の容量が出るまで待つ", yes: `${top}か${second}が出たら確保する`, why: `この2つで${inJa(x.c)}入荷の${pct(st[0].share + st[1].share)}を占めます。ケースとiCloudがあれば、容量の差は待ち時間ほど大きな問題ではありません。` },
    ];
  },
  colourLead: (x: ConfigsView) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return "カラーの比較は、入荷が入ってからです。";
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return `${x.colour(co[0].key)}ですが、差はわずかです。入荷の${pct(co[0].share)}に対し、${x.colour(co[1].key)}は${pct(co[1].share)}で、${N(gap)}ポイントの差${co[0].medianSec && co[1].medianSec ? `。在庫時間の中央値はそれぞれ${secs(co[0].medianSec)}と${secs(co[1].medianSec)}` : ""}。カラーが確率に与える影響は容量より小さいので、希望の容量を両方のカラーで通知すれば、チャンスはほぼ2倍になります。`;
  },
  colourKeys: (x: ConfigsView) => x.d.byColor.map((g) => `${x.colour(g.key)}：入荷${N(g.restocks)}回・${N(g.stores)}店舗、在庫時間の合計${hours(g.exposureSec)}${g.nowStores ? `、いま${N(g.nowStores)}店舗が掲載中` : ""}。`),
  shelfLead: (x: ConfigsView) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return "入荷の在庫時間は、入荷から次に完売を確認したチェックまでを測ります。最初の数値は、ある構成の入荷が10回完売した時点で表示します。";
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return `最も猶予があるのは${x.cfg(slow)}です。完売までの中央値は${secs(slow.lifetimes!.medianSec)}で、${x.cfg(fast)}の${secs(fast.lifetimes!.medianSec)}とは対照的です。売れるのが遅いのは高価な容量——欲しい人が少ない——なので、「買う猶予が最も長い」と「入荷が最も多い」は別の構成を指します。上の順位表はその両方を加味しています。`;
  },
  shelfCaption: "構成ごとの在庫時間（入荷 → 次に完売を確認したチェック）",
  shelfHead: ["構成", "完売を確認した入荷", "中央値", "2分以内に完売", "20分以内に完売", "最速"],
  shelfKeys: (x: ConfigsView) => [
    `プッシュ通知は、入荷を確認してから約${SPEED.alertSec}秒後に届きます。掲載時間の中央値は${x.d.lifetimes ? secs(x.d.lifetimes.medianSec) : "約1分"}なので、Apple StoreアプリでDuoを開き、カードを登録しておけば、ほとんどの入荷に間に合います。`,
    `この時間は上限値です。完売は次のチェック——最長${SPEED.checkSec}秒後、通知を設定した店舗では${SPEED.fastSec}秒後——で確認されるためです。`,
  ],
  weekLead: (x: ConfigsView) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return `この14日間、${inJa(x.c)}入荷はありません。週ごとの表は、次の入荷から始まります。`;
    const lead = rows[0];
    return `この7日間の入荷は${N(tot7)}回${totP ? `、その前の7日間は${N(totP)}回（${signed(tot7 / totP - 1)}）` : ""}で、最多は${x.cfg(lead)}の${N(lead.last7)}回です。${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `累計トップの${x.cfg(x.d.easiest)}とは別の構成です。納品ごとに構成の内訳は変わるので、通知する構成を選ぶ前にこの表を確認してください。` : "累計トップの構成が、今週も首位です。"}`;
  },
  weekCaption: "構成ごとの入荷：直近7日間と、その前の7日間",
  weekHead: ["構成", "直近7日間", "その前の7日間", "変化"],
  alertsLead: (x: ConfigsView) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? `${listJa(top.map((r) => x.cfg(r)))}を、最も早く行ける2〜3店舗に設定しましょう。これで${inJa(x.c)}これまでの入荷の${pct(top.reduce((a, r) => a + r.restocks, 0) / x.d.n)}をカバーできます。4件目として本当に欲しい構成を加え、先に来たほうを確保してください。`
      : `${inJa(x.c)}入荷が入るまでは、希望の容量を両方のカラーで、最寄りの店舗に設定しておきましょう。`;
  },
  alertsKeys: (x: ConfigsView) => [
    `通知は店舗×構成ごとに1件なので、3店舗×3構成なら${N(9)}件です。`,
    `通知を設定した店舗は${SPEED.fastSec}秒ごとにチェックし、入荷を確認してからプッシュします。通知が届くのはその約${SPEED.alertSec}秒後です。`,
    `${x.one ? "" : "店舗は入荷回数ではなく、距離で選びましょう。"}いちばん忙しい店舗は、いちばん多くの人が見ている店舗でもあります。`,
  ],
  methodLead: "入荷とは、ある店舗である構成が「完売」から「在庫あり」に変わることで、2回の一致したチェックで確認したものだけを数えます。計測の空白のあとに初めて見えた在庫は数えません。在庫時間は入荷から、再び完売を示した最初のチェックまでなので、上限値です。「在庫時間の合計」はその構成のすべての入荷の時間を足したもので、買えるチャンスがどれだけあったかを示す最も単純な尺度です。",
  methodKeys: (x: ConfigsView) => [
    `出典：${storesPhrase(x)}について、Apple自身の店頭受け取り在庫を${longDate(x.d.since)}から店舗ごとに${SPEED.checkSec}秒ごと（通知を設定した店舗は${SPEED.fastSec}秒ごと）に読み取っています。`,
    "いま掲載中の店舗と最新の入荷時刻はライブ。それ以外は5分以内に再計算されます。",
    "リンクを添えてご自由に引用ください。数値は変わるので、読んだ日付も添えてください。",
  ],
  faq: (x: ConfigsView): Faq[] => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor;
    return [
      { q: `${inJa(x.c)}いちばん手に入れやすいiPhone Duoは？`, a: e ? `${x.cfg(e)}です。${longDate(d.since)}以降、アップルストア${N(e.stores)}店舗で確認した入荷${N(e.restocks)}回、在庫時間の合計${hours(e.exposureSec)}は、どの構成よりも多い数字です。${h ? `最も難しいのは${x.cfg(h)}で、入荷は${N(h.restocks)}回です。` : ""}` : `${inJa(x.c)}確認した入荷がまだ少なく、判断できません。入荷が入り次第、このページで全構成を順位づけします。` },
      { q: co.length > 1 ? `${x.colour(co[1].key)}は${x.colour(co[0].key)}より見つけにくい？` : "一方のカラーは、もう一方より見つけにくい？", a: co.length > 1 && d.n ? `わずかに。${x.colour(co[0].key)}が入荷の${pct(co[0].share)}、${x.colour(co[1].key)}が${pct(co[1].share)}でした。容量による差のほうがはるかに大きいので、まず容量を決め、そのカラー両方に通知を設定してください。` : "カラーの比較は、入荷が入ってからです。" },
      { q: `1TBや2TBのiPhone Duoは${inJa(x.c)}入荷することがある？`, a: (() => { const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage)); const bn = big.reduce((a, r) => a + r.restocks, 0); const maxStores = big.some((r) => r.stores) ? `最多でも${N(Math.max(...big.map((r) => r.stores)))}店舗` : "店舗数はゼロ"; return bn ? `あります、ただしまれです。1TBと2TBの入荷は${N(d.n)}回中${N(bn)}回（${pct(bn / d.n)}）で、${maxStores}です。出ると長く掲載される（欲しい人が少ない）ので、鳴る頻度は低くても通知1件を割く価値があります。` : `私たちのデータには、まだありません。${longDate(d.since)}以降、${inJa(x.c)}1TB・2TBの確認済み入荷はありません。`; })() },
      { q: "通知は1つの構成に絞る？ 複数に設定する？", a: `複数の構成を、少数の店舗に。上位3構成が${inJa(x.c)}入荷の${d.n ? pct(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n) : "大半"}を占めています。近くの3店舗×3構成で9件になり、Plusプランに収まります。4件目に、本当に欲しい構成を加えてください。` },
      { q: "ほかの国でも内訳は同じ？", a: `必ずしも同じではありません。国ごとに割り当てが異なり、各国ページの順位も変わります。「ほかの国・地域」のリンクから、PickupCheckerが追跡する残り${N(18)}か国の同じページを開けます。記録が最も長いのは米国版（${longDate("2026-10-29")}から）です。` },
    ];
  },
  sources: { apple: "Apple：iPhone Duoの構成と価格", pickup: "Apple：店頭受け取り（英語）", log: "PickupChecker：このページの計算元の入荷履歴" },
  ld: (x: ConfigsView) => ({
    datasetName: `${country(x.c)}のアップルストアにおけるiPhone Duoの構成別入荷`,
    description: `${longDate(x.d.since)}以降に${storesPhrase(x)}で確認したiPhone Duoの入荷を構成（容量×カラー）ごとに集計：回数、店舗数、在庫時間の合計、完売までの中央値、いま掲載中の店舗数。`,
    measured: ["構成別の入荷回数", "入荷のあった店舗数", "在庫時間（秒）", "完売までの中央値", "いま掲載中の店舗数"],
  }),
  related: "続けて読む",
  sameData: "同じデータで答えるほかの疑問",
  otherCountries: "ほかの国・地域",
  questions: { restockTimes: "iPhone Duoの再入荷はいつ？", sellOut: "入荷は何秒で完売する？", shortage: "品薄は緩和してきた？", channels: "Apple、キャリア、量販店？", alerts: "いちばん早く通知を受け取るには", api: "無料の在庫API" },
  setUpAlert: "入荷通知を設定",
  logLive: "入荷履歴をライブで見る",
  faqTitle: "よくある質問",
  onThisPage: "このページの内容",
};

/* ================================================================== 品薄は緩和してきたか */
const supply: D["supply"] = {
  crumb: "品薄は緩和してきた？",
  title: (c: Country) => fitTitleW([
    `${inJa(c)}iPhone Duoの品薄は緩和してきた？週ごとの推移`,
    `${inJa(c)}iPhone Duoの品薄は緩和してきた？週間推移`,
    `${inJa(c)}iPhone Duoの品薄は緩和してきた？`,
    "iPhone Duoの品薄は緩和してきた？",
  ], 49),
  metaDescription: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    return d.trend !== "insufficient"
      ? fitTitleW([
        `${inJa(x.c)}今週のiPhone Duoの入荷は${trendJa(d)}：7日間でアップルストア${N(w.stores)}店舗に${N(w.restocks)}回（前週比${signed(d.change!)}）${w.medianSec ? `、完売までの中央値は${secs(w.medianSec)}` : ""}。日ごとの供給、「緩和」がどう見えるか、待つべきかを解説。`,
        `${inJa(x.c)}直近7日間のiPhone Duoの入荷は${N(w.restocks)}回（前週比${signed(d.change!)}）。日ごとの供給と、品薄が緩和しているかどうか。`,
      ], 160)
      : `${inJa(x.c)}iPhone Duoの品薄は緩和してきた？ ${longDate(d.since)}以降にアップルストアで確認した入荷${N(d.n)}回を日ごとに追い、緩和がどう見えるか、待つか今買うかを解説。`;
  },
  h1: (x: SupplyView) => `${inJa(x.c)}iPhone Duoの品薄は改善している？ いつまで続く？`,
  intro: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    if (d.trend === "insufficient") {
      return `${atJa(x.c)}まだ判断するには早すぎます。PickupCheckerが計測を始めたのは${longDate(d.since)}、${N(d.days)}日前なので、前週との最初の完全な比較は${longDate(d.comparableFrom)}に出ます。これまでに確認した入荷は${N(d.n)}回、アップルストア${N(x.stores)}店舗中${N(d.storesEver)}店舗${d.lifetimes ? `で、完売までの中央値は${secs(d.lifetimes.medianSec)}` : ""}。いまDuoを掲載している店舗は${N(d.storesNow)}店舗です。品薄の終わりは誰にも予測できません。このページは、それを最初に示す2つの数字——週あたりの入荷回数と在庫の秒数——を、入荷のたびに更新して示します。`;
    }
    const verdict = d.trend === "up" ? "供給は改善しています" : d.trend === "down" ? "供給は細っています" : "供給は横ばいです";
    const demand = w.medianSec
      ? (w.medianSec <= 120
        ? `ただ、需要がまだそれを吸収しています。今週の入荷は中央値${secs(w.medianSec)}で消えており${d.prev7.medianSec ? `（先週は${secs(d.prev7.medianSec)}）` : ""}、手動で買いやすくなったとはまだ言えません`
        : `そして在庫時間は延びています。今週の中央値は${secs(w.medianSec)}${d.prev7.medianSec ? `、先週は${secs(d.prev7.medianSec)}` : ""}で、緩和の最初の兆しです`)
      : "";
    return `${atJa(x.c)}${verdict}。直近7日間、アップルストアでのiPhone Duoの入荷は${N(w.restocks)}回で、前週の${N(d.prev7.restocks)}回から${signed(d.change!)}、入荷した店舗は${N(x.stores)}店舗中${N(w.stores)}店舗${demand ? `——${demand}` : ""}。いま掲載している店舗は${N(d.storesNow)}店舗です。終わりは誰にも予測できません。それを最初に示す2つの数字はこのページにあり、入荷のたびに更新されます。`;
  },
  updated: (x: SupplyView, stamp: string) => `${stamp}更新 · データは${longDate(x.d.since)}から · アップルストア${N(x.stores)}店舗 · ${SPEED.checkSec}秒ごとにチェック`,
  nav: { trend: "今週", easier: "買いやすくなった？", stores: "店舗数", howlong: "いつまで", christmas: "待つか買うか", world: "ほかの国", method: "数え方" },
  h2: (x: SupplyView) => ({
    trend: `${inJa(x.c)}iPhone Duoの入荷は増えている？ 減っている？`,
    easier: "実際に買いやすくなってきた？",
    stores: `${ofJa(x.c)}アップルストアのうち、iPhone Duoが一度でも入荷した店舗は？`,
    howlong: "iPhone Duoの品薄はいつまで続く？",
    christmas: "入荷を待ち続ける？ 別の方法で買う？",
    world: x.us ? "ほかの国では、品薄の緩和は早い？" : `${country(x.c)}より、ほかの国のほうが品薄の緩和は早い？`,
    method: "数え方",
  }),
  weekBefore: "前週",
  goneIn2: "2分以内に完売",
  storesEverLabel: ((one: boolean) => (one ? "これまでの確認済み入荷" : "1回以上入荷した店舗")) as unknown as D["supply"]["storesEverLabel"],
  hero: {
    last7: "直近7日間の入荷",
    change: "その前の7日間との比較",
    stores: ((one: boolean) => (one ? "入荷があった日数" : "直近7日間に入荷した店舗")) as unknown as D["supply"]["hero"]["stores"],
    median: "完売までの秒数（中央値・直近7日間）",
    now: ((one: boolean) => (one ? "いま掲載中" : "いま掲載している店舗")) as unknown as D["supply"]["hero"]["now"],
    sinceLast: "最後の入荷からの経過時間（時間）",
  },
  trendLead: (x: SupplyView) => {
    const { d } = x;
    if (d.trend === "insufficient") return `日ごとの表が、これまでの記録のすべてです：${N(d.days)}日間で入荷${N(d.n)}回。前週比の行は${longDate(d.comparableFrom)}に現れます。それまでは、日ごとの方向を読んでください。`;
    const w = d.last7, p = d.prev7;
    const gap = w.longestGapHours != null ? `今週、入荷と入荷の間が最も空いたのは${N(w.longestGapHours)}時間${p.longestGapHours != null ? `（先週は${N(p.longestGapHours)}時間）` : ""}でした。` : "";
    return `今週は${trendJa(d)}：入荷${N(w.restocks)}回（1店舗あたり${(w.perStoreDay * 7).toFixed(1)}回）に対し、前週は${N(p.restocks)}回、${signed(d.change!)}。${gap}入荷は納品に連動した波で来るので、静かな1日にはあまり意味がありません。見るべきは7日間の合計です。`;
  },
  dailyCaption: (x: SupplyView) => `${ofJa(x.c)}現地日付ごとの確認済み入荷（新しい順、直近14日間）`,
  dailyHead: ["日", "入荷", "店舗", "完売までの中央値"],
  trendKeys: (x: SupplyView) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? `これまで最多の日：${dateLabel(best.date)}、${N(best.stores)}店舗で${N(best.restocks)}回。` : "入荷はまだありません。最多の日はここに表示されます。",
      x.d.sinceLastHours != null && x.d.latest ? `最新の入荷は${x.d.sinceLastHours < 1 ? "1時間以内" : `${N(x.d.sinceLastHours)}時間前`}：${x.storeName(x.d.latest.storeNumber)}、${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}。` : "入荷はまだ記録されていません。",
      `「増加」は前週より${N(Math.round(0.15 * 100))}%以上多い入荷、「減少」は${N(Math.round(0.15 * 100))}%以上少ない入荷、その間は「横ばい」です。`,
    ];
  },
  easierLead: (x: SupplyView) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return "「買いやすい」には、2つのことが同時に必要です。入荷が増えること、そして1回の入荷が長く掲載されること。在庫時間は、期間内に完売を確認した入荷が10回に達すると表示します。";
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return `${longer ? "少しだけ、はい" : shorter ? "いいえ、むしろ逆です" : "まだです"}。今週の入荷は中央値${secs(w.medianSec)}掲載され${p.medianSec ? `（先週は${secs(p.medianSec)}）` : ""}、${pct(w.within2min!)}が2分以内に消えました${p.within2min != null ? `（先週は${pct(p.within2min)}）` : ""}。緩和とは、入荷の増加と在庫時間の延びが同時に起きること。入荷だけが増えるのは、Appleの出荷が増えても、待っている人の数は変わっていないということです。`;
  },
  easierKeys: (x: SupplyView) => [
    "ここで「緩和」がどう見えるか：在庫時間の中央値が20分を超え、多くの店舗が同時に掲載し、apple.comの配送予定が1週間以内になる。",
    `それまでは、買う手段はやはり入荷通知です。入荷を確認してから約${SPEED.alertSec}秒後にプッシュするので、掲載時間の中央値に十分収まります。`,
    x.d.lifetimes ? `${inJa(x.c)}累計：完売を確認した入荷${N(x.d.lifetimes.n)}回、中央値${secs(x.d.lifetimes.medianSec)}、${pct(x.d.lifetimes.within2min)}が2分以内に完売。` : "累計の在庫時間は、完売した入荷が10回に達すると表示します。",
  ],
  storesLead: (x: SupplyView) => {
    const { d } = x;
    const never = x.stores - d.storesEver;
    return x.one
      ? `${d.storesEver ? `はい。${country(x.c)}にある唯一のアップルストアでは、${longDate(d.since)}以降に確認済みの入荷が${N(d.n)}回ありました` : `まだです。${country(x.c)}にある唯一のアップルストアでは、${longDate(d.since)}以降、確認済みの入荷はありません`}${d.storesNow ? "。そしていま、Duoを掲載しています" : ""}。`
      : `${ofJa(x.c)}アップルストア${N(x.stores)}店舗中${N(d.storesEver)}店舗（${pct(d.storesEver / x.stores)}）で、${longDate(d.since)}以降にiPhone Duoの確認済み入荷が1回以上ありました${never ? `。${N(never)}店舗はまだありません` : ""}。いま掲載しているのは${N(d.storesNow)}店舗です。供給は均等には広がりません。旗艦店とモール内の店舗が最も多く入荷するので、通知に選ぶ店舗は構成と同じくらい重要です。`;
  },
  storesKeys: (x: SupplyView) => [
    `店舗ごとの入荷回数と現地時間：${ofJa(x.c)}入荷時間ページの「場所」のセクションにあります。`,
    "一度も入荷していない店舗は、Appleが飛ばしている店舗ではありません。割り当ては納品ごとに届き、いくつかの店舗は2週目に初めてDuoを受け取りました。",
  ],
  howlongLead: (x: SupplyView) => `Apple以外には誰にもわからず、私たちも予測はしません。${inJa(x.c)}記録が示しているのは、${N(x.d.days)}日間で入荷${N(x.d.n)}回、${x.d.trend === "insufficient" ? `前週比の傾向は${longDate(x.d.comparableFrom)}から` : `今週の入荷は${trendJa(x.d)}`}、在庫時間は${x.d.last7.medianSec ? `${secs(x.d.last7.medianSec)}前後` : "数分未満"}ということです。品薄は、ここで見られる順序で終わります。週あたりの入荷が増え、在庫時間が秒から時間へ延び、そして多くの店舗が同時に掲載し、apple.comの配送予定が数日になります。`,
  howlongKeys: () => [
    "兆候1——週あたりの入荷が、2〜3週間続けて増える（上の表）。",
    "兆候2——在庫時間の中央値が20分を超える。入荷が、再読み込みする人より長く持つようになる。",
    "兆候3——apple.comの配送予定が1週間以内になり、多くの店舗が同時に掲載する。",
    "新色や新容量の発売で時計はリセットされます。兆候3まで、通知はオンのままに。",
  ],
  christmasLead: (x: SupplyView) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `通知をオンにしたまま、配送の注文も入れておく——どちらか一方ではなく、両方です。いまのペース（${perDay >= 1 ? `${inJa(x.c)}1日あたり約${N(Math.round(perDay))}回の入荷` : `${inJa(x.c)}1日1回未満の入荷`}${w.medianSec ? `、1回あたり中央値${secs(w.medianSec)}の掲載` : ""}）なら、近くで見ている店舗にも数日以内に順番が回り、確認済みの入荷は見つけてから約${SPEED.alertSec}秒でスマートフォンに届きます。ほかで上乗せ価格を払う意味があるのは、待つこと自体が上乗せ分より高くつく場合だけです。販売チャネルの比較ページで、それを正直に秤にかけています。`;
  },
  christmasKeys: () => [
    "まずapple.comで配送を注文する：順番を確保でき、店頭受け取りが取れたらキャンセルできます。",
    "最寄りの店舗で、入荷が最も多い2〜3構成に通知を設定する（どの構成かは構成ページに）。",
    "Apple Storeアプリにサインインし、Duoをバッグに入れ、カードを登録しておく：掲載時間の中央値は約1分です。",
  ],
  worldLead: (x: SupplyView) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return "各国で1週間分のデータがそろうと、ここで週あたり・1店舗あたりの入荷を比較します。";
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return `直近7日間で1店舗あたりの入荷が最も多かったのは${top.name}（1店舗あたり${(top.perStoreDay * 7).toFixed(1)}回）、最も少なかったのは${bottom.name}（${(bottom.perStoreDay * 7).toFixed(1)}回）${mine ? `。${country(x.c)}は${(mine.perStoreDay * 7).toFixed(1)}回` : ""}。割り当ては国と発売日によって異なるので、緩和は国ごとにばらつきます。記録が最も長いのは米国です。`;
  },
  worldCaption: "国別の直近7日間：入荷、1店舗あたりの入荷、完売までの中央値、いま掲載中の店舗",
  worldHead: ["国・地域", "店舗", "入荷（7日）", "1店舗あたり", "完売までの中央値", "いま掲載中"],
  methodLead: `入荷とは、ある店舗である構成が「完売」から「在庫あり」に変わることで、${SPEED.checkSec}秒間隔（通知を設定した店舗は${SPEED.fastSec}秒間隔）の2回の一致したチェックで確認したものだけを数えます。計測の空白のあとに初めて見えた在庫は数えません。日付は店舗の現地日付です。在庫時間は入荷から、再び完売を示した最初のチェックまで——次のチェックまでの上限値です。週は直近の現地7日間と、その前の7日間の比較で、両方がそろって初めて比べます。`,
  methodKeys: (x: SupplyView) => [
    `出典：${storesPhrase(x)}のApple店頭受け取り在庫、${longDate(x.d.since)}から。`,
    "このページのすべては、入荷から5分以内に再計算されます。いま掲載中の店舗はライブです。",
    "引用はリンクと日付を添えて。動いている数字です。",
  ],
  faq: (x: SupplyView): Faq[] => {
    const { d } = x;
    const w = d.last7;
    return [
      { q: `Appleは${inJa(x.c)}まだiPhone Duoを入荷している？`, a: d.n ? `はい。直近7日間に${inJa(x.c)}アップルストア${N(w.stores)}店舗で確認済みの入荷${N(w.restocks)}回、${longDate(d.since)}以降は${N(d.n)}回です。最新の入荷は${d.sinceLastHours != null && d.sinceLastHours < 1 ? "1時間以内" : d.sinceLastHours != null ? `${N(d.sinceLastHours)}時間前` : "まだ記録されていません"}。` : `${longDate(d.since)}の計測開始以降、${inJa(x.c)}確認済みの入荷はまだありません。最初の入荷から5分以内に、このページが更新されます。` },
      { q: `${inJa(x.c)}iPhone Duoの品薄は改善している？`, a: d.trend === "insufficient" ? `判断するには、まだ早すぎます。前週との最初の完全な比較は${longDate(d.comparableFrom)}に出ます。見るべき数字は2つ——週あたりの入荷回数と在庫の秒数。両方が上がれば緩和です。` : `今週の入荷は${trendJa(d)}（${signed(d.change!)}）${w.medianSec ? `で、1回の入荷は中央値${secs(w.medianSec)}掲載されました` : ""}。緩和とは入荷の増加と在庫時間の延びが同時に起きることで、いまのところ${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "両方とも良い方向に動いています" : "その一部しか起きていません"}。` },
      { q: "iPhone Duoが楽に買えるようになるのはいつ？", a: "Apple以外には誰にも言えず、PickupCheckerも予測はしません。見るべき順序は：週あたりの入荷が2〜3週間増え続け、在庫時間の中央値が20分を超え、そして多くの店舗が同時に掲載し、apple.comの配送予定が1週間以内になる。" },
      { q: "待つより、上乗せ価格で買うべき？", a: `待つことが上乗せ分より高くつく場合だけです。いまのペースなら近くで見ている店舗にも数日以内に順番が回り、確認済みの入荷から約${SPEED.alertSec}秒で通知が届きます。転売品には返品期間がなく、いつものリスクもつきます。販売チャネルの比較ページで秤にかけています。` },
      { q: "年末商戦で確率は変わる？", a: "12月に向けて需要は高まる一方、納品のリズムは変わらないので、在庫時間は延びるより縮む傾向です。配送の注文を保険として持ち、受け取りは通知に任せ、不要になったほうをキャンセルしてください。" },
    ];
  },
  sources: { newsroom: "Apple Newsroom：iPhone DuoがApple Store各店に登場（英語）", pickup: "Apple：店頭受け取り（英語）", log: "PickupChecker：このページの計算元の入荷履歴", restockTimes: "PickupChecker：AppleがiPhone Duoを入荷する時間" },
  ld: (x: SupplyView) => ({
    datasetName: `${country(x.c)}のアップルストアにおけるiPhone Duoの供給推移`,
    description: `${longDate(x.d.since)}以降に${storesPhrase(x)}で確認したiPhone Duoの日ごとの入荷：回数、店舗数、完売までの中央値、前週比の変化。`,
    measured: ["日ごとの入荷回数", "入荷のあった店舗数", "完売までの中央値", "前週比の変化", "いま掲載中の店舗数"],
  }),
  related: "続けて読む",
  sameData: "同じデータで答えるほかの疑問",
  otherCountries: "ほかの国の同じページ",
  questions: { restockTimes: "iPhone Duoの再入荷はいつ？", configs: "いちばん手に入れやすい構成は？", channels: "Apple、キャリア、量販店？", sellOut: "入荷は何秒で完売する？", howToGet: "iPhone Duoを手に入れる方法", alerts: "いちばん早く通知を受け取るには" },
  setUpAlert: "入荷通知を設定",
  logLive: "入荷履歴をライブで見る",
  faqTitle: "よくある質問",
  onThisPage: "このページの内容",
};

/* ================================================================== Apple・キャリア・量販店 */
const channels: D["channels"] = {
  crumb: "Apple、キャリア、量販店？",
  title: (c: Country) => fitTitleW([
    `${ofJa(c)}iPhone Duo：Apple、キャリア、量販店のどこで買う？`,
    `${ofJa(c)}iPhone Duo：Apple、キャリア、量販店のどこ？`,
    `${ofJa(c)}iPhone Duo：Apple、キャリア、量販店？`,
    "iPhone Duo：Apple、キャリア、量販店？",
  ], 49),
  metaDescription: (x: ChannelsView) => fitTitleW([
    `${inJa(x.c)}iPhone Duoを実際に手に入れられる場所：アップルストアの店頭受け取り（${longDate(x.sup.since)}以降、${N(x.stores)}店舗で確認済みの入荷${N(x.sup.n)}回）、apple.comの配送、${listJa(x.ch.carriers.slice(0, 3))}、${listJa(x.ch.retailers.slice(0, 2))}、転売——各チャネルで何がわかり何がわからないか、どこを見張るべきか。`,
    `${inJa(x.c)}iPhone Duo：アップルストアの店頭受け取り、apple.comの配送、${listJa(x.ch.carriers.slice(0, 2))}、${x.ch.retailers[0] ?? "量販店"}、転売を比較。各チャネルで何がわかり、どこを見張るべきか。`,
  ], 160),
  h1: (x: ChannelsView) => `アップルストア、キャリア、量販店——${inJa(x.c)}iPhone Duoは実際にどこで手に入る？`,
  intro: (x: ChannelsView) => `${ofJa(x.c)}iPhone Duoの販売チャネルのうち、供給を誰でも計測できるのはアップルストアの店頭受け取りだけです。PickupCheckerは${longDate(x.sup.since)}以降、${storesPhrase(x)}で確認済みの入荷を${N(x.sup.n)}回記録しており、うち${N(x.sup.last7.restocks)}回は直近7日間のもの、いずれもApple自身の受け取りページを${SPEED.checkSec}秒ごとに読み取ったものです。キャリア（${listJa(x.ch.carriers)}）と量販店（${listJa(x.ch.retailers)}）は独自の割り当てを受け取りますが在庫データを公開していないので、彼らの入荷時間を正直に教えられる人は——私たちを含め——誰もいません。以下、各チャネルで何がわかり何がわからないか、それぞれの長短、そして見張る順番です。`,
  updated: (x: ChannelsView, stamp: string) => `${stamp}更新 · アップルストアのデータは${longDate(x.sup.since)}から · アップルストア${N(x.stores)}店舗 · ${SPEED.checkSec}秒ごとにチェック`,
  nav: { compare: "チャネル別", pickup: "受け取りと配送", carriers: "キャリア", retailers: "量販店", resale: "転売価格", abroad: "海外で買う", method: "根拠" },
  h2: (x: ChannelsView) => ({
    compare: `${inJa(x.c)}iPhone Duoの入荷が最も多いチャネルは？`,
    pickup: "アップルストアの店頭受け取りは、apple.comの配送注文より早い？",
    carriers: `${x.ch.carriers.length ? listJa(x.ch.carriers.slice(0, 3), 3) : "キャリア"}で買ったほうがいい？`,
    retailers: `${x.ch.retailers.length ? listJa(x.ch.retailers.slice(0, 2), 2) : "量販店"}は見る価値がある？`,
    resale: `${x.ch.resale[0] ?? "フリマ・オークション"}で上乗せ価格を払う価値はある？`,
    abroad: "海外で買ったiPhone Duoを、国内で使える？",
    method: "私たちは何を根拠にしているか",
  }),
  hero: {
    restocks: "アップルストアの確認済み入荷",
    last7: "直近7日間",
    now: ((one: boolean) => (one ? "いま掲載中のアップルストア" : "いま掲載しているアップルストア")) as unknown as D["channels"]["hero"]["now"],
    channels: "ほかのチャネル（在庫データの公開なし）",
  },
  compareLead: (x: ChannelsView) => `唯一ある尺度で測れば、アップルストアの店頭受け取りです。${inJa(x.c)}直近7日間に${N(x.sup.last7.stores)}店舗で確認済みの入荷${N(x.sup.last7.restocks)}回${x.sup.last7.medianSec ? `、1回あたり中央値${secs(x.sup.last7.medianSec)}の掲載` : ""}。キャリアと量販店もほぼ確実に入荷しています——同じAppleの出荷から割り当てを受けるのですから——が、商品ページに「あり／なし」を出すだけでデータはないので、下の比較は「どこを見張れるか」であって、「誰が多く受け取るか」ではありません。`,
  compareCaption: "iPhone Duoの販売チャネルを、正直に比較",
  compareHead: ["チャネル", "在庫についてわかること", "見張り方", "落とし穴"],
  compareRows: (x: ChannelsView) => {
    const r = x.ch;
    return [
      { channel: "アップルストアの店頭受け取り", known: `${longDate(x.sup.since)}以降、確認済みの入荷${N(x.sup.n)}回。全入荷・全店舗を時刻つきで。`, watch: `ここで入荷通知（確認から約${SPEED.alertSec}秒後）、またはApple Storeアプリの受け取り店舗の選択画面。`, catch: "掲載は約1分。アプリを開き、カードを登録しておく必要があります。" },
      { channel: "apple.comの配送", known: "Appleは購入手続きで配送予定を表示。日々動き、在庫数ではありません。", watch: "注文を入れる。注文ページの予定日は、Appleの出荷に合わせて更新されます。", catch: "分ではなく週の単位——ただし、順番は確保されます。" },
      { channel: `キャリア（${listJa(r.carriers)}）`, known: "独自の割り当て。オンライン在庫は構成ごとに「在庫あり／入荷待ち」で表示。履歴もデータ配信もなし。", watch: "各社のアプリと店舗検索。店舗への電話も有効です。", catch: lockJa(x, "料金プラン、分割払い、開通の条件がつき、在庫は店舗ごとに異なります。") },
      { channel: `量販店（${listJa(r.retailers)}）`, known: "独自の割り当て。発売直後の製品はオンライン限定が多く、商品ページに構成ごとに表示。", watch: "商品ページとアプリ。入荷メールを出す店もあります。", catch: "割り当てはAppleより小さく、やはり数分で売り切れます。" },
      { channel: `転売（${listJa(r.resale)}）`, known: "価格次第で、常に入手可能。", watch: "—", catch: `上乗せ価格、メーカーの購入記録なし、${r.returnDays ? `${returnPhrase(r.returnDays)}もなし` : r.returnDays === 0 ? "不良品の交換も受けられません" : "返品期間もいっさいなし"}。` },
    ];
  },
  compareKeys: (x: ChannelsView) => [
    `${inJa(x.c)}ほかの販売者は${N(x.ch.carriers.length + x.ch.retailers.length)}社、公開された在庫履歴はひとつもありません。キャリアの入荷時間を知っていると言うサイトは、当てずっぽうです。`,
    "私たちの立場：アップルストアの店頭受け取りを入荷通知で見張り、apple.comの配送注文を保険に持ち、量販店のページはそこにいるときに確認する。",
  ],
  pickupLead: (x: ChannelsView) => `速さなら受け取りです。受け取りページに出た構成はその場で予約でき、当日受け取れます。配送注文はAppleの予定日を待つことになります。確実さなら配送です。店頭で何が起きても、注文は順番を確保します。${x.sup.lifetimes ? `${inJa(x.c)}受け取りの掲載は中央値${secs(x.sup.lifetimes.medianSec)}で、${pct(x.sup.lifetimes.within2min)}は2分以内に消えました——通知が存在する理由です。` : ""}正解は両方：今日配送を注文し、受け取りの通知を設定し、不要になったほうをキャンセルする。`,
  pickupSwaps: () => [
    { no: "「やり直し」のために配送注文をキャンセルする", yes: "受け取りが手に入るまで、注文は残す", why: "Appleは待ち順を公開していません。新しい注文には今日の予定日がつくだけで、手元の注文より早くなることはまれです。" },
    { no: "受け取りページを手で再読み込みする", yes: "見張りは通知に任せる", why: `通知を設定した店舗は${SPEED.fastSec}秒ごとにチェックし、確認から約${SPEED.alertSec}秒後にプッシュします。人が再読み込みしても、ほとんどの掲載は消えたあとに見ることになります。` },
    { no: "あとで注文を受け取りに変更する", yes: "通知が鳴ったら、受け取りを新規注文として予約する", why: "受け取りの予約は店舗在庫から、配送注文は倉庫からで、2つは別の列です。速いのは受け取りの列です。" },
  ],
  pickupKeys: (x: ChannelsView) => [
    `Apple自身のページが、受け取りと配送の選択肢${x.ch.returnDays ? `と、どちらにも適用される${N(x.ch.returnDays)}日間の返品期間` : ""}を説明しています（出典は下）${x.ch.returnDays === 0 ? "。なお香港のAppleは自己都合の返品を受け付けず、不良品の交換のみです" : ""}。`,
    "受け取りの予約は、その店舗への注文です。Appleが取り置き、来店のタイミングを知らせます。",
  ],
  carriersLead: (x: ChannelsView) => `分割払いや、料金プランと組み合わせた下取りが欲しい、あるいはすでに${x.ch.carriers[0] ?? "キャリア"}の店頭にいて棚に1台ある——それならはい。少しでも早く端末が欲しいなら、キャリアは確率が低く見張る手段もない、2つ目の抽選です。${lockJa(x, "購入前に、SIMロックと料金プランの条件を確認してください。")}各社のオンラインストアは構成ごとに在庫を表示するので、ちょっと見るだけなら損はありません。ただ、履歴や通知は期待しないでください。`,
  carriersKeys: (x: ChannelsView) => [
    `${ofJa(x.c)}キャリア：${listJa(x.ch.carriers)}。`,
    "キャリアの在庫は店舗ごとです。オンラインで在庫ありでも、店頭受け取り限定のことがあります。",
    "キャリア版も同じハードウェアです。違いは、付いてくる契約です。",
  ],
  retailersLead: (x: ChannelsView) => `そこで買い物をしているなら見る価値はありますが、見張る価値はありません。${listJa(x.ch.retailers)}はiPhone Duoを構成ごとに掲載し、割り当て分をオンラインで数分で売り切ります。購読できるデータ配信はありません。利点は支払い条件とポイント、欠点はApple直営店より小さい割り当てです。`,
  retailersKeys: (x: ChannelsView) => [
    `${ofJa(x.c)}量販店：${listJa(x.ch.retailers)}。`,
    "商品ページの構成選択を確認：グレーアウトはオンライン在庫なしの意味で、店頭についてはなにも言っていません。",
  ],
  resaleLead: (x: ChannelsView) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `ほとんどの場合、いいえ。上乗せ価格と、それで買える「待たない時間」を秤にかけてください。${ofJa(x.c)}アップルストアは今週${perDay >= 1 ? `1日あたり約${N(Math.round(perDay))}回` : "1日1回未満"}入荷し、確認済みの入荷から約${SPEED.alertSec}秒で通知が届くので、近くで見ている店舗はたいてい数日以内に順番が来ます。対して${listJa(x.ch.resale)}にはメーカーの購入記録がなく、${x.ch.returnDays ? `${returnPhrase(x.ch.returnDays)}もなく` : x.ch.returnDays === 0 ? "不良品の交換も受けられず" : "返品期間もいっさいなく"}、いつものリスク——アクティベーションロック、箱のすり替え、「未開封」の返品——がつきます。`;
  },
  resaleKeys: () => [
    "それでも転売で買うなら：対面で受け取り、電源を入れ、「設定 → 一般 → 情報」でシリアル番号を確認し、支払う前にサインインする。",
    "Appleの保証は端末に付き、レシートには付きません——ただし購入証明を求められることはあり、個人売買ではAppleのものは得られません。",
    "1週間の待ち時間を超える上乗せは、待てないことへの対価です。それを承知で決めてください。",
  ],
  abroadLead: (x: ChannelsView) => `多くの場合はい、ただし確認が必要です。Appleで買ったiPhoneはほとんどの国でSIMフリーで販売され、Appleの保証サービスは例外を除いて国際的に受けられ、モデルが国内キャリアの周波数帯——そしてeSIM——に対応している必要があります。Appleの購入ページは、すべての国でiPhone DuoをeSIM専用としているからです。本当のコストは税金です。${x.c.pricesIncludeTax ? "海外で払う価格には現地の税が含まれ、取り戻せないことがあります" : "売上税がレジで加算されます"}し、帰国時に自国の関税がかかることもあります。PickupCheckerは${x.us ? "ほかの18か国" : "米国とほかの17か国"}を追跡しているので、在庫の問いそのものには各国ページで答えられます。`,
  abroadKeys: () => [
    "購入前に：Appleの保証ページでサービス提供国を、モデルの周波数帯とSIMの一覧を、国内キャリアのeSIM対応を確認する。",
    "レシートは保管する：サービスも返品も、購入した国のルールで進みます。",
    "帰国後に誰かへ渡す端末も、海外で買った端末です。同じ確認が必要です。",
  ],
  methodLead: (x: ChannelsView) => `このページのアップルストアの数字は、PickupChecker自身が${longDate(x.sup.since)}以降、${storesPhrase(x)}を${SPEED.checkSec}秒ごとにチェックしたもので、入荷は2回の一致した観測のあとにだけ数えます。キャリアと量販店の一覧は、Apple自身がその国について挙げる販売者と最大手のリセラーで、出典は各社のページです。彼らの在庫について書いていることは各社のページに表示されていることで、履歴ではなくスナップショットです。私たちは彼らのページをスクレイピングせず、入荷時間についてもなにも主張しません。`,
  methodKeys: () => ["訂正歓迎：このページの販売者がiPhone Duoの取り扱いをやめていたら、お知らせください。削除します。", "引用はリンクと日付を添えて。"],
  faq: (x: ChannelsView): Faq[] => [
    { q: `${inJa(x.c)}iPhone Duoの入荷が最も速いチャネルは？`, a: `計測できる記録があるのは、アップルストアの店頭受け取りだけです。${inJa(x.c)}直近7日間に確認済みの入荷${N(x.sup.last7.restocks)}回${x.sup.last7.medianSec ? `、1回あたり中央値${secs(x.sup.last7.medianSec)}の掲載` : ""}。キャリアと量販店も入荷しますがデータを公開していないので、誰も正直に順位づけできません。` },
    { q: "apple.comの注文をキャンセルして再注文すると、順番を失う？", a: "今日の配送予定がついた、新しい注文になります。Appleは待ち順を公開していません。キャンセルする前に、購入手続きに表示される予定日と手元の注文の予定日を比べてください——早くなることはまれです。" },
    { q: "キャリア版のiPhone Duoは、Apple版と違う？", a: `同じハードウェアです。${lockJa(x, "違いは料金プランと、付いてくるSIMロックや分割払いの条件です。")}キャリアの在庫はAppleとは別で、店舗ごとに表示されます。` },
    { q: "量販店で買っても、Appleの返品期間は適用される？", a: x.ch.returnDays ? `いいえ、量販店自身の規約が適用されます。Appleの${N(x.ch.returnDays)}日間の返品期間は、Appleからの購入（apple.comとアップルストア）に適用されます。` : x.ch.returnDays === 0 ? "香港のApple自身が自己都合の返品を受け付けていない（不良品の交換のみ）ので、量販店側の規約を比べてください。香港ではAppleより寛容な店もあります。" : "いいえ、量販店自身の規約が適用されます。Appleの返品期間が適用されるのは、Appleからの購入だけです。" },
    { q: "AppleはiPhone Duoのキャリアとして、どこを挙げている？", a: x.c.cc === "us" || x.c.cc === "jp" ? `${ofJa(x.c)}Appleの購入ページには${listJa(x.ch.carriers)}が記載されています。ほかの国の購入ページではキャリアを選ぶ手順がなく、SIMフリーで販売されます。` : `${ofJa(x.c)}Appleの購入ページはiPhone DuoをSIMフリーで販売し、キャリアの記載はありません。${listJa(x.ch.carriers)}は、AppleがiPhoneに対応するネットワークとして挙げているキャリアで、各社の条件で販売しています。` },
    { q: "海外で買ったiPhone Duoを、国内のキャリアで使える？", a: "たいていは使えます。モデルがキャリアの周波数帯に対応し、キャリアがeSIMを提供し（iPhone Duoはどこで買ってもeSIM専用）、SIMフリーであること——Apple自身の販売は、ほとんどの国でそうです。保証サービスは例外を除いて国際的に受けられます。本当の追加コストは、税金と関税です。" },
  ],
  sources: { buy: "Apple：iPhone Duoを購入", pickup: "Apple：店頭受け取りと配送（英語）", returns: "Apple：返品と返品期間", warranty: "Apple：国別の保証サービス（英語）", log: "PickupChecker：このページの計算元の入荷履歴" },
  ld: (x: ChannelsView) => ({
    description: `${inJa(x.c)}iPhone Duoについて、アップルストアの店頭受け取り、apple.comの配送、キャリア、量販店、転売を比較：計測したアップルストアの入荷と、ほかのチャネルでわかること・わからないこと。`,
  }),
  related: "続けて読む",
  sameData: "同じデータで答えるほかの疑問",
  otherCountries: "ほかの国の同じページ",
  questions: { howToGet: "iPhone Duoを手に入れる方法", whereToBuy: "今日どこで買えるか", shortage: "品薄は緩和してきた？", configs: "いちばん手に入れやすい構成は？", restockTimes: "iPhone Duoの再入荷はいつ？", alerts: "いちばん早く通知を受け取るには" },
  setUpAlert: "入荷通知を設定",
  logLive: "入荷履歴をライブで見る",
  faqTitle: "よくある質問",
  onThisPage: "このページの内容",
};

/* ================================================================== 公開API */
const api: D["api"] = {
  crumb: "在庫API",
  title: (c: Country) => fitTitleW([
    `${ofJa(c)}iPhone Duo在庫API：アップルストアのライブデータ（無料）`,
    `${ofJa(c)}iPhone Duo在庫API：ライブデータを無料JSONで`,
    `${ofJa(c)}iPhone Duo在庫API（無料JSON）`,
    "iPhone Duo在庫API（無料JSON）",
  ], 49),
  metaDescription: (x: ApiView) => fitTitleW([
    `${ofJa(x.c)}アップルストア${N(x.stores)}店舗（世界${N(x.countries)}か国・${N(x.worldStores)}店舗）のiPhone Duo店頭受け取り在庫を返す、無料・読み取り専用のJSON API：店舗×構成ごとの現在の在庫、過去24時間の確認済み入荷。キー不要、キャッシュ30秒。エンドポイント、curl/Python/JavaScriptの例、制限、スクリプトが通知に勝つ場合。`,
    `${ofJa(x.c)}アップルストア${N(x.stores)}店舗のiPhone Duo在庫を返す無料JSON API：店舗ごとの在庫、過去24時間の入荷、キー不要。エンドポイント、例、制限。`,
  ], 160),
  h1: (x: ApiView) => `${ofJa(x.c)}アップルストアのiPhone Duo在庫を監視するAPIやスクリプトはある？`,
  intro: (x: ApiView) => `あります。PickupCheckerは${storesPhrase(x)}（全体では${N(x.countries)}か国・${N(x.worldStores)}店舗）を対象にした、無料・読み取り専用のJSON APIを公開しています。店舗ごとに${SPEED.checkSec}秒ごとのチェックから作られ、エッジで30秒キャッシュされ、キーも登録も不要です。1つのリクエストで全店舗のiPhone Duoの現在の店頭受け取り在庫が構成別に返り、もう1つで過去24時間の確認済み入荷が返ります。いま${inJa(x.c)}${N(x.stores)}店舗中${N(x.storesNow)}店舗が掲載しており、過去24時間に確認済みの入荷は${N(x.restocks24)}回でした。以下、エンドポイント、curl・Python・JavaScriptの動く例、フィールド一覧、制限——そして、30秒のキャッシュ間隔でポーリングするスクリプトがなぜプッシュ通知より遅いのか。`,
  updated: (x: ApiView, stamp: string) => `${stamp}更新 · ${ofJa(x.c)}アップルストア${N(x.stores)}店舗 · ${SPEED.checkSec}秒ごとにチェック · APIは30秒キャッシュ`,
  nav: { endpoints: "エンドポイント", examples: "例", fields: "フィールド", limits: "制限と条件", script: "スクリプトか通知か", apple: "apple.comの取得", method: "データの出どころ" },
  h2: (x: ApiView) => ({
    endpoints: `${ofJa(x.c)}iPhone Duo在庫APIは何を返す？`,
    examples: "curl、Python、JavaScriptからどう呼ぶ？",
    fields: "各フィールドの意味は？",
    limits: "どのくらいの頻度でポーリングできる？ 利用条件は？",
    script: "自分でスクリプトを書く？ それとも通知を使う？",
    apple: "代わりに、自分でapple.comをポーリングできる？",
    method: "データの出どころ",
  }),
  hero: {
    stores: (() => "対象のアップルストア") as unknown as D["api"]["hero"]["stores"],
    now: "いまiPhone Duoを掲載中",
    restocks24: "過去24時間の確認済み入荷",
    cache: "APIがキャッシュされる秒数",
  },
  perMinute: "1アドレスあたり・1分間のリクエスト上限",
  keysNeeded: "必要なAPIキー",
  endpointsLead: (x: ApiView) => `GETエンドポイントが3つ、すべてJSON、すべてhttps://pickupchecker.com/api/v1の下にあります。\`stock\`は${ofJa(x.c)}全アップルストアについて、いま店頭受け取りで掲載中の構成と最終チェック時刻を返します。\`restocks\`は過去1〜168時間の確認済み入荷を新しい順に、いまも掲載中かどうかとともに返します。\`iphone-duo\`は\`stock?model=duo\`へのショートカットです。国コードはパスに入れます（${x.c.cc}${x.c.cc === "uk" ? "、gbも可" : ""}）。モデルはduo、18-pro、18-pro-maxです。`,
  endpointsCaption: "エンドポイント（{country}はus、ca、uk、au、de、fr、it、es、jp、kr、hk、sg、ae、ch、nl、se、tw、at、beのいずれか）",
  endpointsHead: ["エンドポイント", "返すもの", "パラメータ"],
  endpointsRows: (x: ApiView) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: "全店舗：in_stock、掲載中の構成、last_checked_at、last_in_stock_at。summaryにstores_in_stock。", params: "model（duo | 18-pro | 18-pro-max）、storage（例：512GB）、color（例：night-sky）" },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: "確認済み入荷を新しい順に：at、store、構成、still_listed。", params: "model、hours（1〜168、既定24）、limit（1〜200、既定100）" },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: "stock?model=duoにリダイレクト。", params: "—" },
    { path: "/api/v1", returns: "この一覧、対応する国とモデル、制限。", params: "—" },
  ],
  examplesLead: "どれかをコピーしてください。いまiPhone Duoを掲載している店舗を表示します。キー不要、必要なヘッダーはスクリプト名を書いたUser-Agentだけです（挙動がおかしいときに連絡できるように）。",
  exampleTitles: { curl: "curl（任意のシェル）", python: "Python 3（標準ライブラリのみ）", node: "JavaScript（Node 18以降、またはブラウザ）" },
  fieldsLead: "フィールドはすべてsnake_case、時刻はすべてUTCのISO 8601です。店舗IDはApple自身のもの（R番号）なので、Appleの店舗ページやこのサイトのURLと一致します。",
  fieldsCaption: "フィールド一覧",
  fieldsHead: ["フィールド", "型", "意味"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "この応答を計算した時刻。CDNが最長30秒、同じ応答を配信することがあります。" },
    { f: "country.code / name / currency", t: "string", m: "店舗の国。" },
    { f: "configurations[]", t: "object", m: "クエリが対象とする型番。storageとcolorはAppleの表記。" },
    { f: "summary.stores_in_stock", t: "integer", m: "対象の構成を1つ以上、いま店頭受け取りで掲載している店舗数。" },
    { f: "stores[].store_number", t: "string", m: "Appleの店舗ID。例：R085。" },
    { f: "stores[].in_stock", t: "boolean", m: "対象の構成が1つ以上、店頭受け取りで掲載中。" },
    { f: "stores[].available[]", t: "object", m: "掲載中の構成：part_number、storage、color。" },
    { f: "stores[].last_checked_at", t: "string | null", m: `この店舗のAppleの受け取りページを最後に読んだ時刻（通常は${SPEED.checkSec}秒以内）。` },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "この店舗が対象の構成を最後に掲載していた時刻。" },
    { f: "restocks[].at", t: "string", m: "構成が完売から在庫ありに変わった時刻（2回のチェックで確認）。" },
    { f: "restocks[].still_listed", t: "boolean | null", m: "応答の時点で、その店舗がまだ掲載しているか。" },
    { f: "attribution", t: "object", m: "出典、ライセンスの一文、このページ。" },
  ],
  limitsLead: "ポーリングはエンドポイントごとに30秒以上の間隔で——応答はエッジでその時間キャッシュされるので、それより短い間隔では同じJSONが返ります——1アドレスから毎分60リクエスト未満に抑えてください。これが私たちのサーバーに届く上限です。データは商用を含めて無料で使えます。条件は1つ：数値を表示する場所に「Source: PickupChecker」と、pickupchecker.com（または店舗・国ページ）へのリンクを示すこと。キー不要、登録不要、CORSは開放しているので、ブラウザのページから直接呼べます。",
  limitsKeys: () => [
    "429応答は、あなたのアドレスから1分間に60リクエストを超えたという意味です。Retry-Afterの秒数だけ待ってください。",
    "互換性を壊す変更は新しいバージョンパス（/api/v2）で行います。v1ではフィールドは追加されるだけで、改名はしません。",
    "プロジェクト名と連絡先を書いたUser-Agentを設定してください。礼儀正しいスクリプトをブロックしたことは、一度もありません。",
  ],
  scriptLead: (x: ApiView) => `ダッシュボード、Discordボット、スプレッドシート、研究が目的なら、スクリプトを書いてください——APIはそのためにあります。実際にiPhone Duoを買いたいなら、スクリプトは遅いほうの道具です。入荷に気づくのは次のポーリング、最長30秒後で、そこからあなたに伝えなければなりません。私たちのプッシュ通知は同じ店舗を${SPEED.fastSec}秒ごとに読み、入荷を確認し、その約${SPEED.alertSec}秒後にスマートフォンに届きます——${x.storesNow !== undefined ? "約1分という掲載時間の中央値の内側です" : "掲載時間の中央値の内側です"}。多くの人は両方使っています。買うには通知、見るにはAPI。`,
  scriptCaption: "ポーリングするスクリプトと、プッシュ通知の比較",
  scriptHead: ["", "このAPIを使うあなたのスクリプト", "PickupCheckerの通知"],
  scriptRows: () => [
    { k: "入荷に気づくまで", a: "最長30秒（キャッシュ）＋あなたの間隔", b: `約${SPEED.alertSec}秒` },
    { k: "スマートフォンに届く手段", a: "自分で作るもの（メール、ボット、SMS）", b: "ホーム画面アプリの通知" },
    { k: "見張る店舗", a: "全店舗、毎回", b: `選んだ店舗を${SPEED.fastSec}秒ごと、全店舗を${SPEED.checkSec}秒ごと` },
    { k: "費用", a: "無料", b: "通知はプラン制。このサイトを読むのは無料" },
  ],
  appleLead: "できます、限度内で。apple.comの受け取りページは店舗×構成ごとに答え、私たちが読んでいるのもまさにそれです。単発のスクリプトに欠けるのは手間のかかる部分——Appleが答え続けてくれるためのIPv6ローテーション、揺れる「在庫なし」が偽の入荷にならないための2回観測ルール、全店舗のタイムゾーン処理、発売日から続く記録。答えだけが欲しいなら、APIはその作業を済ませたものです。学びたいなら、仕組みのページで各要素を説明しています。",
  appleKeys: () => [
    "Appleのページはスナップショットです。「いま」は教えてくれますが、掲載がどれだけ持ったか、最後の入荷がいつだったかは教えてくれません。",
    `私たちのチェックは店舗ごとに${SPEED.checkSec}秒間隔で、${SPEED.fastSec}秒より速くはしません。それ以上激しくapple.comを叩くスクリプトはブロックされ、何も学べません。`,
  ],
  methodLead: (x: ApiView) => `すべての数値は、PickupCheckerが${storesPhrase(x)}のApple自身の店頭受け取り在庫を${SPEED.checkSec}秒ごと（通知を設定した店舗は${SPEED.fastSec}秒ごと）に読み取ったものです。変化は2回の一致した観測のあとにだけ確定し、空白のあとに初めて見えた在庫は入荷ではありません。APIは、このサイトのページが読んでいるのと同じテーブルを返します。サンプリングも推定もしていません。`,
  methodKeys: () => ["手法の全文：仕組みのページ（英語）。", "出典表示が対価のすべてです。リンクを返してもらえれば、無料のままです。"],
  faq: (x: ApiView): Faq[] => [
    { q: `${ofJa(x.c)}アップルストアのiPhone Duo在庫に、無料のAPIはある？`, a: `あります。PickupCheckerのhttps://pickupchecker.com/api/v1/${x.c.cc}/stockで、${ofJa(x.c)}全アップルストアについて、いま店頭受け取りで掲載中の構成をJSONで返します。キー不要、キャッシュ30秒。もう1つのエンドポイントが、過去24時間の確認済み入荷を返します。` },
    { q: "Appleに公式の在庫APIはある？", a: "公開されたものはありません。apple.comの受け取りページは店舗×構成ごとに読めるので、このサイトはそれを手間をかけて（ローテーション、確認、タイムゾーン）行っています。ここのAPIは、その作業をJSONとして公開したものです。" },
    { q: "データはどのくらい新しい？", a: `各店舗を${SPEED.checkSec}秒ごと（通知を設定した店舗は${SPEED.fastSec}秒ごと）にチェックし、APIの応答は30秒キャッシュされるので、数値は最大でも約45秒前のものです。正確な時刻はlast_checked_atが教えます。` },
    { q: "商用製品で使える？", a: "使えます。条件は出典表示：データを表示する場所に、pickupchecker.comへのリンク付きで「Source: PickupChecker」を示すこと、そしてポーリング間隔を30秒以上にすること。キーは不要です。" },
    { q: "スクリプトのほうが、通知より早くiPhone Duoを手に入れられる？", a: `いいえ。スクリプトが入荷に気づくのは次のポーリング、最長30秒後です。通知は入荷を確認し、見つけてから約${SPEED.alertSec}秒でスマートフォンに届きます。見るにはスクリプト、買うには通知を。` },
  ],
  sources: { pickup: "Apple：店頭受け取り（英語）", method: "PickupChecker：チェックの仕組み（英語）", log: "PickupChecker：入荷履歴" },
  ld: (x: ApiView) => ({
    description: `${storesPhrase(x)}のiPhone Duo店頭受け取り在庫を返す無料JSON API：店舗×構成ごとの現在の在庫と、過去24時間の確認済み入荷。`,
  }),
  related: "続けて読む",
  sameData: "同じデータで答えるほかの疑問",
  otherCountries: "ほかの国の同じページ",
  questions: { alerts: "いちばん早く通知を受け取るには", howItWorks: "チェックの仕組み（英語）", restockTimes: "iPhone Duoの再入荷はいつ？", shortage: "品薄は緩和してきた？", configs: "いちばん手に入れやすい構成は？", stockChecker: "iPhone Duoの在庫チェッカー" },
  setUpAlert: "入荷通知を設定",
  tryIt: "ライブのJSONを開く",
  faqTitle: "よくある質問",
  onThisPage: "このページの内容",
};

export const decide: DecideDict = { configs, supply, channels, api };
