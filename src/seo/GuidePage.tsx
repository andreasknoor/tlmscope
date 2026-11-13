import Link from "next/link";
import { REPO_URL } from "../legal/contact.ts";
import { Logo, Wordmark } from "../ui/brand";
import { CONTENT } from "./content/index.ts";
import { Inline } from "./Inline";
import { answerBlocks, answerPlain } from "./markup.ts";
import { Blocks } from "./Blocks";
import { JsonLd } from "./JsonLd";
import { homePath, legalPath, pagePath, PAGE_IDS, type Lang, type PageId } from "./pages.ts";
import { faqId, guideStructuredData } from "./site.ts";

/** A guide page: the same content in both languages, with the language switch, navigation and footer. */
export function GuidePage({ lang, id }: { lang: Lang; id: PageId }) {
  const c = CONTENT[lang];
  const g = c.guides[id];
  const other: Lang = lang === "de" ? "en" : "de";
  return (
    <>
      <JsonLd data={guideStructuredData(lang, id, g.title, c.chrome.home, g.faq?.map((f) => ({ q: f.q, a: answerPlain(f.a) })))} />
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
        {g.sections.map((s) => (
          <section key={s.h2}>
            <h2>{s.h2}</h2>
            <Blocks blocks={s.blocks} lang={lang} />
          </section>
        ))}
        {g.faq && (
          <section>
            <h2>{c.chrome.faq}</h2>
            {g.faq.map((f) => (
              <div key={f.q} id={faqId(f)} className="qa">
                <h3>{f.q} <a className="qlink" href={`#${faqId(f)}`} aria-label={c.chrome.linkToQuestion}>#</a></h3>
                <div className="qa-a"><Blocks blocks={answerBlocks(f.a)} lang={lang} /></div>
              </div>
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
        <Link href={legalPath(lang)}>{c.chrome.footer.legal}</Link>
      </footer>
    </>
  );
}
