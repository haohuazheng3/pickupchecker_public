import { describe, expect, it } from "vitest";
import { afterSignInPath, signedInFromCookie } from "@/lib/signInRoute";

describe("where the sign-in page sends someone (lib/signInRoute.ts)", () => {
  it("someone who has paid goes to their account", () => {
    expect(afterSignInPath({ home: "/", paid: true })).toBe("/account");
    expect(afterSignInPath({ next: "/account", home: "/", paid: true })).toBe("/account");
  });
  it("someone who never paid goes to the alert setup on the home they came from", () => {
    expect(afterSignInPath({ home: "/", paid: false })).toBe("/#notify");
    expect(afterSignInPath({ next: "/account", home: "/", paid: false })).toBe("/#notify");
    expect(afterSignInPath({ home: "/uk", paid: false })).toBe("/uk#notify");
  });
  it("keeps another page it was asked to return to, and never leaves the site", () => {
    expect(afterSignInPath({ next: "/install", home: "/", paid: false })).toBe("/install");
    expect(afterSignInPath({ next: "/pricing", home: "/", paid: true })).toBe("/pricing");
    expect(afterSignInPath({ next: "//evil.example", home: "/", paid: true })).toBe("/account");
    expect(afterSignInPath({ next: "https://evil.example", home: "/", paid: false })).toBe("/#notify");
    expect(afterSignInPath({ home: "/stock/iphone-duo", paid: false })).toBe("/#notify");
  });
  it("reads Clerk's signed-in cookie", () => {
    expect(signedInFromCookie("")).toBe(false);
    expect(signedInFromCookie("pc_consent=1; __client_uat=0; __client_uat_AbC=0")).toBe(false);
    expect(signedInFromCookie("__client_uat=0; __client_uat_AbC=1793662896")).toBe(true);
    expect(signedInFromCookie("a=1; __client_uat=1793662896")).toBe(true);
  });
});
