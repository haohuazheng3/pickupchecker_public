/** ZIP → coordinates via the free, keyless Zippopotam API (used once per watch, cached in the row). */
export async function geocodeZip(zip: string): Promise<{ lat: number; lng: number; place: string; state: string } | null> {
  if (!/^\d{5}$/.test(zip)) return null;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { places?: { latitude: string; longitude: string; "place name": string; "state abbreviation": string }[] };
    const p = j.places?.[0];
    if (!p) return null;
    return { lat: Number(p.latitude), lng: Number(p.longitude), place: p["place name"], state: p["state abbreviation"] };
  } catch {
    return null;
  }
}
