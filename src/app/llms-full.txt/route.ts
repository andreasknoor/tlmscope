import { CONTENT } from "@/seo/content";
import { answerBlocks, blocksMarkdown, inlineMarkdown } from "@/seo/markup";
import { LANGS, PAGE_IDS, pathOf, UPDATED } from "@/seo/pages";
import { REPO_URL } from "@/legal/contact";
import { absolute, FEATURES, SITE_NAME, SITE_SUMMARY, SITE_URL } from "@/seo/site";

export const dynamic = "force-static";

/** llms-full.txt: the full text of every guide in both languages, as Markdown, for AI assistants (llms.txt links here). */
export function GET() {
  const out = [`# ${SITE_NAME}: full guide text`, "", `> ${SITE_SUMMARY}`, "", ...FEATURES.map((f) => `- ${f}`), "", `App: ${absolute("/")} · Source code: ${REPO_URL}`, ""];
  for (const lang of LANGS) {
    out.push(lang === "en" ? "# Guides (English)" : "# Anleitungen (Deutsch)", "");
    for (const id of PAGE_IDS) {
      const g = CONTENT[lang].guides[id];
      out.push(`## ${g.h1}`, "", `${absolute(pathOf(lang, id))} · ${lang === "en" ? "updated" : "aktualisiert"} ${UPDATED[id]}`, "", inlineMarkdown(lang, g.lead, SITE_URL), "");
      for (const sec of g.sections) out.push(`### ${sec.h2}`, "", blocksMarkdown(lang, sec.blocks, SITE_URL), "");
      if (g.faq?.length) {
        out.push(`### ${CONTENT[lang].chrome.faq}`, "");
        for (const f of g.faq) out.push(`#### ${f.q}`, "", blocksMarkdown(lang, answerBlocks(f.a), SITE_URL), "");
      }
    }
  }
  return new Response(out.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
