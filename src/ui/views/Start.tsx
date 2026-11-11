"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { Blocks } from "@/seo/Blocks";
import { CONTENT } from "@/seo/content";
import type { Tile } from "@/seo/content/types";
import { homePath, pagePath, PAGE_IDS } from "@/seo/pages";
import { Logo, Wordmark } from "../brand";
import { Icon } from "../icons";
import { useLogoClicks } from "../StorkRace";
import { SettingsButton } from "../bits";
import { useStore } from "../store";

/** The flight of the demo: motor climbs, glides and a thermal, in the colours of the app. Drawn once when the page opens. */
const TRACE: { cls: string; d: string; delay: number }[] = [
  { cls: "z", d: "M0 62H70", delay: 0.1 },
  { cls: "m", d: "M70 62L150 24", delay: 0.25 },
  { cls: "g", d: "M150 24L250 38", delay: 0.45 },
  { cls: "l", d: "M250 38C285 40 300 26 335 28S405 12 440 8", delay: 0.65 },
  { cls: "g", d: "M440 8L650 48", delay: 0.9 },
  { cls: "m", d: "M650 48L710 22", delay: 1.2 },
  { cls: "g", d: "M710 22L920 60", delay: 1.35 },
  { cls: "z", d: "M920 62H1000", delay: 1.65 },
];

/** One topic under the drop zone: a link to its page that also opens a short summary. */
function TileLink({ tile, lang, dialog }: { tile: Tile; lang: "en" | "de"; dialog: (el: HTMLDialogElement | null) => void }) {
  const c = CONTENT[lang].home;
  const ref = useRef<HTMLDialogElement | null>(null);
  const href = pagePath(lang, tile.page);
  return (
    <>
      <Link
        className="st-tile"
        href={href}
        onClick={(e) => {
          // A plain click shows the summary; a click with a modifier key, or without script, goes to the page.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
          e.preventDefault();
          ref.current?.showModal();
        }}
      >
        <Icon name={tile.icon} />
        {tile.label}
      </Link>
      <dialog
        className="st-dialog"
        ref={(el) => { ref.current = el; dialog(el); }}
        aria-labelledby={`st-${tile.id}-title`}
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      >
        <div className="st-dh">
          <span className="st-ico"><Icon name={tile.icon} /></span>
          <h2 id={`st-${tile.id}-title`}>{tile.title}</h2>
          <button type="button" aria-label={c.more.close} onClick={() => ref.current?.close()}><Icon name="x" /></button>
        </div>
        <div className="st-db">
          <Blocks blocks={tile.body} lang={lang} />
          <p><Link className="btn primary" href={href}>{c.more.read}</Link></p>
        </div>
      </dialog>
    </>
  );
}

/**
 * The start screen: the drop zone and the demo in a brand panel, the topics as links under it.
 * All texts come from the content files, so the same words are on the page that search engines read.
 */
export function Start({ notices }: { notices: ReactNode }) {
  const t = useTranslations("app");
  const { addFiles, loadDemo, settings, setSettings, openHelp, openSettings } = useStore();
  const lang = settings.locale;
  const c = CONTENT[lang];
  const h = c.home;
  const { onLogo, extra } = useLogoClicks();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const dialogs = useRef<(HTMLDialogElement | null)[]>([]);
  return (
    <div className="start">
      <svg className="st-trace" viewBox="0 0 1000 70" preserveAspectRatio="none" aria-hidden="true">
        {TRACE.map((p) => <path key={p.d} className={p.cls} pathLength={1} style={{ "--d": `${p.delay}s` } as React.CSSProperties} d={p.d} />)}
      </svg>
      <div className="st-panel">
        <div className="st-wrap">
          <div className="st-bar">
            <div className="seg" role="group" aria-label="Language">
              {(["en", "de"] as const).map((l) => (
                <button key={l} aria-pressed={lang === l} onClick={() => setSettings({ locale: l })}>{l.toUpperCase()}</button>
              ))}
            </div>
            <SettingsButton onClick={openSettings} label={t("settings")} />
            <button className="helpbtn" aria-label={t("help")} onClick={openHelp}><i aria-hidden="true">?</i><span className="long">{t("help")}</span></button>
          </div>
          <div className="st-grid">
            <header className="st-head">
              <a className="st-lockup" href={homePath(lang)} aria-label="TLMscope" onClick={(e) => { e.preventDefault(); onLogo(); }}><Logo size={60} /><Wordmark /></a>
              {extra}
              <h1>{h.h1}</h1>
              <p className="st-sub">{h.sub}</p>
            </header>
            <ul className="st-facts">
              {h.facts.map((f) => <li key={f.text}><Icon name={f.icon} />{f.text}</li>)}
            </ul>
            <div className="st-dropcol">
              {notices}
              <div
                className={`st-drop${over ? " over" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={h.drop.aria}
                onClick={() => input.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
                onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); addFiles([...e.dataTransfer.files]); }}
              >
                <Icon name="drop" className="st-dropicon" />
                <strong><span className="pointer-only">{h.drop.title}</span><span className="touch-only">{h.drop.touchTitle}</span></strong>
                <span className="btn primary big">{h.drop.button}</span>
                <input ref={input} type="file" accept=".tlm,.TLM" multiple hidden onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
              </div>
              <button className="st-preview" type="button" onClick={loadDemo} aria-label={h.demo.label}>
                <Image src={`/img/overview-${lang}.jpg`} alt={h.demo.alt} width={1200} height={539} sizes="(max-width: 900px) 100vw, 470px" />
                <span><Icon name="play" />{h.demo.label}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <nav className="st-tiles" aria-label={h.tilesLabel}>
        {h.tiles.map((tile, i) => <TileLink key={tile.id} tile={tile} lang={lang} dialog={(el) => { dialogs.current[i] = el; }} />)}
      </nav>
      <nav className="st-guides" aria-label={h.guidesLabel}>
        {PAGE_IDS.map((id) => <Link key={id} href={pagePath(lang, id)}>{c.chrome.nav[id]}</Link>)}
      </nav>
    </div>
  );
}
