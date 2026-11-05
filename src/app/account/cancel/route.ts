import { NextResponse, type NextRequest } from "next/server";

/**
 * The alert email's "Cancel anytime" link. A path of its own because signing in on the way (proxy → ?next=)
 * keeps the path and drops a query; here the account opens on the plan with its cancel step showing.
 */
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/account?cancel=1#plan", req.url));
}
