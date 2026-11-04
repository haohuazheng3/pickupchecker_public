/**
 * Hand-drawn illustrations for the "grab a restock in 20 seconds" guide: the dashboard's restock window, Apple's
 * Delivery & Pickup sheet with the checkout staged, the carrier terms box, the alert banner, the store and
 * time-slot picks. HTML + the install guide's mock classes (globals.css), so they theme with the site, weigh
 * nothing and show no real screenshot. All aria-hidden: the step text carries the instruction.
 */
import { AppIcon, Hl, Screen } from "@/components/push/Mocks";

const Radio = ({ on = false }: { on?: boolean }) => (
  <span className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full border ${on ? "border-[5px] border-[#0a66ff]" : "border-ink/30"}`} />
);
const Check = ({ on = false }: { on?: boolean }) => (
  <span className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${on ? "border-accent bg-accent text-[var(--accent-ink)]" : "border-ink/30"}`}>{on ? "✓" : ""}</span>
);
const Pay = () => (
  <div className="mx-3 mb-3 mt-2 flex items-center justify-center gap-1 rounded-full bg-ink py-2 text-[11px] font-semibold text-[var(--on-ink)]">Continue with <span className="font-bold">Pay</span></div>
);

/** The dashboard card: which hours the reader's own stores restock, the busiest three in the accent. */
export function RestockWindowMock() {
  const bars = [1, 0, 0, 0, 0, 0, 1, 3, 9, 22, 14, 5, 2, 2, 3, 2, 1, 1, 1, 1, 0, 1, 1, 1];
  const max = Math.max(...bars);
  return (
    <Screen className="mock-wide">
      <div className="mock-fill !gap-2 !p-4">
        <div className="text-[12px] font-semibold text-ink">When your stores restock</div>
        <div className="text-[10px] text-ink-3">iPhone Duo · 3 stores · last 30 days · Eastern time</div>
        <div className="text-[11px] leading-snug text-ink-2">At your 3 stores, most land at <b className="text-ink">8–9 AM</b>, <b className="text-ink">9–10 AM</b> and <b className="text-ink">10–11 AM</b>. One usually lasts <b className="text-ink">1 min</b>.</div>
        <div className="mt-1 flex h-14 items-end gap-[3px]">
          {bars.map((b, h) => <span key={h} className={`flex-1 rounded-t-[2px] ${h >= 8 && h <= 10 ? "bg-accent" : "bg-ink/15"}`} style={{ height: `${Math.max(2, (b / max) * 100)}%` }} />)}
        </div>
        <div className="flex justify-between text-[8px] text-ink-3"><span>12a</span><span>6a</span><span>9a</span><span>12p</span><span>6p</span><span>11p</span></div>
      </div>
    </Screen>
  );
}

/** Apple's Delivery & Pickup sheet, staged: configuration chosen, delivery selected, the pickup row waiting. */
export function CheckoutSheetMock() {
  return (
    <Screen className="mock-tall">
      <div className="mock-sheet mock-sheet-tall">
        <div className="mock-sheet-head"><span className="h-4 w-4 rounded-full bg-ink/10 text-center text-[9px] leading-4 text-ink-2">✕</span><span className="flex-1 text-center text-[11px] font-semibold text-ink">Delivery &amp; Pickup</span><span className="w-4" /></div>
        <div className="mock-row"><span>Zip Code</span><span className="text-ink">10001 ›</span></div>
        <div className="mock-row !items-start"><span className="text-ink">iPhone Duo<br /><span className="text-ink-3">512GB Star White · Unlocked</span></span><span className="text-ink">$2,199</span></div>
        <div className="mock-row"><span className="flex items-center gap-2"><Radio on /> Delivers Mon, Jan 25</span><span className="text-ink-3">Free</span></div>
        <div className="mock-row mock-row-hl">
          <Hl label="tap this when the alert comes" below><span className="flex items-center gap-2 px-1"><Radio /> Pickup – In-Store</span></Hl>
          <span className="text-[9px] text-ink-3">Unavailable</span>
        </div>
        <div className="h-7" />
        <div className="mock-row"><span>Payment</span><span className="text-ink">Apple Pay ›</span></div>
        <Pay />
      </div>
    </Screen>
  );
}

/** The carrier agreement box, already ticked. */
export function TermsMock() {
  return (
    <Screen className="mock-wide">
      <div className="mock-fill !justify-center">
        <div className="text-[10px] text-ink-3">Carrier plan</div>
        <div className="text-[11px] text-[#0a66ff]">Wireless Customer Agreement</div>
        <div className="mt-1 flex items-center text-[12px] text-ink"><Hl label="tick it before the window" below><span className="flex items-center gap-2 px-1"><Check on /> I agree to the above terms</span></Hl></div>
        <div className="mt-3 text-[10px] text-ink-3">Unlocked, paid in full: no agreement at all.</div>
      </div>
    </Screen>
  );
}

/** The push as it lands over the staged sheet: read it, don't tap it. */
export function AlertBannerMock() {
  return (
    <Screen className="mock-tall">
      <div className="mock-sheet mock-sheet-tall mock-dim">
        <div className="mock-sheet-head"><span className="flex-1 text-center text-[11px] font-semibold">Delivery &amp; Pickup</span></div>
        <div className="mock-row"><span>iPhone Duo 512GB Star White</span><span>$2,199</span></div>
        <div className="mock-row"><span className="flex items-center gap-2"><Radio on /> Delivers Mon, Jan 25</span></div>
        <div className="mock-row"><span className="flex items-center gap-2"><Radio /> Pickup – In-Store</span></div>
      </div>
      <div className="absolute start-3 end-3 top-3 flex items-start gap-2 rounded-2xl border border-line-2 bg-[var(--pane-solid)] p-2.5 shadow-[0_20px_40px_-20px_rgba(0,0,0,.45)]">
        <AppIcon size={30} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2"><span className="text-[9px] font-semibold uppercase tracking-wide text-ink-2">PickupChecker</span><span className="text-[9px] text-ink-3">now</span></div>
          <div className="text-[11px] font-semibold leading-snug text-ink">iPhone Duo 512GB Star White</div>
          <div className="text-[10px] leading-snug text-ink-2">Apple Somerset · Troy, MI — Available Today.</div>
        </div>
      </div>
      <div className="absolute bottom-2 start-0 end-0 text-center text-[9px] text-ink-3">read the store name · stay in the app</div>
    </Screen>
  );
}

/** The store list after tapping Pickup: the alert's store shows the slot, the others do not. */
export function StorePickMock() {
  return (
    <Screen className="mock-tall">
      <div className="mock-sheet mock-sheet-tall">
        <div className="mock-sheet-head"><span className="flex-1 text-center text-[11px] font-semibold text-ink">Pickup – In-Store</span></div>
        <div className="mock-row"><span>Near 48197</span><span className="text-ink-3">6 stores</span></div>
        <div className="mock-row mock-row-hl"><Hl label="the store the alert named" below><span className="px-1 text-ink">Apple Somerset</span></Hl><span className="text-accent">Available Today</span></div>
        <div className="h-7" />
        <div className="mock-row"><span>Apple Twelve Oaks</span><span className="text-ink-3">Unavailable</span></div>
        <div className="mock-row"><span>Apple Briarwood</span><span className="text-ink-3">Unavailable</span></div>
        <div className="mock-row"><span>Apple Partridge Creek</span><span className="text-ink-3">Unavailable</span></div>
      </div>
    </Screen>
  );
}

/** The time slot and the pay button: first slot, double-click, done. */
export function TimeSlotMock() {
  return (
    <Screen className="mock-tall">
      <div className="mock-sheet mock-sheet-tall">
        <div className="mock-sheet-head"><span className="flex-1 text-center text-[11px] font-semibold text-ink">Pickup time · Apple Somerset</span></div>
        <div className="mock-row"><span>Today</span><span className="text-ink-3">Tue, Nov 3</span></div>
        <div className="mock-row mock-row-hl"><Hl label="first slot, don't shop around" below><span className="px-1 text-ink">10:15 – 10:45 AM</span></Hl><Radio on /></div>
        <div className="h-7" />
        <div className="mock-row"><span>10:45 – 11:15 AM</span><Radio /></div>
        <div className="mock-row"><span>11:15 – 11:45 AM</span><Radio /></div>
        <Pay />
      </div>
    </Screen>
  );
}

/** Settings: Auto-Lock → Never, for the window only. */
export function AutoLockMock() {
  return (
    <Screen className="mock-wide">
      <div className="mock-fill !gap-1 !p-3">
        <div className="text-[10px] text-ink-3">Settings › Display &amp; Brightness</div>
        <div className="mock-row rounded-lg bg-[var(--fill-1)]"><Hl label="Never, for the window" below><span className="px-1">Auto-Lock</span></Hl><span className="text-ink">Never ›</span></div>
        <div className="h-6" />
        <div className="mock-row"><span>Raise to Wake</span><span className="text-ink-3">On</span></div>
        <div className="mt-2 text-[10px] text-ink-3">Put it back afterwards.</div>
      </div>
    </Screen>
  );
}
