"use client";
/**
 * A typed five-digit ZIP → its centroid, from public/zip/<first three digits>.json (US Census 2020 ZCTA
 * gazetteer; scripts/zip-centroids.mjs). One small file per prefix, fetched once per page.
 */
import { useEffect, useState } from "react";

type Group = Record<string, [number, number]>;
const groups = new Map<string, Promise<Group | null>>();

export function loadZip(zip: string): Promise<{ lat: number; lng: number } | null> {
  const p = zip.slice(0, 3);
  if (!groups.has(p)) groups.set(p, fetch(`/zip/${p}.json`).then((r) => (r.ok ? (r.json() as Promise<Group>) : null)).catch(() => null));
  return groups.get(p)!.then((g) => (g?.[zip] ? { lat: g[zip][0], lng: g[zip][1] } : null));
}

/** The ZIP at the start of `q` with its point once loaded; null while loading, unknown, or not a ZIP. */
export function useZipPoint(q: string): { zip: string; lat: number; lng: number } | null {
  const zip = q.trim().match(/^(\d{5})(\D|$)/)?.[1] ?? null;
  const [hit, setHit] = useState<{ zip: string; lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!zip) return;
    let live = true;
    void loadZip(zip).then((pt) => { if (live && pt) setHit({ zip, ...pt }); });
    return () => { live = false; };
  }, [zip]);
  return zip && hit?.zip === zip ? hit : null;
}
