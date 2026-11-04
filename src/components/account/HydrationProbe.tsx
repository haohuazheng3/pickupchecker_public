"use client";
/**
 * Account page only: when React reports a hydration mismatch (#418: the server and the browser wrote different
 * text, so React threw the server's HTML away and rendered the page again), tell FlowGlance where. The browser's
 * text is read at once (React has just rendered it; nothing has ticked yet), the server's from a fresh copy of the
 * page, and the first three text nodes that differ go out as `hydration_diff` (80 characters each). The listener is
 * set when this module loads, before hydration: an effect would run after React has already reported the error.
 */
import { track } from "@/lib/track";

/** The account page's wrapper (src/app/account/page.tsx); a string here, since a server page cannot read a client module's constants. */
const ACCOUNT_ROOT = "account-root";

function texts(root: Element | null): string[] {
  if (!root) return [];
  const out: string[] = [];
  const walk = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const tag = n.parentElement?.tagName;
    const v = n.nodeValue?.trim();
    if (v && tag !== "SCRIPT" && tag !== "STYLE" && tag !== "TEMPLATE") out.push(v);
  }
  return out;
}

if (typeof window !== "undefined") {
  let sent = false;
  window.addEventListener("error", (e) => {
    const msg = String(e.message || (e.error as Error | undefined)?.message || "");
    if (sent || !/Minified React error #4(18|23|25)\b/.test(msg) || !location.pathname.startsWith("/account")) return;
    sent = true;
    const client = texts(document.getElementById(ACCOUNT_ROOT));
    void fetch(location.href, { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.text())
      .then((html) => {
        const server = texts(new DOMParser().parseFromString(html, "text/html").getElementById(ACCOUNT_ROOT));
        const diffs: { i: number; server: string; client: string }[] = [];
        for (let i = 0; i < Math.max(server.length, client.length) && diffs.length < 3; i++) {
          if (server[i] !== client[i]) diffs.push({ i, server: (server[i] ?? "∅").slice(0, 80), client: (client[i] ?? "∅").slice(0, 80) });
        }
        track("hydration_diff", { code: msg.match(/#(\d+)/)?.[1], nodes: `${server.length}/${client.length}`, diffs: JSON.stringify(diffs) });
      })
      .catch(() => undefined);
  });
}

export function HydrationProbe() {
  return null;
}
