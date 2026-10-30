"use client";
/**
 * Header search: a state, city, store name, ZIP or model takes you straight to its page.
 * Opens with the button, ⌘K / Ctrl+K, or "/" outside a text field; arrows + Enter to pick.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchIndex, type SearchEntry, type SearchKind } from "@/lib/search";
import { track } from "@/lib/track";

const KIND_LABEL: Record<SearchKind, string> = { store: "Store", city: "City", state: "State", model: "Model", page: "Page" };

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);

export function SiteSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (index) return;
    try {
      const r = await fetch("/api/search-index");
      if (r.ok) setIndex((await r.json()) as SearchEntry[]);
    } catch { /* offline: the box still works as a way to close */ }
  }, [index]);

  const show = useCallback(() => { setOpen(true); setActive(0); void load(); track("search_open"); }, [load]);
  const hide = useCallback(() => { setOpen(false); setQ(""); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (open) hide(); else show(); return; }
      if (e.key === "Escape" && open) { hide(); return; }
      if (e.key === "/" && !open) {
        const t = e.target as HTMLElement | null;
        const typing = Boolean(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable));
        if (!typing) { e.preventDefault(); show(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, show, hide]);

  useEffect(() => { if (open) { const t = setTimeout(() => inputRef.current?.focus(), 0); return () => clearTimeout(t); } }, [open]);

  const results = index && q.trim() ? searchIndex(index, q) : [];
  const go = (e: SearchEntry) => { track("search_go", { kind: e.k, q: q.trim().slice(0, 40) }); hide(); };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, Math.max(0, results.length - 1))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); const r = results[active]; go(r); router.push(r.h); }
  };

  return (
    <>
      <button type="button" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-2 bg-ink/4 text-ink transition hover:bg-ink/10 active:scale-95" aria-label="Search states, cities and stores" title="Search (⌘K)" onClick={show}><SearchIcon /></button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/35 p-4 pt-[10vh] backdrop-blur-sm" onClick={hide} role="presentation">
          <div role="dialog" aria-modal="true" aria-label="Search" className="pane w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-line px-4 text-ink-3">
              <SearchIcon />
              <input ref={inputRef} className="h-14 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-3" placeholder="State, city, store, ZIP or model…" value={q}
                onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKeyDown} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} aria-autocomplete="list" aria-controls="site-search-results" />
              <kbd className="hidden rounded-md border border-line-2 px-1.5 py-0.5 text-[10px] sm:block">esc</kbd>
            </div>
            <ul id="site-search-results" role="listbox" className="max-h-[60vh] overflow-y-auto py-2">
              {q.trim() === "" && <li className="px-4 py-3 text-sm text-ink-3">Try &ldquo;Texas&rdquo;, &ldquo;Houston&rdquo;, &ldquo;Fifth Avenue&rdquo;, &ldquo;10001&rdquo; or &ldquo;Duo&rdquo;.</li>}
              {q.trim() !== "" && !index && <li className="px-4 py-3 text-sm text-ink-3">Loading…</li>}
              {q.trim() !== "" && index && results.length === 0 && <li className="px-4 py-3 text-sm text-ink-3">Nothing matches. Try a state, a city, a store name or a ZIP code.</li>}
              {results.map((r, i) => (
                <li key={`${r.k}:${r.h}:${r.l}`} role="option" aria-selected={i === active}>
                  <Link href={r.h} onClick={() => go(r)} onMouseEnter={() => setActive(i)} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i === active ? "bg-ink/6" : ""}`}>
                    <span className="w-11 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-3">{KIND_LABEL[r.k]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{r.k === "store" ? `Apple ${r.l}` : r.l}</span>
                      <span className="block truncate text-xs text-ink-3">{r.s}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
