import { CHANGELOG } from "../changelog.ts";
import { OPERATOR, REPO_URL } from "../legal/contact.ts";
import { LANGS, PAGE_IDS, UPDATED, homePath, pagePath, pathOf, type Lang, type PageId } from "./pages.ts";

/** The latest release: the app changes with it, so it dates the home pages and the changelog. */
export const LATEST_RELEASE = CHANGELOG[0];

/** The one place for what search engines and link previews are told about the site. */
export const SITE_URL = "https://www.tlmscope.com";
/** The address before version 2.0: it redirects here (vercel.json) and shows a notice while an old copy is open. */
export const OLD_HOST = "tlmscope.andreasknoor.com";
export const SITE_NAME = "TLMscope";

export const absolute = (path: string) => new URL(path, SITE_URL).toString();

/** One sentence that says what TLMscope is, worded the same everywhere (llms.txt, README, FAQ), so assistants can quote it. */
export const SITE_SUMMARY =
  "TLMscope is a free, browser-based viewer and analyzer for Spektrum .TLM telemetry logs. It runs on Windows, macOS, Linux, Android and iOS without installing anything, and the files stay on your device.";

/** What TLMscope does, for structured data and llms.txt. */
export const FEATURES = [
  "Reads Spektrum .TLM telemetry logs (NX, iX, DX) in the browser",
  "Plain-language flight summaries with simple ratings",
  "Charts for height, climb, motor, battery and radio link (signal in dBm, fades per receiver, signal against distance)",
  "Flight path on a map with 3D replay and ground speed, from a Spektrum GPS sensor or SkyID Remote ID module",
  "Height above ground from GPS when there is no vario",
  "Flight modes and stabilization (AS3X, SAFE, heading hold) with the AS3X gain",
  "Thermal detection",
  "Battery ageing across flights",
  "Total flight time per model and CSV export of the session list",
  "Simulator sessions (Spektrum WS3000 dongle) recognised, with the simulator time summed up separately",
  "Works offline after the first visit",
  "Files never leave the browser",
];

/** Home page texts. `title` is the search result title (keyword first), `share` the title of a shared link (brand first). */
export const HOME_META: Record<Lang, { title: string; share: string; description: string }> = {
  en: {
    title: "Spektrum TLM Viewer – TLMscope",
    share: "TLMscope – Spektrum telemetry log viewer",
    description: "Free online viewer for Spektrum telemetry logs (.TLM). Flight summaries, charts, map and 3D replay in your browser. No install, nothing uploaded.",
  },
  de: {
    title: "Spektrum TLM Viewer: Telemetrie auswerten – TLMscope",
    share: "TLMscope – Telemetrie-Logs von Spektrum auswerten",
    description: "Kostenloser Online-Viewer für Spektrum-Telemetrie-Logs (.TLM): Flugzusammenfassung, Diagramme, Karte und 3D-Wiedergabe im Browser. Ohne Installation und Upload.",
  },
};

/** Addresses of all pages that exist in both languages, as paths: the home page and the guides. */
export const GUIDE_PAGES: (PageId | undefined)[] = [undefined, ...PAGE_IDS];

/** Pages for the sitemap: every guide in both languages (with their language alternatives) and the legal page. */
export const SITEMAP: { path: string; alternates?: Record<Lang, string>; lastModified?: string }[] = [
  ...GUIDE_PAGES.flatMap((id) => LANGS.map((lang) => ({
    path: pathOf(lang, id),
    alternates: { en: pathOf("en", id), de: pathOf("de", id) },
    lastModified: id ? UPDATED[id] : LATEST_RELEASE.date,
  }))),
  { path: "/legal" },
  { path: "/changelog", lastModified: LATEST_RELEASE.date },
];

/** Language alternatives of a page (hreflang), with English as the default for everything else. */
export function languageAlternates(id?: PageId): Record<string, string> {
  return { en: absolute(pathOf("en", id)), de: absolute(pathOf("de", id)), "x-default": absolute(pathOf("en", id)) };
}

/** A question with its answer as plain text, for structured data. */
export interface Faq { q: string; a: string }

/** The anchor of a question: lower case ASCII words joined by hyphens, umlauts spelt out. */
export function faqId(f: { q: string; id?: string }): string {
  if (f.id) return f.id;
  return f.q
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const faqPage = (faq: Faq[]) => ({
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

/** Structured data for a home page: the site, the web application and, if the page shows them, its questions. */
export function homeStructuredData(lang: Lang, faq: Faq[]) {
  const description = HOME_META[lang].description;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description, inLanguage: ["en", "de"] },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        url: absolute(homePath(lang)),
        name: SITE_NAME,
        alternateName: ["TLM scope", "Spektrum TLM Viewer", "Spektrum telemetry log viewer", "Online TLM viewer", "TLM analyzer"],
        description,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires JavaScript. The flight map and 3D replay need WebGL.",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        inLanguage: ["en", "de"],
        softwareVersion: LATEST_RELEASE.version,
        dateModified: LATEST_RELEASE.date,
        featureList: FEATURES,
        author: { "@type": "Person", name: OPERATOR.name },
        sameAs: [REPO_URL],
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      ...(faq.length ? [faqPage(faq)] : []),
    ],
  };
}

/** Structured data for a guide page: the article with its date, breadcrumbs and, where the page shows questions, the FAQ. */
export function guideStructuredData(lang: Lang, id: PageId, page: { title: string; h1: string; description: string }, homeLabel: string, faq: Faq[] | undefined) {
  const url = absolute(pagePath(lang, id));
  const title = page.title;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${url}#article`,
        headline: page.h1,
        description: page.description,
        inLanguage: lang,
        dateModified: UPDATED[id],
        author: { "@type": "Person", name: OPERATOR.name },
        mainEntityOfPage: url,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#app` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: homeLabel, item: absolute(homePath(lang)) },
          { "@type": "ListItem", position: 2, name: title, item: absolute(pagePath(lang, id)) },
        ],
      },
      ...(faq?.length ? [faqPage(faq)] : []),
    ],
  };
}

