#!/usr/bin/env node
/**
 * Writes poller/deps.json: the repository files the poller runs — the import graph of poller/main.ts,
 * packages excluded — which poller/codeHash.mjs fingerprints. Run after changing what the poller imports:
 *   node scripts/poller-deps.mjs
 * (tests/poller-deps.test.ts fails while the list is stale.)
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

export async function pollerDeps(root = process.cwd()) {
  const r = await build({
    entryPoints: [path.join(root, "poller/main.ts")],
    absWorkingDir: root,
    bundle: true, platform: "node", format: "esm", write: false, metafile: true, logLevel: "silent",
    tsconfig: path.join(root, "tsconfig.json"),
    // Packages and node: builtins stay out; "@/…" is this repo (tsconfig paths).
    plugins: [{ name: "repo-only", setup(b) { b.onResolve({ filter: /^[^./]/ }, (a) => (a.path.startsWith("@/") ? undefined : { path: a.path, external: true })); } }],
  });
  return Object.keys(r.metafile.inputs).map((p) => p.split(path.sep).join("/")).sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = await pollerDeps();
  writeFileSync("poller/deps.json", `${JSON.stringify(files, null, 2)}\n`);
  console.log(`poller/deps.json: ${files.length} files`);
}
