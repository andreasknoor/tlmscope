import { ImageResponse } from "next/og";

export const dynamic = "force-static";

/**
 * The large app icon for installing (Android, desktop). Full bleed with the trace inside the central
 * safe zone, so it also works as a maskable icon that the system crops to a circle or rounded square.
 */
export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d6a83" }}>
        <svg width="320" height="320" viewBox="0 0 64 64">
          <path d="M12 46H21L27 37L32 40L39 27L44 30L51 17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="51" cy="17" r="5" fill="#fff" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
