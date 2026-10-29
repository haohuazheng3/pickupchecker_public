import Script from "next/script";

/** FlowGlance — the only analytics. Loaded on every page; identify() happens in the account area. */
export function Analytics() {
  const key = process.env.NEXT_PUBLIC_FLOWGLANCE_KEY;
  if (!key) return null;
  return <Script src="https://flowglance.com/fw.js" data-site={key} strategy="afterInteractive" />;
}
