import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { OPERATOR, PRIVACY_DATE, REPO_URL } from "@/legal/contact";

export const metadata: Metadata = {
  title: "Impressum & Datenschutz · TLMscope",
  description: "Legal notice and privacy policy of TLMscope.",
  alternates: { canonical: "/legal" },
  openGraph: { type: "website", url: "/legal", siteName: "TLMscope", title: "Impressum & Datenschutz · TLMscope", description: "Legal notice and privacy policy of TLMscope.", images: [{ url: "/og-en.png", width: 1200, height: 630 }] },
};

const ext = (href: string, text: ReactNode = href) => <a href={href} target="_blank" rel="noopener noreferrer">{text}</a>;
const mail = <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>;
const address = (lang: "de" | "en") => (
  <p>
    {OPERATOR.name}<br />
    {OPERATOR.street}<br />
    {OPERATOR.city}<br />
    {OPERATOR.country[lang]}
  </p>
);

/** Legal notice (§ 5 DDG) and privacy policy (GDPR). German is the binding version; English follows for convenience. */
export default function LegalPage() {
  return (
    <main className="legal">
      <p><Link href="/">← TLMscope</Link> · <a href="#de">Deutsch</a> · <a href="#en">English</a></p>

      <section id="de" lang="de">
        <h1>Impressum</h1>
        <h2>Angaben gemäß § 5 DDG</h2>
        {address("de")}
        <h2>Kontakt</h2>
        <p>E-Mail: {mail}</p>
        <p>TLMscope ist ein privates, nicht kommerzielles Projekt. Es wird nicht von Spektrum oder Horizon Hobby hergestellt oder unterstützt.</p>

        <h1>Datenschutzerklärung</h1>
        <h2>1. Verantwortlicher</h2>
        {address("de")}
        <p>E-Mail: {mail}</p>

        <h2>2. Deine Log-Dateien</h2>
        <p>
          Telemetrie-Dateien, die du in TLMscope öffnest, werden ausschließlich in deinem Browser gelesen und ausgewertet.
          Sie werden nicht hochgeladen, nicht an mich oder Dritte übertragen und nirgends gespeichert. Schließt du den Tab, sind sie aus der App verschwunden.
        </p>
        <p>Es gibt kein Benutzerkonto und keine Cookies. Inhalte deiner Dateien werden auch von der Besucherzählung (Abschnitt 5) nicht erfasst.</p>

        <h2>3. Hosting</h2>
        <p>
          Die Website wird von Vercel Inc. (440 N Barranca Ave #4133, Covina, CA 91723, USA) bereitgestellt.
          Beim Aufruf verarbeitet Vercel technisch notwendige Daten: IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browser-Kennung (User-Agent) und Referrer.
          Das dient der Auslieferung und Sicherheit der Website (Art. 6 Abs. 1 lit. f DSGVO). Die Daten können in die USA übermittelt werden;
          Vercel ist nach dem EU-US Data Privacy Framework zertifiziert. Einzelheiten: {ext("https://vercel.com/legal/privacy-policy")}.
        </p>

        <h2>4. Karte</h2>
        <p>
          Nur wenn du ein Log mit GPS-Daten öffnest und den Tab „Flugweg“ aufrufst, lädt die Karte Kartenbilder von OpenFreeMap ({ext("https://openfreemap.org")}, Server tiles.openfreemap.org).
          Dabei erhält dieser Dienst wie jede Website deine IP-Adresse und den angefragten Kartenausschnitt, also ungefähr die Gegend des Flugs. Deine Log-Datei wird nicht übertragen.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Darstellung der Karte, die du aufrufst).
        </p>

        <h2>5. Besucherzählung (Umami)</h2>
        <p>
          Um zu sehen, wie viele Menschen TLMscope nutzen, zähle ich Seitenaufrufe mit Umami Cloud, einem Dienst der Umami Software, Inc. (USA), {ext("https://umami.is/privacy")}.
          Umami setzt keine Cookies und speichert keine IP-Adressen. Erfasst werden die aufgerufene Seite (ohne die Teile hinter „#“ und „?“), die verweisende Seite,
          Browser, Betriebssystem, Gerätetyp, Bildschirmgröße, Sprache und das aus der IP-Adresse abgeleitete Land. Daraus entstehen nur zusammengefasste Statistiken;
          einzelne Besucher lassen sich damit nicht identifizieren. Außerdem zähle ich einige Bedienschritte ohne Bezug zum Inhalt: Demo geladen, Datei geöffnet
          (nur Dateiformat und grobe Größenklasse), Datei konnte nicht gelesen werden (nur die Art des Fehlers), Ansicht konnte nicht angezeigt werden und welcher Tab geöffnet wurde.
          Namen, Inhalte oder Werte deiner Log-Dateien werden nicht übertragen.
          Wenn dein Browser „Do Not Track“ sendet, wird nichts gezählt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer anonymen Nutzungsstatistik).
          Die Daten können in die USA übermittelt werden.
        </p>

        <h2>6. Schriften</h2>
        <p>Die Schriftarten werden von dieser Website selbst ausgeliefert. Es besteht keine Verbindung zu Google Fonts oder anderen Schriftanbietern.</p>

        <h2>7. Gespeicherte Einstellungen</h2>
        <p>
          Sprache, Farbschema, Einheiten, Detailansicht, Sitzungsfilter sowie von dir eingetragene Akkukapazitäten und Akku-Namen werden im lokalen Speicher deines Browsers (localStorage) abgelegt, damit sie beim nächsten Besuch erhalten bleiben.
          Diese Daten verlassen dein Gerät nicht und du kannst sie jederzeit über die Browser-Einstellungen löschen (§ 25 Abs. 2 Nr. 2 TDDDG).
        </p>
        <p>
          Damit TLMscope auch ohne Internet funktioniert, speichert dein Browser beim Besuch die Programmdateien der App (Seiten, Skripte, Schriften, Symbole und den Demo-Flug) in seinem Zwischenspeicher (Service Worker).
          Deine Log-Dateien werden dabei nicht gespeichert. Auch diese Daten verlassen dein Gerät nicht und lassen sich über die Browser-Einstellungen löschen (§ 25 Abs. 2 Nr. 2 TDDDG).
        </p>

        <h2>8. Externe Links</h2>
        <p>Links, z. B. zum Quellcode auf GitHub, führen zu Angeboten anderer Anbieter. Dort gelten deren Datenschutzbestimmungen.</p>

        <h2>9. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung, auf Datenübertragbarkeit sowie das Recht,
          der Verarbeitung zu widersprechen (Art. 15–21 DSGVO). Wende dich dazu an die oben genannte E-Mail-Adresse.
          Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren.
        </p>
        <p className="hint">Stand: {PRIVACY_DATE.de}</p>
      </section>

      <hr />

      <section id="en" lang="en">
        <h1>Legal notice</h1>
        <p className="hint">Translation for convenience; the German version above is binding.</p>
        <h2>Information according to § 5 DDG</h2>
        {address("en")}
        <h2>Contact</h2>
        <p>E-mail: {mail}</p>
        <p>TLMscope is a private, non-commercial project. It is not made or endorsed by Spektrum or Horizon Hobby.</p>

        <h1>Privacy policy</h1>
        <h2>1. Controller</h2>
        {address("en")}
        <p>E-mail: {mail}</p>

        <h2>2. Your log files</h2>
        <p>
          Telemetry files you open in TLMscope are read and analysed only in your browser. They are not uploaded, not sent to me or anyone else,
          and not stored anywhere. When you close the tab, they are gone from the app.
        </p>
        <p>There is no account and there are no cookies. The visitor count (section 5) does not record anything from your files either.</p>

        <h2>3. Hosting</h2>
        <p>
          The website is served by Vercel Inc. (440 N Barranca Ave #4133, Covina, CA 91723, USA). When you visit it, Vercel processes technically necessary data:
          IP address, time, requested address, browser identifier (user agent) and referrer, to deliver and protect the website (Art. 6(1)(f) GDPR).
          The data may be transferred to the USA; Vercel is certified under the EU-US Data Privacy Framework. Details: {ext("https://vercel.com/legal/privacy-policy")}.
        </p>

        <h2>4. Map</h2>
        <p>
          Only when you open a log with GPS data and go to the Flight path tab, the map loads map images from OpenFreeMap ({ext("https://openfreemap.org")}, server tiles.openfreemap.org).
          Like any website, that service receives your IP address and the requested map area, so roughly where the flight was. Your log file is not sent.
          Legal basis: Art. 6(1)(f) GDPR (showing the map you asked for).
        </p>

        <h2>5. Visitor count (Umami)</h2>
        <p>
          To see how many people use TLMscope, I count page views with Umami Cloud, a service of Umami Software, Inc. (USA), {ext("https://umami.is/privacy")}.
          Umami sets no cookies and stores no IP addresses. It records the page visited (without the parts after “#” and “?”), the referring page,
          browser, operating system, device type, screen size, language and the country derived from the IP address. Only aggregated statistics result;
          individual visitors cannot be identified from them. I also count a few actions, unrelated to content: demo loaded, file opened
          (only the file format and a rough size class), file could not be read (only the kind of error), view could not be shown, and which tab was opened.
          Names, contents or values of your log files are not sent.
          If your browser sends “Do Not Track”, nothing is counted. Legal basis: Art. 6(1)(f) GDPR (legitimate interest in anonymous usage statistics).
          The data may be transferred to the USA.
        </p>

        <h2>6. Fonts</h2>
        <p>Fonts are served by this website itself. There is no connection to Google Fonts or other font services.</p>

        <h2>7. Saved settings</h2>
        <p>
          Language, colour scheme, units, detail view, session filter, and the battery capacities and battery names you entered are kept in your browser&apos;s local storage so they are still set on your next visit.
          This data does not leave your device, and you can delete it at any time in your browser settings (§ 25(2) no. 2 TDDDG).
        </p>
        <p>
          So that TLMscope also works without internet, your browser stores the app&apos;s program files (pages, scripts, fonts, icons and the demo flight) in its cache (service worker) when you visit.
          Your log files are not stored. This data does not leave your device either, and you can delete it in your browser settings (§ 25(2) no. 2 TDDDG).
        </p>

        <h2>8. External links</h2>
        <p>Links, for example to the source code on GitHub, lead to other providers. Their privacy policies apply there.</p>

        <h2>9. Your rights</h2>
        <p>
          You have the right of access, rectification, erasure, restriction of processing, data portability and the right to object (Art. 15–21 GDPR).
          Write to the e-mail address above. You can also lodge a complaint with a data protection supervisory authority.
        </p>
        <p className="hint">Last updated: {PRIVACY_DATE.en}</p>
      </section>

      <p><Link href="/">← TLMscope</Link> · {ext(REPO_URL, "Source code on GitHub")}</p>
    </main>
  );
}
