import { renderOgImage } from "@/seo/og";

export const dynamic = "force-static";

/** The link preview image for English pages: a plain file address (with .png) that any page can name. */
export function GET() {
  return renderOgImage("See what happened during your RC flights.");
}
