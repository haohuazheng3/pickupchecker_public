import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import { userPlan } from "@/lib/billing";
import { logOps } from "@/lib/ops";
import { ASKED_META, SKIPPED, cleanDetail, deviceOf, isSourceAnswer } from "@/lib/survey/sources";
import { recordSource } from "@/lib/survey/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The dashboard's one-time "where did you hear about us" (SourceSurvey): `{ source, detail, lang, standalone }`,
 * where source is a SOURCES id or "skipped" (closed with the X) and detail what they typed after Other. The answer
 * goes to Neon first; only once it is stored does the account get the Clerk flag that stops the question on every
 * device. If Neon cannot take it, the flag is left off (another device may ask again) and this browser still never
 * asks again (it set its own flag).
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { source?: unknown; detail?: unknown; lang?: unknown; standalone?: unknown } | null;
  const source = body?.source;
  if (!isSourceAnswer(source)) return NextResponse.json({ error: "unknown source" }, { status: 400 });
  if (!env.surveyDatabaseUrl()) return NextResponse.json({ error: "survey off" }, { status: 503 });

  const detail = source === "other" ? cleanDetail(body?.detail) : null;
  const lang = typeof body?.lang === "string" && /^[A-Za-z]{2}(-[A-Za-z]{2})?$/.test(body.lang) ? body.lang : null;
  const country = req.headers.get("x-vercel-ip-country")?.slice(0, 2) || null;
  const device = deviceOf(req.headers.get("user-agent") ?? "", body?.standalone === true);
  const plan = await userPlan(userId).then((p) => p.plan.key, () => null); // context only; never blocks the answer

  let result: "saved" | "already";
  try {
    result = await recordSource({ userId, source, detail, plan, lang, country, device });
  } catch (e) {
    await logOps("web", "error", "source survey: answer not stored in Neon", { source, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "not stored" }, { status: 503 });
  }
  try {
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, { publicMetadata: { [ASKED_META]: source === SKIPPED ? "skipped" : "answered" } });
  } catch (e) {
    // Stored all the same; a later dashboard on another device asks once more and lands here as "already".
    await logOps("web", "warn", "source survey: Clerk flag not set", { error: e instanceof Error ? e.message : String(e) });
  }
  return NextResponse.json({ ok: true, stored: result });
}
