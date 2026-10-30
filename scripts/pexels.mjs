#!/usr/bin/env node
/**
 * Pexels photos for the guides, self-hosted. The API key comes from the environment (PEXELS_API_KEY),
 * never from a file in the repo.
 *
 *   node scripts/pexels.mjs search "<query>" <outDir>      → contact sheet + candidates.json (no files kept in the repo)
 *   node scripts/pexels.mjs fetch <pexelsId> <id> <group> "<alt>" ["<caption>"]
 *        → public/img/<group>/<id>-{480,800,1200}.webp and an entry in src/content/images.json
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = process.env.PEXELS_API_KEY;
if (!KEY) { console.error("PEXELS_API_KEY is not set"); process.exit(1); }
const WIDTHS = [480, 800, 1200];

async function api(path) {
  const r = await fetch(`https://api.pexels.com/v1/${path}`, { headers: { Authorization: KEY } });
  if (!r.ok) throw new Error(`pexels ${path}: ${r.status}`);
  return r.json();
}

async function buf(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${url}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function search(query, outDir) {
  mkdirSync(outDir, { recursive: true });
  const res = await api(`search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`);
  const list = res.photos.map((p) => ({ id: p.id, w: p.width, h: p.height, by: p.photographer, url: p.url, alt: p.alt, thumb: p.src.medium }));
  writeFileSync(join(outDir, "candidates.json"), JSON.stringify(list, null, 1));
  // Contact sheet: 5 columns, numbered tiles.
  const tiles = await Promise.all(list.map(async (p, i) => {
    const img = await sharp(await buf(p.thumb)).resize(300, 200, { fit: "cover" }).toBuffer();
    const label = Buffer.from(`<svg width="300" height="200"><rect x="0" y="0" width="44" height="30" fill="black" opacity="0.75"/><text x="8" y="22" font-size="20" font-family="Arial" fill="white">${i}</text></svg>`);
    return sharp(img).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer();
  }));
  const cols = 5, rows = Math.ceil(tiles.length / cols);
  const sheet = sharp({ create: { width: cols * 300, height: rows * 200, channels: 3, background: "#ffffff" } })
    .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * 300, top: Math.floor(i / cols) * 200 })));
  await sheet.jpeg({ quality: 70 }).toFile(join(outDir, "sheet.jpg"));
  for (const [i, p] of list.entries()) console.log(i, p.id, `${p.w}x${p.h}`, p.by, "|", p.alt);
}

async function fetchOne(pexelsId, id, group, alt, caption) {
  const p = await api(`photos/${pexelsId}`);
  const original = await buf(p.src.large2x || p.src.original);
  const dir = join(ROOT, "public", "img", group);
  mkdirSync(dir, { recursive: true });
  // 3:2 frame, centred: consistent figures, no layout shift.
  let width = 0, height = 0;
  for (const w of WIDTHS) {
    const h = Math.round((w * 2) / 3);
    const info = await sharp(original).resize(w, h, { fit: "cover", position: "attention" }).webp({ quality: w >= 1200 ? 68 : 72 }).toFile(join(dir, `${id}-${w}.webp`));
    width = w; height = h;
    console.log(`${id}-${w}.webp ${Math.round(info.size / 1024)} KB`);
  }
  const file = join(ROOT, "src", "content", "images.json");
  const list = JSON.parse(readFileSync(file, "utf8")).filter((x) => x.id !== id);
  list.push({ id, base: `/img/${group}/${id}`, widths: WIDTHS, width, height, alt, ...(caption ? { caption } : {}), credit: p.photographer, creditUrl: p.url, pexelsId: Number(pexelsId) });
  list.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(file, JSON.stringify(list, null, 1) + "\n");
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "search") await search(args[0], args[1]);
else if (cmd === "fetch") await fetchOne(args[0], args[1], args[2], args[3], args[4]);
else { console.error("usage: search <query> <outDir> | fetch <pexelsId> <id> <group> <alt> [caption]"); process.exit(1); }
