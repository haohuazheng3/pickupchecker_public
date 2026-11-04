/**
 * 通知文（プッシュ、入荷メール、「通知が止まりました」メール、端末名、Stripe 決済ページの一行）、日本語。
 * ポーラーからも送るため、型以外の import はしない。
 */
import type { NotifyText } from "./en";

export const notifyJa: NotifyText = {
  pushTitle: (cfg: string) => cfg,
  pushBody: (where: string, quote: string | null) => `${where}${quote ? `：${quote}` : ""}。タップしてapple.comで受け取りを予約。`,
  testTitle: "PickupCheckerの通知がオンになりました",
  testBody: (time: string, device: string) => `${time}に${device}へテストを送信しました。入荷通知も同じように、数秒で届きます。`,
  device: {
    iphoneApp: "iPhone（ホーム画面のアプリ）",
    iphoneSafari: "iPhone（Safari）",
    androidApp: "Android（インストール済みアプリ）",
    android: (browser: string) => `Android${browser ? `（${browser}）` : ""}`,
    computer: (browser: string) => `パソコン${browser ? `（${browser}）` : ""}`,
    other: "この端末",
  },
  email: {
    subject: (cfg: string, store: string, more: number) => `在庫あり：${cfg}（${store}）${more > 0 ? `ほか${more}件` : ""}`,
    intro: "朗報です。いま店頭受け取りできます：",
    reserve: "購入・受け取り予約",
    store: "店舗",
    tip: "店頭受け取りの在庫はすぐになくなります。Apple Storeアプリかapple.comを開き、「受け取り」を選んで店舗を指定してください。",
    manage: (url: string) => `この通知の管理・一時停止：${url}`,
    htmlTitle: "いま店頭受け取りできます",
    htmlReserve: "apple.comで受け取りを予約",
    htmlStorePage: "店舗ページ →",
    htmlTip: "店頭受け取りの在庫はすぐになくなります。Apple Storeアプリかapple.comで<b>受け取り</b>を選び、店舗を指定してください。",
    htmlManage: "この通知を管理・一時停止",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}：通知${limit}件。選んだ店舗は${fastSec}秒ごと（全店舗は${checkSec}秒ごと）にチェックし、入荷を確認してから約${alertSec}秒でプッシュ通知。月額、いつでも解約できます。`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Androidスマートフォン", desktop: "パソコン", other: "端末" },
    subject: (device: string) => `${device}への通知が止まりました。ホーム画面からPickupCheckerを開いてください`,
    gone: (device: string) => `${device}がPickupCheckerの通知を受け付けなくなりました（プッシュサービスから、登録が無効になったと報告がありました）。`,
    byEmail: "通知をオンに戻すまで、入荷通知はメールでお届けします。",
    reopenIos: "ホーム画面から（Safariではなく）PickupCheckerを開き、「マイ通知」ページで「通知をオンにする」をタップしてください。",
    reopenOther: "PickupCheckerを開き、「マイ通知」ページで「通知をオンにする」をタップしてください。",
    causes: "よくある原因：ホーム画面からアプリを削除した、設定で通知をオフにした、iPhoneを復元した。",
  },
};
