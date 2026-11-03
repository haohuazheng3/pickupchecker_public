import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { adminTokenFrom, verifyAdminToken } from "@/lib/admin/session";
import { publicRouteCheck } from "@/lib/seo/routes";
import { APP_LOCALE_HEADER, LANG_COOKIE, LOCALE_HEADER, isAppPath, localeFromSegment, nativeLocale, signInHome } from "@/lib/i18n/locales";

const isProtected = createRouteMatcher(["/account", "/account/(.*)", "/checkout/success", "/checkout/success/(.*)"]);
const isAdmin = createRouteMatcher(["/admin", "/admin/(.*)", "/api/admin/(.*)"]);
const isAdminPublic = createRouteMatcher(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

/**
 * Clerk session handling for every non-static route. Admin routes need the password session
 * cookie (or a whitelisted Clerk email); otherwise pages go to /admin/login and APIs get 401.
 * Internal .md files never exist as routes (404 by Next).
 */
export default clerkMiddleware(async (auth, req) => {
  const check = publicRouteCheck(req.nextUrl.pathname, req.nextUrl.search);
  // Languages (docs/i18n.md §6): a native tree (/ja-jp/…) is its language, an app page the person's (cookie),
  // everything else English. The root layout reads the result for <html lang>, the header and the footer.
  const seg = req.nextUrl.pathname.split("/")[1];
  // The Home Screen app starts at /account?lang=ja-jp (manifest): its first launch has no cookie of its own yet.
  const asked = isAppPath(req.nextUrl.pathname) ? req.nextUrl.searchParams.get("lang") : null;
  const native = nativeLocale(seg) ?? (asked && !req.cookies.get(LANG_COOKIE) ? nativeLocale(asked) : undefined);
  const person = native ?? nativeLocale(req.cookies.get(LANG_COOKIE)?.value);
  const page = (nativeLocale(seg) ?? undefined) ?? (isAppPath(req.nextUrl.pathname) ? person : undefined) ?? localeFromSegment(seg);
  const withLang = (res: NextResponse) => {
    // Opening a page in a language makes it the person's language for the app pages (and their sign-in).
    if (native && req.cookies.get(LANG_COOKIE)?.value !== native.id) res.cookies.set(LANG_COOKIE, native.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  };
  const langHeaders = (h = new Headers(req.headers)) => {
    h.set(LOCALE_HEADER, page?.id || "en");
    h.set(APP_LOCALE_HEADER, person?.id ?? "en");
    return h;
  };
  if (check) {
    if ("redirect" in check) return NextResponse.redirect(new URL(check.redirect, req.url), 308);
    // Two segments: no route matches it (a single one would match another country's /[cc] home).
    return NextResponse.rewrite(new URL("/__not_found__/404", req.url), { status: 404, request: { headers: langHeaders() } });
  }
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
    const h = langHeaders();
    h.set("x-pathname", req.nextUrl.pathname);
    return NextResponse.next({ request: { headers: h } });
  }
  if (isProtected(req)) {
    // The success page means nothing without its Checkout session (a Home Screen app saved from it opens it bare): after signing in, the account.
    const back = req.nextUrl.pathname.startsWith("/checkout/success") ? "/account" : req.nextUrl.pathname;
    // Sign-in happens on the home page of the person's language (/ja-jp?signin=1), English: the US home.
    await auth.protect({ unauthenticatedUrl: new URL(`${signInHome(person)}?signin=1&next=${encodeURIComponent(back)}`, req.url).toString() });
  }
  if (req.nextUrl.pathname.startsWith("/api/")) return;
  return withLang(NextResponse.next({ request: { headers: langHeaders() } }));
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml|mjs)).*)", "/(api|trpc)(.*)", "/stock/:path*", "/stores/:path*", "/:cc/stock/:path*", "/:cc/stores/:path*"],
};
