"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { LoadMessage } from "./App";
import { cssVar, clock, dayLabel, longDuration, num, timeLabel } from "./format";
import { flightTotal, simulatorTotal } from "./flight-total";
import { downloadText, sessionCsv, sessionCsvFileName } from "./session-csv";
import { Guides } from "./views/Guides";
import { FeedbackDialog } from "./views/FeedbackDialog";
import { SettingsDialog } from "./views/Settings";
import { LogbookDialog } from "./views/LogbookDialog";
import { counted, totals } from "./my-logbook";
import { Batteries } from "./views/Batteries";
import { Inventory } from "./views/Inventory";
import { SessionView } from "./views/SessionView";
import { Start } from "./views/Start";
import { useStore, useUnits, type Entry, type Model } from "./store";
import { FeedbackButton, FeedbackLink, OfflineBadge, SettingsButton, useAirtime } from "./bits";
import { ErrorBoundary } from "./ErrorBoundary";
import { track } from "./analytics";
import { OPERATOR, REPO_URL } from "@/legal/contact";
import { WhatsNew } from "./WhatsNew";
import { MovedNotice } from "./MovedNotice";
import { PHASE_COLOR } from "./charts/LineChart";
import { Logo, Wordmark } from "./brand";
import { useLogoClicks } from "./StorkRace";
import { useServiceWorker, type OfflineState } from "./offline";

export const KIND_COLOR: Record<string, string> = { flight: "var(--s-alt)", "ground-test": "var(--s-motor)", "powered-on": "var(--s-glide)", "transmitter-only": "var(--s-ground)", simulator: "var(--s-4)" };

/** Coloured square of a model; the name is always shown next to it. */
export function ModelBadge({ model, large = false }: { model: Model; large?: boolean }) {
  return <span className={`mbadge${large ? " lg" : ""}`} style={{ background: model.color }} aria-hidden="true" />;
}

/** Model name, or "Unknown model" for sessions without one. */
export function useModelName() {
  const t = useTranslations();
  return (m: Model) => m.name ?? t("app.unknownModel");
}

/** Dropdown that limits the session list to one model. Option values carry a prefix, because a session without a name has the key "". */
export function ModelSelect({ id, count }: { id: string; count?: (key: string | null) => number }) {
  const t = useTranslations();
  const { models, modelFilter, setModelFilter } = useStore();
  const modelName = useModelName();
  const n = (k: string | null) => (count ? ` (${count(k)})` : "");
  return (
    <select id={id} aria-label={t("app.model")} value={modelFilter === null ? "*" : `m:${modelFilter}`} onChange={(ev) => setModelFilter(ev.target.value === "*" ? null : ev.target.value.slice(2))}>
      <option value="*">{t("app.allModels")}{n(null)}</option>
      {models.map((m) => <option key={m.key} value={`m:${m.key}`}>{modelName(m)}{n(m.key)}</option>)}
    </select>
  );
}

/** major.minor, injected at build time from package.json. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

function Header() {
  const t = useTranslations("app");
  const { view, go, settings, setSettings, openHelp, openSettings, files } = useStore();
  // The sidebar sits right below the header; its height can change when the header wraps.
  const ref = useRef<HTMLElement>(null);
  const { onLogo, extra } = useLogoClicks();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--top-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <header className="top" ref={ref}>
      <a className="brand" href="#sessions" onClick={(e) => { e.preventDefault(); onLogo(); go("sessions"); }}>
        <Logo /><Wordmark />
      </a>
      {extra}
      <WhatsNew version={APP_VERSION} />
      <OfflineBadge />
      {files.length > 0 && (
        <nav className="nav" aria-label="Main">
          {(["sessions", "batteries", "inventory"] as const).map((v) => (
            <a key={v} href={`#${v}`} aria-current={view === v ? "page" : undefined} onClick={(e) => { e.preventDefault(); go(v); }}>{t(v)}</a>
          ))}
        </nav>
      )}
      <div className="spacer" />
      {/* Phones: logo, language and help in row 1; navigation and the details toggle in row 2. */}
      {files.length > 0 && <div className="hbreak" aria-hidden="true" />}
      {files.length > 0 && (
        <button className="toggle" aria-pressed={settings.details} aria-label={t("showDetails")} onClick={() => setSettings({ details: !settings.details })}>
          <span className="sw" aria-hidden="true" /><span className="long">{t("showDetails")}</span><span className="short">{t("details")}</span>
        </button>
      )}
      <div className="controls">
        <div className="seg" role="group" aria-label="Language">
          {(["en", "de"] as const).map((l) => (
            <button key={l} aria-pressed={settings.locale === l} onClick={() => setSettings({ locale: l })}>{l.toUpperCase()}</button>
          ))}
        </div>
        <SettingsButton onClick={openSettings} label={t("settings")} />
        <FeedbackButton />
        <button className="helpbtn" aria-label={t("help")} onClick={() => openHelp()}><i aria-hidden="true">?</i><span className="long">{t("help")}</span></button>
      </div>
    </header>
  );
}

function Spark({ e }: { e: Entry }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const p = e.a.profile.available ? e.a.profile.value : null;
    if (!cv || !p) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, n = p.n;
    ctx.clearRect(0, 0, W, H);
    for (const ph of p.phases) {
      ctx.fillStyle = cssVar(PHASE_COLOR[ph.kind]);
      ctx.globalAlpha = ph.kind === "glide" || ph.kind === "unpowered" || ph.kind === "ground" ? 0.25 : 0.55;
      ctx.fillRect((ph.start / n) * W, H - 5, ((ph.end - ph.start + 1) / n) * W, 5);
    }
    ctx.globalAlpha = 1;
    // Without height only the phase strip is drawn.
    if (p.maxAltitudeM === null) return;
    const alt = e.a.grid.get("altitude");
    const top = p.maxAltitudeM;
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
  const { entries, visible, selected, select, step, settings, setSettings, filter, setFilter, addFiles, files, closeFile, closeAll, models, modelFilter, openSettings } = useStore();
  const modelName = useModelName();
  const airtime = useAirtime();
  const total = useMemo(() => flightTotal(modelFilter === null ? entries : entries.filter((e) => e.model.key === modelFilter)), [entries, modelFilter]);
  const sim = useMemo(() => simulatorTotal(modelFilter === null ? entries : entries.filter((e) => e.model.key === modelFilter)), [entries, modelFilter]);
  const multi = models.length > 1;
  const kindEntries = modelFilter === null ? entries : entries.filter((e) => e.model.key === modelFilter);
  const count = (m: string | null) => entries.filter((e) => (m === null || e.model.key === m) && (filter === "all" || e.a.kind === "flight")).length;
  const [over, setOver] = useState(false);
  // The list scrolls on its own: keep the chosen session in view (arrow keys, buttons, links).
  const list = useRef<HTMLDivElement>(null);
  // The list shows the newest session first; ← → and the buttons still move along the time axis.
  const newestFirst = useMemo(() => [...visible].reverse(), [visible]);
  // ↑ ↓ move through the list while a session in it has the focus (newer above, older below).
  const onListKey = (ev: React.KeyboardEvent) => {
    if (ev.key !== "ArrowUp" && ev.key !== "ArrowDown") return;
    ev.preventDefault();
    ev.stopPropagation();
    step(ev.key === "ArrowUp" ? 1 : -1);
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus());
  };
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selected?.key, filter, modelFilter]);
  const input = useRef<HTMLInputElement>(null);
  const loc = settings.locale;
  const U = useUnits();
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
        <div className="files">
        {files.map((f) => {
          const fm = models.filter((m) => entries.some((e) => e.file === f && e.model === m));
          return (
            <div key={f.fileName} style={{ display: "contents" }}>
              <div className="file">
                <span title={f.fileName}>{f.fileName}</span>
                <span className="num size">{num(loc, f.sizeBytes / 1e6, 1)} MB</span>
                <button className="x" aria-label={t("app.closeFile", { name: f.fileName })} title={t("app.closeFile", { name: f.fileName })} onClick={() => closeFile(f.fileName)}>×</button>
              </div>
              {fm.length > 0 && <div className="fmodels">{fm.map((m) => <span key={m.key}><ModelBadge model={m} />{modelName(m)}</span>)}</div>}
            </div>
          );
        })}
        </div>
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
          <button aria-pressed={filter === "flights"} onClick={() => setFilter("flights")}>{t("app.flights", { n: kindEntries.filter((e) => e.a.kind === "flight").length })}</button>
          <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("app.all", { n: kindEntries.length })}</button>
        </div>
      </div>
      {multi && (
        <div className="mfilter">
          <label htmlFor="model-filter">{t("app.model")}</label>
          <ModelSelect id="model-filter" count={count} />
        </div>
      )}
      {total.flights > 0 && (
        <div className="total" title={`${t("app.totalHint")}${total.estimatedSeconds > 0 ? ` ${t("app.totalHintApprox")}` : ""}`}>
          <b>{total.estimatedSeconds > 0 ? "≈ " : ""}{t("app.total", { time: longDuration(total.seconds), n: total.flights })}</b>
          <span>{t(total.estimatedSeconds > 0 ? "app.totalSubApprox" : "app.totalSub")}</span>
        </div>
      )}
      {sim.sessions > 0 && (
        <div className="total sim" title={t("app.simTotalHint")}>
          <b>{t("app.simTotal", { time: longDuration(sim.activeSeconds), n: sim.sessions })}</b>
          <span>{t("app.simTotalSub", { time: longDuration(sim.connectedSeconds) })}</span>
        </div>
      )}
      <LogbookBox />
      {!settings.logbook && !settings.logbookHintSeen && total.flights + sim.sessions > 0 && (
        <p className="bookhint hint">
          {t("logbook.hint")}{" "}
          <button className="linkbtn" onClick={() => {
            setSettings({ logbookHintSeen: true });
            openSettings();
            requestAnimationFrame(() => document.getElementById("set-logbook")?.scrollIntoView({ block: "start" }));
          }}>{t("logbook.hintLink")}</button>
        </p>
      )}
      <button className="btn exportbtn" title={t("app.exportCsvHint")} disabled={visible.length === 0}
        onClick={() => downloadText(sessionCsv(visible, loc), sessionCsvFileName())}>{t("app.exportCsv")}</button>
      <div className="slist" ref={list} onKeyDown={onListKey}>
        {newestFirst.map((e, k) => {
          const d = dayOf(e);
          const head = k === 0 || dayOf(newestFirst[k - 1]) !== d ? <div className="sday">{d}</div> : null;
          const p = e.a.profile.available ? e.a.profile.value : null;
          const meta = e.a.kind === "flight" && p ? (p.maxAltitudeM !== null ? `${U.fmt("height", p.maxAltitudeM)} · ${airtime(p)}` : airtime(p)) : e.a.kind === "transmitter-only" ? "" : clock(e.a.session.durationS);
          return (
            <div key={e.key} style={{ display: "contents" }}>
              {head}
              <button className={`sitem ${e.a.kind === "flight" ? "" : "dim"}`} aria-current={selected?.key === e.key} onClick={() => select(e.key)}>
                <span className="t num">{e.startMs !== null ? timeLabel(loc, e.startMs) : "–"}</span>
                {/* Each row names its model; sessions that are not flights get their kind on a second line. */}
                <span className="k">
                  <ModelBadge model={e.model} />
                  <span className="mn">{modelName(e.model)}</span>
                  {e.a.issues.some((i) => i.level === 1) && <span title={t("issue.frozen")} style={{ color: "var(--crit)", fontWeight: 700 }}>!</span>}
                </span>
                <span className="m num">{meta}</span>
                {e.a.kind === "flight" ? <Spark e={e} /> : <span className="kk"><span className="kdot" style={{ background: KIND_COLOR[e.a.kind] }} />{t(`kind.${e.a.kind}`)}</span>}
              </button>
            </div>
          );
        })}
      </div>
      <div className="keys"><kbd>←</kbd> <kbd>→</kbd> {t("app.keys")} · <kbd>↑</kbd> <kbd>↓</kbd> {t("app.keysList")}</div>
    </aside>
  );
}

/** The logbook's totals over all files, when it is on; opens the logbook. */
export function LogbookBox({ line = false }: { line?: boolean }) {
  const t = useTranslations("logbook");
  const { settings, book, openLogbook } = useStore();
  const all = useMemo(() => totals(counted(book)), [book]);
  if (!settings.logbook) return null;
  const values = { air: longDuration(all.airS), sim: longDuration(all.simActiveS) };
  if (line) return all.flights + all.simSessions > 0 ? <button type="button" className="st-book" onClick={openLogbook}>{t("startLine", values)} ›</button> : null;
  return (
    <button type="button" className="total bookbox" onClick={openLogbook}>
      <b>{t("title")}</b>
      <span>{t("sidebar", values)}</span>
    </button>
  );
}

/** One question per new model while the logbook asks: count its sessions, or leave them out as another pilot's log. */
function LogbookAsk() {
  const t = useTranslations("logbook");
  const { bookPending, bookDecide } = useStore();
  const modelName = useModelName();
  if (!bookPending.length) return null;
  return (
    <div className="stack" role="status">
      {bookPending.map((m) => (
        <div key={m.key} className="infobox bookask">
          <span><ModelBadge model={m} /> {t("askModel", { name: modelName(m) })}</span>
          <span className="bookacts">
            <button className="btn" onClick={() => bookDecide(m, true)}>{t("yesMine")}</button>
            <button className="btn" onClick={() => bookDecide(m, false)}>{t("noOther")}</button>
          </span>
        </div>
      ))}
    </div>
  );
}

function Footer({ offline }: { offline: boolean }) {
  const t = useTranslations("footer");
  const { settings } = useStore();
  return (
    <footer className="foot">
      <span>TLMscope {t("by", { name: OPERATOR.name })} (v{APP_VERSION})</span>
      {offline && <span title={t("offlineHint")}>{t("offline")}</span>}
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer">{t("source")}</a>
      <span>{t("notAffiliated")}</span>
      <Link href="/changelog">{t("changelog")}</Link>
      <a href={`/legal#${settings.locale}`}>{t("legal")}</a>
    </footer>
  );
}

/**
 * Phones only (the sidebar is hidden there): the loaded files in one line, with "Add" and a list
 * that opens to close single files or all of them. Shown above every view.
 */
function PhoneFiles() {
  const t = useTranslations("app");
  const { files, addFiles, closeFile, closeAll, settings, visible } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const mb = files.reduce((sum, f) => sum + f.sizeBytes, 0) / 1e6;
  return (
    <div className="mfiles">
      <details>
        <summary><span>{t("filesLoaded", { n: files.length })} · <span className="num">{num(settings.locale, mb, 1)} MB</span></span><i aria-hidden="true">▾</i></summary>
        <div className="mfiles-list">
          {files.map((f) => (
            <div key={f.fileName} className="file">
              <span title={f.fileName}>{f.fileName}</span>
              <span className="num size">{num(settings.locale, f.sizeBytes / 1e6, 1)} MB</span>
              <button className="x" aria-label={t("closeFile", { name: f.fileName })} onClick={() => closeFile(f.fileName)}>×</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={closeAll}>{t("closeAll")}</button>
            <button className="btn" title={t("exportCsvHint")} disabled={visible.length === 0} onClick={() => downloadText(sessionCsv(visible, settings.locale), sessionCsvFileName())}>{t("exportCsv")}</button>
          </div>
        </div>
      </details>
      <button className="btn" onClick={() => input.current?.click()}>+ {t("addShort")}</button>
      <input ref={input} type="file" accept=".tlm,.TLM" multiple hidden onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
    </div>
  );
}

/** A new version is stored: offer the reload, which also closes the open files. */
function UpdateBar({ sw }: { sw: OfflineState }) {
  const t = useTranslations("app");
  const { files } = useStore();
  // Stays while the reload waits for the newest version to be stored.
  if (!sw.update && !sw.applying) return null;
  return (
    <div className="infobox updatebar" role="status">
      <span>{t("updateReady")}{files.length > 0 && ` ${t("updateCloses")}`}</span>
      <button className="btn" onClick={sw.applyUpdate} disabled={sw.applying}>{t(sw.applying ? "updateApplying" : "updateReload")}</button>
    </div>
  );
}

/** The kind of file error as a fixed word for the feedback context (never the file name). */
const ERROR_KIND: Record<string, string> = { "app.unsupported": "unsupported", "app.readError": "read-error", "app.tooLarge": "too-large" };

/** Files larger than this get the "takes a few seconds" note. */
const LARGE_FILE_BYTES = 5e6;

/** Progress while a file is read: name, bar and, for big files, a note that it takes a moment. */
function LoadCard({ m }: { m: LoadMessage }) {
  const t = useTranslations();
  const pct = Math.round((m.progress ?? 0) * 100);
  return (
    <div className="loadcard">
      <div className="lc-head">
        <span className="spinner" aria-hidden="true" />
        <b>{t(m.text, m.values)}</b>
        <span className="num lc-pct">{pct} %</span>
      </div>
      <div className="lc-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t(m.text, m.values)}>
        <i style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <span className="hint">
        {m.file && m.file.total > 1 ? `${t("app.loadingFile", { n: m.file.n, total: m.file.total })} · ` : ""}
        {m.file?.bytes !== undefined && m.file.bytes > LARGE_FILE_BYTES ? t("app.loadingLarge") : t("app.loadingLocal")}
      </span>
    </div>
  );
}

export function Shell({ helpRef, settingsRef, feedbackRef, logbookRef, messages, dismiss }: { helpRef: RefObject<HTMLDialogElement | null>; settingsRef: RefObject<HTMLDialogElement | null>; feedbackRef: RefObject<HTMLDialogElement | null>; logbookRef: RefObject<HTMLDialogElement | null>; messages: LoadMessage[]; dismiss: (i: number) => void }) {
  const t = useTranslations();
  const { files, view, selected, tab, helpTarget, setHelpTarget } = useStore();
  const sw = useServiceWorker();
  const notices = messages.length > 0 && (
    <div className="stack" role="status">
      {messages.map((m, i) => m.kind === "loading" ? <LoadCard key={i} m={m} /> : (
        <div key={i} className={m.kind === "error" ? "errorbox" : "infobox"} style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
          <span>{t(m.text, m.values)}{m.kind === "error" && <> <FeedbackLink entry="error" detail={ERROR_KIND[m.text]}>{t("feedback.errorLink")}</FeedbackLink></>}</span>
          <button className="btn" onClick={() => dismiss(i)}>{t("app.close")}</button>
        </div>
      ))}
    </div>
  );
  return (
    <>
      <MovedNotice />
      {files.length === 0 ? <Start notices={notices} /> : (
        <>
        <Header />
        <div className="app">
          <Sidebar />
          <main className="main">
            <PhoneFiles />
            <LogbookAsk />
            {notices}
            <ErrorBoundary resetKey={`${view}|${selected?.key}|${tab}`} onError={() => track({ name: "view-error", view: view === "sessions" ? `sessions/${tab}` : view })} fallback={(reset) => (
              <div className="errorbox stack">
                <b>{t("app.viewError")}</b>
                <span>{t("app.viewErrorText")}</span>
                <div><button className="btn" onClick={reset}>{t("app.tryAgain")}</button> <FeedbackLink entry="error" detail="view">{t("feedback.errorLink")}</FeedbackLink></div>
              </div>
            )}>
              {view === "batteries" ? <Batteries /> : view === "inventory" ? <Inventory /> : selected ? <SessionView key={selected.key} /> : null}
            </ErrorBoundary>
          </main>
        </div>
        </>
      )}
      <Footer offline={sw.ready} />
      <UpdateBar sw={sw} />
      <Guides dialogRef={helpRef} target={helpTarget} setTarget={setHelpTarget} />
      <SettingsDialog dialogRef={settingsRef} />
      <LogbookDialog dialogRef={logbookRef} />
      <FeedbackDialog dialogRef={feedbackRef} />
    </>
  );
}
