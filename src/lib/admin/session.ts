/**
 * Admin session = an HMAC-signed expiry, nothing else (no user id: there is one password).
 * Web Crypto only, so the same code runs in the proxy and in route handlers.
 */
export const ADMIN_COOKIE = "pc_admin";
export const ADMIN_TTL_SEC = 30 * 24 * 3600;

function b64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}

export async function signAdminToken(secret: string, now = Date.now()): Promise<string> {
  const exp = String(Math.floor(now / 1000) + ADMIN_TTL_SEC);
  return `${exp}.${await hmac(secret, exp)}`;
}

export async function verifyAdminToken(token: string | undefined | null, secret: string, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) * 1000 < now) return false;
  const expected = await hmac(secret, exp);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

/** Reads the cookie off a Request (proxy / route handlers). */
export function adminTokenFrom(req: Request): string | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function safeEqualStr(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
