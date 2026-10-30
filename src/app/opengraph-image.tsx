import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "PickupChecker — iPhone in-store pickup alerts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OG() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#ffffff 0%,#e8f3ec 100%)", color: "#0d1411", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 36, fontWeight: 700 }}>
        <svg width="60" height="60" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="15" fill="#2fd182" />
          <path d="M25 24.5v-3.6a7 7 0 0 1 14 0v3.6" stroke="#fff" strokeWidth="3.8" strokeLinecap="round" />
          <path d="M18.2 24h27.6a2 2 0 0 1 2 2.15l-1.55 20.6a4.3 4.3 0 0 1-4.29 3.98H21.99a4.3 4.3 0 0 1-4.29-3.98l-1.55-20.6A2 2 0 0 1 18.2 24z" fill="#fff" />
          <path d="M25.4 37.6l4.6 4.6 8.6-9.4" stroke="#0a7f49" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        PickupChecker
      </div>
      <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>Know the second an iPhone Duo is in a store near you.</div>
      <div style={{ fontSize: 30, color: "#4b5551" }}>iPhone Duo - 18 Pro - 18 Pro Max - every US Apple Store, alerts in seconds</div>
    </div>,
    size,
  );
}
