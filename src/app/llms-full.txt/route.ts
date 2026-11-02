import { llmsFullTxt } from "@/lib/content/llms";

export const dynamic = "force-dynamic";

/** llms-full.txt: llms.txt plus every Apple Store's restock pattern (local hour, weekday, counts, last restock). */
export async function GET() {
  return new Response(await llmsFullTxt(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
