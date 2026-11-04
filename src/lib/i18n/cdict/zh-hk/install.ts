/**
 * 繁體中文（香港）client strings: install (the /install guide and its phone screens). The mock labels are the words
 * iOS, Android and Chrome show in Traditional Chinese (Hong Kong): 分享, 加至主畫面, 加入, 允許, 設定 → 通知.
 */
import type { CDict } from "../en";

export const install: CDict["install"] = {
  hero: {
    eyebrow: "主畫面 App · 不用下載",
    title: "提醒直達鎖定畫面。",
    lead: "把 PickupChecker 加至主畫面並允許通知，補貨幾秒內就出現在你的鎖定畫面。",
    seeSteps: "查看步驟",
    sendTest: "發送測試",
    turnOn: "開啟通知",
    already: "**✓ 已設定好。**提醒會發送到你的{label}。以下步驟可把這部裝置也加入。{link}",
    myAlerts: "我的提醒",
  },
  progress: {
    homeScreen: "已在主畫面",
    signedIn: "已登入",
    on: "通知已開啟",
    blocked: "已在設定中封鎖——見第 {n} 步。",
  },
  steps: {
    title: "設定通知",
    intro: {
      ios: "在 iPhone 和 iPad 上，只有主畫面 App 才能收到通知。",
      android: "Android 不一定要安裝；Chrome 本身就能發出通知。",
      desktop: "在瀏覽器即可使用，不用安裝。",
    },
    tabsLabel: "你的裝置",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "電腦" },
    ios: {
      safari: { title: "用 Safari 打開 pickupchecker.com", text: "只限 Safari，不能用 Chrome 或 App 內置瀏覽器。" },
      share: { title: "按「分享」", text: "iPhone 在底部列，iPad 在頂部。" },
      choose: { title: "選擇「加至主畫面」", text: "看不到的話，向下捲動。" },
      add: { title: "按「加入」", text: "名稱保留 PickupChecker。" },
      open: { title: "從主畫面打開並登入", text: "App 要另外登入。同一個電郵，同一組提醒。" },
      allow: { title: "按「開啟通知」，再按「允許」", text: "按鈕在你的提醒頁面。iPhone 只會問一次。" },
    },
    android: {
      chrome: { title: "用 Chrome 打開 pickupchecker.com", text: "Samsung Internet 和 Edge 也可以，App 內置瀏覽器則不行。" },
      install: { title: "安裝 App", text: "按一下就完成，不用經 App 商店。" },
      menu: { title: "選單 ⋮ →「加至主畫面」", text: "有時會寫成**安裝應用程式**。" },
      open: { title: "打開 PickupChecker 並登入", text: "從主畫面或應用程式清單打開。同一個電郵，同一組提醒。" },
      allow: { title: "按「開啟通知」，再按「允許」", text: "Android 只會問一次。在 Chrome 分頁內也可以。" },
    },
    desktop: {
      allow: { title: "按「開啟通知」", text: "Chrome、Edge、Firefox、Safari 16 或以上。瀏覽器只會問一次。" },
      install: { title: "可選：安裝成 App", text: "Chrome 或 Edge：按網址列上的安裝圖示。即使關閉瀏覽器也能收到通知。" },
      phone: { title: "手機也一樣", text: "在手機用同一個電郵登入。每部開啟了通知的裝置都會收到每個提醒。" },
    },
  },
  action: {
    install: "安裝 PickupChecker",
    on: "✓ 這部裝置的通知已開啟。",
    sendTest: "發送測試",
    needsInstall: "打開主畫面 App 後即可使用。",
    signInFirst: "請先登入",
    signInThenOn: "登入後開啟",
    turnOn: "開啟通知",
    denied: "已封鎖。請在「設定」中允許 PickupChecker，然後重新載入。",
  },
  notes: [
    { q: "為何 iPhone 要用 Safari？", a: "只有 Safari 能把網站加至主畫面，App 內置瀏覽器不行。" },
    { q: "耗電嗎？", a: "你的手機甚麼都不用運行，檢查全由我們的伺服器負責。" },
    { q: "電郵呢？", a: "沒有裝置開啟通知？提醒會改為寄到你的電郵。" },
    { q: "多部裝置？", a: "每部都用同一個電郵登入。每部裝置都會收到每個提醒。" },
  ],
  cta: { title: "還未設定提醒？", button: "設定提醒" },

  mocks: {
    share: "分享",
    shareSheet: { copy: "拷貝", readingList: "加至閱讀列表", bookmark: "加入書籤", favorites: "加至喜好項目", addToHome: "加至主畫面", markup: "標示" },
    addDialog: { cancel: "取消", title: "加至主畫面", add: "加入", note: "一個圖像將會加至你的主畫面，讓你可以快速取用此網站。" },
    iosAlert: { title: "「PickupChecker」想傳送通知給你", text: "通知可能包括提示、聲音和圖像標記。你可在「設定」中設定這些項目。", dontAllow: "不允許", allow: "允許" },
    chromeMenuLabel: "選單",
    chromeMenu: { before: ["新分頁", "記錄", "下載", "書籤", "分享…"], add: "加至主畫面", after: ["電腦版網站"] },
    androidAlert: { title: "要允許 PickupChecker 傳送通知給你嗎？", dontAllow: "不允許", allow: "允許" },
    desktopAlert: { wantsTo: "pickupchecker.com 想", show: "顯示通知", block: "封鎖", allow: "允許" },
    desktopInstall: { callout: "安裝", title: "安裝 PickupChecker", text: "會在獨立視窗中開啟", cancel: "取消", install: "安裝" },
    lockScreen: { date: "10月29日 星期四", now: "現在", title: "iPhone 18 Pro 256GB 黑色", body: "Apple Canton Road（廣東道）· 香港尖沙咀——今天可提供。按此在 apple.com 預訂。" },
  },
};
