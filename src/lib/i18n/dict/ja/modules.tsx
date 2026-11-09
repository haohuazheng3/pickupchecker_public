/**
 * 日本語: modules — 入荷・店舗・在庫のモジュール（src/components/{restocks,stores,stock}）。
 * `label` は場所を表す名詞句（「東京」「Apple 銀座」「この店舗」「日本」）で届く。助詞はこちらで付ける。
 * 数値は生の値で届くので num() で整形する。所要時間・時刻・日付・割合は整形済み。チェック間隔は15秒と5秒のみ。
 */
import type { ReactNode } from "react";
import { num } from "@/lib/i18n/format";
import type { Dict } from "../en";

const N = (n: number) => num("ja", n);
/** 「日」→「日曜」、それ以外（「明日」など）はそのまま。 */
const dayWord = (day: string) => (day.length === 1 ? `${day}曜` : day);
const CHECK = "15秒ごと、通知設定店舗は5秒ごと";

export const modules: Dict["modules"] = {
  daily: {
    empty: (label: string, days: number) => `過去${N(days)}日間、${label}の入荷・完売の記録はありません。最初の記録からグラフが埋まっていきます。`,
    summary: (restocks: number, soldouts: number, label: string, days: number, activeDays: number) =>
      `過去${N(days)}日間の${label}：入荷${N(restocks)}回・完売${N(soldouts)}回、記録のあった日は${N(activeDays)}日。`,
    busiest: (day: string, restocks: number) => <>最も多かったのは<b className="text-ink">{day}</b>の{N(restocks)}回です。</>,
    barAria: (day: string, restocks: number, soldouts: number) => `${day}：入荷${N(restocks)}回、完売${N(soldouts)}回`,
    barTitle: (day: string, restocks: number, soldouts: number) => `${day}：入荷${N(restocks)}回 · 完売${N(soldouts)}回`,
    legendRestocks: "入荷",
    legendSoldouts: "完売",
  },

  last24: {
    title: (label: string) => `${label}のiPhone Duo入荷：過去24時間`,
    asOf: (when: string) => `${when}時点`,
    localTime: (when: string) => `現地時間 ${when}`,
    anAppleStore: "アップルストア",
    unknown: "過去24時間の件数をいま読み込めませんでした。このページのライブ在庫と入荷履歴には影響ありません。",
    none: (label: string, asOf: string) => <><b className="text-ink">過去24時間、{label}でiPhone Duoの入荷はありません</b>（{asOf}時点）。</>,
    some: (o: { restocks: number; one: boolean; label: string; withStores: number; allStores: number; config: string; store: ReactNode | null; when: string }) => (
      <>過去24時間で、iPhone Duoは<b className="text-ink">{o.one ? `${o.label}で${N(o.restocks)}回` : `${o.label}のアップルストア${N(o.allStores)}店舗中${N(o.withStores)}店舗で計${N(o.restocks)}回`}</b>入荷しました。最新は<b className="text-ink">{o.config}</b>{o.store != null && <>（{o.store}）</>}、現地時間{o.when}です。</>
    ),
    tileRestocks: "確認済みの入荷 · 24時間",
    tileConfigsBack: "再入荷した構成",
    tileStores: (configs: number, allConfigs: number) => `入荷のあった店舗${configs ? ` · ${N(allConfigs)}構成中${N(configs)}構成` : ""}`,
    tileLatest: (config: string, store: string | null) => <>最新 · {config}{store != null && <> · {store}</>}</>,
    tileBefore: (config: string, store: string | null, day: string) => <>その前の入荷 · {config}{store != null && <> · {store}</>} · {day}</>,
    tileNoEarlier: "それ以前の入荷記録なし",
    caption: (label: string, asOf: string) => `${label}のiPhone Duo、構成別の確認済み入荷（過去24時間・${asOf}時点）`,
    thConfig: "構成",
    thRestocks: "入荷",
    thStores: "店舗",
    thLast: "最新の入荷（現地時間）",
    thNow: "現在の在庫",
    ofStores: (n: number, total: number) => `${N(total)}店舗中${N(n)}`,
    noneIn24: "24時間なし",
    yes: "あり",
    no: "なし",
    countedTitle: "入荷のカウント方法",
    counted: "PickupCheckerが自らapple.comの店頭受け取り在庫をチェックしています。全店舗を15秒ごと、通知の設定された店舗は5秒ごと。入荷は2回のチェックが一致したときだけ記録し、ある店舗を初めて確認したときの在庫は数えません。他サイトの報告は一切混ぜていません。",
    alert: (label: string | null) => `${label != null ? `${label}の` : ""}入荷通知を設定 → 次の入荷は数秒でお知らせ`,
  },

  clock: {
    none: (label: string, days: number) => `過去${N(days)}日間、${label}の入荷記録はまだありません。`,
    thin: (total: number, label: string, days: number, dates: number | null) =>
      `過去${N(days)}日間の${label}の入荷は${N(total)}回${dates != null ? `（${N(dates)}日間）` : ""}。傾向を判断するにはまだ少なすぎます。`,
    pattern: (total: number, label: string, days: number, hour: string, day: string | null) => (
      <>過去{N(days)}日間の{label}の入荷は{N(total)}回。多くは現地時間の<b className="text-ink">{hour}</b>ごろ{day ? <>で、最も多い曜日は<b className="text-ink">{day}</b></> : null}です。</>
    ),
    byHour: (zone: string) => `時間帯別 · ${zone}`,
    byWeekday: "曜日別",
    barReported: (n: number) => `（他サイトの報告 +${N(n)}）`,
    barReportedTitle: (bar: string, n: number) => `${bar}：他サイトの報告 ${N(n)}件`,
    legendOurs: "PickupCheckerが確認",
  },

  feed: {
    empty: "入荷の記録はまだありません。",
    available: "在庫あり",
    soldOut: "在庫切れ",
    soldOutAt: (time: ReactNode) => <>{time}に完売</>,
    since: (time: ReactNode) => <>{time}から</>,
    restockedAt: (time: ReactNode) => <>{time}に入荷</>,
    mapAria: (store: string) => `${store}を地図で表示`,
    map: "地図",
    buyAria: (model: string, config: string) => `apple.comで${model} ${config}を購入`,
    buy: "apple.comで購入",
  },

  byConfig: {
    empty: (label: string, days: number) => `過去${N(days)}日間、${label}で入荷した構成はないため、ランキングはまだありません。`,
    intro: (label: string, days: number) => `過去${N(days)}日間に${label}で入荷した構成を、多い順に。`,
    times: (n: number) => `${N(n)}回`,
    alert: "入荷通知",
  },

  sellout: {
    typical: (label: string, band: string) => `${label}のiPhone Duoの入荷は、通常約${band}で完売しました。`,
    half: (label: string, duration: string) => `${label}の入荷の半数は、${duration}以内に完売しました。`,
    none: (label: string, days: number) => `過去${N(days)}日間、${label}で完売した入荷はまだありません。`,
    whatDuo: "iPhone Duo",
    whatAll: "全iPhone",
    definition: "表示時間とは、Appleの店頭受け取りページがその構成を受け取り可能と表示していた時間で、私たちの2回のチェックの間で決まります。売れた台数や、どれだけ急ぐ必要があるかを示すものではありません。",
    tileHalf: (what: string) => <>半数が完売するまで · {what}</>,
    tileWithin30: "30秒以内に完売",
    tileWithin60: "1分以内に完売",
    tileFastest: (n: number, days: number) => <>最速 · 完売した入荷{N(n)}回・{N(days)}日間</>,
    caption: (days: number) => `iPhone別、過去${N(days)}日間`,
    thIphone: "iPhone",
    thSoldOut: "完売",
    thHalf: "半数が完売",
    thWithin30: "≤ 30秒",
    thWithin60: "≤ 1分",
    thFastest: "最速",
    each: "入荷ごとの記録",
    barNote: (full: string) => `バー＝在庫があった秒数 · ${full}で最大`,
    stillListed: (duration: string) => `在庫あり継続中 · ${duration}`,
    approx: (range: string) => `≈ ${range}`,
    measuredTitle: "測定方法",
    measured: (estimated: boolean) =>
      `「45〜60秒で完売」とは、最初に在庫を確認してから45秒後のチェックではまだ在庫があり、60秒後のチェックではなくなっていた、という意味です。通知の設定された店舗は5秒ごと、それ以外の店舗は15秒ごとにチェックするので、それが各範囲の幅になります${estimated ? "。≈ は最後のチェック時刻を記録し始める前の入荷で、代わりに15秒のチェック周期で範囲を区切っています" : ""}。チェック1回分より短い在庫は2回のチェックの間に出て消えることがあるため、30秒以内に完売した実際の割合は、表示より高くなります。`,
  },

  configTable: {
    title: "この店舗の全構成",
    titleAt: (store: string) => `${store}の全構成`,
    lookupOff: (hasRows: boolean) => `現在、この店舗ではAppleが店頭受け取りの在庫照会を提供していません${hasRows ? "（以下は最後に得られた回答です）" : ""}`,
    tracked: (n: number) => `${N(n)}構成をチェック中`,
    firstSweep: "初回チェック中：1分以内に状況が表示されます",
    inStock: (n: number, total: number) => `${N(total)}構成中${N(n)}構成に在庫`,
    available: "受け取り可能",
    unavailable: "受け取り不可",
    noLookup: "在庫照会なし",
    notChecked: "未チェック",
    since: (ago: ReactNode) => <>{ago}から</>,
    lastAvailable: (ago: ReactNode) => <>最後の在庫：{ago}</>,
    neverHere: "この店舗では在庫を確認したことがありません",
    buy: "購入",
    alertAria: (model: string, config: string, store: string) => `${store}で${model} ${config}が受け取り可能になったら通知`,
    alert: "通知 →",
  },

  matrix: {
    store: "店舗",
    checked: "チェック",
    cellTitle: (model: string, n: number, total: number) => `${model}：${N(total)}構成中${N(n)}構成が受け取り可能`,
  },

  nearby: {
    duo: (short: string, n: number) => `${short} · ${N(n)}`,
    noDuo: (short: string) => `${short}なし`,
  },

  stockByModel: {
    availableNow: (n: number, total: number) => `いま${N(total)}構成中${N(n)}構成が受け取り可能`,
    noneNow: (total: number) => `現在${N(total)}構成とも在庫なし`,
    lookupOff: "現在、この店舗ではAppleが受け取り在庫の照会を提供していません",
    notChecked: "未チェック",
    more: (n: number) => `+${N(n)}`,
    checked: (ago: ReactNode) => <>{ago}にチェック</>,
    alert: "通知 →",
  },

  storeBlock: {
    checked: (ago: ReactNode) => <>{ago}にチェック · {CHECK}</>,
    map: "地図で表示",
    alert: "この店舗で入荷通知",
    alsoIn: (region: string) => `${region}のほかの店舗`,
    acrossLine: "州境の向こうの近い店舗",
    elsewhere: "ほかの近い店舗",
  },

  hours: {
    title: "営業時間",
    local: (zone: string) => `現地時間 · ${zone}`,
    today: (hours: string, week: string) => ` · 本日 ${hours} · ${week}`,
    directions: "経路",
    applePage: "apple.comの店舗ページ",
    liveMap: "在庫マップ",
    storePage: "店舗ページ",
    closed: "休業",
    everyDay: (hours: string) => `毎日 ${hours}`,
    openNow: (closes: string) => `営業中 · ${closes}閉店`,
    opensAt: (opens: string) => `${opens}開店`,
    closedToday: (next: string | null) => (next ? `本日休業 · ${next}に開店` : "本日休業"),
    closedNow: (next: string | null) => (next ? `営業時間外 · ${next}に開店` : "営業時間外"),
    nextOpen: (day: string | null, time: string) => `${day == null ? "明日" : dayWord(day)} ${time}`,
  },

  liveStats: {
    inStock: "現在の在庫",
    storesWith: "在庫のある店舗",
    lastCheck: "最終チェック",
    none: "—",
  },

  board: {
    summary: (n: number, stores: number, short: string) => `${N(stores)}店舗中${N(n)}店舗に${short}の在庫あり`,
    lastCheck: (ago: ReactNode) => <>最終チェック {ago}</>,
    firstSweep: "初回チェック中です。",
    noneListed: (model: string, storage: string | null, color: string | null) => `現在、${model}${storage ? ` ${storage}` : ""}${color ? `（${color}）` : ""}の在庫がある店舗はありません。`,
    more: (n: number) => `+${N(n)}`,
    seen: (ago: ReactNode) => <>{ago}に確認</>,
    loading: "在庫を読み込み中",
  },
  duoNow: {
    eyebrow: (label: string) => `${label}のiPhone Duo在庫：現在`,
    /** 判定文。`stamp` は整形済みの日時、`list` は在庫のある店舗（storeItem）を連結したもの。 */
    notNow: (o: { stamp: string; n: number; label: string }) => <><b className="text-ink">{o.stamp}時点で在庫なし</b>：{o.label}のアップルストア{N(o.n)}店舗はいずれも、iPhone Duoを店頭受け取りで扱っていません。</>,
    notNowOne: (o: { stamp: string; name: string }) => <><b className="text-ink">{o.stamp}時点で在庫なし</b>：{o.name}では、店頭受け取りできるiPhone Duoの構成はありません。</>,
    inStock: (o: { stamp: string; k: number; n: number; label: string; list: ReactNode }) => <><b className="text-ink">{o.stamp}時点で在庫あり</b>：{o.label}のアップルストア{N(o.n)}店舗中{N(o.k)}店舗で、iPhone Duoを店頭受け取りできます — {o.list}。</>,
    inStockOne: (o: { stamp: string; k: number; total: number; name: string; list: ReactNode }) => <><b className="text-ink">{o.stamp}時点で在庫あり</b>：{o.name}では、iPhone Duo全{N(o.total)}構成中{N(o.k)}構成を店頭受け取りできます — {o.list}。</>,
    storeItem: (store: ReactNode, configs: number, ago: string | null) => <>{store}（{N(configs)}構成{ago ? `・${ago}から表示` : ""}）</>,
    configItem: (config: string, ago: string | null) => <>{config}{ago ? `（${ago}から表示）` : ""}</>,
    lastIn: (o: { config: string; store: ReactNode | null; when: string; lasted: string | null }) => <>最後の在庫：<b className="text-ink">{o.config}</b>{o.store != null && <>（{o.store}）</>}、{o.when}{o.lasted ? <>（{o.lasted}）</> : null}。</>,
    neverYet: (label: string, since: string) => `${since}に追跡を始めて以来、${label}で確認済みのiPhone Duo入荷はまだありません。`,
    others: (o: { pro: number; max: number; one: boolean; configs: number }) => (o.one ? `この店舗ではiPhone 18 Proが${N(o.configs)}構成中${N(o.pro)}構成、18 Pro Maxが${N(o.max)}構成で受け取り可能です。` : `iPhone 18 Proはそのうち${N(o.pro)}店舗、18 Pro Maxは${N(o.max)}店舗で受け取り可能です。`),
    evidence: (o) => (o.one
      ? (o.fresh > 0
        ? <>{o.stamp}時点：{o.name}は直近1分以内にチェックに応答しました。</>
        : <>{o.stamp}時点：{o.name}から直近1分以内の応答がありません。状態は不明で、在庫切れとは数えていません。</>)
      : <>{o.stamp}時点：{N(o.total)}店舗中{N(o.fresh)}店舗が直近1分以内に応答しました。{o.stale > 0 ? `${N(o.stale)}店舗は最新の応答がなく、状態不明のため在庫切れとは数えていません。` : ""}</>),
    evidenceNone: (o) => (o.one
      ? `${o.name}からはまだチェックへの応答がありません。状態は不明で、在庫切れとは数えていません。`
      : `${N(o.total)}店舗のいずれからも、まだチェックへの応答がありません。状態は不明で、在庫切れとは数えていません。`),
    howCounted: (o) => {
      const base = "入荷は2回の応答が一致したときだけ数えます（初めて確認したときの在庫は除外）。表示時間は、その構成がまだ見えていた最後のチェックと、見えなくなった最初のチェックの間で決まります。チェックの予定間隔は、通知のある店舗で5秒、全店舗で15秒です。";
      const lanes = [
        o.fast && `通知のある店舗の間隔は中央値${o.fast.p50}（p95 ${o.fast.p95}、${N(o.fast.n)}回${o.fast.slow ? "、予定より遅い" : ""}）`,
        o.round && `全店舗の1巡は${o.round.p50}（p95 ${o.round.p95}、${N(o.round.n)}巡${o.round.slow ? "、予定より遅い" : ""}）`,
      ].filter(Boolean);
      if (lanes.length === 0 || !o.win) return base;
      const win = o.win.days ? `直近${N(o.win.days)}日間` : `直近${N(o.win.hours ?? 1)}時間`;
      return `${base}${win}の実測では、${lanes.join("、")}でした。`;
    },
    howLink: "計測方法 →",
    sec: (v) => `${v}秒`,
    technique: "PickupCheckerは各アップルストアについて、Appleの店頭受け取りの在庫状況を照会しています。会員の通知がある店舗は5秒ごと、全店舗は15秒ごとです。入荷は2回の応答が一致したときだけ数え（初めて確認したときの在庫は除外）、表示時間はその構成がまだ見えていた最後のチェックと、見えなくなった最初のチェックの間で決まります。",
    tShare: (range: string) => `入荷のうち${range}の割合`,
    tBusiest: (count: number) => `最多の時間帯 · ${N(count)}回`,
    tHalf: "表示時間の中央値",
    tSince: (date: string) => `${date}以降の確認済み入荷`,
    tToday: "今日これまで",
    mostOften: (config: string, k: number, n: number) => `最多は${config}（${N(n)}回中${N(k)}回）`,
    zone: (tz: string | null): string => (void tz, "現地時間"),
    factsTitle: (label) => `要点：${label}のiPhone Duo`,
    fN: (o) => <>PickupCheckerが{o.since}以降に{o.one ? o.label : `${o.label}のアップルストア${N(o.stores)}店舗`}で確認したiPhone Duoの入荷は<b className="text-ink">{N(o.n)}回</b>、入荷があった日は{N(o.days)}日です。</>,
    fShare: (o) => <>{o.since}以降の{o.label}でのiPhone Duo入荷{N(o.n)}回のうち、<b className="text-ink">{o.pct}</b>は{o.zone}{o.range}の間でした。最も多い時間帯は{o.busiest}（{N(o.busiestN)}回）です。</>,
    fTooFew: (o) => `${o.label}で確認したiPhone Duoの入荷は${N(o.days)}日間で${N(o.n)}回です。いつもの時間帯を示すにはまだ少なく、PickupCheckerは${N(o.minDays)}日以上で${N(o.min)}回以上そろってから示します。`,
    fMedian: (o) => <>{o.label}のiPhone DuoがAppleの店頭受け取りページに表示されていた時間の中央値は<b className="text-ink">約{o.median}</b>です（{o.since}以降に計測した{N(o.n)}回）。</>,
    fTop: (o) => <>{o.label}で最も多く入荷したiPhone Duoの構成は<b className="text-ink">{o.config}</b>で、{o.since}以降の{N(o.n)}回中{N(o.k)}回（{o.pct}）です。</>,
    fToday: (o) => (o.n > 0
      ? <>今日（{o.date}、現地時間）はこれまでに、PickupCheckerが{o.label}でiPhone Duoの入荷を<b className="text-ink">{N(o.n)}回</b>確認しています。</>
      : <>今日（{o.date}、現地時間）は、{o.label}でのiPhone Duoの入荷をまだ確認していません。</>),
    hourByHour: "時間帯別・全店舗 →",
    lastThree: (n: number, label: string) => (n === 1 ? `${label}での直近のiPhone Duo入荷` : `${label}での直近${N(n)}回のiPhone Duo入荷`),
    secs: (n: number) => `${N(n)}秒`,
    mins: (n: number) => `${N(n)}分`,
    listedRange: (low: string, high: string) => `${low}〜${high}表示`,
    listedAbout: (x: string) => `約${x}表示`,
    stillListed: (x: string) => `現在も表示中（${x}）`,
    ago: (x: string) => `${x}前`,
    alerts: (o: { sent: number; stores: number; total: number; days: number; label: string; one: boolean }) => (o.one
      ? `過去${N(o.days)}日間、PickupCheckerは${o.label}のiPhone Duo入荷について、会員に${N(o.sent)}件の通知を送りました。`
      : `過去${N(o.days)}日間、PickupCheckerは${o.label}のアップルストア${N(o.total)}店舗中${N(o.stores)}店舗のiPhone Duo入荷について、会員に${N(o.sent)}件の通知を送りました。`),
    alertMe: (label: string) => `${label}の入荷通知を設定`,
    unknown: "入荷パターンをいま読み込めませんでした。このページのライブ在庫には影響ありません。",
    allModels: (o: { n: number; days: number; peak: string | null }) => `iPhone全3機種：${N(o.days)}日間で${N(o.n)}回入荷${o.peak ? `、最も多いのは${o.peak}ごろ` : ""}。`,
  },
};
