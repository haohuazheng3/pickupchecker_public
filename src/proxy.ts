import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { adminTokenFrom, verifyAdminToken } from "@/lib/admin/session";

const isProtected = createRouteMatcher(["/account", "/account/(.*)", "/checkout/success", "/checkout/success/(.*)"]);
const isAdmin = createRouteMatcher(["/admin", "/admin/(.*)", "/api/admin/(.*)"]);
const isAdminPublic = createRouteMatcher(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

/**
 * Clerk session handling for every non-static route. Admin routes need the password session
 * cookie (or a whitelisted Clerk email); otherwise pages go to /admin/login and APIs get 401.
 * Internal .md files never exist as routes (404 by Next).
 */
export default clerkMiddleware(async (auth, req) => {
  if (isAdmin(req) && !isAdminPublic(req)) {
    const ok = await verifyAdminToken(adminTokenFrom(req), process.env.ADMIN_SESSION_SECRET ?? "");
    if (!ok) {
      const { userId, sessionClaims } = await auth();
      const email = String((sessionClaims as { email?: string } | null)?.email ?? "").toLowerCase();
      const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      const clerkOk = Boolean(userId) && (email ? admins.includes(email) : true); // no email claim → the page re-checks via currentUser()
      if (!clerkOk) {
        if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        return NextResponse.redirect(new URL(`/admin/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url));
      }
    }
    // The layout reads this to build the login redirect / active tab.
    const h = new Headers(req.headers);
    h.set("x-pathname", req.nextUrl.pathname);
    return NextResponse.next({ request: { headers: h } });
  }
  if (isProtected(req)) await auth.protect({ unauthenticatedUrl: new URL(`/?signin=1&next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url).toString() });
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml|mjs)).*)", "/(api|trpc)(.*)"],
};
