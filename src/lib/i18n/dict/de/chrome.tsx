/** German strings: chrome — footer, 404 page. (Header labels are client strings: cdict chrome.nav.) */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import { cap } from "./util";

export const chrome: Dict["chrome"] = {
  footer: {
    blurb: "iPhone-Alarme zur Abholung für alle 269 Apple Stores in den USA: jeder Store alle 15 Sekunden geprüft, die Stores Ihrer Alarme alle 5.",
    blurbIn: (allStores: string) => `${cap(allStores)}: iPhone-Alarme zur Abholung, jeder Store alle 15 Sekunden geprüft, die Stores Ihrer Alarme alle 5.`,
    trademark: "Nicht mit Apple Inc. verbunden oder von Apple unterstützt. Apple, iPhone und Apple Store sind Marken der Apple Inc.",
    product: "Produkt",
    duoStock: "iPhone Duo Verfügbarkeit",
    proStock: "iPhone 18 Pro Verfügbarkeit",
    proMaxStock: "iPhone 18 Pro Max Verfügbarkeit",
    restockLog: "Restock-Protokoll",
    liveMap: "Live-Karte",
    storesByState: "Stores nach Bundesstaat",
    pricing: "Preise",
    company: "Unternehmen",
    howItWorks: "So funktioniert’s",
    getApp: "App holen",
    about: "Über uns",
    contact: "Kontakt",
    allStates: "Alle Bundesstaaten & Städte →",
    storesIn: "Apple Stores",
    allStores: "Alle Stores →",
    legal: "Rechtliches",
    privacy: "Datenschutz",
    terms: "Nutzungsbedingungen",
    refunds: "Rückerstattung",
    englishOnly: "Auf Englisch",
    questions: "Fragen zum iPhone Duo",
    restockTimes: "Wann ist das iPhone Duo wieder verfügbar?",
    configsPage: "Welches iPhone Duo bekommt man am leichtesten?",
    shortagePage: "Lässt der iPhone-Duo-Engpass nach?",
    channelsPage: "Apple Store, Provider oder Händler?",
    apiPage: "Kostenlose Bestands-API",
    countries: "Länder",
    status: "Status",
  },
  notFound: {
    title: "Hier ist nichts",
    body: (stores: ReactNode, map: ReactNode) => <>Diese Seite gibt es nicht. Weiter zur {stores} oder zur {map}?</>,
    stores: "Store-Übersicht",
    map: "Live-Karte",
    home: "Zur Startseite",
  },
};
