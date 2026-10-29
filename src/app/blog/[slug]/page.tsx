import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allPosts, postBySlug, renderMarkdown } from "@/lib/blog";
import { BrowseModels, BrowsePopular } from "@/components/seo/Browse";
import { RelatedBlock } from "@/components/seo/Related";

export function generateStaticParams() { return allPosts().map((p) => ({ slug: p.slug })); }
export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params; const p = postBySlug(slug);
  return p ? { title: p.title, description: p.description, alternates: { canonical: `/blog/${p.slug}` } } : {};
}
export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params; const p = postBySlug(slug);
  if (!p) notFound();
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: p.title, datePublished: p.date, author: { "@type": "Organization", name: "PickupChecker" }, publisher: { "@type": "Organization", name: "PickupChecker" } };
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="text-xs text-ink-3">{p.date}</div>
      <h1 className="display mt-1 text-3xl sm:text-5xl">{p.title}</h1>
      <div className="pane prose-site mt-8 p-6 sm:p-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
      <RelatedBlock title="Check stock now">
        <BrowseModels />
        <BrowsePopular states={8} cities={8} />
      </RelatedBlock>
    </div>
  );
}
