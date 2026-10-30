/**
 * Photos from Pexels (free to use, attribution given anyway), downloaded once by scripts/pexels.mjs and
 * self-hosted as WebP at 480/800/1200 px under /public/img — no image proxy, no third-party request at view time.
 */
import list from "../../content/images.json";

export interface Photo {
  id: string;
  /** Path prefix without width/extension, e.g. "/img/guides/duo-price-1" → "-800.webp". */
  base: string;
  widths: number[];
  width: number;
  height: number;
  alt: string;
  caption?: string;
  credit: string;
  creditUrl: string;
}

const BY_ID = new Map((list as Photo[]).map((p) => [p.id, p]));

export function photo(id: string): Photo | undefined {
  return BY_ID.get(id);
}

export function allPhotos(): Photo[] {
  return list as Photo[];
}

export function srcSet(p: Photo): string {
  return p.widths.map((w) => `${p.base}-${w}.webp ${w}w`).join(", ");
}

export function src(p: Photo, w = 800): string {
  const best = p.widths.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a), p.widths[0]);
  return `${p.base}-${best}.webp`;
}
