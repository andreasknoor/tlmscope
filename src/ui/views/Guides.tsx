"use client";

import { useTranslations } from "next-intl";
import { useEffect, type RefObject } from "react";
import { Blocks } from "@/seo/Blocks";
import { CONTENT } from "@/seo/content";
import { FaqAnchors } from "@/seo/FaqAnchors";
import { Inline } from "@/seo/Inline";
import { answerBlocks } from "@/seo/markup";
import { legalPath, pagePath, PAGE_IDS, UPDATED, type PageId } from "@/seo/pages";
import { faqId } from "@/seo/site";
import { useStore } from "../store";

/** Which guide the help shows, and optionally the question or anchor to open on it. */
export interface GuideTarget { page: PageId; anchor?: string }

const longDate = (lang: "en" | "de", d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * The guides of the website inside the app, with the same navigation, so the help never leaves the loaded logs
 * (they live only in memory). Same content as the guide pages (`src/seo/content`); links between guides switch
 * the guide here, a link to the home page closes the help, the legal page opens in a new tab.
 */
export function Guides({ dialogRef, target, setTarget }: { dialogRef: RefObject<HTMLDialogElement | null>; target: GuideTarget | null; setTarget: (t: GuideTarget) => void }) {
  const { settings } = useStore();
  const ta = useTranslations("app");
  const lang = settings.locale;
  const c = CONTENT[lang];
  const g = target ? c.guides[target.page] : null;
  const close = () => dialogRef.current?.close();

  const go = (to: string) => {
    if (to === "home") { close(); return; }
    if (to === "legal") { window.open(legalPath(lang), "_blank", "noopener"); return; }
    if (!to.startsWith("page:")) return;
    const [page, anchor] = to.slice(5).split("#") as [PageId, string | undefined];
    if ((PAGE_IDS as readonly string[]).includes(page)) setTarget({ page, anchor });
  };

  // On a new guide or anchor: open and show the question, else start at the top.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg || !target) return;
    const el = target.anchor ? dlg.querySelector<HTMLElement>(`[id="${CSS.escape(target.anchor)}"]`) : null;
    if (el instanceof HTMLDetailsElement) el.open = true;
    if (el) el.scrollIntoView({ block: "start" });
    else dlg.scrollTop = 0;
  }, [target, dialogRef]);

  return (
    <dialog className="helpdlg guides" ref={dialogRef} aria-labelledby="helpTitle" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      {/* No text until the help is first opened (target is null): the prerendered app page then carries
          no copy of a guide page, search engines find that text on the guide pages only. */}
      {target && g && <>
      <div className="hd">
        <nav className="guidenav" aria-label={c.chrome.guides}>
          {PAGE_IDS.map((id) => (
            <a key={id} href={pagePath(lang, id)} aria-current={id === target.page ? "page" : undefined}
              onClick={(e) => { if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); setTarget({ page: id }); }}>
              {c.chrome.nav[id]}
            </a>
          ))}
        </nav>
        <button className="btn" onClick={close}>{ta("close")}</button>
      </div>
      <div className="doc">
        <h1 id="helpTitle">{g.h1}</h1>
        <p className="lead"><Inline text={g.lead} lang={lang} go={go} /></p>
        <p className="updated">{c.chrome.updated} <time dateTime={UPDATED[target.page]}>{longDate(lang, UPDATED[target.page])}</time>
          {" · "}<a href={pagePath(lang, target.page)} target="_blank" rel="noopener">{ta("helpOnWeb")}</a></p>
        {g.sections.map((s) => (
          <section key={s.h2}>
            <h2>{s.h2}</h2>
            <Blocks blocks={s.blocks} lang={lang} go={go} />
          </section>
        ))}
        {g.faq && (
          <section key={target.page}>
            {g.sections.length > 0 && <h2>{c.chrome.faq}</h2>}
            <FaqAnchors toggle={g.faq.length > 6 ? c.chrome.allQuestions : undefined} />
            {/* No "#" link per question here: the address of the app belongs to the app's own views. */}
            {g.faq.map((f) => (
              <details key={f.q} id={faqId(f)} className="qa">
                <summary><h3>{f.q}</h3></summary>
                <div className="qa-a"><Blocks blocks={answerBlocks(f.a)} lang={lang} go={go} /></div>
              </details>
            ))}
          </section>
        )}
      </div>
      </>}
    </dialog>
  );
}
