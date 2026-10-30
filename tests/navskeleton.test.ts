import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { skeletonKind } from "@/components/ui/RouteSkeletons";

describe("navigation skeletons", () => {
  it("maps every public route to its skeleton", () => {
    expect(skeletonKind("/")).toBe("home");
    expect(skeletonKind("/stores")).toBe("hub");
    expect(skeletonKind("/stores/california")).toBe("state");
    expect(skeletonKind("/stores/new-york/new-york")).toBe("city");
    expect(skeletonKind("/stores/new-york/new-york/fifthavenue")).toBe("store");
    expect(skeletonKind("/stock/iphone-duo")).toBe("product");
    expect(skeletonKind("/stock/iphone-duo/california/los-angeles")).toBe("product");
    expect(skeletonKind("/map")).toBe("map");
    expect(skeletonKind("/restocks")).toBe("restocks");
    expect(skeletonKind("/install")).toBe("install");
    expect(skeletonKind("/pricing")).toBeNull();
    expect(skeletonKind("/account")).toBeNull();
  });

  it("keeps loading.tsx off public routes, so the first load streams the page itself", () => {
    // A route-level loading.tsx wraps the first server render in Suspense: the HTML then opens with a
    // skeleton and the real content sits in a hidden block until a script swaps it in. That delayed the
    // LCP paint and hid the copy from crawlers that do not run JavaScript. Private areas may keep theirs.
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) walk(p);
        else if (e === "loading.tsx") found.push(relative(join(process.cwd(), "src", "app"), p));
      }
    };
    walk(join(process.cwd(), "src", "app"));
    expect(found.filter((f) => !/^(account|admin|\(panel\)|checkout)/.test(f) && !f.startsWith("admin/"))).toEqual([]);
  });
});
