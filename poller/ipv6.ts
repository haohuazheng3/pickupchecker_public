/** IPv6 helpers for the rotating egress (pure, no side effects — see tests/ipv6.test.ts). */
import { randomBytes } from "node:crypto";

/** "2600:3c0a::1" → "2600:3c0a:0000:0000:0000:0000:0000:0001" */
export function expandV6(a: string): string {
  const [head, tail = ""] = a.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const fill = Array(8 - h.length - t.length).fill("0");
  return [...h, ...fill, ...t].map((x) => x.padStart(4, "0")).join(":");
}

/** Keep the top `len` bits of `prefix` ("2600:3c0a:e000:1b::/56"), randomise the rest; never the all-zero host (anycast). */
export function randomAddressIn(prefix: string): string {
  const [base, lenStr] = prefix.split("/");
  const len = Math.min(128, Math.max(0, Number(lenStr ?? 64) || 64));
  const bytes = Buffer.from(expandV6(base).replace(/:/g, ""), "hex");
  const rnd = randomBytes(16);
  for (let bit = len; bit < 128; bit++) {
    const i = bit >> 3, m = 0x80 >> (bit & 7);
    if (rnd[i] & m) bytes[i] |= m; else bytes[i] &= ~m;
  }
  let zero = true;
  for (let bit = len; bit < 128 && zero; bit++) if (bytes[bit >> 3] & (0x80 >> (bit & 7))) zero = false;
  if (zero) bytes[15] |= 1;
  return (bytes.toString("hex").match(/.{4}/g) as string[]).map((x) => x.replace(/^0+/, "") || "0").join(":");
}

/** The /64 of the first global IPv6 address on any interface (Hetzner: the whole /64 is routed to the host). */
export function prefixFromInterfaces(ifaces: Record<string, { family: string; internal: boolean; address: string }[] | undefined>): string {
  for (const list of Object.values(ifaces)) {
    for (const i of list ?? []) {
      if (i.family === "IPv6" && !i.internal && !i.address.startsWith("fe80") && !i.address.startsWith("fc") && !i.address.startsWith("fd")) {
        return `${expandV6(i.address).split(":").slice(0, 4).join(":")}::/64`;
      }
    }
  }
  return "";
}
