import type { Metadata } from "next";
import Link from "next/link";
import { allPosts } from "@/lib/blog";
export const metadata: Metadata = { title: "Blog — iPhone pickup stock guides", description: "Guides on finding iPhone 18 Pro, Pro Max and Duo in-store pickup stock at Apple Stores.", alternates: { canonical: "/blog" } };
export default function Blog() {
  const posts = allPosts();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <h1 className="display text-3xl sm:text-5xl">Blog</h1>
      <p className="mt-4 text-ink-2">Short, practical guides on getting an iPhone from a store instead of waiting weeks for shipping.</p>
      <ul className="mt-8 space-y-3">
        {posts.map((p) => (
          <li key={p.slug}><Link href={`/blog/${p.slug}`} className="pane-2 pane-hover block p-5"><div className="text-xs text-ink-3">{p.date}</div><div className="mt-1 text-lg font-semibold">{p.title}</div><p className="mt-1 text-ink-2">{p.description}</p></Link></li>
        ))}
        {posts.length === 0 && <li className="text-ink-3">First posts coming soon.</li>}
      </ul>
    </div>
  );
}
