import Image from "next/image";
import type { Block } from "./content/types.ts";
import { Inline, type GuideLinkHandler } from "./Inline";
import { SCREENSHOTS } from "./images.ts";
import type { Lang } from "./pages.ts";

export function Blocks({ blocks, lang, go }: { blocks: Block[]; lang: Lang; go?: GuideLinkHandler }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p": return <p key={i}><Inline text={b.text} lang={lang} go={go} /></p>;
          case "note": return <p key={i} className="note"><Inline text={b.text} lang={lang} go={go} /></p>;
          case "ul": return <ul key={i}>{b.items.map((it, k) => <li key={k}><Inline text={it} lang={lang} go={go} /></li>)}</ul>;
          case "ol": return <ol key={i}>{b.items.map((it, k) => <li key={k}><Inline text={it} lang={lang} go={go} /></li>)}</ol>;
          case "table": return (
            <div key={i} className="scroll">
              <table className="tbl">
                <thead><tr>{b.head.map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
                <tbody>{b.rows.map((row, r) => <tr key={r}>{row.map((cell, k) => <td key={k} data-label={b.head[k]}><Inline text={cell} lang={lang} go={go} /></td>)}</tr>)}</tbody>
              </table>
            </div>
          );
          case "img": {
            const size = SCREENSHOTS[b.name];
            return (
              <figure key={i}>
                <Image src={`/img/${b.name}-${lang}.jpg`} alt={b.alt} width={size.w} height={size.h} sizes="(max-width: 800px) 100vw, 780px" />
                <figcaption>{b.caption}</figcaption>
              </figure>
            );
          }
        }
      })}
    </>
  );
}
