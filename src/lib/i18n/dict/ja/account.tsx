/**
 * 日本語: account（マイ通知ページ、そこに出る入荷モジュール、/install、/checkout/success、/pricing）。
 * **太字** と [ラベル](リンク) は <Md> で表示。プラン名とドル金額は訳さない（全言語で米ドル課金）。
 */
import { SPEED } from "@/lib/plans";
import { num } from "@/lib/i18n/format";
import type { Dict } from "../en";

const N = (n: number) => num("ja", n);

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
    push: "入荷確認 → プッシュ通知を送信（端末への到着は未計測）",
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
    speedTitle: "どれくらい速い？ 計画値と実測値",
    speedAnswer: (v) => `通知を設定した店舗は${SPEED.fastSec}秒ごとにチェックする計画です。米国での直近7日間の実測では、そうした店舗への2回の応答の間隔は中央値**${v.p50}**、95パーセンタイル${v.p95}でした。どのプランでも同じペースです。`,
    speedPlanned: `通知を設定した店舗は${SPEED.fastSec}秒ごと、それ以外の店舗は${SPEED.checkSec}秒ごとにチェックする計画です。1週間分のチェックが記録されると、ここに実測値が表示されます。どのプランでも同じペースです。`,
    planned: `計画値：選んだ店舗は**${SPEED.fastSec}秒ごと**、全店舗は**${SPEED.checkSec}秒ごと**`,
    intl: (v) => `米国以外：中央値**${v.p50}**、95パーセンタイル${v.p95}${v.above ? `（計画の${SPEED.fastSec}秒より遅い）` : ""}`,
    push: (v) => `在庫を最初に検知したチェック → AppleまたはGoogleのプッシュサービスが受理：中央値**${v.p50}**、90パーセンタイル${v.p90}（入荷${v.n}回、7日間）`,
    pushPending: "1週間分の通知が記録されると、通知のタイミングをここに表示します",
    notMeasured: "スマートフォンへの到着は測定していません（プッシュサービスから報告がないため）",
    listingLine: (band, k) => `iPhone Duoの入荷がAppleの受け取りページに掲載されていた時間は通常**${band}**（入荷${k}回の中央値、7日間）`,
    band: (range: string) => `${range.replace(/[–-]/, "〜")}秒`,
    aboutMinute: "約1分",
    report: "[サービスレポート](/service-report)：チェック系統ごとの24時間・7日・30日の実測値（サンプル数と限界つき）",
    gapTile: "選んだ店舗：チェック間隔の中央値（7日間）",
    plannedTile: "選んだ店舗：計画上のチェック間隔",
    pushTile: "初回検知 → プッシュサービス、中央値（7日間）",
    pushTilePending: "初回検知 → プッシュサービス：測定中",
    listing: "Duoの受け取りページ掲載時間（通常）、中央値",
    note: { plus: "iPhone 1台 × 10店舗", pro: "iPhone 2台 × 10店舗", max: "iPhone 5台 × 10店舗" },
    month: "/ 月",
    alerts: (n: number) => `通知${N(n)}件`,
    perks: [
      `選んだ店舗は${SPEED.fastSec}秒ごと、全店舗は${SPEED.checkSec}秒ごとにチェック`,
      `入荷を確認してから約${SPEED.alertSec}秒でプッシュ通知を送信`,
    ],
    cancel: "いつでも解約可能",
    get: (plan: string) => `${plan}を始める`,
    needTitle: "プランは必要？",
    needAnswer: "多くの場合、不要です。プランが役立つのは、行ける店舗で特定のiPhoneが欲しいのに自分ではずっと確認できず、しかも入荷してもすぐ消えてしまう場合です。リアルタイム在庫、地図、入荷ログ、各店舗ページ、公開APIはアカウントなしで無料のままです。",
    skipTitle: "こんな人には不要",
    skip: [
      "リアルタイム在庫、地図、入荷ログを見るだけ",
      "いつでも行ける店舗：出かける前にその店舗ページを確認",
      "構成にこだわらない：店舗ページで今ある在庫をすべて確認できます",
      "データが欲しい：[無料の公開API](/iphone-duo-stock-api)で同じリアルタイム在庫を取得できます",
    ],
    helpsTitle: "こんな人に役立つ",
    helps: [
      "特定の構成が欲しく、入荷しても数分で消える",
      "タブを開いたままにできない：2回のチェックが一致して入荷を確認した時点でプッシュを送信",
      "複数の店舗や構成を同時に見張りたい",
    ],
    tool: "店舗やカラーで迷ったら？[通知設定](/#notify)で、選んだ組み合わせの過去の受け取り枠の数と、いちばん枠が増える変更を無料で確認できます。",
    tableTitle: "通知はいくつ必要？",
    tableAnswer: (plus, pro, max) => `通知の数＝構成 × 店舗。通知${N(plus.limit)}件まで（例：iPhone 1台を${N(plus.limit)}店舗で）ならPlusで月額$${plus.price}、${N(pro.limit)}件までならProで$${pro.price}、${N(max.limit)}件までならMaxで$${max.price}。${N(max.limit)}件を超えるとどのプランにも収まらないので、店舗か構成を絞ってください。`,
    corner: "iPhone ↓ · 店舗 →",
    configsN: (k) => `iPhone ${N(k)}台`,
    storesN: (k) => `${N(k)}店舗`,
    noPlan: "対応プランなし",
    tableNote: "通知1件＝1店舗 × 1つの構成（モデル・容量・カラー）。どのプランでも、上限数まで自由に組み合わせられます。",
    billing: "Stripeで決済 · カードまたはLink · プラン変更は日割り計算",
    refund: "合わなかったら：入荷通知がまだ一度も届いていなければ、[7日以内は全額返金](/refunds)します",
  },
};
