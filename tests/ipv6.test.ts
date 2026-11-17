import { describe, expect, it } from "vitest";
import { expandV6, prefixFromInterfaces, randomAddressIn, resolvePrefixFrom } from "../poller/ipv6";

const bits = (addr: string) =>
  expandV6(addr).replace(/:/g, "").split("").map((h) => parseInt(h, 16).toString(2).padStart(4, "0")).join("");

describe("randomAddressIn", () => {
  it("keeps the top 64 bits of a /64 and never yields the anycast host", () => {
    const seen = new Set<string>();
    for (let k = 0; k < 200; k++) {
      const a = randomAddressIn("2a01:4f8:1c1b:abcd::/64");
      expect(bits(a).slice(0, 64)).toBe(bits("2a01:4f8:1c1b:abcd::").slice(0, 64));
      expect(bits(a).slice(64)).not.toBe("0".repeat(64));
      seen.add(a);
    }
    expect(seen.size).toBeGreaterThan(190);
  });
  it("keeps the top 56 bits of a /56 and spreads across its /64s", () => {
    const subnets = new Set<string>();
    for (let k = 0; k < 300; k++) {
      const a = randomAddressIn("2600:3c0a:e000:1b00::/56");
      expect(bits(a).slice(0, 56)).toBe(bits("2600:3c0a:e000:1b00::").slice(0, 56));
      subnets.add(bits(a).slice(56, 64));
    }
    expect(subnets.size).toBeGreaterThan(100);
  });
  it("defaults to /64 when no length is given", () => {
    expect(bits(randomAddressIn("2001:db8:1:2::")).slice(0, 64)).toBe(bits("2001:db8:1:2::").slice(0, 64));
  });
});

describe("resolvePrefixFrom — IPV6_PREFIX", () => {
  const ifaces = { eth0: [{ family: "IPv6", internal: false, address: "2600:3c06::2000:e4ff:feaf:ca7d" }] };
  it("auto: the routed range anyip.sh wrote", () => {
    expect(resolvePrefixFrom("auto", "2600:3c06:e003:c900::/56\n", ifaces)).toBe("2600:3c06:e003:c900::/56");
  });
  it("auto without a routed range: no IPv6 egress, never the SLAAC address's /64 (not routed on Linode; 2026-11-17)", () => {
    expect(resolvePrefixFrom("auto", null, ifaces)).toBe("");
    expect(resolvePrefixFrom("auto", "garbage", ifaces)).toBe("");
  });
  it("interface: the /64 of the first global address (Hetzner)", () => {
    expect(resolvePrefixFrom("interface", null, { eth0: [{ family: "IPv6", internal: false, address: "2a01:4f8:1c1b:abcd::1" }] })).toBe("2a01:04f8:1c1b:abcd::/64");
  });
  it("anything else as written", () => {
    expect(resolvePrefixFrom("2600:3c0a:e000:1b::/56", null, ifaces)).toBe("2600:3c0a:e000:1b::/56");
    expect(resolvePrefixFrom("", "2600:3c06:e003:c900::/56", ifaces)).toBe("");
  });
});

describe("prefixFromInterfaces", () => {
  it("returns the /64 of the first global address and ignores link-local / ULA / internal", () => {
    expect(
      prefixFromInterfaces({
        lo: [{ family: "IPv6", internal: true, address: "::1" }],
        eth0: [
          { family: "IPv6", internal: false, address: "fe80::1" },
          { family: "IPv6", internal: false, address: "fd00::5" },
          { family: "IPv6", internal: false, address: "2a01:4f8:1c1b:abcd::1" },
        ],
      }),
    ).toBe("2a01:04f8:1c1b:abcd::/64");
    expect(prefixFromInterfaces({ eth0: [{ family: "IPv4", internal: false, address: "10.0.0.1" }] })).toBe("");
  });
});
