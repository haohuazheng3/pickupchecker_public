import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "PickupChecker — iPhone in-store pickup alerts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OG() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#07080c 0%,#0d1a14 100%)", color: "#f3f4f8", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 36, fontWeight: 700 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#35e38c", display: "flex", alignItems: "center", justifyContent: "center", color: "#052414", fontSize: 36 }}>✓</div>
        Pickup<span style={{ color: "#35e38c" }}>Checker</span>
      </div>
      <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>Know the second your iPhone is in a store near you.</div>
      <div style={{ fontSize: 30, color: "#b4b8c6" }}>iPhone 18 Pro · 18 Pro Max · iPhone Duo — every US Apple Store, alerts in seconds</div>
    </div>,
    size,
  );
}
