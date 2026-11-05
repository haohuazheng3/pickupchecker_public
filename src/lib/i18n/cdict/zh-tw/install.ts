/**
 * 台灣中文客戶端字串：install（/install 教學與手繪的手機畫面）。示意圖上的字用 iOS、Android、Chrome 繁體中文
 * （台灣）介面本身的字：分享、加入主畫面、加入、允許、設定 → 通知、加到主畫面。
 */
import type { CDict } from "../en";

export const install: CDict["install"] = {
  hero: {
    eyebrow: "主畫面 App · 免下載",
    title: "補貨通知，直接出現在鎖定畫面。",
    lead: "把 PickupChecker 加入主畫面並允許通知。一補貨，幾秒內就出現在你的鎖定畫面。",
    seeSteps: "查看步驟",
    sendTest: "傳送測試",
    turnOn: "開啟通知",
    already: "**✓ 已經設定好了。**通知會送到：{label}。照下面的步驟，這台裝置也能一起收到。{link}",
    myAlerts: "我的通知",
  },
  progress: {
    homeScreen: "已加入主畫面",
    signedIn: "已登入",
    on: "通知已開啟",
    blocked: "已在設定中封鎖——請看步驟 {n}。",
  },
  steps: {
    title: "設定通知",
    intro: {
      ios: "在 iPhone 和 iPad 上，只有從主畫面 App 才收得到通知。",
      android: "Android 可以不安裝；Chrome 本身就能發通知。",
      desktop: "直接在瀏覽器使用，不必安裝。",
    },
    tabsLabel: "你的裝置",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "電腦" },
    ios: {
      safari: { title: "用 Safari 打開 pickupchecker.com", text: "只能用 Safari，Chrome 或 App 內建的瀏覽器都不行。" },
      share: { title: "點「分享」", text: "iPhone 在下方工具列，iPad 在上方。" },
      choose: { title: "選擇「加入主畫面」", text: "沒看到的話，往下滑。" },
      add: { title: "點「加入」", text: "名稱維持 PickupChecker 就好。" },
      open: { title: "從主畫面打開並登入", text: "App 有自己的登入狀態。同一個 Email，同一組通知。" },
      allow: { title: "點「開啟通知」，再點「允許」", text: "按鈕在你的通知頁面。iPhone 只會問一次。" },
    },
    android: {
      chrome: { title: "用 Chrome 打開 pickupchecker.com", text: "Samsung Internet 和 Edge 也可以，App 內建的瀏覽器不行。" },
      install: { title: "安裝 App", text: "點一下就好，不用經過應用程式商店。" },
      menu: { title: "選單 ⋮ →「加到主畫面」", text: "有時會寫成 **安裝應用程式**。" },
      open: { title: "打開 PickupChecker 並登入", text: "從主畫面或應用程式清單打開。同一個 Email，同一組通知。" },
      allow: { title: "點「開啟通知」，再點「允許」", text: "Android 只會問一次。在 Chrome 分頁裡也能用。" },
    },
    desktop: {
      allow: { title: "點「開啟通知」", text: "Chrome、Edge、Firefox、Safari 16 以上都可以。瀏覽器只會問一次。" },
      install: { title: "選用：安裝成 App", text: "Chrome 或 Edge：網址列上的安裝圖示。瀏覽器關著也收得到通知。" },
      phone: { title: "手機也一起", text: "在手機上用同一個 Email 登入。每台開啟通知的裝置，都會收到每一則通知。" },
    },
  },
  action: {
    install: "安裝 PickupChecker",
    on: "✓ 這台裝置已開啟通知。",
    sendTest: "傳送測試",
    needsInstall: "打開主畫面 App 後才能使用。",
    signInFirst: "請先登入",
    signInThenOn: "登入後開啟",
    turnOn: "開啟通知",
    denied: "已封鎖。請到「設定」允許 PickupChecker，然後重新整理。",
  },
  notes: [
    { q: "為什麼 iPhone 要用 Safari？", a: "只有 Safari 能把網站加入主畫面，App 內建的瀏覽器不行。" },
    { q: "會耗電嗎？", a: "你的手機上什麼都不用跑，檢查都是我們的伺服器在做。" },
    { q: "Email 呢？", a: "不會。通知只用推播送出，請至少在一台裝置上開啟。" },
    { q: "有好幾台裝置？", a: "每台都用同一個 Email 登入，每台都會收到每一則通知。" },
  ],
  cta: { title: "還沒設定通知？", button: "設定補貨通知" },

  mocks: {
    share: "分享",
    shareSheet: { copy: "拷貝", readingList: "加入閱讀列表", bookmark: "加入書籤", favorites: "加入喜好項目", addToHome: "加入主畫面", markup: "標示" },
    addDialog: { cancel: "取消", title: "加入主畫面", add: "加入", note: "將會在你的主畫面加入一個圖像，讓你能快速取用此網站。" },
    iosAlert: { title: "「PickupChecker」想要傳送通知給你", text: "通知可能包含提示、聲音和圖像標記。這些可在「設定」中設定。", dontAllow: "不允許", allow: "允許" },
    chromeMenuLabel: "選單",
    chromeMenu: { before: ["新分頁", "歷史記錄", "下載", "書籤", "分享…"], add: "加到主畫面", after: ["電腦版網站"] },
    androidAlert: { title: "要允許「PickupChecker」傳送通知給你嗎？", dontAllow: "不允許", allow: "允許" },
    desktopAlert: { wantsTo: "pickupchecker.com 要求取得以下權限：", show: "顯示通知", block: "封鎖", allow: "允許" },
    desktopInstall: { callout: "安裝", title: "要安裝 PickupChecker 嗎？", text: "會在獨立視窗中開啟", cancel: "取消", install: "安裝" },
    lockScreen: { date: "10月29日 星期四", now: "現在", title: "iPhone 18 Pro 256GB 黑色", body: "Apple 信義 A13 · 台北 — 今天可取貨。點一下前往 apple.com 預訂。" },
  },
};
