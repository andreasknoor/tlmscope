import Link from "next/link";
import { REPO_URL, STICKSCOPE_URL } from "../legal/contact.ts";
import { Logo, Wordmark } from "../ui/brand";
import { CONTENT } from "./content/index.ts";
import { Inline } from "./Inline";
import { answerBlocks, answerPlain } from "./markup.ts";
import { Blocks } from "./Blocks";
import { FaqAnchors } from "./FaqAnchors";
import { JsonLd } from "./JsonLd";
import { homePath, legalPath, pagePath, PAGE_IDS, UPDATED, type Lang, type PageId } from "./pages.ts";
import { faqId, guideStructuredData } from "./site.ts";

/** 18 November 2026 / 18. November 2026, independent of the time zone. */
const longDate = (lang: Lang, d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** A guide page: the same content in both languages, with the language switch, navigation and footer. */
export function GuidePage({ lang, id }: { lang: Lang; id: PageId }) {
  const c = CONTENT[lang];
  const g = c.guides[id];
  const other: Lang = lang === "de" ? "en" : "de";
  return (
    <>
      <JsonLd data={guideStructuredData(lang, id, g, c.chrome.home, g.faq?.map((f) => ({ q: f.q, a: answerPlain(f.a) })))} />
      <a className="skip" href="#main">{c.chrome.skip}</a>
      <header className="sitehead">
        <Link className="brand" href={homePath(lang)}><Logo /><Wordmark /></Link>
        <nav className="guidenav" aria-label={c.chrome.guides}>
          {PAGE_IDS.map((pid) => (
            <Link key={pid} href={pagePath(lang, pid)} aria-current={pid === id ? "page" : undefined}>{c.chrome.nav[pid]}</Link>
          ))}
        </nav>
        <Link className="langswitch" href={pagePath(other, id)} lang={other} hrefLang={other} title={c.chrome.switchTo.title}>{c.chrome.switchTo.label}</Link>
      </header>
      <main id="main" className="doc">
        <h1>{g.h1}</h1>
        <p className="lead"><Inline text={g.lead} lang={lang} /></p>
        <p className="updated">{c.chrome.updated} <time dateTime={UPDATED[id]}>{longDate(lang, UPDATED[id])}</time></p>
        {g.sections.map((s) => (
          <section key={s.h2}>
            <h2>{s.h2}</h2>
            <Blocks blocks={s.blocks} lang={lang} />
          </section>
        ))}
        {g.faq && (
          <section>
            {/* On a page that is only questions (the FAQ), the page title already says it. */}
            {g.sections.length > 0 && <h2>{c.chrome.faq}</h2>}
            {/* The open/close-all link only where there are many questions (the FAQ page). */}
            <FaqAnchors toggle={g.faq.length > 6 ? c.chrome.allQuestions : undefined} />
            {g.faq.map((f) => (
              <details key={f.q} id={faqId(f)} className="qa">
                <summary><h3>{f.q} <a className="qlink" href={`#${faqId(f)}`} aria-label={c.chrome.linkToQuestion}>#</a></h3></summary>
                <div className="qa-a"><Blocks blocks={answerBlocks(f.a)} lang={lang} /></div>
              </details>
            ))}
          </section>
        )}
        <aside className="cta">
          <h2>{c.chrome.cta.title}</h2>
          <p>{c.chrome.cta.text}</p>
          <Link className="btn primary" href={homePath(lang)}>{c.chrome.cta.button}</Link>
        </aside>
      </main>
      <footer className="foot">
        <span>{c.chrome.footer.by}</span>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">{c.chrome.footer.source}</a>
        <span>{c.chrome.footer.notAffiliated}</span>
        <a href={STICKSCOPE_URL} target="_blank" rel="noopener noreferrer" title={c.chrome.footer.stickscope.title}>{c.chrome.footer.stickscope.label}</a>
        <Link href={legalPath(lang)}>{c.chrome.footer.legal}</Link>
      </footer>
    </>
  );
}
