/**
 * Fingerprint of the code the poller runs: the files poller/deps.json lists (its import graph, made by
 * scripts/poller-deps.mjs) and the dependency versions in package.json. The site computes it at build time
 * (next.config.ts → /api/health and the admin board) and the poller at start-up (heartbeat), so "is the poller
 * behind?" compares the code it actually runs, not commits that only touched pages or docs. The host's
 * auto-update (infra/linode autoupdate.sh) updates when the two differ.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

/** 12 hex characters; throws when deps.json or a listed file is missing. */
export function pollerCodeHash(root = process.cwd()) {
  const files = JSON.parse(readFileSync(path.join(root, "poller/deps.json"), "utf8"));
  const h = createHash("sha256");
  for (const f of files) h.update(`${f}\0`).update(readFileSync(path.join(root, f))).update("\0");
  // Versions, not package-lock.json: an install may rewrite the lockfile, which would make the build's hash drift.
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  h.update(JSON.stringify(Object.entries(pkg.dependencies ?? {}).sort(([a], [b]) => a.localeCompare(b))));
  return h.digest("hex").slice(0, 12);
}
