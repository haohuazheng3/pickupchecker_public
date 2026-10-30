import { describe, expect, it } from "vitest";
import { alertSetOf, reconcile, togglePhone, toggleStore } from "@/lib/alertSet";

const rule = (id: string, model: string, storage: string, color: string, store: string, active = true, at = id) => ({ id, active, createdAt: `2026-10-30T00:00:0${at}Z`, model, storages: [storage], colors: [color], storeNumbers: [store] });
const A = { model: "duo", storage: "256GB", color: "Night Sky" }, B = { model: "duo", storage: "512GB", color: "Star White" };

describe("alert set", () => {
  it("reads phones and stores from the active single-store rules, oldest first", () => {
    const rows = [rule("2", "duo", "512GB", "Star White", "R095"), rule("1", "duo", "256GB", "Night Sky", "R415"), rule("3", "duo", "256GB", "Night Sky", "R095"), rule("4", "duo", "1TB", "Night Sky", "R001", false),
      { id: "5", active: true, createdAt: "2026-10-30T00:00:05Z", model: "duo", storages: ["256GB", "512GB"], colors: [], storeNumbers: [] }];
    expect(alertSetOf(rows)).toEqual({ phones: [A, B], stores: ["R415", "R095"] });
  });

  it("adds the missing combinations store-major and retires the rest", () => {
    const rows = [rule("1", "duo", "256GB", "Night Sky", "R415"), rule("2", "duo", "512GB", "Star White", "R415"), rule("3", "duo", "512GB", "Star White", "R009")];
    const r = reconcile(rows, { phones: [A, B], stores: ["R415", "R095"] });
    expect(r.add).toEqual([{ ...A, storeNumber: "R095" }, { ...B, storeNumber: "R095" }]);
    expect(r.retire).toEqual(["3"]);
    expect(reconcile(rows, { phones: [], stores: ["R415"] }).retire.sort()).toEqual(["1", "2", "3"]);
  });

  it("toggles keep order and append new picks", () => {
    expect(togglePhone([A], B)).toEqual([A, B]);
    expect(togglePhone([A, B], A)).toEqual([B]);
    expect(toggleStore(["R1", "R2"], "R1")).toEqual(["R2"]);
    expect(toggleStore(["R1"], "R3")).toEqual(["R1", "R3"]);
  });
});
