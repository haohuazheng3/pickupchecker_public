import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "PickupChecker — iPhone in-store pickup alerts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OG() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#ffffff 0%,#e8f3ec 100%)", color: "#0d1411", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 36, fontWeight: 700 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#5cf0a5,#1fbf72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="34" height="34" viewBox="0 0 64 64" fill="none"><path d="M18 34l10 10 20-22" stroke="#052414" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        Pickup<span style={{ color: "#0a7f49" }}>Checker</span>
      </div>
      <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>Know the second an iPhone Duo is in a store near you.</div>
      <div style={{ fontSize: 30, color: "#4b5551" }}>iPhone Duo - 18 Pro - 18 Pro Max - every US Apple Store, alerts in seconds</div>
    </div>,
    size,
  );
}
