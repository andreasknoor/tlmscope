import { OPERATOR, REPO_URL } from "../legal/contact.ts";
import { LANGS, PAGE_IDS, homePath, pagePath, pathOf, type Lang, type PageId } from "./pages.ts";

/** The one place for what search engines and link previews are told about the site. */
export const SITE_URL = "https://tlmscope.andreasknoor.com";
export const SITE_NAME = "TLMscope";

export const absolute = (path: string) => new URL(path, SITE_URL).toString();

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
export const SITEMAP: { path: string; alternates?: Record<Lang, string> }[] = [
  ...GUIDE_PAGES.flatMap((id) => LANGS.map((lang) => ({ path: pathOf(lang, id), alternates: { en: pathOf("en", id), de: pathOf("de", id) } }))),
  { path: "/legal" },
];

/** Language alternatives of a page (hreflang), with English as the default for everything else. */
export function languageAlternates(id?: PageId): Record<string, string> {
  return { en: absolute(pathOf("en", id)), de: absolute(pathOf("de", id)), "x-default": absolute(pathOf("en", id)) };
}

export interface Faq { q: string; a: string }

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
        alternateName: ["TLM scope", "Spektrum TLM Viewer"],
        description,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires JavaScript. The flight map and 3D replay need WebGL.",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        inLanguage: ["en", "de"],
        featureList: [
          "Reads Spektrum .TLM telemetry logs (NX, iX, DX) in the browser",
          "Flight summaries with simple ratings",
          "Charts for height, climb, motor, battery and radio link",
          "Flight path on a map with 3D replay",
          "Battery ageing across flights",
          "Files never leave the browser",
        ],
        author: { "@type": "Person", name: OPERATOR.name },
        sameAs: [REPO_URL],
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      ...(faq.length ? [faqPage(faq)] : []),
    ],
  };
}

/** Structured data for a guide page: breadcrumbs and, where the page shows questions, the FAQ. */
export function guideStructuredData(lang: Lang, id: PageId, title: string, homeLabel: string, faq: Faq[] | undefined) {
  return {
    "@context": "https://schema.org",
    "@graph": [
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

