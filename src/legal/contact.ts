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

/** Date the privacy policy was last checked. */
export const PRIVACY_DATE = { de: "November 2026", en: "November 2026" } as const;
