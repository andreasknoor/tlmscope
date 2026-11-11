import type { MetadataRoute } from "next";
import { HOME_META, SITE_NAME } from "@/seo/site";

export const dynamic = "force-static";

/** Web app manifest: name, colours and icons for installing and for crawlers that read it. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: HOME_META.en.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d6a83",
    icons: [
      { src: "/favicon.ico", sizes: "16x16 32x32 48x48 96x96 144x144", type: "image/x-icon" },
      { src: "/icon1.png", sizes: "192x192", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
