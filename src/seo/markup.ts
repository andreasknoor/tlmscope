import { homePath, legalPath, pagePath, PAGE_IDS, type Lang, type PageId } from "./pages.ts";

/** Inline markup of the content files: `[text](target)`, `**bold**` and `` `code` ``. */
export const TOKEN = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/;
export const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

/** Where a link target in the content points: `home`, `legal`, `page:<id>` or an https address. */
export function resolveTarget(lang: Lang, target: string): { href: string; external: boolean } | null {
  if (target === "home") return { href: homePath(lang), external: false };
  if (target === "legal") return { href: legalPath(lang), external: false };
  if (target.startsWith("page:")) {
    const id = target.slice(5) as PageId;
    return (PAGE_IDS as readonly string[]).includes(id) ? { href: pagePath(lang, id), external: false } : null;
  }
  return /^https:\/\//.test(target) ? { href: target, external: true } : null;
}


/** The same text without markup, for structured data and plain text. */
export function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}
