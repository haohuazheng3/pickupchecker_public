# PickupChecker

A notification on your phone the moment an iPhone 18 Pro, iPhone 18 Pro Max or iPhone Duo is
available for **in-store pickup** at any of the 269 Apple Stores in the United States. One $5/month
subscription per model; every store is re-checked around the clock. Alerts are Web Push from the
installable Home Screen app (`/install` walks the user through it); email is the fallback when no
device has notifications on. `/map` shows every store on a live map.

Live at <https://pickupchecker.com>. Independent service, not affiliated with Apple Inc.

## How it works

* `poller/` — a Node process (Linode host, systemd) that asks apple.com's pickup availability for
  33 anchor ZIP codes × 2 part batches every 20 seconds (66 requests per sweep), binding a fresh
  IPv6 source address inside the host's /64 for every request (Apple throttles per address).
* `src/lib/stock/` — the shared engine: parse → diff against the last state → `restock` / `soldout`
  events → match active alerts → one alert per restock (Web Push to every enabled device via
  `src/lib/push`, else an email via Resend), with cool-downs and dedupe.
* `src/lib/push/` + `public/sw.js` + `src/app/manifest.ts` — the PWA: service worker (push,
  notification click, subscription rotation), VAPID keys (`VAPID_*`), install guide components.
* `src/app/` — the Next.js 16 site: live stock pages (public, SEO), the live map (`/map`, MapLibre +
  OpenFreeMap tiles, no key), the illustrated install guide (`/install`), a single-surface sign-up
  wizard (Clerk email code, custom UI), Stripe Checkout, account page with the notification switch
  and device list, admin dashboard with request logs, anchor freshness, errors, alerts and the test inbox.
* `/api/cron/watchdog` (Vercel Cron, every minute) switches to a serverless degraded mode and
  emails the owner when the poller's heartbeat stops; `infra/workers/mail` is the Cloudflare
  worker that receives test@ mail and probes `/api/health`.

## Run it yourself

```bash
cp .env.example .env.local   # fill in the values
npm install
npx web-push generate-vapid-keys   # → VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in .env.local
npm run db:migrate           # applies drizzle/*.sql
npm run seed                 # stores + SKUs from data/apple
npm run dev                  # site on http://localhost:3000
npm run poller               # one poller process (IPV6_PREFIX optional)
npm test                     # vitest
```

`npm run build` first runs `scripts/vendor.mjs`, which copies MapLibre's worker into `public/vendor/`
(MapLibre 6 looks for it next to its main module, which bundlers relocate).

`npm run poller` without `IPV6_PREFIX` uses the Vercel egress and is limited to about one request
per minute — fine for a smoke test, not for production. On the host it runs as a systemd service.

Deployment: GitHub Actions builds and uploads a prebuilt output to Vercel (`.github/workflows/deploy.yml`);
the host is provisioned with `infra/linode/provision.sh` (Linode, routed /56) — `infra/hetzner/provision.sh` is the
equivalent for a Hetzner /64 host.

## License

MIT — see `LICENSE`.
