import { llmsTxt } from "@/lib/content/llms";

// Live numbers (siteFacts, cached an hour) — rendered per request and kept at the edge for an hour.
export const dynamic = "force-dynamic";

/** llms.txt (llmstxt.org): what this site is, its key facts, and the pages worth reading. */
export async function GET() {
  return new Response(await llmsTxt(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
