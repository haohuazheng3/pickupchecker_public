/**
 * 日本語: account（マイ通知ページ、そこに出る入荷モジュール、/install、/checkout/success、/pricing）。
 * **太字** と [ラベル](リンク) は <Md> で表示。プラン名とドル金額は訳さない（全言語で米ドル課金）。
 */
import { OTHER_TRACKERS, SPEED } from "@/lib/plans";
import { num } from "@/lib/i18n/format";
import type { Dict } from "../en";

const N = (n: number) => num("ja", n);
/** 他サイトが公表しているチェック間隔（"8 seconds to 15 minutes" → 「8秒〜15分」）。 */
const others = (() => {
  const m = OTHER_TRACKERS.match(/^(\d+) seconds? to (\d+) minutes?$/);
  return m ? `${m[1]}秒〜${m[2]}分` : OTHER_TRACKERS;
})();

export const account: Dict["account"] = {
  loading: "読み込み中",
  meta: { title: "マイ通知" },
  signedInAs: (email: string) => `${email}でログイン中`,
  title: "マイ通知",
  units: { s: "秒", min: "分", taps: "タップ" },

  plan: {
    title: "プラン",
    none: "プラン未加入：通知はオフです",
    summary: (plan: string, on: number, limit: number) => `${plan} · 通知${N(limit)}件中${N(on)}件がオン`,
    renews: (date: string) => ` · ${date}に更新`,
    ends: (date: string) => ` · ${date}に終了`,
  },

  sent: {
    title: "送信済みの通知",
    last: (ago: string) => `最新：${ago}`,
    none: "まだ送信していません",
    empty: "まだ送信していません。",
    channel: { push: "プッシュ通知", email: "メール" },
    status: { sent: "送信済み", failed: "失敗", skipped: "スキップ" },
  },

  fast: {
    title: "20秒で確保する",
    sub: "最後の4タップ以外は、いま済ませておく",
    lasts: "Duoの在庫が出ている時間（通常）",
    push: "入荷確認 → スマートフォンにプッシュ通知",
    tapsLeft: "通知が届いてから残る操作",
    steps: [
      { title: "時間帯を決める", hint: "店舗の営業時間は下に · 10分前から準備" },
      { title: "Appleの購入画面を準備", hint: "容量とカラーを正確に → お届け・受け取り" },
      { title: "規約に同意 · またはSIMフリーで", hint: "SIMフリー・一括払いならチェック欄なし" },
      { title: "画面をつけたままに", hint: "自動ロック → なし · 10〜15分おきに触れる" },
      { title: "通知は読むだけ、タップしない", hint: "受け取り → 表示された店舗 → 最初の時間枠 → Apple Pay" },
    ],
    guide: "2分でわかるガイド（英語）",
    window: "あなたの入荷時間帯",
  },

  restock: {
    title: "選んだ店舗に入荷する時間帯",
    anyIphone: "iPhone",
    and: "、",
    yours: (n: number) => (n === 1 ? "選んだ店舗" : `選んだ${N(n)}店舗`),
    Yours: (n: number) => (n === 1 ? "選んだ店舗" : `選んだ${N(n)}店舗`),
    otherStores: (n: number) => `ほかの${N(n)}店舗`,
    meta: (what: string, stores: number, days: number, zone: string) => `${what} · ${N(stores)}店舗 · 過去${N(days)}日間 · ${zone}`,
    busiest: (yours: string, then: string | null) => (then ? `${yours}で最も多い時間帯 · 次いで${then}` : `${yours}で最も多い時間帯`),
    busiestArea: (stores: number, zone: string) => `${zone}の全${N(stores)}店舗で最も多い時間帯`,
    next: (inHours: number) => `次の時間帯 · ${inHours === 0 ? "この1時間" : `${N(inHours)}時間後`}`,
    typical: "完売までの在庫時間（通常）",
    count: (yours: string, days: number, total: number, pattern: boolean) => (total === 0 ? `${yours}ではまだ入荷なし · 過去${N(days)}日間` : `${yours}の入荷 · 過去${N(days)}日間${pattern ? "" : " · 傾向を出すにはまだ少なすぎます"}`),
    byHour: (busiestInGreen: boolean) => `時間帯別${busiestInGreen ? " · 最多は緑" : ""}`,
    byWeekday: (busiest: string | null) => `曜日別${busiest ? ` · 最多は${busiest}` : ""}`,
    hourChart: (yours: string, zone: string, items: string) => `${yours}の時間帯別の入荷（${zone}）：${items}`,
    weekdayChart: (yours: string, items: string) => `${yours}の曜日別の入荷：${items}`,
    chartItem: (label: string, n: number, reported: number) => `${label} ${N(n)}${reported ? `（他サイトの報告 +${N(reported)}）` : ""}`,
    barTitle: (label: string, n: number, yours: string, area: { n: number; zone: string } | null, reported: number) =>
      `${label}：${yours}で入荷${N(n)}回${area ? ` · ${area.zone}の全店舗で${N(area.n)}回` : ""}${reported ? ` · 他サイトの報告${N(reported)}回` : ""}`,
    now: "現在",
    allZone: (stores: number, zone: string) => `${zone}の全${N(stores)}店舗`,
    reportMarkBars: "破線",
    reportMarkDots: "白抜きの点",
    sellTitle: "選んだ店舗の入荷は、どれくらいで完売するか",
    sellMeta: (what: string, stores: number, days: number) => `${what} · ${N(stores)}店舗 · 過去${N(days)}日間`,
    sellLabel: (yours: string) => yours,
  },

  success: {
    metaTitle: "通知がオンになりました",
    isOn: (plan: string) => `${plan}が有効になりました`,
    yourPlan: "現在のプラン",
    received: "お支払いを受け付けました",
    onPlan: (limit: number) => `このプランで通知${N(limit)}件が使えます。`,
    planOn: "プランが有効になりました。",
    pending: "サブスクリプションは1分以内にアカウントに反映されます。",
    open: "マイ通知を開く",
    another: "通知を追加する",
    saved: (n: number) => `通知${N(n)}件を保存 · 領収書はStripeから届きます`,
    pushOn: "通知",
    pushNext: "次は、スマートフォンで通知を受け取る設定",
  },

  install: {
    metaTitle: "アプリを入手：ホーム画面で入荷通知を受け取る",
    metaDescription: "PickupCheckerをホーム画面に追加すると、近くのアップルストアでiPhone Duo、18 Pro、Pro Maxが店頭受け取り可能になった瞬間に通知が届きます。",
  },

  pricing: {
    metaTitle: "料金：通知10件で$5、20件で$10、50件で$20",
    metaDescription: `アップルストアのiPhone店頭受け取り在庫の入荷通知。選んだ店舗を${SPEED.fastSec}秒ごとにチェックし、入荷を確認してから約${SPEED.alertSec}秒でプッシュ通知。Plusは月額$5で10件、Proは$10で20件、Maxは$20で50件。いつでも解約できます。`,
    title: "料金",
    lead: "**通知1件＝1店舗 × 1台のiPhone（容量・カラーまで指定）。** 在庫の閲覧は無料です。",
    chips: ["日本のアップルストア全11店舗に対応", "いつでも解約", "カードまたはLink"],
    fastest: "公表されているiPhone在庫トラッカーの中で、最速のチェック間隔",
    everyFast: `選んだ店舗を**${SPEED.fastSec}秒ごと**にチェック · 他サイトの公表値は${others}`,
    sellsOut: (band: string) => `iPhone Duoの入荷は通常**${band}**で完売、20〜30秒で消えることも`,
    band: (range: string) => `${range.replace(/[–-]/, "〜")}秒`,
    aboutMinute: "約1分",
    sameSpeed: "どのプランでも速さは同じ",
    rechecked: "選んだ店舗の再チェック間隔",
    toPhone: "入荷確認からスマートフォンへ",
    listing: "Duoの在庫が出てから消えるまで（通常）",
    note: { plus: "iPhone 1台 × 10店舗", pro: "iPhone 2台 × 10店舗", max: "iPhone 5台 × 10店舗" },
    month: "/ 月",
    alerts: (n: number) => `通知${N(n)}件`,
    perks: [
      `選んだ店舗は${SPEED.fastSec}秒ごと、全店舗は${SPEED.checkSec}秒ごとにチェック`,
      `入荷を確認してから約${SPEED.alertSec}秒でプッシュ通知`,
    ],
    cancel: "いつでも解約可能",
    get: (plan: string) => `${plan}を始める`,
    billing: "Stripeで決済 · カードまたはLink · プラン変更は日割り計算",
    refund: "合わなかったら：入荷通知がまだ一度も届いていなければ、[7日以内は全額返金](/refunds)します",
  },
};
