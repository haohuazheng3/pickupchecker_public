import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtected = createRouteMatcher(["/account(.*)", "/checkout/success(.*)"]);
const isAdmin = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

/**
 * Clerk session handling for every non-static route. Admin routes 404 for everyone who is not
 * in ADMIN_EMAILS (the page checks again). Internal .md files never exist as routes (404 by Next).
 */
export default clerkMiddleware(async (auth, req) => {
  if (isAdmin(req)) {
    const { userId, sessionClaims } = await auth();
    const email = String((sessionClaims as { email?: string } | null)?.email ?? "").toLowerCase();
    const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!userId || (email && !admins.includes(email))) {
      // Unknown email in the token (no custom claim): let the page decide via currentUser(); otherwise 404.
      if (!userId || email) return NextResponse.rewrite(new URL("/not-found-404", req.url), { status: 404 });
    }
  }
  if (isProtected(req)) await auth.protect({ unauthenticatedUrl: new URL(`/?signin=1&next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url).toString() });
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml)).*)", "/(api|trpc)(.*)"],
};
