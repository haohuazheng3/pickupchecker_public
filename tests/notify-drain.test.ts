import { describe, expect, it } from "vitest";
import { drainNotifications, trackInFlight } from "../src/lib/stock/notify";

// 11-10: a poller restart 3.5 s after a confirmed restock killed the alert send. SIGTERM now drains sends first.
describe("drainNotifications", () => {
  it("waits for a send that is still running", async () => {
    let done = false;
    trackInFlight(new Promise((r) => setTimeout(() => { done = true; r(null); }, 300)));
    expect(await drainNotifications(5_000, 0)).toBe(0);
    expect(done).toBe(true);
  });
  it("gives up after the timeout and says how many were left", async () => {
    trackInFlight(new Promise((r) => setTimeout(r, 2_000)));
    expect(await drainNotifications(300, 0)).toBe(1);
  });
  it("a failed send does not throw out of the drain", async () => {
    trackInFlight(Promise.reject(new Error("push down"))).catch(() => undefined);
    expect(await drainNotifications(3_000, 0)).toBe(0);
  });
});
