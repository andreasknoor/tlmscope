import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "uplot/dist/uPlot.min.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const display = Barlow_Semi_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const body = Source_Sans_3({ variable: "--font-body", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "TLMscope",
  description: "See what happened during your RC flights. Reads Spektrum telemetry logs in your browser.",
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
      <body>{children}</body>
    </html>
  );
}
