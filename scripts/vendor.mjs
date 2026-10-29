#!/usr/bin/env node
/**
 * Copies static assets that must be served from our own origin out of node_modules:
 *  - MapLibre's module worker (v6 resolves it next to the main module, which bundlers rewrite).
 * Runs before `next build`; the output is committed so `next dev` works without it.
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "node_modules/maplibre-gl/package.json"), "utf8"));
const out = join(root, "public/vendor");
mkdirSync(out, { recursive: true });
copyFileSync(join(root, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs"), join(out, "maplibre-gl-worker.mjs"));
console.log(`[vendor] maplibre-gl-worker.mjs ${pkg.version} → public/vendor/`);
