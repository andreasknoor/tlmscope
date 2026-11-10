/** The pages of the site and where they live, per language. English is the default (no prefix). */
export type Lang = "en" | "de";
export const LANGS: Lang[] = ["en", "de"];

export const PAGE_IDS = ["open", "understand", "radios", "help", "faq", "compare"] as const;
export type PageId = (typeof PAGE_IDS)[number];

/** Address names; the German ones are German on purpose, they are part of what people search for. */
export const SLUGS: Record<PageId, Record<Lang, string>> = {
  open: { en: "open-tlm-files", de: "tlm-dateien-oeffnen" },
  understand: { en: "understand-telemetry", de: "telemetrie-verstehen" },
  radios: { en: "supported-radios", de: "unterstuetzte-sender" },
  help: { en: "help", de: "hilfe" },
  faq: { en: "faq", de: "haeufige-fragen" },
  compare: { en: "compare", de: "vergleich" },
};

export const homePath = (lang: Lang) => (lang === "de" ? "/de" : "/");
export const pagePath = (lang: Lang, id: PageId) => `${lang === "de" ? "/de" : ""}/${SLUGS[id][lang]}`;
export const legalPath = (lang: Lang) => `/legal#${lang}`;
/** Path of a page in a language; `undefined` is the home page. */
export const pathOf = (lang: Lang, id?: PageId) => (id ? pagePath(lang, id) : homePath(lang));

export const slugsFor = (lang: Lang) => PAGE_IDS.map((id) => SLUGS[id][lang]);
export const idForSlug = (lang: Lang, slug: string): PageId | undefined => PAGE_IDS.find((id) => SLUGS[id][lang] === slug);
