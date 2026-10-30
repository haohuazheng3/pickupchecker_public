import { photo, src, srcSet } from "@/lib/content/images";

/** A self-hosted Pexels photo: responsive srcset, fixed aspect ratio (no layout shift), lazy unless `eager`. */
export function Figure({ id, eager = false, className = "" }: { id: string; eager?: boolean; className?: string }) {
  const p = photo(id);
  if (!p) return null;
  return (
    <figure className={`my-6 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static WebP files at fixed widths; no optimizer needed */}
      <img
        src={src(p, 800)}
        srcSet={srcSet(p)}
        sizes="(min-width: 768px) 720px, 100vw"
        width={p.width}
        height={p.height}
        alt={p.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="h-auto w-full rounded-[20px] border border-line bg-ink/5 object-cover"
        style={{ aspectRatio: `${p.width} / ${p.height}` }}
      />
      <figcaption className="mt-2 text-xs text-ink-3">
        {p.caption ? <>{p.caption} · </> : null}Photo: <a href={p.creditUrl} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink">{p.credit} / Pexels</a>
      </figcaption>
    </figure>
  );
}
