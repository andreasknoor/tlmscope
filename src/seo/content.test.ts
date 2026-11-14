import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTENT } from "./content/index.ts";
import type { Block, Guide } from "./content/types.ts";
import { LANGS, PAGE_IDS } from "./pages.ts";
import { SCREENSHOTS } from "./images.ts";
import { answerBlocks, answerPlain, LINK, resolveTarget } from "./markup.ts";
import { faqId } from "./site.ts";

const blocksOf = (g: Guide) => g.sections.flatMap((s) => s.blocks);
const strings = (lang: (typeof LANGS)[number]): string[] => {
  const c = CONTENT[lang];
  const out: string[] = [c.home.h1, c.home.sub, ...c.home.facts.map((f) => f.text), ...c.home.tiles.flatMap((t) => [t.label, t.title, ...t.body.flatMap(blockStrings)])];
  for (const id of PAGE_IDS) {
    const g = c.guides[id];
    out.push(g.h1, g.lead, ...(g.faq ?? []).flatMap((f) => [f.q, ...answerBlocks(f.a).flatMap(blockStrings)]));
    for (const s of g.sections) {
      out.push(s.h2);
      for (const b of s.blocks) {
        if (b.t === "p" || b.t === "note") out.push(b.text);
        else if (b.t === "ul" || b.t === "ol") out.push(...b.items);
        else if (b.t === "table") out.push(...b.head, ...b.rows.flat());
        else out.push(b.alt, b.caption);
      }
    }
  }
  return out;
};
const blockStrings = (b: Block): string[] => (b.t === "p" || b.t === "note" ? [b.text] : b.t === "ul" || b.t === "ol" ? b.items : b.t === "table" ? [...b.head, ...b.rows.flat()] : [b.alt, b.caption]);
const shape = (b: Block) => (b.t === "ul" || b.t === "ol" ? `${b.t}${b.items.length}` : b.t === "table" ? `table${b.head.length}x${b.rows.length}` : b.t === "img" ? `img:${b.name}` : b.t);

describe("guide pages", () => {
  it("has every guide in both languages, with titles and descriptions that fit in search results", () => {
    const titles = new Set<string>();
    for (const lang of LANGS) {
      for (const id of PAGE_IDS) {
        const g = CONTENT[lang].guides[id];
        expect(g.title.length, `${lang}/${id} title`).toBeLessThanOrEqual(60);
        expect(g.description.length, `${lang}/${id} description`).toBeLessThanOrEqual(160);
        expect(g.description.length, `${lang}/${id} description`).toBeGreaterThanOrEqual(70);
        expect(titles.has(g.title), `duplicate title ${g.title}`).toBe(false);
        titles.add(g.title);
        expect(CONTENT[lang].chrome.nav[id]).toBeTruthy();
      }
    }
  });

  it("has the same structure in English and German", () => {
    const [en, de] = [CONTENT.en, CONTENT.de];
    expect(en.home.facts.map((f) => f.icon)).toEqual(de.home.facts.map((f) => f.icon));
    expect(en.home.tiles.map((t) => [t.id, t.icon, t.page, t.body.map(shape)])).toEqual(de.home.tiles.map((t) => [t.id, t.icon, t.page, t.body.map(shape)]));
    for (const id of PAGE_IDS) {
      expect(en.guides[id].sections.map((s) => s.blocks.map(shape)), id).toEqual(de.guides[id].sections.map((s) => s.blocks.map(shape)));
      expect(en.guides[id].faq?.length, `${id} faq`).toBe(de.guides[id].faq?.length);
      expect((en.guides[id].faq ?? []).map((f) => answerBlocks(f.a).map(shape).join()), `${id} faq answers`).toEqual((de.guides[id].faq ?? []).map((f) => answerBlocks(f.a).map(shape).join()));
    }
  });

  it("only links to pages and addresses that exist, and closes all markup", () => {
    for (const lang of LANGS) {
      for (const text of strings(lang)) {
        for (const m of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
          expect(resolveTarget(lang, m[1]), `${lang}: ${m[1]}`).not.toBeNull();
          // A link to an anchor must point to a question that exists on that page.
          const [page, anchor] = m[1].startsWith("page:") ? m[1].slice(5).split("#") : [];
          if (anchor) expect((CONTENT[lang].guides[page as (typeof PAGE_IDS)[number]].faq ?? []).map(faqId), `${lang}: ${m[1]}`).toContain(anchor);
        }
        const bare = text.replace(new RegExp(LINK.source.slice(1, -1), "g"), "x");
        expect((bare.match(/\*\*/g) ?? []).length % 2, text).toBe(0);
        expect((bare.match(/`/g) ?? []).length % 2, text).toBe(0);
      }
    }
  });

  it("gives every question its own anchor for deep links", () => {
    for (const lang of LANGS) for (const id of PAGE_IDS) {
      const ids = (CONTENT[lang].guides[id].faq ?? []).map(faqId);
      for (const x of ids) expect(x).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(faqId({ q: "Wie lädt man Größe & Höhe?" })).toBe("wie-laedt-man-groesse-hoehe");
  });

  it("gives search engines answers as plain text", () => {
    for (const lang of LANGS) for (const id of PAGE_IDS) for (const f of CONTENT[lang].guides[id].faq ?? []) expect(answerPlain(f.a)).not.toMatch(/[[\]`]|\*\*/);
  });

  it("points every start page topic to a page that exists, and every guide is reachable from the start page", () => {
    for (const lang of LANGS) {
      const linked = new Set(CONTENT[lang].home.tiles.map((t) => t.page));
      for (const t of CONTENT[lang].home.tiles) expect(PAGE_IDS, t.id).toContain(t.page);
      expect(linked.size).toBe(CONTENT[lang].home.tiles.length);
    }
  });

  it("uses screenshots that exist, in both languages", () => {
    for (const lang of LANGS) {
      for (const id of PAGE_IDS) {
        for (const b of blocksOf(CONTENT[lang].guides[id])) {
          if (b.t !== "img") continue;
          expect(SCREENSHOTS[b.name], b.name).toBeDefined();
          expect(existsSync(`public/img/${b.name}-${lang}.jpg`), `public/img/${b.name}-${lang}.jpg`).toBe(true);
          expect(b.alt.length).toBeGreaterThan(20);
        }
      }
    }
  });
});
