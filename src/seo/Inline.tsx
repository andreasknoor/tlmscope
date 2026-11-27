import Link from "next/link";
import { Fragment } from "react";
import { LINK, resolveTarget, TOKEN } from "./markup.ts";
import type { Lang } from "./pages.ts";
import { SUPPORT_URL } from "../legal/contact.ts";
import { eventAttrs } from "../ui/analytics.ts";

/**
 * Handles a link to another guide or the home page itself instead of loading that page; the app uses it to
 * show guides without leaving the loaded logs. Gets the link target as written in the content (`page:faq#id`).
 */
export type GuideLinkHandler = (target: string) => void;

/** Text with the small inline markup of the content files: links, bold and code. */
export function Inline({ text, lang, go }: { text: string; lang: Lang; go?: GuideLinkHandler }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        const link = LINK.exec(part);
        if (link) {
          const to = resolveTarget(lang, link[2]);
          if (!to) return <Fragment key={i}>{link[1]}</Fragment>;
          if (to.external) {
            const counted = to.href.startsWith(SUPPORT_URL) ? eventAttrs({ name: "support-opened", from: "faq" }) : {};
            return <a key={i} href={to.href} target="_blank" rel="noopener noreferrer" {...counted}>{link[1]}</a>;
          }
          if (go) {
            // A plain click stays in the app; a click with a modifier key opens the page in a new tab as usual.
            return <a key={i} href={to.href} target="_blank" rel="noopener" onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              go(link[2]);
            }}>{link[1]}</a>;
          }
          return <Link key={i} href={to.href}>{link[1]}</Link>;
        }
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}><Inline text={part.slice(2, -2)} lang={lang} go={go} /></strong>;
        if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
