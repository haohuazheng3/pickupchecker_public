"use client";
/** Auto-refresh toggle (router.refresh every 30 s, remembered per browser), a manual refresh, sign out. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminTools({ via }: { via: "password" | "clerk" }) {
  const router = useRouter();
  const [auto, setAuto] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // read the remembered choice after hydration (server-rendered label must match the first client render)
    const t = window.setTimeout(() => { try { setAuto(localStorage.getItem("pc:admin:auto") === "1"); } catch { /* ignore */ } }, 0);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") { router.refresh(); setTick((t) => t + 1); } }, 30_000);
    return () => clearInterval(id);
  }, [auto, router]);
  const toggle = () => { const v = !auto; setAuto(v); try { localStorage.setItem("pc:admin:auto", v ? "1" : "0"); } catch { /* ignore */ } };
  return (
    <>
      <button type="button" className="chip px-3 py-1.5 text-xs" aria-pressed={auto} onClick={toggle} title="Reload the data every 30 seconds">{auto ? `Auto · 30 s${tick ? ` · ${tick}` : ""}` : "Auto-refresh"}</button>
      <button type="button" className="chip px-3 py-1.5 text-xs" onClick={() => router.refresh()}>Refresh</button>
      <a href="/api/health" className="chip px-3 py-1.5 text-xs" target="_blank" rel="noreferrer">/api/health</a>
      {via === "password" ? (
        <form action="/api/admin/logout" method="post"><button className="chip px-3 py-1.5 text-xs" type="submit">Sign out</button></form>
      ) : (
        <span className="text-xs text-ink-3">via Clerk</span>
      )}
    </>
  );
}
