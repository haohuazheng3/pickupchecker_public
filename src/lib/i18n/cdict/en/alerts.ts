/**
 * English client strings: the alert setup (AlertSetup, AlertEditor, PhoneMatrix, StorePicker, EmailSignIn,
 * PlanPanel, PlanButton). Plain data: "{name}" placeholders (format.fill, or Rich when a value is an element),
 * plural forms { one, other } with "#" for the number (format.plural). These values reproduce the site's
 * English text exactly, spaces and punctuation included (a leading space marks text that follows another
 * piece on the same line). Model names, storage sizes, plan names and "$5" amounts are filled in, never
 * translated; plans are billed in US dollars in every language.
 */
import type { CountryCode } from "@/lib/apple/countries";
import type { Forms } from "@/lib/i18n/format";

export const alerts = {
  /** The home page's block (AlertSetup). */
  setup: {
    title: "Get an alert",
    lead: "Tick the phones you want and the stores you can get to. Every phone is watched at every store.",
  },

  /** The editor: phones × stores, the sum line, turning alerts on (AlertEditor). */
  editor: {
    /** Joins the two or three names a folded section lists. */
    listSep: ", ",
    phonesTitle: "Phones",
    storesTitle: "Stores",
    phonesNone: "None yet: tick a configuration",
    storesNone: "None yet: tick the stores you can get to",
    phones: { one: "# phone", other: "# phones" } as Forms,
    stores: { one: "# store", other: "# stores" } as Forms,
    alerts: { one: "# alert", other: "# alerts" } as Forms,
    /** "1 phone × 3 stores = 3 alerts" ({phones}, {stores}, {alerts}: the three forms above). */
    sum: "{phones} × {stores} = {alerts}",
    pickBoth: "Pick at least one phone and one store.",
    /** {price}: "$5". */
    fits: "Fits {plan}: {limit} alerts for {price}/month.",
    overAny: "More than any plan holds ({most}).",
    tickStore: "Now tick a store: each phone is watched at each store you tick.",
    tickPhone: "Now tick a phone: it is watched at each store you ticked.",
    tickEach: "Tick a phone and a store: each phone is watched at each store.",
    offUntilPlan: "Saved, but off until you choose a plan.",
    onWith: "{on} of {limit} on with {plan}",
    /** After onWith: " · {n} off". */
    off: " · {n} off",
    overPlan: "That makes {n} alerts; {plan} holds {limit}. Upgrade, or untick something first.",
    overMost: "That makes {n} alerts; the largest plan holds {most}. Untick something first.",
    overPlanHave: "You already have {have} alerts and {plan} sends {limit}. Untick some, or move up a plan.",
    upgradeTo: "Get {plan} · {limit} alerts · ${price}/mo",
    saving: "Saving",
    saved: "✓ Saved",
    notSaved: "Not saved",
    saveFailed: "Couldn't save your alerts",
    saveFailedStatus: "Couldn't save ({status})",
    checkoutUnavailable: "Checkout unavailable",
    seePlans: "See plans",
    signIn: "Sign in",
    signInLead: "Your email is the account. We send a 6-digit code, no password. New here? The same code sets up your account, then you pick your alerts.",
    turnOn: { one: "Turn on this alert", other: "Turn on these # alerts" } as Forms,
    thenPlan: "Then pick a plan: {plan} covers them for {price}/month, cancel anytime.",
    untickFew: "Untick a few first: the largest plan holds {most}.",
    continueWith: { one: "Continue with # alert", other: "Continue with # alerts" } as Forms,
    /** Before choosePlan, just after signing in. */
    savedN: { one: "# alert saved. ", other: "# alerts saved. " } as Forms,
    choosePlan: { one: "Choose a plan to turn it on", other: "Choose a plan to turn them on" } as Forms,
    /** After "$5" in bold. */
    perMo: "/mo",
    fitsYour: " · fits your {n}",
    /** {fast}, {all}, {push}: "5 s", "15 s", "3 s" (format.unit). The only intervals the site states: 15 s and 5 s. */
    speedLine: "Your stores are checked every {fast} (every store every {all}), with a push about {push} after a restock is confirmed.",
    /** After speedLine. */
    afterSpeed: " Monthly, cancel anytime. Stripe checkout, card or Link.",
    alertsOn: "✓ Alerts on. ",
    /** {device}: the phone's name ("iPhone"), else `phone`. */
    goesTo: "They go to your {device}.",
    phone: "phone",
    /** {link}: getOnPhoneLink as a link. */
    getOnPhone: "{link}.",
    getOnPhoneLink: "Get them on your phone",
    myAlerts: "My alerts",
  },

  /** The phone grid (PhoneMatrix). */
  matrix: {
    model: "Model",
    configs: "{model} configurations",
  },

  /** The store list (StorePicker). Place names come from i18n/places. */
  picker: {
    country: "Country",
    find: "Find stores",
    searchUs: "ZIP, city, state or store",
    search: "City or store",
    /** {noun}: regionNoun of the country. */
    searchRegion: "City, {noun} or store",
    locating: "Locating",
    nearMe: "Near me",
    nearestYou: "Nearest to you",
    locatedNow: "Location updated: nearest stores first",
    locBlocked: "Location is blocked for this site. Allow it in your browser or phone settings, or type a place instead.",
    zipNotFound: "ZIP not found — nearest to that area",
    /** {place}: a ZIP, a store ("Apple Fifth Avenue"), a city or a region. */
    nearestTo: "Nearest to {place}",
    regionFirst: "{place} A–Z, then the nearest beyond",
    placeFirst: "{place} first, then the nearest beyond",
    finding: "Finding stores near you…",
    noLocationUs: "No location — type a ZIP or city, or pick a state",
    noLocation: "No location — type a city or store",
    noLocationRegion: "No location — type a city or store, or pick a {noun}",
    promptUs: "Type a ZIP or city, or tap Near me",
    prompt: "Type a city or store, or tap Near me",
    /** {unit}: `miles` or `km` (every language but English: km); {from}: `you` or a ZIP. */
    byRoad: "{unit} by road from {from}, estimated",
    miles: "miles",
    km: "km",
    you: "you",
    zip: "ZIP {zip}",
    zipForDistances: "type your ZIP for distances",
    nearMeForDistances: "tap Near me for distances",
    alreadyOn: "{n} already on",
    preticked: "nearest {n} ticked",
    pickRegion: "Pick a {noun}",
    /** What a country's regions are called (the store list's level between country and city). */
    regionNoun: {
      us: "state", ca: "province", au: "state", uk: "area", de: "state", fr: "department", it: "province", es: "province", jp: "prefecture",
      sg: "area", hk: "area", ae: "emirate", ch: "canton", nl: "province", se: "county", at: "state", be: "region", kr: "province", tw: "city",
    } satisfies Record<CountryCode, string>,
    storesLabel: "Stores",
    on: "on",
    turningOff: "turning off",
    byRoadTitle: "By road, estimated",
    /** The drive time of a store you are at. */
    here: "here",
    directions: "Directions",
    /** {store}: "Apple Fifth Avenue". */
    directionsTo: "Directions to {store}",
    showMore: "Show {n} more",
    noMatchUs: "No match — try a ZIP, city or state.",
    noMatch: "No match — try a city or store.",
    noMatchRegion: "No match — try a city, {noun} or store.",
    alsoChosen: "Also chosen",
  },

  /** Email + code (EmailSignIn). */
  signIn: {
    sendCode: "Send code",
    sending: "Sending",
    verify: "Verify",
    verifying: "Verifying",
    placeholder: "you@example.com",
    emailLabel: "Email",
    codeLabel: "6-digit code",
    invalidEmail: "Enter a valid email address",
    enterCode: "Enter the 6-digit code",
    incomplete: "Verification incomplete ({status}) — try again",
    failed: "Something went wrong",
    /** {email}: the address, as an element. */
    codeSent: "Code sent to {email}",
    resend: "resend",
    changeEmail: "change email",
    /** {terms}, {privacy}: termsLink and privacyLink as links. */
    terms: "Your email is the account: a 6-digit code, no password. By continuing you agree to the {terms} and {privacy}.",
    termsLink: "Terms",
    privacyLink: "Privacy Policy",
    /**
     * Clerk's errors by code, for every language but English (English shows Clerk's own message, as always).
     * A code missing here shows Clerk's message.
     */
    clerk: {
      form_code_incorrect: "That code isn't right. Check the email and try again.",
      verification_expired: "That code has expired. Tap resend for a new one.",
      verification_failed: "Too many wrong codes. Tap resend for a new one.",
      form_param_format_invalid: "Enter a valid email address",
      form_identifier_exists: "That email already has an account. Try again to sign in.",
      too_many_requests: "Too many tries. Wait a minute, then try again.",
      rate_limit_exceeded: "Too many tries. Wait a minute, then try again.",
      user_locked: "This account is locked for now. Try again later.",
    } as Record<string, string>,
  },

  /** The plan, changing and cancelling it (PlanPanel, ChangeConfirm, CancelConfirm). {price} and {amount}: "$5", "$4.17". */
  plan: {
    nextRenewal: "the next renewal",
    unavailable: "Unavailable right now",
    priceFailed: "Couldn't price the change",
    bankConfirm: "Your bank needs to confirm the payment.",
    notChanged: "The plan didn't change. Try again in a minute.",
    changeTo: "Change to {plan}",
    upgradeTo: "Upgrade to {plan}",
    switchTo: "Switch to {plan}",
    today: "Today",
    /** An estimate (before Stripe has the exact figure). */
    about: "about {amount}",
    aboutCap: "About {amount}",
    daysLeft: { other: "for the # days left of this period" } as Forms,
    /** Before the credit in bold. */
    noCharge: "No charge. ",
    credit: "of unused {plan} time becomes credit for your next bills",
    discount: "· your discount covers it",
    then: "Then",
    perMonth: "{price}/month",
    from: "from {date}",
    alerts: "Alerts",
    youHave: "· you have {n}",
    newestOff: "; the newest {n} turn off",
    paidWith: "Paid with",
    exactNote: "Stripe charges the exact amount for the time left, which may differ by a few cents.",
    confirmPay: "Confirm and pay {amount}",
    confirmUpgrade: "Confirm upgrade",
    confirmSwitch: "Confirm switch",
    cancel: "Cancel",
    finishOnStripe: "Finish on Stripe",
    close: "Close",
    cancelSub: "Cancel subscription",
    cancelQ: "Cancel your {plan} plan?",
    until: "Until {date}",
    /** {alerts}: "3 alerts" in bold (editor.alerts). */
    keepsWorking: "{plan} keeps working: {alerts} on, as now.",
    after: "After",
    /** {notCharged}: notCharged in bold. */
    alertsStop: "Alerts stop and {notCharged}.",
    notCharged: "you won't be charged again",
    yourAlerts: "Your alerts",
    staySaved: "Stay saved. Pick a plan again any time and they turn back on.",
    keepPlan: "Keep my plan",
    notCancelled: "The subscription wasn't cancelled. Try again in a minute.",
    notResumed: "The subscription wasn't resumed. Try again in a minute.",
    continues: "{plan} continues. It renews on {date} at {price}/month.",
    paymentFailed: "payment failed",
    onOf: "{on} of {limit} alerts on",
    overOff: " · {n} over the limit, off",
    ends: " · ends {date}",
    renews: " · renews {date}",
    /** {date}: the end date, in bold. */
    cancelled: "Cancelled: {plan} ends on {date}. Alerts stop then, and you won't be charged again.",
    resume: "Resume subscription",
    savedOff: { one: "Your # alert is saved but off until a plan is active.", other: "Your # alerts are saved but off until a plan is active." } as Forms,
    startNow: "Alerts start the moment a plan is active.",
    /** After savedOff / startNow. */
    monthly: " Monthly, cancel anytime.",
    /** After the plan's name. */
    row: " · {limit} alerts · {price}/month",
    fitsYour: "fits your {n}",
    yourPlan: "Your plan",
    upgrade: "Upgrade",
    switch: "Switch",
    choose: "Choose {plan}",
    nowOn: "You're on {plan} now: {limit} alerts.",
    cancelledUntil: "Cancelled. {plan} keeps working until {date}, and you won't be charged again.",
    billing: "Billing and invoices",
    paidNote: "Upgrades are charged for the days left; switching down turns the rest into credit.",
    checkoutNote: "Stripe checkout, card or Link.",
  },

  /** The pricing page's plan buttons (PlanButton). */
  button: {
    onPlan: "✓ You're on {plan} · manage",
    yourPlan: "Your plan · manage",
  },
};
