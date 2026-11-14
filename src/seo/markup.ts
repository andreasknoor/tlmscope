import type { Answer, Block } from "./content/types.ts";
import { homePath, legalPath, pagePath, PAGE_IDS, type Lang, type PageId } from "./pages.ts";

/** Inline markup of the content files: `[text](target)`, `**bold**` and `` `code` ``. */
export const TOKEN = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/;
export const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

/** Where a link target in the content points: `home`, `legal`, `page:<id>` (optionally `page:<id>#<anchor>`) or an https address. */
export function resolveTarget(lang: Lang, target: string): { href: string; external: boolean } | null {
  if (target === "home") return { href: homePath(lang), external: false };
  if (target === "legal") return { href: legalPath(lang), external: false };
  if (target.startsWith("page:")) {
    const [id, anchor] = target.slice(5).split("#") as [PageId, string | undefined];
    return (PAGE_IDS as readonly string[]).includes(id) ? { href: pagePath(lang, id) + (anchor ? `#${anchor}` : ""), external: false } : null;
  }
  return /^https:\/\//.test(target) ? { href: target, external: true } : null;
}


/** The same text without markup, for structured data and plain text. */
export function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}

/** The blocks of an answer: a plain string is one paragraph. */
export function answerBlocks(a: Answer): Block[] {
  return typeof a === "string" ? [{ t: "p", text: a }] : a;
}

/**
 * An answer as plain text: paragraphs separated by a blank line, list items on their own lines.
 * With `markdown`, list items get "- " or "1. " (for llms.txt); without, they stay bare (structured data).
 */
export function answerPlain(a: Answer, markdown = false): string {
  return answerBlocks(a).map((b) => {
    if (b.t === "p" || b.t === "note") return plain(b.text);
    if (b.t === "ul" || b.t === "ol") return b.items.map((it, k) => (markdown ? (b.t === "ul" ? "- " : `${k + 1}. `) : "") + plain(it)).join("\n");
    return "";
  }).filter(Boolean).join("\n\n");
}
