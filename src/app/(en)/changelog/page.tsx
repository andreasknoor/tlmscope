import type { Metadata } from "next";
import Link from "next/link";
import { CHANGELOG } from "@/changelog";

const description = "What changed in each version of TLMscope, one line per new feature or fix.";

export const metadata: Metadata = {
  title: "Changelog · TLMscope",
  description,
  alternates: { canonical: "/changelog" },
  openGraph: { type: "website", url: "/changelog", siteName: "TLMscope", title: "Changelog · TLMscope", description, images: [{ url: "/og-en.png", width: 1200, height: 630 }] },
};

const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Every version, newest first, grouped by day (English only, also linked from the German UI). */
export default function ChangelogPage() {
  const days = [...new Set(CHANGELOG.map((r) => r.date))];
  return (
    <main className="legal changelog">
      <p><Link href="/">← TLMscope</Link></p>
      <h1>What changed</h1>
      <p>Every update, newest first. One line per change.</p>
      {days.map((d) => (
        <section key={d}>
          <div className="day">{day(d)}</div>
          {CHANGELOG.filter((r) => r.date === d).map((r) => (
            <div key={r.version} className="rel" id={`v${r.version}`}>
              <span className="wn-v">{r.version}</span>
              <div className="items">
                {r.changes.map(([kind, text], i) => (
                  <div key={i} className="it"><span className={`wn-tag ${kind}`}>{kind === "new" ? "New" : "Fix"}</span><span>{text}</span></div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
