import Link from "next/link";
import { Fragment } from "react";
import { LINK, resolveTarget, TOKEN } from "./markup.ts";
import type { Lang } from "./pages.ts";

/** Text with the small inline markup of the content files: links, bold and code. */
export function Inline({ text, lang }: { text: string; lang: Lang }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        const link = LINK.exec(part);
        if (link) {
          const to = resolveTarget(lang, link[2]);
          if (!to) return <Fragment key={i}>{link[1]}</Fragment>;
          return to.external
            ? <a key={i} href={to.href} target="_blank" rel="noopener noreferrer">{link[1]}</a>
            : <Link key={i} href={to.href}>{link[1]}</Link>;
        }
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}><Inline text={part.slice(2, -2)} lang={lang} /></strong>;
        if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
