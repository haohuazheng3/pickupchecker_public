/**
 * Dutch client strings: install (the /install guide and its drawn phone screens). The mock labels are the words
 * iOS, Android and Chrome show in Dutch: Deel, Zet op beginscherm, Voeg toe, Sta toe, Toevoegen aan startscherm.
 */
import type { CDict } from "../en";

export const install: CDict["install"] = {
  hero: {
    eyebrow: "App op je beginscherm · geen download",
    title: "Alerts op je toegangsscherm.",
    lead: "Zet PickupChecker op je beginscherm en sta meldingen toe. Nieuwe voorraad staat binnen seconden op je toegangsscherm.",
    seeSteps: "Bekijk de stappen",
    sendTest: "Stuur een test",
    turnOn: "Zet meldingen aan",
    already: "**✓ Je bent klaar.** Alerts gaan naar je {label}. Met de stappen hieronder voeg je ook dit apparaat toe. {link}",
    myAlerts: "Mijn alerts",
  },
  progress: {
    homeScreen: "Op het beginscherm",
    signedIn: "Ingelogd",
    on: "Meldingen aan",
    blocked: "Geblokkeerd in de instellingen — zie stap {n}.",
  },
  steps: {
    title: "Meldingen instellen",
    intro: {
      ios: "Op iPhone en iPad werken meldingen alleen vanuit de app op je beginscherm.",
      android: "Installeren is optioneel op Android; Chrome kan zelf meldingen geven.",
      desktop: "Werkt in de browser. Niets te installeren.",
    },
    tabsLabel: "Je apparaat",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "Computer" },
    ios: {
      safari: { title: "Open pickupchecker.com in Safari", text: "Alleen Safari. Niet Chrome of een browser in een app." },
      share: { title: "Tik op Deel", text: "Onderaan op de iPhone, bovenaan op de iPad." },
      choose: { title: "Kies “Zet op beginscherm”", text: "Scrol omlaag als je het niet ziet." },
      add: { title: "Tik op Voeg toe", text: "Laat de naam PickupChecker staan." },
      open: { title: "Open het vanaf je beginscherm en log in", text: "De app heeft een eigen login. Hetzelfde e-mailadres, dezelfde alerts." },
      allow: { title: "Tik op “Zet meldingen aan” en dan op Sta toe", text: "De knop staat op je alertspagina. De iPhone vraagt het één keer." },
    },
    android: {
      chrome: { title: "Open pickupchecker.com in Chrome", text: "Samsung Internet en Edge werken ook. Browsers in apps niet." },
      install: { title: "Installeer de app", text: "Eén tik, geen Play Store nodig." },
      menu: { title: "Menu ⋮ → “Toevoegen aan startscherm”", text: "Soms heet het **App installeren**." },
      open: { title: "Open PickupChecker en log in", text: "Vanaf je startscherm of app-overzicht. Hetzelfde e-mailadres, dezelfde alerts." },
      allow: { title: "Tik op “Zet meldingen aan” en dan op Toestaan", text: "Android vraagt het één keer. Werkt ook in het Chrome-tabblad." },
    },
    desktop: {
      allow: { title: "Klik op “Zet meldingen aan”", text: "Chrome, Edge, Firefox, Safari 16+. De browser vraagt het één keer." },
      install: { title: "Optioneel: installeer het als app", text: "Chrome of Edge: het installatie-icoon in de adresbalk. Geeft meldingen, ook als de browser dicht is." },
      phone: { title: "Ook je telefoon", text: "Log op je telefoon in met hetzelfde e-mailadres. Elk apparaat met meldingen aan krijgt elke alert." },
    },
  },
  action: {
    install: "PickupChecker installeren",
    on: "✓ Meldingen staan aan op dit apparaat.",
    sendTest: "Stuur een test",
    needsInstall: "Beschikbaar zodra je de app op je beginscherm opent.",
    signInFirst: "Log eerst in",
    signInThenOn: "Log in en zet ze aan",
    turnOn: "Zet meldingen aan",
    denied: "Geblokkeerd. Sta PickupChecker toe in Instellingen en laad de pagina opnieuw.",
  },
  notes: [
    { q: "Waarom Safari op de iPhone?", a: "Alleen Safari kan een site op je beginscherm zetten. Browsers in apps kunnen dat niet." },
    { q: "Batterij?", a: "Op je telefoon draait niets. Onze servers doen het checken." },
    { q: "E-mail?", a: "Geen apparaat met meldingen aan? Dan gaat de alert naar je e-mail." },
    { q: "Meerdere apparaten?", a: "Log op elk apparaat in met hetzelfde e-mailadres. Elk apparaat krijgt elke alert." },
  ],
  cta: { title: "Nog geen alert?", button: "Stel een alert in" },

  mocks: {
    share: "Deel",
    shareSheet: { copy: "Kopieer", readingList: "Voeg toe aan leeslijst", bookmark: "Voeg bladwijzer toe", favorites: "Voeg toe aan favorieten", addToHome: "Zet op beginscherm", markup: "Markering" },
    addDialog: { cancel: "Annuleer", title: "Zet op beginscherm", add: "Voeg toe", note: "Er wordt een symbool aan je beginscherm toegevoegd, zodat je snel naar deze website kunt gaan." },
    iosAlert: { title: "“PickupChecker” wil je berichten sturen", text: "Berichtgeving kan meldingen, geluiden en symboolbadges bevatten. Deze kunnen in Instellingen worden geconfigureerd.", dontAllow: "Sta niet toe", allow: "Sta toe" },
    chromeMenuLabel: "Menu",
    chromeMenu: { before: ["Nieuw tabblad", "Geschiedenis", "Downloads", "Bladwijzers", "Delen…"], add: "Toevoegen aan startscherm", after: ["Desktopsite"] },
    androidAlert: { title: "Toestaan dat PickupChecker je meldingen stuurt?", dontAllow: "Niet toestaan", allow: "Toestaan" },
    desktopAlert: { wantsTo: "pickupchecker.com wil", show: "Meldingen weergeven", block: "Blokkeren", allow: "Toestaan" },
    desktopInstall: { callout: "Installeren", title: "PickupChecker installeren", text: "Opent in een eigen venster", cancel: "Annuleren", install: "Installeren" },
    lockScreen: { date: "donderdag 29 oktober", now: "nu", title: "iPhone 18 Pro 256GB Zwart", body: "Apple Amsterdam · Amsterdam — Vandaag beschikbaar. Tik om te reserveren op apple.com." },
  },
};
