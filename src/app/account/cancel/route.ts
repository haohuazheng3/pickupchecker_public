import { NextResponse, type NextRequest } from "next/server";

/**
 * A direct link to the plan's cancel step (once the "Cancel anytime" link in alert emails, which no longer exist; old emails still point here). A path of its own because signing in on the way (proxy → ?next=)
 * keeps the path and drops a query; here the account opens on the plan with its cancel step showing.
 */
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/account?cancel=1#plan", req.url));
}
