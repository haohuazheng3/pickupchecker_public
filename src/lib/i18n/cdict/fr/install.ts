/**
 * Chaînes client françaises : install (le guide /install et ses écrans dessinés). Les libellés des maquettes reprennent
 * ceux d’iOS, d’Android et de Chrome en français (« Partager », « Sur l’écran d’accueil », « Autoriser »).
 */
import type { CDict } from "../en";

export const install: CDict["install"] = {
  hero: {
    eyebrow: "App sur l’écran d’accueil · aucun téléchargement",
    title: "Les alertes sur votre écran verrouillé.",
    lead: "Ajoutez PickupChecker à votre écran d’accueil et autorisez les notifications. Les retours en stock arrivent sur l’écran verrouillé en quelques secondes.",
    seeSteps: "Voir les étapes",
    sendTest: "Envoyer un test",
    turnOn: "Activer les notifications",
    already: "**✓ Tout est prêt.** Les alertes arrivent sur : {label}. Les étapes ci-dessous ajoutent aussi cet appareil. {link}",
    myAlerts: "Mes alertes",
  },
  progress: {
    homeScreen: "Sur l’écran d’accueil",
    signedIn: "Connecté",
    on: "Notifications activées",
    blocked: "Bloquées dans les réglages : voir l’étape {n}.",
  },
  steps: {
    title: "Configurer les notifications",
    intro: {
      ios: "Sur iPhone et iPad, les notifications ne fonctionnent que depuis l’app de l’écran d’accueil.",
      android: "Sur Android, l’installation est facultative : Chrome peut envoyer des notifications tout seul.",
      desktop: "Fonctionne dans le navigateur. Aucune installation nécessaire.",
    },
    tabsLabel: "Votre appareil",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "Ordinateur" },
    ios: {
      safari: { title: "Ouvrez pickupchecker.com dans Safari", text: "Safari uniquement. Pas Chrome, ni un navigateur intégré à une app." },
      share: { title: "Touchez Partager", text: "Barre du bas sur iPhone, en haut sur iPad." },
      choose: { title: "Choisissez « Sur l’écran d’accueil »", text: "Faites défiler vers le bas si vous ne le voyez pas." },
      add: { title: "Touchez Ajouter", text: "Gardez le nom PickupChecker." },
      open: { title: "Ouvrez-la depuis l’écran d’accueil et connectez-vous", text: "L’app a sa propre connexion. Même e-mail, mêmes alertes." },
      allow: { title: "Touchez « Activer les notifications », puis Autoriser", text: "Le bouton se trouve sur votre page d’alertes. L’iPhone ne demande qu’une fois." },
    },
    android: {
      chrome: { title: "Ouvrez pickupchecker.com dans Chrome", text: "Samsung Internet et Edge fonctionnent aussi. Pas les navigateurs intégrés aux apps." },
      install: { title: "Installez l’app", text: "Un seul toucher, sans boutique d’applications." },
      menu: { title: "Menu ⋮ → « Ajouter à l’écran d’accueil »", text: "Parfois intitulé **Installer l’application**." },
      open: { title: "Ouvrez PickupChecker et connectez-vous", text: "Depuis l’écran d’accueil ou le tiroir d’applications. Même e-mail, mêmes alertes." },
      allow: { title: "Touchez « Activer les notifications », puis Autoriser", text: "Android ne demande qu’une fois. Fonctionne aussi dans l’onglet Chrome." },
    },
    desktop: {
      allow: { title: "Cliquez sur « Activer les notifications »", text: "Chrome, Edge, Firefox, Safari 16 et plus. Le navigateur ne demande qu’une fois." },
      install: { title: "Facultatif : l’installer comme une app", text: "Chrome ou Edge : l’icône d’installation dans la barre d’adresse. Les notifications arrivent même navigateur fermé." },
      phone: { title: "Votre téléphone aussi", text: "Connectez-vous sur votre téléphone avec le même e-mail. Chaque appareil aux notifications activées reçoit chaque alerte." },
    },
  },
  action: {
    install: "Installer PickupChecker",
    on: "✓ Les notifications sont activées sur cet appareil.",
    sendTest: "Envoyer un test",
    needsInstall: "Disponible une fois l’app de l’écran d’accueil ouverte.",
    signInFirst: "Connectez-vous d’abord",
    signInThenOn: "Se connecter, puis activer",
    turnOn: "Activer les notifications",
    denied: "Bloquées. Autorisez PickupChecker dans Réglages, puis rechargez.",
  },
  notes: [
    { q: "Pourquoi Safari sur iPhone ?", a: "Seul Safari peut ajouter un site à l’écran d’accueil. Les navigateurs intégrés aux apps ne le peuvent pas." },
    { q: "La batterie ?", a: "Rien ne tourne sur votre téléphone. Ce sont nos serveurs qui vérifient." },
    { q: "Et l’e-mail ?", a: "Non. Les alertes arrivent uniquement en notification : activez-les sur au moins un appareil." },
    { q: "Plusieurs appareils ?", a: "Connectez-vous avec le même e-mail sur chacun. Chaque appareil reçoit chaque alerte." },
  ],
  cta: { title: "Pas encore d’alerte ?", button: "Créer une alerte" },

  mocks: {
    share: "Partager",
    shareSheet: { copy: "Copier", readingList: "Ajouter à la liste de lecture", bookmark: "Ajouter un signet", favorites: "Ajouter aux favoris", addToHome: "Sur l’écran d’accueil", markup: "Annotation" },
    addDialog: { cancel: "Annuler", title: "Ajouter à l’écran d’accueil", add: "Ajouter", note: "Une icône sera ajoutée à votre écran d’accueil pour vous permettre d’accéder rapidement à ce site web." },
    iosAlert: { title: "« PickupChecker » souhaite vous envoyer des notifications", text: "Les notifications peuvent inclure des alertes, des sons et des pastilles d’icônes. Vous pouvez les configurer dans Réglages.", dontAllow: "Refuser", allow: "Autoriser" },
    chromeMenuLabel: "Menu",
    chromeMenu: { before: ["Nouvel onglet", "Historique", "Téléchargements", "Favoris", "Partager…"], add: "Ajouter à l’écran d’accueil", after: ["Version pour ordinateur"] },
    androidAlert: { title: "Autoriser PickupChecker à vous envoyer des notifications ?", dontAllow: "Ne pas autoriser", allow: "Autoriser" },
    desktopAlert: { wantsTo: "pickupchecker.com souhaite", show: "Afficher des notifications", block: "Bloquer", allow: "Autoriser" },
    desktopInstall: { callout: "Installer", title: "Installer PickupChecker ?", text: "S’ouvre dans sa propre fenêtre", cancel: "Annuler", install: "Installer" },
    lockScreen: { date: "jeudi 29 octobre", now: "maintenant", title: "iPhone 18 Pro 256GB Noir", body: "Apple Champs-Élysées · Paris — Disponible aujourd’hui. Touchez pour réserver sur apple.com." },
  },
};
