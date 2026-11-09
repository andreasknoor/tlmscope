"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { LoadMessage } from "./App";
import { cssVar, clock, dayLabel, num, timeLabel } from "./format";
import { Help } from "./views/Help";
import { Batteries } from "./views/Batteries";
import { Inventory } from "./views/Inventory";
import { SessionView } from "./views/SessionView";
import { Welcome } from "./views/Welcome";
import { useStore, type Entry } from "./store";
import { PHASE_COLOR } from "./charts/LineChart";

export const KIND_COLOR: Record<string, string> = { flight: "var(--s-alt)", "ground-test": "var(--s-motor)", "powered-on": "var(--s-glide)", "transmitter-only": "var(--s-ground)" };

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0d6a83" />
      <path d="M12 46H21L27 37L32 40L39 27L44 30L51 17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="51" cy="17" r="5" fill="#fff" />
    </svg>
  );
}

export function Wordmark() {
  return <span className="wordmark"><b>TLM</b>scope</span>;
}

function Header() {
  const t = useTranslations("app");
  const { view, go, settings, setSettings, openHelp, files } = useStore();
  return (
    <header className="top">
      <a className="brand" href="#sessions" onClick={(e) => { e.preventDefault(); go("sessions"); }}>
        <Logo /><Wordmark />
      </a>
      {files.length > 0 && (
        <nav className="nav" aria-label="Main">
          {(["sessions", "batteries", "inventory"] as const).map((v) => (
            <a key={v} href={`#${v}`} aria-current={view === v ? "page" : undefined} onClick={(e) => { e.preventDefault(); go(v); }}>{t(v)}</a>
          ))}
        </nav>
      )}
      <div className="spacer" />
      <div className="controls">
        {files.length > 0 && (
          <>
            <div className="ctl"><span>{t("detail")}</span>
              <div className="seg" role="group" aria-label={t("detail")}>
                {(["simple", "standard", "expert"] as const).map((l) => (
                  <button key={l} aria-pressed={settings.level === l} onClick={() => setSettings({ level: l })}>{t(l)}</button>
                ))}
              </div>
            </div>
            <button className="toggle" aria-pressed={settings.details} onClick={() => setSettings({ details: !settings.details })}>
              <span className="sw" aria-hidden="true" />{t("showDetails")}
            </button>
          </>
        )}
        <div className="seg" role="group" aria-label="Language">
          {(["en", "de"] as const).map((l) => (
            <button key={l} aria-pressed={settings.locale === l} onClick={() => setSettings({ locale: l })}>{l.toUpperCase()}</button>
          ))}
        </div>
        <button className="helpbtn" onClick={openHelp}><i aria-hidden="true">?</i>{t("help")}</button>
      </div>
    </header>
  );
}

function Spark({ e }: { e: Entry }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const p = e.a.profile.available ? e.a.profile.value : null;
    if (!cv || !p || p.maxAltitudeM === null) return;
    const alt = e.a.grid.get("altitude");
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, n = alt.length, top = p.maxAltitudeM;
    ctx.clearRect(0, 0, W, H);
    for (const ph of p.phases) {
      ctx.fillStyle = cssVar(PHASE_COLOR[ph.kind]);
      ctx.globalAlpha = ph.kind === "glide" || ph.kind === "ground" ? 0.25 : 0.55;
      ctx.fillRect((ph.start / n) * W, H - 5, ((ph.end - ph.start + 1) / n) * W, 5);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = cssVar("--s-alt");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    alt.forEach((v, i) => {
      if (v === null) return;
      const x = (i / n) * W, y = H - 6 - (Math.max(0, v) / top) * (H - 8);
      if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
    });
    ctx.stroke();
  }, [e]);
  return <canvas ref={ref} width={220} height={32} aria-hidden="true" />;
}

function Sidebar() {
  const t = useTranslations();
  const { entries, visible, selected, select, settings, setSettings, addFiles, files, closeFile, closeAll } = useStore();
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const loc = settings.locale;
  const dayOf = (e: Entry) => (e.startMs !== null ? dayLabel(loc, e.startMs) : "?");
  return (
    <aside className="side">
      {/* The whole zone accepts drops and clicks; keyboard users get the explicit buttons inside. */}
      <div
        className={`drop ${over ? "over" : ""}`}
        onClick={(e) => { if (!(e.target as HTMLElement).closest("button")) input.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); addFiles([...e.dataTransfer.files]); }}
      >
        {files.map((f) => (
          <div className="file" key={f.fileName}>
            <span title={f.fileName}>{f.fileName}</span>
            <span className="num size">{num(loc, f.sizeBytes / 1e6, 1)} MB</span>
            <button className="x" aria-label={t("app.closeFile", { name: f.fileName })} title={t("app.closeFile", { name: f.fileName })} onClick={() => closeFile(f.fileName)}>×</button>
          </div>
        ))}
        <small>{t("app.dropMore")}</small>
        <div className="dropacts">
          <button className="btn" onClick={() => input.current?.click()}>{t("app.addFiles")}</button>
          <button className="btn" onClick={closeAll}>{t("app.closeAll")}</button>
        </div>
        <input ref={input} type="file" accept=".tlm,.TLM" multiple hidden onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      <div className="sidehead">
        <h2>{t("app.sessions")}</h2>
        <div className="seg" role="group" aria-label={t("app.sessions")}>
          <button aria-pressed={settings.filter === "flights"} onClick={() => setSettings({ filter: "flights" })}>{t("app.flights", { n: entries.filter((e) => e.a.kind === "flight").length })}</button>
          <button aria-pressed={settings.filter === "all"} onClick={() => setSettings({ filter: "all" })}>{t("app.all", { n: entries.length })}</button>
        </div>
      </div>
      <div className="slist">
        {visible.map((e, k) => {
          const d = dayOf(e);
          const head = k === 0 || dayOf(visible[k - 1]) !== d ? <div className="sday">{d}</div> : null;
          const p = e.a.profile.available ? e.a.profile.value : null;
          const meta = e.a.kind === "flight" && p ? `${num(loc, p.maxAltitudeM, 0)} m · ${clock(p.airtimeS)}` : e.a.kind === "transmitter-only" ? "" : clock(e.a.session.durationS);
          return (
            <div key={e.key} style={{ display: "contents" }}>
              {head}
              <button className={`sitem ${e.a.kind === "flight" ? "" : "dim"}`} aria-current={selected?.key === e.key} onClick={() => select(e.key)}>
                <span className="t num">{e.startMs !== null ? timeLabel(loc, e.startMs) : "–"}</span>
                <span className="k">
                  <span className="kdot" style={{ background: KIND_COLOR[e.a.kind] }} />
                  {t(`kind.${e.a.kind}`)}
                  {e.a.issues.some((i) => i.level === 1) && <span title={t("issue.frozen")} style={{ color: "var(--crit)", fontWeight: 700 }}>!</span>}
                </span>
                <span className="m num">{meta}</span>
                {e.a.kind === "flight" && <Spark e={e} />}
              </button>
            </div>
          );
        })}
      </div>
      <div className="keys"><kbd>←</kbd> <kbd>→</kbd> {t("app.keys")}</div>
    </aside>
  );
}

export function Shell({ helpRef, messages, dismiss }: { helpRef: RefObject<HTMLDialogElement | null>; messages: LoadMessage[]; dismiss: (i: number) => void }) {
  const t = useTranslations();
  const { files, view, selected } = useStore();
  const notices = messages.length > 0 && (
    <div className="stack" role="status">
      {messages.map((m, i) => (
        <div key={i} className={m.kind === "error" ? "errorbox" : "loading"} style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
          <span>{t(m.text, m.values)}</span>
          {m.kind === "error" && <button className="btn" onClick={() => dismiss(i)}>{t("app.close")}</button>}
        </div>
      ))}
    </div>
  );
  return (
    <>
      <Header />
      {files.length === 0 ? (
        <div className="welcome">{notices}<Welcome /></div>
      ) : (
        <div className="app">
          <Sidebar />
          <main className="main">
            {notices}
            {view === "batteries" ? <Batteries /> : view === "inventory" ? <Inventory /> : selected ? <SessionView key={selected.key} /> : null}
          </main>
        </div>
      )}
      <Help dialogRef={helpRef} />
    </>
  );
}
