import { ImageResponse } from "next/og";
export const alt = "ArrivalPay — One required payment. One reusable Stellar wallet.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(<div style={{ background: "#151515", color: "white", width: "100%", height: "100%", padding: "64px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
    <div style={{ display: "flex", fontSize: 34 }}>arrivalpay.</div>
    <div style={{ display: "flex", flexDirection: "column", fontSize: 68, letterSpacing: "-3px", lineHeight: 1.12 }}><span>One required payment.</span><span>One reusable Stellar wallet.</span></div>
    <div style={{ display: "flex", fontSize: 24, color: "#ccc" }}>Conditional enrollment deposits · Stellar Testnet</div>
  </div>, size);
}
