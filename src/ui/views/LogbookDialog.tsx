"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, type RefObject } from "react";
import { longDuration } from "../format";
import { downloadText } from "../logbook";
import { backupFileName, bookCsv, byFile, byModel, byYear, counted, totals, type BookTotals } from "../my-logbook";
import { useStore } from "../store";

/** Largest backup file accepted (a logbook of many years is far below this). */
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

/** "My logbook": the totals over every file opened since it was switched on, per year, model and file. */
export function LogbookDialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const t = useTranslations("logbook");
  const ta = useTranslations("app");
  const { book, settings, bookDecide, bookFileOn, bookClear, bookImport } = useStore();
  const list = useMemo(() => counted(book), [book]);
  const all = useMemo(() => totals(list), [list]);
  const years = useMemo(() => byYear(list), [list]);
  const models = useMemo(() => byModel(book), [book]);
  const files = useMemo(() => byFile(book), [book]);
  const stored = Object.keys(book.sessions).length;
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = () => { setConfirm(false); setNote(null); dialogRef.current?.close(); };

  const air = (x: BookTotals) => (x.flights ? longDuration(x.airS) : "–");
  const sim = (x: BookTotals) => (x.simSessions ? longDuration(x.simActiveS) : "–");

  const restore = async (file: File | undefined) => {
    if (!file) return;
    const added = file.size <= MAX_BACKUP_BYTES ? bookImport(await file.text()) : null;
    setNote(added === null ? { ok: false, text: t("notBackup") } : { ok: true, text: t("restored", { n: Math.max(0, added) }) });
  };

  return (
    <dialog className="helpdlg setdlg bookdlg" ref={dialogRef} aria-labelledby="logbookTitle" onClose={() => { setConfirm(false); setNote(null); }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="hd"><h2 id="logbookTitle">{t("title")}</h2><button className="btn" onClick={close}>{ta("close")}</button></div>
      <div className="bd">
        {!settings.logbook && <p className="infobox">{t("recordingOff")}</p>}
        {note && <p className={note.ok ? "infobox" : "errorbox"} role="status">{note.text}</p>}
        {stored === 0 ? <p className="hint">{t("empty")}</p> : (
          <>
            <div className="booktotals">
              <div className="total">
                <b>{all.estS > 0 ? "≈ " : ""}{air(all)}</b>
                <span>{t("airTime")} · {t("flights", { n: all.flights })}{all.estS > 0 ? ` · ${t("partlyEstimated")}` : ""}</span>
              </div>
              <div className="total sim">
                <b>{sim(all)}</b>
                <span>{t("simulator")} · {t("simSub", { n: all.simSessions, time: longDuration(all.simConnectedS) })}</span>
              </div>
            </div>

            <h3>{t("perYear")}</h3>
            <div className="scroll"><table className="tbl">
              <thead><tr><th>{t("year")}</th><th className="r">{t("airTime")}</th><th className="r">{t("simulator")}</th></tr></thead>
              <tbody>{years.map(({ year, t: y }) => (
                <tr key={year}><td className="num">{year}</td><td className="r num">{air(y)}{y.flights ? <span className="hint"> · {t("flights", { n: y.flights })}</span> : null}</td><td className="r num">{sim(y)}</td></tr>
              ))}</tbody>
            </table></div>

            <h3>{t("models")}</h3>
            <p className="hint">{t("modelsHint")}</p>
            <div className="scroll"><table className="tbl">
              <thead><tr><th>{t("counts")}</th><th>{t("model")}</th><th className="r">{t("airTime")}</th><th className="r">{t("simulator")}</th></tr></thead>
              <tbody>{models.map((m) => (
                <tr key={m.key} className={m.on ? "" : "dim"}>
                  <td><input type="checkbox" checked={m.on} aria-label={`${t("counts")}: ${m.name ?? ta("unknownModel")}`} onChange={(e) => bookDecide(m, e.target.checked)} /></td>
                  <td>{m.name ?? ta("unknownModel")}</td>
                  <td className="r num">{air(m.t)}</td>
                  <td className="r num">{sim(m.t)}</td>
                </tr>
              ))}</tbody>
            </table></div>

            <h3>{t("files")}</h3>
            <p className="hint">{t("filesHint")}</p>
            <div className="scroll"><table className="tbl">
              <thead><tr><th>{t("counts")}</th><th>{t("files")}</th><th className="r">{t("sessions")}</th></tr></thead>
              <tbody>{files.map((f) => (
                <tr key={f.file} className={f.on ? "" : "dim"}>
                  <td><input type="checkbox" checked={f.on} aria-label={`${t("counts")}: ${f.file}`} onChange={(e) => bookFileOn(f.file, e.target.checked)} /></td>
                  <td className="mono">{f.file}</td>
                  <td className="r num">{f.sessions}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </>
        )}

        <div className="bookacts">
          <button className="btn" disabled={stored === 0} onClick={() => downloadText(JSON.stringify(book), backupFileName(), "application/json")}>{t("backup")}</button>
          {settings.logbook && <button className="btn" onClick={() => input.current?.click()}>{t("restore")}</button>}
          <button className="btn" disabled={stored === 0} onClick={() => downloadText(bookCsv(book, settings.locale, ta("unknownModel")), backupFileName().replace(/\.json$/, ".csv"))}>{t("csv")}</button>
          <button className="btn" disabled={stored === 0 && Object.keys(book.models).length === 0} onClick={() => setConfirm(true)}>{t("clear")}</button>
          <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {confirm && (
          <div className="errorbox bookconfirm" role="alert">
            <span>{t("clearQuestion", { n: stored })}</span>
            <span className="bookacts">
              <button className="btn" onClick={() => { bookClear(); setConfirm(false); }}>{t("delete")}</button>
              <button className="btn" onClick={() => setConfirm(false)}>{t("cancel")}</button>
            </span>
          </div>
        )}
        <p className="note">{t("local")}</p>
      </div>
    </dialog>
  );
}
