import { ImageResponse } from "next/og";

export const alt = "Alfred. Job hunt. Handled. A Chrome extension that fills job applications from your saved profile.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The share card: the hero poster, flat colour and heavy type. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1a1a1a",
          padding: "56px 64px",
          fontWeight: 700,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#efefeb", letterSpacing: "-0.02em" }}>ALFRED</div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 0.9, letterSpacing: "-0.05em" }}>
          <span style={{ fontSize: 170, color: "#efefeb" }}>JOB HUNT.</span>
          <span style={{ fontSize: 170, color: "#f4b41a" }}>HANDLED.</span>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#efefeb" }}>
          A Chrome extension that fills job applications. You press Submit.
        </div>
      </div>
    ),
    size,
  );
}
