import type { MetadataRoute } from "next";
import { absolute, SITEMAP } from "@/seo/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP.map(({ path, alternates, lastModified }) => ({
    url: absolute(path),
    ...(lastModified ? { lastModified } : {}),
    ...(alternates ? { alternates: { languages: { en: absolute(alternates.en), de: absolute(alternates.de) } } } : {}),
  }));
}
