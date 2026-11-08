import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-static";

/** Home-screen icon: the climb trace, full bleed (the phone rounds the corners). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d6a83" }}>
        <svg width="140" height="140" viewBox="0 0 64 64">
          <path d="M12 46H21L27 37L32 40L39 27L44 30L51 17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="51" cy="17" r="5" fill="#fff" />
        </svg>
      </div>
    ),
    size,
  );
}
