import { neon } from "@neondatabase/serverless";
import { env } from "@/lib/env";
import type { SourceAnswer } from "./sources";

export interface SourceRow {
  userId: string;
  source: SourceAnswer;
  /** What they typed after Other (cleanDetail), else null. */
  detail: string | null;
  plan: string | null;
  lang: string | null;
  country: string | null;
  device: string | null;
}

/**
 * One answer into Neon (`referral_sources`, scripts/survey-db.mjs), over Neon's HTTP endpoint: no pool to keep
 * in a serverless function, and nothing on the main database host. The first answer stands (ON CONFLICT DO
 * NOTHING; the role may not update). Neon's compute sleeps after 5 idle minutes, so the first query can take a
 * few seconds to wake it: three tries, 8 s each.
 */
export async function recordSource(row: SourceRow, site = "pickupchecker"): Promise<"saved" | "already"> {
  const url = env.surveyDatabaseUrl();
  if (!url) throw new Error("SURVEY_DATABASE_URL is not set");
  let last: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const sql = neon(url, { fetchOptions: { signal: AbortSignal.timeout(8000) } });
      const rows = await sql`
        insert into referral_sources (site, user_id, source, detail, plan, lang, country, device)
        values (${site}, ${row.userId}, ${row.source}, ${row.detail}, ${row.plan}, ${row.lang}, ${row.country}, ${row.device})
        on conflict (site, user_id) do nothing
        returning 1 as ok`;
      return rows.length ? "saved" : "already";
    } catch (e) {
      last = e;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw last;
}
