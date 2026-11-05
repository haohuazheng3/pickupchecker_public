/**
 * Swedish client strings: install (the /install guide and its hand-drawn phone screens). The mock labels use the
 * words iOS, Android and Chrome show in Swedish: Dela, Lägg till på hemskärmen, Lägg till, Tillåt, Inställningar.
 */
import type { CDict } from "../en";

export const install: CDict["install"] = {
  hero: {
    eyebrow: "Hemskärmsapp · ingen nedladdning",
    title: "Notiser på låsskärmen.",
    lead: "Lägg till PickupChecker på hemskärmen och tillåt notiser. Påfyllningar landar på låsskärmen på några sekunder.",
    seeSteps: "Se stegen",
    sendTest: "Skicka ett test",
    turnOn: "Slå på notiser",
    already: "**✓ Du är klar.** Notiserna går till {label}. Stegen nedan lägger till den här enheten också. {link}",
    myAlerts: "Mina bevakningar",
  },
  progress: {
    homeScreen: "På hemskärmen",
    signedIn: "Inloggad",
    on: "Notiser på",
    blocked: "Blockerade i inställningarna – se steg {n}.",
  },
  steps: {
    title: "Slå på notiser",
    intro: {
      ios: "På iPhone och iPad fungerar notiser bara från appen på hemskärmen.",
      android: "På Android är installationen valfri; Chrome kan skicka notiser ändå.",
      desktop: "Fungerar i webbläsaren. Ingen installation behövs.",
    },
    tabsLabel: "Din enhet",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "Dator" },
    ios: {
      safari: { title: "Öppna pickupchecker.com i Safari", text: "Bara Safari. Inte Chrome eller en webbläsare inuti en annan app." },
      share: { title: "Tryck på Dela", text: "Nederst på iPhone, överst på iPad." },
      choose: { title: "Välj ”Lägg till på hemskärmen”", text: "Scrolla ner om du inte ser det." },
      add: { title: "Tryck på Lägg till", text: "Behåll namnet PickupChecker." },
      open: { title: "Öppna den från hemskärmen och logga in", text: "Appen har en egen inloggning. Samma e-post, samma bevakningar." },
      allow: { title: "Tryck på ”Slå på notiser” och sedan Tillåt", text: "Knappen finns på sidan med dina bevakningar. iPhone frågar en gång." },
    },
    android: {
      chrome: { title: "Öppna pickupchecker.com i Chrome", text: "Samsung Internet och Edge fungerar också. Webbläsare inuti andra appar gör det inte." },
      install: { title: "Installera appen", text: "Ett tryck, ingen appbutik." },
      menu: { title: "Meny ⋮ → ”Lägg till på startskärmen”", text: "Heter ibland **Installera app**." },
      open: { title: "Öppna PickupChecker och logga in", text: "Från startskärmen eller applådan. Samma e-post, samma bevakningar." },
      allow: { title: "Tryck på ”Slå på notiser” och sedan Tillåt", text: "Android frågar en gång. Fungerar också i Chrome-fliken." },
    },
    desktop: {
      allow: { title: "Tryck på ”Slå på notiser”", text: "Chrome, Edge, Firefox, Safari 16+. Webbläsaren frågar en gång." },
      install: { title: "Valfritt: installera som app", text: "Chrome eller Edge: installationsikonen i adressfältet. Skickar notiser även när webbläsaren är stängd." },
      phone: { title: "Din telefon också", text: "Logga in i telefonen med samma e-post. Varje enhet med notiser på får varje notis." },
    },
  },
  action: {
    install: "Installera PickupChecker",
    on: "✓ Notiser är på för den här enheten.",
    sendTest: "Skicka ett test",
    needsInstall: "Tillgängligt när du öppnar appen på hemskärmen.",
    signInFirst: "Logga in först",
    signInThenOn: "Logga in, slå sedan på",
    turnOn: "Slå på notiser",
    denied: "Blockerade. Tillåt PickupChecker i Inställningar och ladda sedan om.",
  },
  notes: [
    { q: "Varför Safari på iPhone?", a: "Bara Safari kan lägga till en webbplats på hemskärmen. Webbläsare inuti andra appar kan inte det." },
    { q: "Batteriet?", a: "Inget körs i din telefon. Våra servrar sköter kollandet." },
    { q: "E-post?", a: "Nej. Bevakningar kommer bara som notiser, så slå på dem på minst en enhet." },
    { q: "Flera enheter?", a: "Logga in med samma e-post på var och en. Varje enhet får varje notis." },
  ],
  cta: { title: "Ingen bevakning än?", button: "Skapa en bevakning" },

  mocks: {
    share: "Dela",
    shareSheet: { copy: "Kopiera", readingList: "Lägg till i läslista", bookmark: "Lägg till bokmärke", favorites: "Lägg till i favoriter", addToHome: "Lägg till på hemskärmen", markup: "Markering" },
    addDialog: { cancel: "Avbryt", title: "Lägg till på hemskärmen", add: "Lägg till", note: "En symbol läggs till på hemskärmen så att du snabbt kan komma åt den här webbplatsen." },
    iosAlert: { title: "”PickupChecker” vill skicka notiser till dig", text: "Notiser kan innehålla meddelanden, ljud och symbolbrickor. Dessa kan konfigureras i Inställningar.", dontAllow: "Tillåt inte", allow: "Tillåt" },
    chromeMenuLabel: "Meny",
    chromeMenu: { before: ["Ny flik", "Historik", "Nedladdningar", "Bokmärken", "Dela…"], add: "Lägg till på startskärmen", after: ["Datorversion"] },
    androidAlert: { title: "Vill du tillåta att PickupChecker skickar aviseringar till dig?", dontAllow: "Tillåt inte", allow: "Tillåt" },
    desktopAlert: { wantsTo: "pickupchecker.com vill", show: "Visa aviseringar", block: "Blockera", allow: "Tillåt" },
    desktopInstall: { callout: "Installera", title: "Installera PickupChecker", text: "Öppnas i ett eget fönster", cancel: "Avbryt", install: "Installera" },
    lockScreen: { date: "torsdag 29 oktober", now: "nu", title: "iPhone 18 Pro 256GB svart", body: "Apple Mall of Scandinavia · Solna – Tillgänglig idag. Tryck för att reservera på apple.com." },
  },
};
