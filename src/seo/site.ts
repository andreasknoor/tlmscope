import { OPERATOR, REPO_URL } from "../legal/contact.ts";

/** The one place for what search engines and link previews are told about the site. */
export const SITE_URL = "https://tlmscope.andreasknoor.com";
export const SITE_NAME = "TLMscope";
/** Keyword first: the search result title. */
export const TITLE = "Spektrum TLM Viewer – TLMscope";
/** What a shared link shows: brand first. */
export const SHARE_TITLE = "TLMscope – Spektrum telemetry log viewer";
export const DESCRIPTION = "Free online viewer for Spektrum telemetry logs (.TLM). Flight summaries, charts, map and 3D replay in your browser. No install, nothing uploaded.";

/** Pages that belong in the sitemap, as paths. */
export const SITEMAP_PATHS = ["/", "/legal"] as const;

export const absolute = (path: string) => new URL(path, SITE_URL).toString();

/** Structured data for the home page (schema.org): the site and the web application. */
export function structuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: DESCRIPTION,
        inLanguage: ["en", "de"],
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: ["TLM scope", "Spektrum TLM Viewer"],
        description: DESCRIPTION,
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
    ],
  };
}
