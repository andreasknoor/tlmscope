import { CONTENT } from "@/seo/content";
import { answerPlain } from "@/seo/markup";
import { LANGS, PAGE_IDS, pathOf } from "@/seo/pages";
import { REPO_URL } from "@/legal/contact";
import { absolute, HOME_META, SITE_NAME, SITE_SUMMARY } from "@/seo/site";

export const dynamic = "force-static";

/** llms.txt (llmstxt.org): a short, plain description of the site and its pages for AI assistants. */
export function GET() {
  const lines = [`# ${SITE_NAME}`, "", `> ${SITE_SUMMARY}`, ""];
  lines.push(
    "It turns a log into a plain-language summary of each flight with simple ratings, charts (height, climb, motor, battery, radio link), a GPS map with 3D replay, detected thermals and battery ageing across flights. Logs from Spektrum NX and iX transmitters are tested. It is an independent, open-source hobby project (MIT licence), not made by Spektrum or Horizon Hobby.",
    "",
    `- App: ${absolute("/")}`,
    `- Source code: ${REPO_URL}`,
    "",
  );
  for (const lang of LANGS) {
    lines.push(lang === "en" ? "## Guides" : "## Anleitungen (Deutsch)", "");
    lines.push(`- [${HOME_META[lang].title}](${absolute(pathOf(lang))}): ${HOME_META[lang].description}`);
    for (const id of PAGE_IDS) {
      const g = CONTENT[lang].guides[id];
      lines.push(`- [${g.title}](${absolute(pathOf(lang, id))}): ${g.description}`);
    }
    lines.push("");
  }
  lines.push("## Questions and answers", "");
  for (const f of CONTENT.en.guides.faq.faq ?? []) lines.push(`### ${f.q}`, "", answerPlain(f.a, true), "");
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
