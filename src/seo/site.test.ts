import { describe, expect, it } from "vitest";
import { LANGS, PAGE_IDS, SLUGS, pathOf } from "./pages.ts";
import { absolute, HOME_META, homeStructuredData, languageAlternates, SITE_SUMMARY, SITE_URL, SITEMAP } from "./site.ts";

describe("search engine basics", () => {
  it("keeps titles and descriptions within what results show", () => {
    for (const lang of LANGS) {
      const m = HOME_META[lang];
      expect(m.title.length, `${lang} title`).toBeLessThanOrEqual(60);
      expect(m.share.length, `${lang} share title`).toBeLessThanOrEqual(70);
      expect(m.description.length, `${lang} description`).toBeLessThanOrEqual(160);
      expect(m.title).toMatch(/TLM/);
    }
  });

  it("lists every sitemap page once, as an absolute address on the site", () => {
    const urls = SITEMAP.map((e) => absolute(e.path));
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
    // Every guide exists in both languages and is listed in both.
    for (const id of [undefined, ...PAGE_IDS]) for (const lang of LANGS) expect(urls).toContain(absolute(pathOf(lang, id)));
  });

  it("names every language alternative of a page, with English as the default", () => {
    const alt = languageAlternates("open");
    expect(alt).toEqual({ en: absolute("/open-tlm-files"), de: absolute("/de/tlm-dateien-oeffnen"), "x-default": absolute("/open-tlm-files") });
  });

  it("gives every page a clean address in each language, with no clash", () => {
    for (const lang of LANGS) {
      const slugs = PAGE_IDS.map((id) => SLUGS[id][lang]);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("describes a free web application, with the page's questions only if it shows them, and no invented ratings", () => {
    const faq = [{ q: "Is it free?", a: "Yes." }];
    const graph = homeStructuredData("en", faq)["@graph"];
    expect(homeStructuredData("en", [])["@graph"].some((n) => n["@type"] === "FAQPage")).toBe(false);
    const app = graph.find((n) => n["@type"] === "WebApplication")!;
    expect(app).toMatchObject({ name: "TLMscope", applicationCategory: "UtilitiesApplication", isAccessibleForFree: true });
    expect(graph.some((n) => n["@type"] === "FAQPage")).toBe(true);
    expect(JSON.stringify(graph)).not.toMatch(/aggregateRating|"review/i);
  });
});

describe("site summary", () => {
  it("is worded the same in the FAQ and the README", async () => {
    const { CONTENT } = await import("./content/index.ts");
    const { readFileSync } = await import("node:fs");
    const { answerPlain } = await import("./markup.ts");
    expect(answerPlain(CONTENT.en.guides.faq.faq![0].a).startsWith(SITE_SUMMARY.split(". ")[0])).toBe(true);
    expect(readFileSync("README.md", "utf8")).toContain(SITE_SUMMARY);
  });
});

describe("dates and full text for search engines and assistants", () => {
  it("dates every guide, never after the latest release, and gives it to the sitemap", async () => {
    const { UPDATED } = await import("./pages.ts");
    const { LATEST_RELEASE } = await import("./site.ts");
    for (const id of PAGE_IDS) {
      expect(UPDATED[id], id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(UPDATED[id] <= LATEST_RELEASE.date, id).toBe(true);
      for (const lang of LANGS) expect(SITEMAP.find((e) => e.path === pathOf(lang, id))!.lastModified).toBe(UPDATED[id]);
    }
  });

  it("describes a guide as a dated article by its author", async () => {
    const { guideStructuredData } = await import("./site.ts");
    const { UPDATED } = await import("./pages.ts");
    const graph = guideStructuredData("de", "faq", { title: "T", h1: "H", description: "D" }, "Start", [])["@graph"];
    const article = graph.find((n) => n["@type"] === "TechArticle") as Record<string, unknown>;
    expect(article.dateModified).toBe(UPDATED.faq);
    expect(article.inLanguage).toBe("de");
    expect(article.mainEntityOfPage).toBe(absolute(pathOf("de", "faq")));
  });

  it("turns content into Markdown with absolute links", async () => {
    const { blocksMarkdown } = await import("./markup.ts");
    const md = blocksMarkdown("de", [{ t: "p", text: "See [the FAQ](page:faq) and **this**." }, { t: "ul", items: ["a", "b"] }, { t: "table", head: ["x", "y"], rows: [["1", "2"]] }], SITE_URL);
    expect(md).toContain(`[the FAQ](${absolute(pathOf("de", "faq"))})`);
    expect(md).toContain("**this**");
    expect(md).toContain("- a\n- b");
    expect(md).toContain("| x | y |\n| --- | --- |\n| 1 | 2 |");
  });
});
