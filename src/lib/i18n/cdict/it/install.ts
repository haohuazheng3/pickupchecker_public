import type { CDict } from "../en";

/**
 * Italian client strings: install (the /install guide and its drawn phone screens). Mock labels are the words iOS,
 * Android and Chrome show in Italian (Condividi, Aggiungi alla schermata Home, Consenti…).
 */
export const install: CDict["install"] = {
  hero: {
    eyebrow: "App nella schermata Home · niente da scaricare",
    title: "Avvisi sulla schermata di blocco.",
    lead: "Aggiungi PickupChecker alla schermata Home e consenti le notifiche. I rifornimenti arrivano sulla schermata di blocco in pochi secondi.",
    seeSteps: "Vedi i passaggi",
    sendTest: "Invia una prova",
    turnOn: "Attiva le notifiche",
    already: "**✓ È tutto pronto.** Avvisi inviati a: {label}. I passaggi qui sotto aggiungono anche questo dispositivo. {link}",
    myAlerts: "I miei avvisi",
  },
  progress: {
    homeScreen: "Nella schermata Home",
    signedIn: "Accesso effettuato",
    on: "Notifiche attive",
    blocked: "Bloccate nelle impostazioni: vedi il passaggio {n}.",
  },
  steps: {
    title: "Configura le notifiche",
    intro: {
      ios: "Su iPhone e iPad le notifiche funzionano solo dall'app nella schermata Home.",
      android: "Su Android l'installazione è facoltativa: Chrome può inviare notifiche anche da solo.",
      desktop: "Funziona nel browser. Nessuna installazione.",
    },
    tabsLabel: "Il tuo dispositivo",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "Computer" },
    ios: {
      safari: { title: "Apri pickupchecker.com in Safari", text: "Solo Safari. Non Chrome né il browser interno di un'app." },
      share: { title: "Tocca Condividi", text: "Nella barra in basso su iPhone, in alto su iPad." },
      choose: { title: "Scegli «Aggiungi alla schermata Home»", text: "Scorri verso il basso se non lo vedi." },
      add: { title: "Tocca Aggiungi", text: "Lascia il nome PickupChecker." },
      open: { title: "Aprila dalla schermata Home e accedi", text: "L'app ha un accesso separato. Stessa email, stessi avvisi." },
      allow: { title: "Tocca «Attiva le notifiche», poi Consenti", text: "Il pulsante è nella pagina dei tuoi avvisi. iPhone lo chiede una volta sola." },
    },
    android: {
      chrome: { title: "Apri pickupchecker.com in Chrome", text: "Funzionano anche Samsung Internet ed Edge. I browser interni delle app no." },
      install: { title: "Installa l'app", text: "Un tocco, senza passare dall'app store." },
      menu: { title: "Menu ⋮ → «Aggiungi a schermata Home»", text: "A volte si chiama **Installa app**." },
      open: { title: "Apri PickupChecker e accedi", text: "Dalla schermata Home o dall'elenco delle app. Stessa email, stessi avvisi." },
      allow: { title: "Tocca «Attiva le notifiche», poi Consenti", text: "Android lo chiede una volta sola. Funziona anche nella scheda di Chrome." },
    },
    desktop: {
      allow: { title: "Fai clic su «Attiva le notifiche»", text: "Chrome, Edge, Firefox, Safari 16+. Il browser lo chiede una volta sola." },
      install: { title: "Facoltativo: installala come app", text: "Chrome o Edge: l'icona di installazione nella barra degli indirizzi. Ti avvisa anche con il browser chiuso." },
      phone: { title: "Anche sul telefono", text: "Accedi sul telefono con la stessa email. Ogni dispositivo con le notifiche attive riceve ogni avviso." },
    },
  },
  action: {
    install: "Installa PickupChecker",
    on: "✓ Le notifiche sono attive su questo dispositivo.",
    sendTest: "Invia una prova",
    needsInstall: "Disponibile quando apri l'app dalla schermata Home.",
    signInFirst: "Prima accedi",
    signInThenOn: "Accedi, poi attivale",
    turnOn: "Attiva le notifiche",
    denied: "Bloccate. Consenti PickupChecker in Impostazioni, poi ricarica.",
  },
  notes: [
    { q: "Perché Safari su iPhone?", a: "Solo Safari può aggiungere un sito alla schermata Home. I browser interni delle app no." },
    { q: "E la batteria?", a: "Sul telefono non gira niente. I controlli li fanno i nostri server." },
    { q: "Email?", a: "Nessun dispositivo con le notifiche attive? L'avviso arriva via email." },
    { q: "Più dispositivi?", a: "Accedi con la stessa email su ognuno. Ogni dispositivo riceve ogni avviso." },
  ],
  cta: { title: "Ancora nessun avviso?", button: "Imposta un avviso" },

  mocks: {
    share: "Condividi",
    shareSheet: { copy: "Copia", readingList: "Aggiungi a Elenco lettura", bookmark: "Aggiungi segnalibro", favorites: "Aggiungi a Preferiti", addToHome: "Aggiungi alla schermata Home", markup: "Markup" },
    addDialog: { cancel: "Annulla", title: "Aggiungi alla schermata Home", add: "Aggiungi", note: "Un'icona verrà aggiunta alla schermata Home per consentirti di accedere rapidamente a questo sito web." },
    iosAlert: { title: "“PickupChecker” vorrebbe inviarti delle notifiche", text: "Le notifiche possono includere avvisi, suoni e badge sulle icone. Puoi configurarle in Impostazioni.", dontAllow: "Non consentire", allow: "Consenti" },
    chromeMenuLabel: "Menu",
    chromeMenu: { before: ["Nuova scheda", "Cronologia", "Download", "Preferiti", "Condividi…"], add: "Aggiungi a schermata Home", after: ["Sito desktop"] },
    androidAlert: { title: "Consentire a PickupChecker di inviarti notifiche?", dontAllow: "Non consentire", allow: "Consenti" },
    desktopAlert: { wantsTo: "pickupchecker.com vuole", show: "Mostrare notifiche", block: "Blocca", allow: "Consenti" },
    desktopInstall: { callout: "Installa", title: "Installa PickupChecker", text: "Si apre in una finestra dedicata", cancel: "Annulla", install: "Installa" },
    lockScreen: { date: "giovedì 29 ottobre", now: "ora", title: "iPhone 18 Pro 256GB Nero", body: "Apple Via del Corso · Roma — Disponibile oggi. Tocca per prenotarlo su apple.com." },
  },
};
