import type { MetadataRoute } from "next";
import { absolute } from "@/seo/site";

export const dynamic = "force-static";

/** Everything may be crawled, by search engines and AI assistants alike. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: absolute("/sitemap.xml") };
}
