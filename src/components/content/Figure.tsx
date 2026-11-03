import { photo, src, srcSet } from "@/lib/content/images";
import { t, pageLocale } from "@/lib/i18n/server";

/**
 * A self-hosted Pexels photo: responsive srcset, fixed aspect ratio (no layout shift), lazy unless `eager`.
 * Alt text and caption: English from images.json; other languages from the dictionary by image id (English if missing).
 */
export function Figure({ id, eager = false, className = "" }: { id: string; eager?: boolean; className?: string }) {
  const p = photo(id);
  if (!p) return null;
  const d = t().content;
  const own = pageLocale().lang === "en" ? undefined : d.photos[id];
  const alt = own?.alt ?? p.alt;
  const caption = own ? own.caption ?? p.caption : p.caption;
  return (
    <figure className={`my-6 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static WebP files at fixed widths; no optimizer needed */}
      <img
        src={src(p, 800)}
        srcSet={srcSet(p)}
        sizes="(min-width: 768px) 720px, 100vw"
        width={p.width}
        height={p.height}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="h-auto w-full rounded-[20px] border border-line bg-ink/5 object-cover"
        style={{ aspectRatio: `${p.width} / ${p.height}` }}
      />
      <figcaption className="mt-2 text-xs text-ink-3">
        {caption ? <>{caption} · </> : null}{d.photoCredit(<a href={p.creditUrl} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink">{p.credit} / Pexels</a>)}
      </figcaption>
    </figure>
  );
}
