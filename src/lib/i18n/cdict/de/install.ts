/**
 * German client strings: install (the /install guide and its phone illustrations). The mock labels use the words
 * iOS, Android and Chrome show in German (iOS: „Teilen“, „Zum Home-Bildschirm“, „Erlauben“; Android: „Zulassen“).
 */
import type { CDict } from "../en";

export const install: CDict["install"] = {
  hero: {
    eyebrow: "Home-Bildschirm-App · kein Download",
    title: "Alarme auf dem Sperrbildschirm.",
    lead: "Fügen Sie PickupChecker zum Home-Bildschirm hinzu und erlauben Sie Mitteilungen. Restocks landen in Sekunden auf Ihrem Sperrbildschirm.",
    seeSteps: "Zu den Schritten",
    sendTest: "Test senden",
    turnOn: "Mitteilungen einschalten",
    already: "**✓ Eingerichtet.** Alarme gehen an: {label}. Mit den Schritten unten kommt dieses Gerät dazu. {link}",
    myAlerts: "Meine Alarme",
  },
  progress: {
    homeScreen: "Auf dem Home-Bildschirm",
    signedIn: "Angemeldet",
    on: "Mitteilungen an",
    blocked: "In den Einstellungen blockiert – siehe Schritt {n}.",
  },
  steps: {
    title: "Mitteilungen einrichten",
    intro: {
      ios: "Auf iPhone und iPad funktionieren Mitteilungen nur aus der Home-Bildschirm-App.",
      android: "Auf Android ist die Installation optional; Chrome kann selbst benachrichtigen.",
      desktop: "Funktioniert im Browser. Keine Installation nötig.",
    },
    tabsLabel: "Ihr Gerät",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "Computer" },
    ios: {
      safari: { title: "pickupchecker.com in Safari öffnen", text: "Nur Safari – nicht Chrome oder ein In-App-Browser." },
      share: { title: "Auf „Teilen“ tippen", text: "Auf dem iPhone unten, auf dem iPad oben." },
      choose: { title: "„Zum Home-Bildschirm“ wählen", text: "Nach unten scrollen, falls Sie es nicht sehen." },
      add: { title: "Auf „Hinzufügen“ tippen", text: "Den Namen PickupChecker beibehalten." },
      open: { title: "Vom Home-Bildschirm öffnen und anmelden", text: "Die App hat eine eigene Anmeldung. Gleiche E-Mail, gleiche Alarme." },
      allow: { title: "Auf „Mitteilungen einschalten“ tippen, dann „Erlauben“", text: "Der Button ist auf Ihrer Alarmseite. Das iPhone fragt einmal." },
    },
    android: {
      chrome: { title: "pickupchecker.com in Chrome öffnen", text: "Samsung Internet und Edge gehen auch. In-App-Browser nicht." },
      install: { title: "App installieren", text: "Ein Tippen, kein App Store." },
      menu: { title: "Menü ⋮ → „Zum Startbildschirm hinzufügen“", text: "Heißt manchmal **App installieren**." },
      open: { title: "PickupChecker öffnen und anmelden", text: "Vom Startbildschirm oder aus der App-Übersicht. Gleiche E-Mail, gleiche Alarme." },
      allow: { title: "Auf „Mitteilungen einschalten“ tippen, dann „Zulassen“", text: "Android fragt einmal. Funktioniert auch im Chrome-Tab." },
    },
    desktop: {
      allow: { title: "Auf „Mitteilungen einschalten“ klicken", text: "Chrome, Edge, Firefox, Safari 16+. Der Browser fragt einmal." },
      install: { title: "Optional: als App installieren", text: "Chrome oder Edge: das Installieren-Symbol in der Adressleiste. Benachrichtigt auch bei geschlossenem Browser." },
      phone: { title: "Auch Ihr Handy", text: "Melden Sie sich auf dem Handy mit derselben E-Mail an. Jedes Gerät mit eingeschalteten Mitteilungen bekommt jeden Alarm." },
    },
  },
  action: {
    install: "PickupChecker installieren",
    on: "✓ Mitteilungen sind auf diesem Gerät an.",
    sendTest: "Test senden",
    needsInstall: "Verfügbar, sobald Sie die Home-Bildschirm-App öffnen.",
    signInFirst: "Erst anmelden",
    signInThenOn: "Anmelden, dann einschalten",
    turnOn: "Mitteilungen einschalten",
    denied: "Blockiert. Erlauben Sie PickupChecker in den Einstellungen und laden Sie neu.",
  },
  notes: [
    { q: "Warum Safari auf dem iPhone?", a: "Nur Safari kann eine Website zum Home-Bildschirm hinzufügen. In-App-Browser können das nicht." },
    { q: "Akku?", a: "Auf Ihrem Handy läuft nichts. Das Prüfen übernehmen unsere Server." },
    { q: "E-Mail?", a: "Kein Gerät mit eingeschalteten Mitteilungen? Dann geht der Alarm an Ihre E-Mail." },
    { q: "Mehrere Geräte?", a: "Auf jedem mit derselben E-Mail anmelden. Jedes Gerät bekommt jeden Alarm." },
  ],
  cta: { title: "Noch kein Alarm?", button: "Alarm einrichten" },

  mocks: {
    share: "Teilen",
    shareSheet: { copy: "Kopieren", readingList: "Zur Leseliste hinzufügen", bookmark: "Lesezeichen hinzufügen", favorites: "Zu Favoriten hinzufügen", addToHome: "Zum Home-Bildschirm", markup: "Markierungen" },
    addDialog: { cancel: "Abbrechen", title: "Zum Home-Bildschirm", add: "Hinzufügen", note: "Ein Symbol wird zu deinem Home-Bildschirm hinzugefügt, damit du schnell auf diese Website zugreifen kannst." },
    iosAlert: { title: "„PickupChecker“ möchte dir Mitteilungen senden", text: "Mitteilungen können Hinweise, Töne und Kennzeichensymbole enthalten. Diese können in „Einstellungen“ konfiguriert werden.", dontAllow: "Nicht erlauben", allow: "Erlauben" },
    chromeMenuLabel: "Menü",
    chromeMenu: { before: ["Neuer Tab", "Verlauf", "Downloads", "Lesezeichen", "Teilen…"], add: "Zum Startbildschirm hinzufügen", after: ["Desktopversion"] },
    androidAlert: { title: "PickupChecker erlauben, dir Benachrichtigungen zu senden?", dontAllow: "Nicht zulassen", allow: "Zulassen" },
    desktopAlert: { wantsTo: "pickupchecker.com möchte", show: "Benachrichtigungen anzeigen", block: "Blockieren", allow: "Zulassen" },
    desktopInstall: { callout: "Installieren", title: "App installieren?", text: "Öffnet sich in einem eigenen Fenster", cancel: "Abbrechen", install: "Installieren" },
    lockScreen: { date: "Donnerstag, 29. Oktober", now: "jetzt", title: "iPhone 18 Pro 256GB Schwarz", body: "Apple Kurfürstendamm · Berlin – Heute verfügbar. Tippen, um auf apple.com zu reservieren." },
  },
};
