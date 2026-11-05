import { describe, expect, it } from "vitest";
import { errorFingerprintText } from "../src/lib/errors";

describe("errorFingerprintText", () => {
  it("groups poller failures that differ only by the random IPv6 source address", () => {
    const a =
      "apple request failed: fetch failed: connect ENETUNREACH 2600:141b:1c00:9a3::1aca:443 - Local (2600:3c03:e004:f324:5ad0:e1f2:3b4c:5d6e:46425)";
    const b =
      "apple request failed: fetch failed: connect ENETUNREACH 2600:141b:1c00:998::1aca:443 - Local (2600:3c03:e004:f3d5:713c:9a8b:7c6d:5e4f:40613)";
    expect(errorFingerprintText(a)).toBe(errorFingerprintText(b));
    expect(errorFingerprintText(a)).toBe("apple request failed: fetch failed: connect ENETUNREACH <ip> - Local (<ip>)");
  });

  it("groups IPv4 addresses and keeps ordinary words and numbers apart", () => {
    expect(errorFingerprintText("connect ETIMEDOUT 17.253.144.10:443")).toBe("connect ETIMEDOUT <ip>");
    expect(errorFingerprintText("au: 40 of 40 requests failed")).toBe("au: # of # requests failed");
    expect(errorFingerprintText("store R384 missing from response")).toBe("store R# missing from response");
  });
});
