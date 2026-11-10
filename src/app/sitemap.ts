import type { MetadataRoute } from "next";
import { absolute, SITEMAP_PATHS } from "@/seo/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_PATHS.map((path) => ({ url: absolute(path) }));
}
