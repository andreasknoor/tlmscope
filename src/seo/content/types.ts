import type { Faq } from "../site.ts";
import type { PageId } from "../pages.ts";

/**
 * Text content of the pages. Inline markup in every string: `[text](target)`, `**bold**` and `` `code` ``;
 * a link target is `home`, `legal`, `page:<id>` or an https address.
 */
export type Block =
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "note"; text: string }
  | { t: "table"; head: string[]; rows: string[][] }
  /** A screenshot: file `public/img/<name>-<lang>.jpg`. */
  | { t: "img"; name: string; alt: string; caption: string };

export interface Section { h2: string; blocks: Block[] }

export interface Guide {
  /** Search result title, up to 60 characters. */
  title: string;
  /** Search result description, up to 160 characters. */
  description: string;
  h1: string;
  lead: string;
  sections: Section[];
  /** Questions shown on the page; also given to search engines as structured data. */
  faq?: Faq[];
}

export interface Chrome {
  home: string;
  guides: string;
  switchTo: { label: string; title: string };
  cta: { title: string; text: string; button: string };
  footer: { by: string; source: string; notAffiliated: string; legal: string };
  skip: string;
  /** Short names of the guides for the navigation. */
  nav: Record<PageId, string>;
  /** Heading above the questions of a guide. */
  faq: string;
}

export type IconName = "summary" | "chart" | "map" | "battery" | "lock" | "usb" | "radio" | "question" | "drop" | "play" | "help" | "x" | "device";

/** One of the five topics under the drop zone: a link to its own page that also opens a short summary. */
export interface Tile {
  id: "see" | "logs" | "radios" | "data" | "faq";
  icon: IconName;
  label: string;
  title: string;
  /** The summary: paragraphs and lists. */
  body: Block[];
  /** The page with the full text. */
  page: PageId;
}

/** The start page. */
export interface Home {
  h1: string;
  sub: string;
  facts: { icon: IconName; text: string }[];
  drop: { title: string; touchTitle: string; button: string; aria: string };
  demo: { label: string; alt: string };
  tiles: Tile[];
  tilesLabel: string;
  more: { read: string; close: string };
  guidesLabel: string;
}

export interface Content {
  chrome: Chrome;
  home: Home;
  guides: Record<PageId, Guide>;
}
