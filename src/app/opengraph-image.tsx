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
          <rect width="64" height="64" rx="15" fill="#35e38c" />
          <path d="M24.6 25.6v-3.4a7.4 7.4 0 0 1 14.8 0v3.4" stroke="#0d1411" strokeWidth="4" strokeLinecap="round" />
          <path d="M17.6 25.2h28.8a2.2 2.2 0 0 1 2.19 2.38l-1.6 19.5a4.6 4.6 0 0 1-4.58 4.22H21.6a4.6 4.6 0 0 1-4.58-4.22l-1.6-19.5a2.2 2.2 0 0 1 2.19-2.38z" fill="#0d1411" />
          <path d="M24.9 38.4l4.9 4.9 9.3-10.1" stroke="#35e38c" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        PickupChecker
      </div>
      <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>Know the second an iPhone Duo is in a store near you.</div>
      <div style={{ fontSize: 30, color: "#4b5551" }}>iPhone Duo - 18 Pro - 18 Pro Max - every US Apple Store, alerts in seconds</div>
    </div>,
    size,
  );
}
