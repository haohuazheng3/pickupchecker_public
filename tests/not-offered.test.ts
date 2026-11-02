import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isNoStoreAnswer, parsePickupBody } from "@/lib/apple/client";
import { NOT_OFFERED_RECHECK_MS, nextNotOffered, notOfferedDue, parseNotOffered, persistNotOffered, restoreNotOffered, type NotOfferedState } from "@/lib/stock/notOffered";
import { STORE_INDEX } from "@/lib/apple/catalog";

vi.mock("@/components/ui/PendingLink", () => ({ PendingLink: (p: Record<string, unknown>) => createElement("a", p) }));

const MESSAGE = "There is no store associated with this search. Please try another search value.";
const answer = (body: Record<string, unknown>) => parsePickupBody({ head: { status: "200" }, body }, 200, 120);

describe("Apple's answer for a store it offers no pickup lookups for", () => {
  it("is recognised by its own message on an empty store list (R384 Chermside, 2026-11-02)", () => {
    const r = answer({ stores: [], errorMessage: MESSAGE });
    expect(r).toMatchObject({ ok: true, stores: [], message: MESSAGE });
    expect(isNoStoreAnswer(r)).toBe(true);
  });
  it("leaves every other empty or odd answer a failure, as before", () => {
    expect(isNoStoreAnswer(answer({ stores: [] }))).toBe(false); // no message: closed / renumbered → "store missing"
    expect(isNoStoreAnswer(answer({ stores: [], errorMessage: "Something went wrong" }))).toBe(false);
    expect(isNoStoreAnswer(answer({ stores: [{ storeNumber: "R385", partsAvailability: {} }], errorMessage: MESSAGE }))).toBe(false);
    expect("message" in answer({ stores: [] })).toBe(false);
  });
});

describe("marking and re-asking a store without pickup lookups", () => {
  const t0 = new Date("2026-11-02T10:00:00Z");
  const at = (ms: number) => new Date(t0.getTime() + ms);
  const no = { R384: { country: "au", message: MESSAGE } };

  it("holds a first answer, marks the second, then asks only every 30 minutes; any answer with the store clears it", () => {
    let st: NotOfferedState = {};
    let step = nextNotOffered(st, { notOffered: no, answered: [] }, t0);
    st = step.state;
    expect(step.marked).toEqual([]); // one answer could be a blip
    expect(st.R384.confirmed).toBe(false);
    expect(notOfferedDue(st, "R384", at(15_000).getTime())).toBe(true); // asked again next round
    expect(persistNotOffered(st)).toEqual({ stores: {} });

    step = nextNotOffered(st, { notOffered: no, answered: [] }, at(15_000));
    st = step.state;
    expect(step.marked).toEqual(["R384"]);
    expect(persistNotOffered(st).stores.R384).toEqual({ country: "au", message: MESSAGE, since: t0.toISOString(), checkedAt: at(15_000).toISOString() });
    expect(notOfferedDue(st, "R384", at(15_000 + 60_000).getTime())).toBe(false);
    expect(notOfferedDue(st, "R384", at(15_000 + NOT_OFFERED_RECHECK_MS).getTime())).toBe(true);
    expect(notOfferedDue(st, "R385", at(15_000).getTime())).toBe(true); // other stores: every round

    step = nextNotOffered(st, { notOffered: no, answered: ["R385"] }, at(15_000 + NOT_OFFERED_RECHECK_MS));
    st = step.state;
    expect(step).toMatchObject({ marked: [], cleared: [], rechecked: ["R384"] });
    expect(st.R384.since).toBe(t0.toISOString());

    // A failed request (neither answer) changes nothing; an answer that lists the store clears it.
    expect(nextNotOffered(st, { notOffered: {}, answered: [] }, at(NOT_OFFERED_RECHECK_MS * 3)).state).toEqual(st);
    step = nextNotOffered(st, { notOffered: {}, answered: ["R384"] }, at(NOT_OFFERED_RECHECK_MS * 3));
    expect(step.cleared).toEqual(["R384"]);
    expect(step.state).toEqual({});
  });

  it("a store listed by one batch of the round is offered, whatever the other batch said", () => {
    const step = nextNotOffered({}, { notOffered: no, answered: ["R384"] }, t0);
    expect(step.state).toEqual({});
  });

  it("survives a restart through poller_state, limited to the stores still polled", () => {
    const value = { stores: { R384: { country: "au", message: MESSAGE, since: t0.toISOString(), checkedAt: t0.toISOString() }, R999: { country: "uk", message: "x", since: "y", checkedAt: "nope" } } };
    expect(Object.keys(parseNotOffered(value))).toEqual(["R384"]);
    expect(parseNotOffered(null)).toEqual({});
    expect(restoreNotOffered(value, new Set(["R384"])).R384.confirmed).toBe(true);
    expect(restoreNotOffered(value, new Set(["R385"]))).toEqual({});
  });
});

describe("the store page says so instead of \"not checked yet\"", () => {
  const store = STORE_INDEX.get("R384")!;
  it("in the stock cards and the configuration table", async () => {
    const { StockByModel } = await import("@/components/stores/StockByModel");
    const { ConfigTable } = await import("@/components/stores/ConfigTable");
    const off = renderToStaticMarkup(createElement(StockByModel, { summary: undefined, storeNumber: "R384", lookupOff: true }));
    expect(off).toContain("Apple isn&#x27;t offering pickup lookups here right now");
    expect(off).not.toContain("not checked yet");
    const plain = renderToStaticMarkup(createElement(StockByModel, { summary: undefined, storeNumber: "R384" }));
    expect(plain).toContain("not checked yet");
    const table = renderToStaticMarkup(createElement(ConfigTable, { store, rows: [], lookupOff: true }));
    expect(table).toContain("Apple isn&#x27;t offering in-store pickup lookups at this store right now");
    expect(table).not.toContain("not checked yet");
    expect(renderToStaticMarkup(createElement(ConfigTable, { store, rows: [] }))).toContain("First sweep in progress");
  });
});
