#!/usr/bin/env node
/**
 * IndexNow (Bing, Yandex, Seznam, Naver...): push every sitemap URL, or the URLs given as arguments.
 * The key is public by design: it is served at https://pickupchecker.com/15c8b6ceb658e293c7d8f72f54d857ad.txt.
 *   node scripts/indexnow.mjs                 # every URL in the live sitemap
 *   node scripts/indexnow.mjs /stores/texas   # just these paths
 */
const HOST = "pickupchecker.com";
const KEY = "15c8b6ceb658e293c7d8f72f54d857ad";
const base = `https://${HOST}`;
let urls = process.argv.slice(2).map((p) => (p.startsWith("http") ? p : base + p));
if (urls.length === 0) {
  const xml = await (await fetch(`${base}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
for (let i = 0; i < urls.length; i += 10000) {
  const urlList = urls.slice(i, i + 10000);
  const r = await fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${base}/${KEY}.txt`, urlList }) });
  console.log(`IndexNow ${urlList.length} URLs → ${r.status} ${r.statusText}`, (await r.text()).slice(0, 200));
}
