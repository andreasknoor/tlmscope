import { renderOgImage } from "@/seo/og";

export const dynamic = "force-static";

/** The link preview image for German pages. */
export function GET() {
  return renderOgImage("Sieh, was bei deinen Flügen passiert ist.");
}
