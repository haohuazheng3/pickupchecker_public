"use client";
/**
 * "Alert me" — one surface, five stages:
 *   model → phone (storage, colour; "+ Phone" adds more) → tick stores → email + code (Clerk, custom UI) → done, or pick a plan
 * Alerts = phones × stores: one rule per phone per store, saved together when the user presses
 * "Set N alerts". A visitor without a plan can line up what Plus switches on (10); a subscriber the
 * room their plan has left. Model and phone picks advance on their own; the store step waits for the button.
 * A signed-in user's existing alerts for the chosen phone(s) start ticked ("+ Stores" on the account page
 * lands here); the nearest five are pre-ticked only when there are none. Unticking one of them switches
 * that alert off when the change is saved.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { MODELS, COLOR_META, STORAGE_ORDER, STORE_INDEX, stateCodeOf, type ModelKey, appleName } from "@/lib/apple/catalog";
import { FREE_PICK_LIMIT, PAID_PLANS, PLANS, SAVE_CAP, comparePlans, isPaidPlan, type PaidPlanKey, type PlanKey } from "@/lib/plans";
import { track } from "@/lib/track";
import { announceAlertsChanged } from "@/lib/alertEvents";
import { forgetMe } from "@/lib/me";
import type { DeviceSummary } from "@/lib/devices";
import { ownedKeys, pickDelta, ruleKey, storesOwnedFor } from "@/lib/alertPicks";
import { PRETICK, StorePicker, freshPickerMemory, type PickerMemory } from "./StorePicker";

type Step = "model" | "config" | "store" | "email" | "code" | "pay";
/** Progress segments: model · phone · stores · sign-in · done. */
const STAGE: Record<Step, number> = { model: 0, config: 1, store: 2, email: 3, code: 3, pay: 4 };

export interface WizardCatalog {
  configs: Record<ModelKey, { storage: string; color: string; price: number; partNumber: string }[]>;
  prices: Record<ModelKey, number>;
}

/** What a page can hand the wizard: a model, a phone, a store, or the place to list stores for. */
export interface WizardStart {
  initialModel?: ModelKey;
  initialStorage?: string;
  initialColor?: string;
  initialStore?: string;
  /** Full state name / city name (from the state and city pages) — lists those stores first. */
  initialState?: string;
  initialCity?: string;
  startSignIn?: boolean;
  next?: string;
  /** Rendered inside the alert dialog: no page anchor, no page events. */
  inDialog?: boolean;
}

/** One exact phone. */
type Item = { model: ModelKey; storage: string; color: string };
type PlanInfo = { key: PlanKey; limit: number; used: number };
/** What a save sends: the phones, the stores ticked, and existing stores unticked (switched off). */
type Picks = { items: Item[]; storeNumbers: string[]; remove?: string[] };
/** One saved rule, as /api/watches returns it. */
type SavedRule = { id: string; model: string; storage: string; color: string; storeNumber: string; covered: boolean; existing: boolean };
/** A row of GET /api/watches. */
type WatchRow = { active: boolean; model: string; storages: string[]; colors: string[]; storeNumbers: string[] };
const sameItem = (a: Item, b: Item) => a.model === b.model && a.storage === b.storage && a.color === b.color;
const itemKey = (it: Item) => `${it.model}|${it.storage}|${it.color}`;
const shortName = (key: ModelKey) => MODELS.find((m) => m.key === key)?.short ?? key;

function clerkMessage(e: unknown): string {
  const err = e as { longMessage?: string; errors?: { longMessage?: string; message?: string }[]; message?: string };
  return err?.longMessage ?? err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? "Something went wrong";
}

export function Wizard({ catalog, initialModel, initialStorage, initialColor, initialStore, initialState, initialCity, startSignIn, next, inDialog = false }: { catalog: WizardCatalog } & WizardStart) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const configOk = Boolean(initialModel && initialStorage && initialColor && catalog.configs[initialModel]?.some((c) => c.storage === initialStorage && c.color === initialColor));
  const [items, setItems] = useState<Item[]>(configOk ? [{ model: initialModel!, storage: initialStorage!, color: initialColor! }] : []);
  const [step, setStep] = useState<Step>(startSignIn ? "email" : !initialModel ? "model" : configOk ? "store" : "config");
  const [model, setModel] = useState<ModelKey | null>(initialModel ?? null);
  const [storage, setStorage] = useState<string | null>(null); // the phone being picked
  const [color, setColor] = useState<string | null>(null);
  const [storeNumbers, setStoreNumbers] = useState<string[]>(initialStore ? [initialStore] : []);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [results, setResults] = useState<SavedRule[]>([]);
  const [removedCount, setRemovedCount] = useState(0); // alerts the last save switched off
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  /** Signed-in users: their active alerts (rule keys) and the devices that get them; null until known. */
  const [owned, setOwned] = useState<Set<string> | null>(null);
  const [devices, setDevices] = useState<DeviceSummary | null>(null);

  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [notice]);

  const modelMeta = MODELS.find((m) => m.key === model);
  const configs = useMemo(() => (model ? catalog.configs[model] : []), [catalog, model]);
  const storageOptions = useMemo(() => [...new Set(configs.map((c) => c.storage))].sort((a, b) => STORAGE_ORDER.indexOf(a) - STORAGE_ORDER.indexOf(b)), [configs]);
  const colorOptions = useMemo(() => [...new Set(configs.filter((c) => !storage || c.storage === storage).map((c) => c.color))], [configs, storage]);
  const stores = useMemo(() => storeNumbers.map((n) => STORE_INDEX.get(n)).filter((s): s is NonNullable<typeof s> => Boolean(s)), [storeNumbers]);
  const phones = items.length;
  const alerts = phones * storeNumbers.length;
  const coveredCount = results.filter((r) => r.covered).length;
  const allCovered = results.length > 0 && coveredCount === results.length;
  // Existing alerts for the phones on screen: which stores they cover, and what saving the ticks would change.
  const ownedHere = useMemo(() => (owned && items.length ? storesOwnedFor(owned, items) : []), [owned, items]);
  const editing = ownedHere.length > 0;
  /** New alerts minus switched-off ones, for a set of ticked stores: what the plan has to make room for. */
  const netFor = useCallback((ticked: string[]) => { const d = pickDelta(items, ticked, owned); return d.added - d.off; }, [items, owned]);
  const { added: newCount, off: offCount, offStores: removedStores } = pickDelta(items, storeNumbers, owned);
  const net = newCount - offCount;
  const changed = newCount > 0 || offCount > 0;

  // Signed-in users: how much room their plan has left. Visitors: what Plus will switch on.
  const [slots, setSlots] = useState<PlanInfo | null>(null);
  const loadAccount = useCallback(async () => {
    const r = await fetch("/api/watches").catch(() => null);
    const j = r?.ok ? ((await r.json().catch(() => null)) as { plan?: PlanInfo; watches?: WatchRow[]; devices?: DeviceSummary } | null) : null;
    if (!j) return;
    if (j.plan) setSlots(j.plan);
    setOwned(ownedKeys(j.watches ?? []));
    if (j.devices) setDevices(j.devices);
  }, []);
  useEffect(() => {
    if (!authLoaded || !isSignedIn) return;
    let gone = false;
    const t = window.setTimeout(() => { if (!gone) void loadAccount(); }, 0);
    return () => { gone = true; window.clearTimeout(t); };
  }, [authLoaded, isSignedIn, loadAccount]);
  const slotsKnown = !authLoaded || !isSignedIn || slots !== null;
  /** The nearest stores are pre-ticked once per visit — not again after the user cleared them or came back. */
  const [pretickDone, setPretickDone] = useState(Boolean(initialStore));
  const [pickerMemory, setPickerMemory] = useState<PickerMemory>(freshPickerMemory);
  const remember = useCallback((patch: Partial<PickerMemory>) => setPickerMemory((m) => ({ ...m, ...patch })), []);
  const room = useMemo(() => {
    if (!authLoaded || !isSignedIn || !slots) return FREE_PICK_LIMIT;
    if (slots.key === "free") return Math.max(0, Math.min(FREE_PICK_LIMIT, SAVE_CAP - slots.used));
    return Math.max(0, Math.min(slots.limit, SAVE_CAP) - slots.used);
  }, [authLoaded, isSignedIn, slots]);
  // The plan turned out smaller than what was lined up (slots arrive after a pre-tick): drop the newest
  // ticks that would be new alerts until it fits. Existing alerts stay ticked.
  useEffect(() => {
    if (step !== "store" && step !== "config") return; // only while the pick is being made
    if (net <= room) return;
    const t = window.setTimeout(() => {
      setStoreNumbers((prev) => {
        const keep = [...prev];
        for (let i = keep.length - 1; i >= 0 && netFor(keep) > room; i--) if (!ownedHere.includes(keep[i])) keep.splice(i, 1);
        return keep;
      });
      setNotice(`Trimmed to the ${room} new alerts your plan has room for.`);
    }, 0);
    return () => window.clearTimeout(t);
  }, [step, room, net, netFor, ownedHere]);

  // Existing alerts for the chosen phone(s) start ticked, once per phone set. An untouched nearest-five
  // pre-tick (made before the account loaded) gives way to them.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const autoPicked = useRef<string[] | null>(null);
  const phonesKey = items.map(itemKey).sort().join(",");
  useEffect(() => {
    if (step !== "store" || !owned || items.length === 0 || seededFor === phonesKey) return;
    const mine = storesOwnedFor(owned, items);
    const t = window.setTimeout(() => {
      setSeededFor(phonesKey);
      if (mine.length === 0) return;
      setPretickDone(true);
      setStoreNumbers((prev) => {
        const auto = autoPicked.current;
        const untouched = auto != null && prev.length === auto.length && prev.every((n) => auto.includes(n));
        return [...new Set([...(untouched ? [] : prev), ...mine])];
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, [step, owned, items, phonesKey, seededFor]);

  const saving = useRef(false);
  const saveWatch = useCallback(async (v: Picks): Promise<SavedRule[]> => {
    const remove = v.remove ?? [];
    if (v.items.length === 0 || (v.storeNumbers.length === 0 && remove.length === 0)) throw new Error("Pick a phone and at least one store first");
    const res = await fetch("/api/watches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: v.items, storeNumbers: v.storeNumbers, ...(remove.length ? { removeStoreNumbers: remove } : {}) }) });
    const j = (await res.json().catch(() => ({}))) as { rules?: SavedRule[]; removed?: number; plan?: PlanInfo; devices?: DeviceSummary; error?: string };
    if (!res.ok || !j.rules || (j.rules.length === 0 && !j.removed)) throw new Error(j.error ?? (res.ok ? "Could not save your alerts" : `Could not save your alerts (${res.status})`));
    const rules = j.rules;
    setResults(rules); setRemovedCount(j.removed ?? 0); setPlanInfo(j.plan ?? null);
    if (j.plan) setSlots(j.plan); // the room left is what the save just reported
    if (j.devices) setDevices(j.devices);
    // What the account holds now, so another round for the same phone starts from it.
    setOwned((prev) => {
      const next = new Set(prev ?? []);
      for (const it of v.items) for (const n of remove) next.delete(ruleKey(it, n));
      for (const r of rules) next.add(ruleKey({ model: r.model as ModelKey, storage: r.storage, color: r.color }, r.storeNumber));
      return next;
    });
    // The confirmation describes exactly what was saved.
    setItems(v.items); setStoreNumbers([...new Set(rules.map((r) => r.storeNumber))]);
    track("watch_saved", { phones: v.items.length, stores: v.storeNumbers.length, rules: rules.length, existing: rules.filter((r) => r.existing).length, removed: j.removed ?? 0 });
    // The account page behind the dialog (or in another tab) redraws its lists and restock modules now.
    forgetMe();
    announceAlertsChanged();
    return rules;
  }, []);

  const goPay = useCallback(async (plan: PaidPlanKey, id: string | null, opts: { stay?: boolean } = {}) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, watchId: id ?? undefined }) });
      const j = (await res.json()) as { url?: string; alreadySubscribed?: boolean; changed?: boolean; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error ?? "Checkout unavailable");
      track(j.alreadySubscribed || j.changed ? "plan_changed" : "checkout_started", { plan });
      // Switched in place while picking stores: stay on the picks, with the bigger room.
      if (opts.stay && j.changed) { await loadAccount(); setNotice(`You're on ${PLANS[plan].name} now: ${PLANS[plan].limit} alerts.`); setBusy(false); return; }
      window.location.assign(j.url);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false); }
  }, [loadAccount]);

  // After the stores: signed-in users save and go to the plan step; signed-out users go to the email
  // step. While Clerk is still loading we hold the pick (busy) instead of guessing.
  const [held, setHeld] = useState<Picks | null>(null);
  const continueFromStore = useCallback(async (v: Picks) => {
    setError(null);
    if (v.items.length === 0) { setStep("config"); setError("Pick the storage and color first."); return; }
    if (v.storeNumbers.length === 0 && !v.remove?.length) return;
    if (!authLoaded) { setHeld(v); setBusy(true); return; }
    if (!isSignedIn) { setStep("email"); return; }
    if (saving.current) return;
    saving.current = true; setBusy(true);
    try { await saveWatch(v); setStep("pay"); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { saving.current = false; setBusy(false); }
  }, [authLoaded, isSignedIn, saveWatch]);
  useEffect(() => {
    if (!authLoaded || !held) return;
    const v = held;
    const t = window.setTimeout(() => { setHeld(null); setBusy(false); void continueFromStore(v); }, 0);
    return () => window.clearTimeout(t);
  }, [authLoaded, held, continueFromStore]);

  // A signed-in user who still landed on the email step (Clerk finished loading late): save instead.
  useEffect(() => {
    if (step !== "email" || !authLoaded || !isSignedIn || items.length === 0 || storeNumbers.length === 0) return;
    const v = { items, storeNumbers };
    const t = window.setTimeout(() => { void continueFromStore(v); }, 0);
    return () => window.clearTimeout(t);
  }, [step, authLoaded, isSignedIn, items, storeNumbers, continueFromStore]);

  // The floating button hides while the wizard is on screen; tell it we exist, and honour #notify.
  useEffect(() => {
    if (inDialog) return;
    window.dispatchEvent(new CustomEvent("pc:wizard", { detail: true }));
    if (window.location.hash === "#notify") document.getElementById("notify")?.scrollIntoView({ block: "start" });
    return () => { window.dispatchEvent(new CustomEvent("pc:wizard", { detail: false })); };
  }, [inDialog]);

  /** Add the phone being picked and go on to the stores. */
  const addItem = (it: Item) => {
    if (busy) return;
    const more = storeNumbers.filter((n) => !owned?.has(ruleKey(it, n))).length;
    if (!items.some((x) => sameItem(x, it)) && net + more > room) { setNotice(`Another phone makes ${net + more} new alerts — over the ${room} you can add. Untick some stores first.`); return; }
    setItems((prev) => (prev.some((x) => sameItem(x, it)) ? prev : [...prev, it]));
    setStorage(null); setColor(null);
    track("phone_added", { model: it.model, storage: it.storage, color: it.color });
    setStep("store");
  };
  const removeItem = (it: Item) => {
    if (busy) return;
    const rest = items.filter((x) => !sameItem(x, it));
    setItems(rest);
    if (rest.length === 0) { setModel(it.model); setStep("config"); }
  };
  const addPhone = () => {
    if (busy) return;
    if (net + storeNumbers.length > room) { setNotice(`Another phone makes up to ${net + storeNumbers.length} new alerts — over the ${room} you can add. Untick some stores first.`); return; }
    setStorage(null); setColor(null); setStep("config");
  };
  /** Functional update: two quick taps never overwrite each other; the plan's room is checked on the way in. */
  const toggleStore = useCallback((n: string) => {
    if (busy) return;
    if (!storeNumbers.includes(n) && netFor([...storeNumbers, n]) > room) {
      const over = netFor([...storeNumbers, n]);
      setNotice(room <= 0 || net >= room ? "No room left on your plan." : `That makes ${over} new alerts — over the ${room} you can add. Untick one, or remove a phone.`);
      return;
    }
    setStoreNumbers((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : netFor([...prev, n]) > room ? prev : [...prev, n]));
  }, [busy, storeNumbers, room, net, netFor]);
  const pretick = useCallback((nearest: string[]) => {
    setPretickDone(true);
    const n = Math.max(0, Math.min(PRETICK, Math.floor(room / Math.max(1, phones))));
    const pick = nearest.slice(0, n);
    setStoreNumbers((prev) => { if (prev.length) return prev; autoPicked.current = pick; return pick; });
  }, [room, phones]);
  const submitStores = () => {
    if (busy || saving.current || (storeNumbers.length === 0 && removedStores.length === 0) || (editing && !changed)) return;
    track("stores_submitted", { stores: storeNumbers.length, phones, removed: removedStores.length });
    void continueFromStore({ items, storeNumbers, remove: removedStores });
  };

  const sendCode = async () => {
    if (!signIn || !signUp) return;
    const addr = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) { setError("Enter a valid email address"); return; }
    setBusy(true); setError(null);
    try {
      // One flow, no Clerk UI: try sign-in; an unknown email becomes a sign-up.
      const created = await signIn.create({ identifier: addr });
      if (!created.error) {
        const sent = await signIn.emailCode.sendCode();
        if (sent.error) throw sent.error;
        setAuthMode("signin");
      } else if (created.error.code === "form_identifier_not_found" || /not found|couldn't find|no account/i.test(created.error.longMessage ?? created.error.message)) {
        const su = await signUp.create({ emailAddress: addr });
        if (su.error) throw su.error;
        const sent = await signUp.verifications.sendEmailCode();
        if (sent.error) throw sent.error;
        setAuthMode("signup");
      } else {
        throw created.error;
      }
      track("code_sent");
      setStep("code");
    } catch (e) { setError(clerkMessage(e)); }
    finally { setBusy(false); }
  };

  const verifyCode = async () => {
    if (!signIn || !signUp) return;
    const c = code.replace(/\D/g, "");
    if (c.length < 6) { setError("Enter the 6-digit code"); return; }
    setBusy(true); setError(null);
    try {
      if (authMode === "signin") {
        const r = await signIn.emailCode.verifyCode({ code: c });
        if (r.error) throw r.error;
        if (signIn.status !== "complete") throw new Error(`Verification incomplete (${signIn.status}) — try again`);
        const f = await signIn.finalize();
        if (f.error) throw f.error;
      } else {
        const r = await signUp.verifications.verifyEmailCode({ code: c });
        if (r.error) throw r.error;
        if (signUp.status !== "complete") throw new Error(`Verification incomplete (${signUp.status}) — try again`);
        const f = await signUp.finalize();
        if (f.error) throw f.error;
      }
      track("signed_in", { mode: authMode });
      if (items.length === 0 || storeNumbers.length === 0) {
        // Sign-in only (header link, a protected page, the install guide): go where they were headed.
        window.location.assign(next && next.startsWith("/") && !next.startsWith("//") ? next : "/account");
        return;
      }
      await saveWatch({ items, storeNumbers });
      setStep("pay");
    } catch (e) { setError(clerkMessage(e)); }
    finally { setBusy(false); }
  };

  const phoneLabel = (it: Item) => `${shortName(it.model)} ${it.storage} ${it.color}`;
  const storeText = useMemo(() => {
    const names = stores.map((s) => `${appleName(s)}`);
    if (names.length === 0) return "";
    if (names.length === 1) return `${names[0]}, ${stores[0].city}, ${stateCodeOf(stores[0])}`;
    const shown = names.slice(0, 3);
    const more = names.length - shown.length;
    return more > 0 ? `${shown.join(", ")} and ${more} more` : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  }, [stores]);
  const summary = useMemo(() => {
    const ph = items.length === 0 ? (modelMeta?.name ?? "") : items.length === 1 ? `${MODELS.find((m) => m.key === items[0].model)?.name ?? items[0].model} ${items[0].storage} ${items[0].color}` : `${items.length} phones`;
    const where = stores.length > 1 ? `${stores.length} stores` : storeText;
    return [ph, where].filter(Boolean).join(" · ");
  }, [items, modelMeta, stores.length, storeText]);
  const ruleReady = items.length > 0 && storeNumbers.length > 0;
  const fitPlan = PAID_PLANS.find((k) => PLANS[k].limit >= (planInfo?.used ?? results.length));

  return (
    <div id={inDialog ? undefined : "notify"} className={inDialog ? "relative min-w-0 px-5 pb-5 pt-1 sm:px-7 sm:pb-7" : "pane relative min-w-0 scroll-mt-28 overflow-clip p-5 sm:p-7 sm:scroll-mt-32"}>
      <div className={`mb-5 flex items-center gap-2 ${inDialog ? "pr-10" : ""}`} aria-label={`Step ${STAGE[step] + 1} of 5`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= STAGE[step] ? "bg-accent" : "bg-ink/8"}`} />
        ))}
      </div>

      {step === "model" && (
        <section>
          <h2 className="display text-2xl sm:text-3xl">Which iPhone?</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MODELS.map((m) => (
              <button key={m.key} type="button" onClick={() => { setModel(m.key); setStorage(null); setColor(null); setStep("config"); track("model_selected", { model: m.key }); }}
                className={`pane-2 pane-hover min-w-0 p-4 text-left ${m.key === "duo" ? "border-accent/40" : ""}`}>
                <div className="text-lg font-semibold">{m.name}</div>
                <div className="mt-1 text-sm text-ink-3">{m.blurb} · from ${catalog.prices[m.key].toLocaleString("en-US")}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "config" && model && (
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="display text-2xl sm:text-3xl">{modelMeta?.name}</h2>
            <button type="button" className="text-sm text-ink-3 hover:text-ink" disabled={busy} onClick={() => { if (!busy) setStep("model"); }}>Change model</button>
          </div>
          {items.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Phones picked">
              {items.map((it) => (
                <button key={phoneLabel(it)} type="button" className="chip" data-on="true" onClick={() => removeItem(it)} aria-label={`Remove ${phoneLabel(it)}`}>{phoneLabel(it)} <span aria-hidden>×</span></button>
              ))}
            </div>
          )}
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Storage</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {storageOptions.map((v) => (
              <button key={v} type="button" className="chip" aria-pressed={storage === v} onClick={() => { if (busy) return; setStorage(v); if (color && !configs.some((c) => c.storage === v && c.color === color)) setColor(null); track("storage_selected", { model, storage: v }); }}>{v}</button>
            ))}
          </div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Color</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {colorOptions.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={color === c} disabled={!storage} title={storage ? undefined : "Pick a storage first"}
                onClick={() => { if (busy || !storage) return; setColor(c); track("color_selected", { model, color: c }); addItem({ model, storage, color: c }); }}>
                <span className="inline-block h-3 w-3 rounded-full border border-ink/15" style={{ background: COLOR_META[c]?.hex ?? "#888" }} aria-hidden />{c}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {items.length > 0 && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStep("store")}>Back to stores</button>}
            {notice && <span className="text-sm text-warn">{notice}</span>}
          </div>
          {error && <Err msg={error} />}
        </section>
      )}

      {step === "store" && (
        <section>
          <Back onClick={() => { if (!busy) { setStorage(null); setColor(null); setStep("config"); } }} />
          <h2 className="display text-2xl sm:text-3xl">Which stores?</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Phones">
            {items.map((it) => (
              <button key={phoneLabel(it)} type="button" className="chip" data-on="true" onClick={() => removeItem(it)} aria-label={`Remove ${phoneLabel(it)}`}>{phoneLabel(it)} <span aria-hidden>×</span></button>
            ))}
            <button type="button" className="chip" onClick={addPhone} aria-label="Add another iPhone">+ Another iPhone</button>
          </div>
          {/* The sticky footer belongs to this block, so it only sticks while the list itself is in view. */}
          <div>
          <div className="mt-4"><StorePicker value={storeNumbers} onToggle={toggleStore} onPretick={slotsKnown && !pretickDone && (!owned || seededFor === phonesKey) ? pretick : undefined} room={Math.max(0, Math.floor((room - net) / Math.max(1, phones)))} owned={ownedHere} preferState={initialState} preferCity={initialCity} memory={pickerMemory} onMemory={remember} /></div>
          {/* Sticks to the bottom of the screen while the list is taller than it: the way forward is always in view. */}
          <div className="sticky bottom-0 -mx-5 mt-4 px-5 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 sm:-mx-7 sm:px-7" style={{ background: "var(--pane-solid)" }}>
            <div className="flex h-9 items-center gap-2 overflow-x-auto whitespace-nowrap pr-8 [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]" role="group" aria-label="Stores ticked">
              {stores.length === 0
                ? <span className="text-sm text-ink-3">No stores ticked yet</span>
                : stores.map((s) => <button key={s.storeNumber} type="button" className="chip chip-sm shrink-0" data-on="true" onClick={() => toggleStore(s.storeNumber)} aria-label={`Untick ${appleName(s)}`}>{s.name} <span aria-hidden>×</span></button>)}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0 text-sm text-ink-2" aria-live="polite">
                <span className="font-semibold tabular-nums">
                  {slots && isPaidPlan(slots.key) ? `${alerts} alert${alerts === 1 ? "" : "s"} · ${Math.max(0, room - net)} left on ${PLANS[slots.key].name}` : `${alerts} of ${FREE_PICK_LIMIT} alerts`}
                </span>
                <span className="block text-ink-3 sm:inline"><span className="hidden sm:inline"> · </span>{phones} iPhone{phones === 1 ? "" : "s"} × {storeNumbers.length} store{storeNumbers.length === 1 ? "" : "s"}{editing ? ` · ${newCount} new${offCount ? ` · ${offCount} off` : ""}` : ""}</span>
              </div>
              <button type="button" className="btn btn-primary btn-lg shrink-0" disabled={busy || (alerts === 0 && offCount === 0) || (editing && !changed)} aria-busy={busy} onClick={submitStores}>
                {busy ? <><span className="spinner" /> Saving</>
                  : alerts === 0 && offCount === 0 ? "Tick a store"
                  : editing && !changed ? "No changes"
                  : alerts === 0 ? `Turn off ${offCount} alert${offCount === 1 ? "" : "s"}`
                  : offCount > 0 ? "Save changes"
                  : `Set ${alerts} alert${alerts === 1 ? "" : "s"}`}
              </button>
            </div>
            {(notice || error) && <p role="alert" className={`mt-2 text-sm ${error ? "text-bad" : "text-warn"}`}>{error ?? notice}</p>}
            {/* A subscriber whose plan is full: the bigger plan is one tap away, in place (prorated), and the ticks stay. */}
            {slots && isPaidPlan(slots.key) && net >= room && nextPlan(slots.key) && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warn/10 px-3 py-2 text-sm">
                <span className="text-ink-2">{Math.min(slots.limit, slots.used + net)} of {slots.limit} {PLANS[slots.key].name} alerts used.</span>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void goPay(nextPlan(slots.key)!, null, { stay: true })}>
                  Upgrade to {PLANS[nextPlan(slots.key)!].name} · {PLANS[nextPlan(slots.key)!].limit} alerts · ${PLANS[nextPlan(slots.key)!].priceUsd}/mo
                </button>
              </div>
            )}
          </div>
          </div>
        </section>
      )}

      {step === "email" && (
        <section>
          {ruleReady ? <Back onClick={() => setStep("store")} /> : null}
          <h2 className="display text-2xl sm:text-3xl">{ruleReady ? `Save ${alerts === 1 ? "this alert" : `${alerts} alerts`}` : "Sign in"}</h2>
          <p className="mt-2 text-ink-2">Your email is the account. We send a 6-digit code, no password.</p>
          {ruleReady && <div className="pane-2 mt-4 px-4 py-3 text-sm text-ink-2">{summary}</div>}
          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void sendCode(); }}>
            <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
            <button className="btn btn-primary sm:w-48" type="submit" disabled={busy || !authLoaded} aria-busy={busy}>{busy ? <><span className="spinner" /> Sending</> : "Send code"}</button>
          </form>
          <div id="clerk-captcha" className="mt-3" />
          {error && <Err msg={error} />}
          <p className="mt-4 text-xs text-ink-3">By continuing you agree to the <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy Policy</a>.</p>
        </section>
      )}

      {step === "code" && (
        <section>
          <Back onClick={() => { setStep("email"); setCode(""); }} />
          <h2 className="display text-2xl sm:text-3xl">Enter the code</h2>
          <p className="mt-2 text-ink-2">Sent to <span className="text-ink">{email}</span>.</p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void verifyCode(); }}>
            <input ref={codeRef} className="input input-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder="••••••" value={code}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); }} disabled={busy} />
            <button className="btn btn-primary sm:w-48" type="submit" disabled={busy || code.length < 6} aria-busy={busy}>{busy ? <><span className="spinner" /> Verifying</> : "Verify"}</button>
          </form>
          {error && <Err msg={error} />}
          <button type="button" className="mt-4 text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline" onClick={() => { setCode(""); void sendCode(); }} disabled={busy}>Resend code</button>
        </section>
      )}

      {step === "pay" && (
        <section>
          <h2 className="display text-2xl sm:text-3xl">
            {results.length === 0 && removedCount > 0 ? `${removedCount} alert${removedCount === 1 ? "" : "s"} off`
              : allCovered ? (results.length === 1 ? "Alert on" : `${results.length} alerts on`)
              : coveredCount > 0 ? `${coveredCount} of ${results.length} alerts on`
              : planInfo?.key === "free" ? `${results.length} alert${results.length === 1 ? "" : "s"} saved — pick a plan`
              : "Over your plan"}
          </h2>
          <p className="mt-2 text-ink-2">{summary}{results.length > 0 && removedCount > 0 ? ` · ${removedCount} switched off` : ""}</p>
          {allCovered || results.length === 0 ? (
            <div className="mt-6">
              {results.length > 0 && <p className="text-ink-2">Watching {storeText || "your stores"}{planInfo && planInfo.key !== "free" ? ` · ${planInfo.used} of ${planInfo.limit} ${PLANS[planInfo.key].name} alerts in use` : ""}.</p>}
              {/* Where alerts go: a device that already has notifications on, or the setup when none does. */}
              {devices?.active ? <p className="mt-1 text-ink-2">Alerts go to your {devices.label}.</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {!devices?.active && <a href="/install" className="btn btn-primary">Get alerts on your phone</a>}
                <a href="/account" className={`btn ${devices?.active ? "btn-primary" : "btn-ghost"}`}>My alerts</a>
                <button type="button" className="btn btn-ghost" onClick={() => { setStep("model"); setItems([]); setStoreNumbers([]); setStorage(null); setColor(null); setResults([]); setRemovedCount(0); setPretickDone(false); setSeededFor(null); autoPicked.current = null; setPickerMemory(freshPickerMemory()); }}>Add more</button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-ink-2">
                {planInfo?.key === "free" ? "Alerts start the moment a plan is active."
                  : coveredCount > 0 ? `${PLANS[planInfo?.key ?? "plus"].name} holds ${planInfo?.limit ?? 10}: ${coveredCount} sending, ${results.length - coveredCount} saved but off.`
                  : `${PLANS[planInfo?.key ?? "plus"].name} holds ${planInfo?.limit ?? 10} and they are all in use.`}
                {planInfo?.key === "max" ? " Delete alerts to free slots." : ""}
              </p>
              {planInfo?.key === "max" && <div className="mt-4"><a href="/account" className="btn btn-primary">My alerts</a></div>}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PAID_PLANS.filter((k) => comparePlans(k, planInfo?.key ?? "free") > 0).map((k) => (
                  <div key={k} className={`pane-2 flex min-w-0 flex-col p-5 ${k === fitPlan ? "border-accent/50" : ""}`}>
                    <div className="flex items-baseline justify-between"><span className="font-semibold">{PLANS[k].name}</span><span><span className="display text-3xl">${PLANS[k].priceUsd}</span><span className="text-ink-3"> / mo</span></span></div>
                    <div className="mt-2 flex-1 text-sm text-ink-2">{PLANS[k].limit} alerts{k === fitPlan ? ` · fits your ${results.length}` : ""}</div>
                    <button type="button" className={`btn mt-4 ${k === fitPlan ? "btn-primary" : "btn-ghost"}`} disabled={busy} aria-busy={busy} onClick={() => goPay(k, results[0]?.id ?? null)}>
                      {busy ? <><span className="spinner" /> Opening</> : `Get ${PLANS[k].name}`}
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-ink-3">Monthly, cancel anytime. Stripe checkout, card or Link.</p>
            </div>
          )}
          {error && <Err msg={error} />}
        </section>
      )}
    </div>
  );
}

/** The next plan up, if there is one. */
function nextPlan(key: PlanKey): PaidPlanKey | null {
  return PAID_PLANS.find((k) => comparePlans(k, key) > 0) ?? null;
}

function Back({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mb-3 text-sm text-ink-3 hover:text-ink">← Back</button>;
}
function Err({ msg }: { msg: string }) {
  return <p role="alert" className="mt-3 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{msg}</p>;
}
