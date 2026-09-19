import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background:
          "linear-gradient(145deg, #f5f7f8 0%, #e8f7f4 55%, #c5ebe3 100%)",
        color: "#152026",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "#125a50",
        }}
      >
        {SITE_NAME}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            maxWidth: 960,
          }}
        >
          Check Indian company name uniqueness
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            lineHeight: 1.35,
            color: "#3d505a",
            maxWidth: 900,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Official MCA Company Master open-data snapshot — not live MCA
          approval.
        </div>
      </div>
    </div>,
    { ...size },
  );
}
