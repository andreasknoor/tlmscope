import { describe, expect, it } from "vitest";
import { absolute, DESCRIPTION, SHARE_TITLE, SITE_URL, SITEMAP_PATHS, structuredData, TITLE } from "./site.ts";

describe("search engine basics", () => {
  it("keeps titles and the description within what results show", () => {
    expect(TITLE.length).toBeLessThanOrEqual(60);
    expect(SHARE_TITLE.length).toBeLessThanOrEqual(70);
    expect(DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(TITLE).toMatch(/TLM/);
  });

  it("lists every sitemap page once, as an absolute address on the site", () => {
    expect(new Set(SITEMAP_PATHS).size).toBe(SITEMAP_PATHS.length);
    for (const path of SITEMAP_PATHS) expect(absolute(path).startsWith(`${SITE_URL}/`)).toBe(true);
  });

  it("describes a free web application with the fields search engines read", () => {
    const graph = structuredData()["@graph"];
    const app = graph.find((n) => n["@type"] === "WebApplication")!;
    expect(app).toMatchObject({ name: "TLMscope", applicationCategory: "UtilitiesApplication", isAccessibleForFree: true });
    expect((app as { offers: { price: string } }).offers.price).toBe("0");
    expect(graph.some((n) => n["@type"] === "WebSite")).toBe(true);
    // No invented ratings or reviews.
    expect(JSON.stringify(graph)).not.toMatch(/aggregateRating|review/i);
  });
});
