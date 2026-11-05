import { describe, expect, it } from "vitest";
import { withRateLimitRetry } from "@/lib/mail/resend";

const limited = { data: null, error: { name: "rate_limit_exceeded", message: "Too many requests." } };
const noSleep = async () => undefined;

describe("withRateLimitRetry", () => {
  it("retries a rate-limited send until it goes through", async () => {
    let calls = 0;
    const id = await withRateLimitRetry(async () => (++calls < 3 ? limited : { data: { id: "em_1" }, error: null }), noSleep);
    expect(id).toBe("em_1");
    expect(calls).toBe(3);
  });

  it("gives up after the last wait and reports the provider error", async () => {
    let calls = 0;
    await expect(withRateLimitRetry(async () => (calls++, limited), noSleep, [1, 1])).rejects.toThrow("rate_limit_exceeded");
    expect(calls).toBe(3);
  });

  it("does not retry other errors", async () => {
    let calls = 0;
    const bad = { data: null, error: { name: "validation_error", message: "bad to" } };
    await expect(withRateLimitRetry(async () => (calls++, bad), noSleep)).rejects.toThrow("validation_error");
    expect(calls).toBe(1);
  });
});
