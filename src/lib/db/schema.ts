/**
 * PickupChecker database schema (Neon Postgres, Drizzle).
 *
 * Writes are idempotent everywhere (no interactive transactions over the HTTP driver):
 * unique keys + ON CONFLICT, conditional UPDATEs, and "unknown ≠ unavailable" states.
 */
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  bigserial,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/* ------------------------------------------------------------------ platform */

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  email: text("email").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: ts("created_at").notNull().defaultNow(),
  lastSeenAt: ts("last_seen_at"),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(), // Stripe subscription id
    userId: text("user_id").notNull().references(() => users.id),
    model: text("model").notNull().default("all"), // legacy per-model plans; "all" since the alert-count plans
    plan: text("plan").notNull().default("plus"), // plus ($5, 10 alerts) | pro ($10, 20 alerts)
    alertLimit: integer("alert_limit").notNull().default(10),
    status: text("status").notNull(), // active | trialing | past_due | canceled | incomplete | unpaid
    priceId: text("price_id"),
    currentPeriodEnd: ts("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId)],
);

/** One alert rule: a model with storage/color filters and a store set. */
export const watches = pgTable(
  "watches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    subscriptionId: text("subscription_id").references(() => subscriptions.id),
    model: text("model").notNull(),
    storages: jsonb("storages").$type<string[]>().notNull().default([]), // [] = any
    colors: jsonb("colors").$type<string[]>().notNull().default([]), // [] = any
    storeNumbers: jsonb("store_numbers").$type<string[]>().notNull().default([]), // [] = all US
    zip: text("zip"),
    radiusMiles: integer("radius_miles"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    active: boolean("active").notNull().default(true),
    paused: boolean("paused").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("watches_user_idx").on(t.userId), index("watches_model_idx").on(t.model)],
);

/**
 * Web Push subscriptions (one row per browser/installed app). Alerts go to every enabled device of
 * the watch's owner; a 404/410 from the push service disables the row instead of deleting it so the
 * account page can explain why a phone stopped receiving alerts.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    platform: text("platform").notNull().default("unknown"), // ios | android | desktop | unknown
    standalone: boolean("standalone").notNull().default(false), // installed to the Home Screen
    userAgent: text("user_agent"),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    lastSentAt: ts("last_sent_at"),
    disabledAt: ts("disabled_at"),
    lastError: text("last_error"),
  },
  (t) => [uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint), index("push_subscriptions_user_idx").on(t.userId)],
);

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: ts("received_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ stock */

export const stores = pgTable(
  "stores",
  {
    storeNumber: text("store_number").primaryKey(), // "R032"
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(), // full name, e.g. "New York"
    stateCode: text("state_code").notNull(), // "NY"
    postalCode: text("postal_code"),
    street: text("street"),
    phone: text("phone"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    timezone: text("timezone"),
    hours: jsonb("hours").$type<{ days: string[]; opens: string | null; closes: string | null }[]>(),
    image: text("image"),
    url: text("url"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("stores_state_idx").on(t.stateCode)],
);

export const skus = pgTable("skus", {
  partNumber: text("part_number").primaryKey(), // "MJQ34LL/A"
  sku: text("sku").notNull(), // "MJQ34"
  model: text("model").notNull(), // "18-pro"
  modelName: text("model_name").notNull(), // "iPhone 18 Pro"
  storage: text("storage").notNull(),
  color: text("color").notNull(),
  priceUsd: doublePrecision("price_usd"),
  active: boolean("active").notNull().default(true),
});

/** Current state per (store, sku). status: available | unavailable | unknown */
export const storeSkuStatus = pgTable(
  "store_sku_status",
  {
    storeNumber: text("store_number").notNull(),
    partNumber: text("part_number").notNull(),
    status: text("status").notNull().default("unknown"),
    quote: text("quote"), // Apple's pickupSearchQuote, e.g. "Available Today"
    since: ts("since"), // when the current status began
    lastCheckedAt: ts("last_checked_at"),
    lastChangedAt: ts("last_changed_at"),
    lastAvailableAt: ts("last_available_at"),
    // An observed change waiting for confirmation (stock/ingest.ts CONFIRM): one response never flips a status alone.
    pendingStatus: text("pending_status"),
    pendingSince: ts("pending_since"),
    pendingSeen: integer("pending_seen").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.storeNumber, t.partNumber] }),
    index("sss_part_status_idx").on(t.partNumber, t.status),
    index("sss_last_available_idx").on(t.lastAvailableAt),
  ],
);

/** Every transition. kind: restock (→available) | soldout (→unavailable) */
export const availabilityEvents = pgTable(
  "availability_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    storeNumber: text("store_number").notNull(),
    partNumber: text("part_number").notNull(),
    kind: text("kind").notNull(),
    quote: text("quote"),
    at: ts("at").notNull().defaultNow(),
    sweepId: text("sweep_id"),
    notifiedAt: ts("notified_at"),
    /** unknown → available: the first time we ever saw the pair, not a real restock (excluded from feeds/stats). */
    firstSeen: boolean("first_seen").notNull().default(false),
  },
  (t) => [index("events_at_idx").on(t.at), index("events_part_idx").on(t.partNumber, t.at), index("events_store_idx").on(t.storeNumber, t.at)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    watchId: text("watch_id").notNull(),
    userId: text("user_id").notNull(),
    eventId: integer("event_id"),
    storeNumber: text("store_number").notNull(),
    partNumber: text("part_number").notNull(),
    channel: text("channel").notNull().default("email"), // email | push
    status: text("status").notNull(), // sent | failed | skipped
    providerId: text("provider_id"),
    error: text("error"),
    latencyMs: integer("latency_ms"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.createdAt),
    uniqueIndex("notifications_dedupe_idx").on(t.watchId, t.eventId),
  ],
);

/* ------------------------------------------------------------------ poller observability */

/** One row per Apple request. */
export const pollLog = pgTable(
  "poll_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    at: ts("at").notNull().defaultNow(),
    sweepId: text("sweep_id"),
    egress: text("egress").notNull(), // ipv6:<addr> | vercel | cloudflare | local
    anchor: text("anchor").notNull(), // zip
    batch: integer("batch").notNull(),
    httpStatus: integer("http_status"),
    ok: boolean("ok").notNull(),
    durationMs: integer("duration_ms"),
    bytes: integer("bytes"),
    storesSeen: integer("stores_seen"),
    error: text("error"),
  },
  (t) => [index("poll_log_at_idx").on(t.at), index("poll_log_ok_idx").on(t.ok, t.at)],
);

/** One row per sweep (a full pass over all anchors × batches). */
export const sweeps = pgTable(
  "sweeps",
  {
    id: text("id").primaryKey(),
    startedAt: ts("started_at").notNull(),
    finishedAt: ts("finished_at"),
    mode: text("mode").notNull(), // full | degraded
    host: text("host").notNull(),
    requests: integer("requests").notNull().default(0),
    failures: integer("failures").notNull().default(0),
    storesCovered: integer("stores_covered").notNull().default(0),
    transitions: integer("transitions").notNull().default(0),
    durationMs: integer("duration_ms"),
  },
  (t) => [index("sweeps_started_idx").on(t.startedAt)],
);

/** Heartbeat + egress health, keyed by name. */
export const pollerState = pgTable("poller_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Error inbox: grouped by fingerprint. */
export const errorGroups = pgTable(
  "error_groups",
  {
    fingerprint: text("fingerprint").primaryKey(),
    source: text("source").notNull(), // web | poller | worker
    message: text("message").notNull(),
    sample: jsonb("sample").$type<Record<string, unknown>>(),
    count: integer("count").notNull().default(1),
    firstSeenAt: ts("first_seen_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    resolvedAt: ts("resolved_at"),
  },
  (t) => [index("error_groups_last_idx").on(t.lastSeenAt)],
);

/**
 * Operational events worth keeping (poller start/stop/mode switches, throttling, watchdog ticks,
 * admin logins, deploys). Low volume; the admin "Logs" page and the 24 h health strips read it.
 */
export const opsLog = pgTable(
  "ops_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    at: ts("at").notNull().defaultNow(),
    source: text("source").notNull(), // poller | web | cron | worker
    level: text("level").notNull().default("info"), // debug | info | warn | error
    message: text("message").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
  },
  (t) => [index("ops_log_at_idx").on(t.at), index("ops_log_source_idx").on(t.source, t.at)],
);

export const contactMessages = pgTable("contact_messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  ip: text("ip"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** test@pickupchecker.com inbox (Cloudflare Email Routing → worker → /api/inbox/ingest). */
export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    to: text("to").notNull(),
    from: text("from").notNull(),
    subject: text("subject"),
    text: text("text"),
    html: text("html"),
    headers: jsonb("headers").$type<Record<string, string>>(),
    auth: jsonb("auth").$type<{ spf?: string; dkim?: string; dmarc?: string }>(),
    receivedAt: ts("received_at").notNull().defaultNow(),
  },
  (t) => [index("inbox_received_idx").on(t.receivedAt)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: ts("reset_at").notNull(),
});

export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});
