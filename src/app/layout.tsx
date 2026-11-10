import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Barlow_Semi_Condensed, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "uplot/dist/uPlot.min.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { DESCRIPTION, SHARE_TITLE, SITE_NAME, SITE_URL, structuredData, TITLE } from "@/seo/site";

const display = Barlow_Semi_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const body = Source_Sans_3({ variable: "--font-body", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });

// Link previews (Facebook, WhatsApp, X, Slack …) read the Open Graph and Twitter tags; the image
// comes from app/opengraph-image.tsx and needs the absolute site address (metadataBase).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SHARE_TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    alternateLocale: ["de_DE"],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#151f25" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }} />
        {/* Cookieless page-view counting (Umami Cloud). Only on the live domain; honours "Do Not Track";
            no URL hash or query. Allowed in the CSP in vercel.json and described on the privacy page. */}
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="172a6628-9f2e-4adb-804c-34d1355bc80c"
          data-domains="tlmscope.andreasknoor.com"
          data-do-not-track="true"
          data-exclude-hash="true"
          data-exclude-search="true"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
