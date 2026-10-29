import type { Metadata } from "next";
import Link from "next/link";
import { statesWithStores } from "@/lib/apple/catalog";

export const metadata: Metadata = {
  title: "Apple Stores in the US by state — iPhone pickup stock",
  description: "All 269 US Apple Stores grouped by state, each with live iPhone 18 Pro, Pro Max and Duo in-store pickup availability.",
  alternates: { canonical: "/stores" },
};

export default function StoresIndex() {
  const states = statesWithStores();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="display text-3xl sm:text-5xl">Apple Stores by state</h1>
      <p className="mt-3 max-w-2xl text-ink-2">{states.reduce((n, s) => n + s.count, 0)} stores across {states.length} states and territories. Open a state to see live pickup stock per store.</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {states.map((s) => (
          <li key={s.slug}>
            <Link href={`/stores/${s.slug}`} className="pane-2 pane-hover flex items-center justify-between px-4 py-3">
              <span className="font-medium">{s.name}</span>
              <span className="text-sm text-ink-3">{s.count} store{s.count > 1 ? "s" : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
