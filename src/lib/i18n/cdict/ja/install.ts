import type { CDict } from "../en";

/** 日本語クライアント文言: install（/install のガイドと手描きの画面イラスト）。イラスト内の文言は iOS・Android・Chrome の日本語表示に合わせる。 */
export const install: CDict["install"] = {
  hero: {
    eyebrow: "ホーム画面のアプリ · ダウンロード不要",
    title: "入荷を、ロック画面に。",
    lead: "PickupCheckerをホーム画面に追加して、通知を許可するだけ。入荷は数秒でロック画面に届きます。",
    seeSteps: "手順を見る",
    sendTest: "テストを送信",
    turnOn: "通知をオンにする",
    already: "**✓ 設定済みです。** 通知は{label}に届きます。以下の手順で、この端末も追加できます。{link}",
    myAlerts: "マイ通知",
  },
  progress: {
    homeScreen: "ホーム画面に追加済み",
    signedIn: "ログイン済み",
    on: "通知オン",
    blocked: "設定でブロックされています。手順{n}をご覧ください。",
  },
  steps: {
    title: "通知を設定する",
    intro: {
      ios: "iPhoneとiPadでは、ホーム画面に追加したアプリからのみ通知を受け取れます。",
      android: "Androidではインストールは任意です。Chromeだけでも通知を受け取れます。",
      desktop: "ブラウザでそのまま使えます。インストールは不要です。",
    },
    tabsLabel: "お使いの端末",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "パソコン" },
    ios: {
      safari: { title: "Safariでpickupchecker.comを開く", text: "Safariのみ対応。Chromeやアプリ内ブラウザでは追加できません。" },
      share: { title: "「共有」をタップ", text: "iPhoneは画面下、iPadは画面上のバーにあります。" },
      choose: { title: "「ホーム画面に追加」を選ぶ", text: "見当たらない場合は、下にスクロールしてください。" },
      add: { title: "「追加」をタップ", text: "名前はPickupCheckerのままでOKです。" },
      open: { title: "ホーム画面から開いてログイン", text: "アプリは別途ログインが必要です。同じメールアドレスなら、同じ通知がそのまま使えます。" },
      allow: { title: "「通知をオンにする」→「許可」をタップ", text: "ボタンはマイ通知ページにあります。iPhoneが確認するのは一度だけです。" },
    },
    android: {
      chrome: { title: "Chromeでpickupchecker.comを開く", text: "Samsung InternetやEdgeでも使えます。アプリ内ブラウザでは使えません。" },
      install: { title: "アプリをインストール", text: "タップ1回、アプリストアは不要です。" },
      menu: { title: "メニュー ⋮ →「ホーム画面に追加」", text: "**アプリをインストール** と表示されることもあります。" },
      open: { title: "PickupCheckerを開いてログイン", text: "ホーム画面かアプリ一覧から。同じメールアドレスなら、同じ通知がそのまま使えます。" },
      allow: { title: "「通知をオンにする」→「許可」をタップ", text: "Androidが確認するのは一度だけ。Chromeのタブのままでも使えます。" },
    },
    desktop: {
      allow: { title: "「通知をオンにする」をタップ", text: "Chrome、Edge、Firefox、Safari 16以降に対応。ブラウザが確認するのは一度だけです。" },
      install: { title: "任意：アプリとしてインストール", text: "ChromeかEdgeなら、アドレスバーのインストールアイコンから。ブラウザを閉じていても通知が届きます。" },
      phone: { title: "スマートフォンにも", text: "スマートフォンでも同じメールアドレスでログインを。通知がオンの端末すべてに、すべての通知が届きます。" },
    },
  },
  action: {
    install: "PickupCheckerをインストール",
    on: "✓ この端末の通知はオンです。",
    sendTest: "テストを送信",
    needsInstall: "ホーム画面のアプリを開くと使えます。",
    signInFirst: "先にログイン",
    signInThenOn: "ログインしてオンにする",
    turnOn: "通知をオンにする",
    denied: "ブロックされています。設定でPickupCheckerを許可してから、再読み込みしてください。",
  },
  notes: [
    { q: "なぜiPhoneはSafari？", a: "サイトをホーム画面に追加できるのはSafariだけです。アプリ内ブラウザではできません。" },
    { q: "バッテリーは？", a: "スマートフォン側では何も動きません。チェックするのは私たちのサーバーです。" },
    { q: "メールでも届く？", a: "通知がオンの端末がなければ、代わりにメールで届きます。" },
    { q: "複数の端末で使える？", a: "それぞれ同じメールアドレスでログインしてください。すべての端末に、すべての通知が届きます。" },
  ],
  cta: { title: "まだ通知を設定していませんか？", button: "入荷通知を設定" },

  mocks: {
    share: "共有",
    shareSheet: { copy: "コピー", readingList: "リーディングリストに追加", bookmark: "ブックマークを追加", favorites: "お気に入りに追加", addToHome: "ホーム画面に追加", markup: "マークアップ" },
    addDialog: { cancel: "キャンセル", title: "ホーム画面に追加", add: "追加", note: "このWebサイトにすばやくアクセスできるように、ホーム画面にアイコンを追加します。" },
    iosAlert: { title: "“PickupChecker”は通知を送信します。よろしいですか？", text: "通知方法は、“通知”、“サウンド”、“アイコンバッジ”が利用できる可能性があります。通知方法は“設定”で設定できます。", dontAllow: "許可しない", allow: "許可" },
    chromeMenuLabel: "メニュー",
    chromeMenu: { before: ["新しいタブ", "履歴", "ダウンロード", "ブックマーク", "共有…"], add: "ホーム画面に追加", after: ["PC版サイト"] },
    androidAlert: { title: "PickupChecker に通知の送信を許可しますか？", dontAllow: "許可しない", allow: "許可" },
    desktopAlert: { wantsTo: "pickupchecker.com が次の許可を求めています", show: "通知の表示", block: "ブロック", allow: "許可" },
    desktopInstall: { callout: "インストール", title: "アプリをインストールしますか？", text: "専用のウィンドウで開きます", cancel: "キャンセル", install: "インストール" },
    lockScreen: { date: "10月29日 木曜日", now: "今", title: "iPhone 18 Pro 256GB ブラック", body: "Apple 銀座 · 東京：本日受け取り可能。タップしてapple.comで受け取りを予約。" },
  },
};
