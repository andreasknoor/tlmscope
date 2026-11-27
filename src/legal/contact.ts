/**
 * Operator details for the legal notice and the privacy policy. The only place they are kept.
 * `legal.test.ts` fails while a placeholder is left, and with it the Vercel build, so the
 * page never goes live incomplete.
 */
export const OPERATOR = {
  name: "Andreas Knoor",
  street: "Bredower Weg 2",
  city: "14612 Falkensee",
  country: { de: "Deutschland", en: "Germany" },
  email: "andreas.knoor@gmail.com",
} as const;

export const REPO_URL = "https://github.com/andreasknoor/tlmscope";

/** StickScope, the slow-motion trainer for 3D figures by the same author; linked from the footer and one guide. */
export const STICKSCOPE_URL = "https://stickscope.andreasknoor.com";

/** "Buy me a coffee": a plain link, no widget (nothing loads from the provider until it is clicked). Footer, feedback dialog, FAQ. */
export const SUPPORT_URL = "https://buymeacoffee.com/andreasknoor";
/** The support page in the language of the app or guide (`?l=en` / `?l=de`). */
export const supportUrl = (lang: "en" | "de") => `${SUPPORT_URL}?l=${lang}`;

/** Date the privacy policy was last checked. */
export const PRIVACY_DATE = { de: "November 2026", en: "November 2026" } as const;
