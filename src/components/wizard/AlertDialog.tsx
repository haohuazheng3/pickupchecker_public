"use client";
/**
 * Every in-site "Alert me" opens the alert flow in place: a sheet from the bottom on phones, a centred
 * card on larger screens, over a blurred page. Links keep their /?…#notify hrefs (deep links and
 * no-JS still land on the home page's wizard); this host catches clicks on them and opens the dialog
 * with the same pre-fill instead.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { wizardStartFrom, type StartParams } from "@/lib/wizardStart";
import { Wizard, type WizardCatalog } from "./Wizard";

export function AlertDialogHost({ catalog }: { catalog: WizardCatalog }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [start, setStart] = useState<StartParams | null>(null);
  const [run, setRun] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const open = useCallback((params: URLSearchParams) => {
    setStart(wizardStartFrom((k) => params.get(k)));
    setRun((n) => n + 1);
    document.documentElement.classList.add("dialog-open");
    window.requestAnimationFrame(() => { if (ref.current && !ref.current.open) ref.current.showModal(); });
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/" || url.hash !== "#notify" || url.searchParams.has("signin")) return;
      e.preventDefault();
      e.stopPropagation();
      open(url.searchParams);
    };
    const onEvent = (e: Event) => open(new URLSearchParams((e as CustomEvent<string>).detail ?? ""));
    // Capture phase: runs before the router's own link handler, so no navigation starts.
    document.addEventListener("click", onClick, true);
    window.addEventListener("pc:alert", onEvent);
    return () => { document.removeEventListener("click", onClick, true); window.removeEventListener("pc:alert", onEvent); };
  }, [open]);

  const close = () => ref.current?.close();
  const onClose = () => {
    document.documentElement.classList.remove("dialog-open");
    // New rules show up on the account page straight away.
    if (pathname.startsWith("/account")) router.refresh();
    window.setTimeout(() => setStart(null), 250);
  };

  return (
    <dialog ref={ref} className="alert-dialog" aria-label="Set up an alert" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-[var(--pane-solid)] px-5 pb-2 pt-3 sm:px-7 sm:pt-5">
        <span className="mx-auto h-1 w-10 rounded-full bg-ink/15 sm:hidden" aria-hidden />
        <button type="button" onClick={close} className="absolute right-3 top-2.5 flex h-9 w-9 items-center justify-center rounded-full text-xl text-ink-3 hover:bg-ink/6 hover:text-ink sm:right-4 sm:top-4" aria-label="Close">×</button>
      </div>
      {start && <Wizard key={run} catalog={catalog} {...start} inDialog />}
    </dialog>
  );
}
