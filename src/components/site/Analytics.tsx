"use client";
import { useEffect } from "react";

const SITE_HOST = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com").hostname;

/**
 * FlowGlance — the only analytics. Loaded on the production host only: local runs, Lighthouse builds and
 * preview deployments would otherwise count as visitors. identify() happens in the account area.
 */
export function Analytics() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_FLOWGLANCE_KEY;
    if (!key || window.location.hostname !== SITE_HOST || document.getElementById("fw-snippet")) return;
    const s = document.createElement("script");
    s.id = "fw-snippet";
    s.src = "https://flowglance.com/fw.js";
    s.async = true;
    s.dataset.site = key;
    document.head.appendChild(s);
  }, []);
  return null;
}
