"use client";

import { useTranslations } from "next-intl";
import { useState, type RefObject } from "react";
import { feedbackContext, feedbackUrl, type FeedbackFrom } from "../feedback";
import { useOnline } from "../offline";
import { useStore } from "../store";

/** Version shown in the header, passed along as context. */
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

/**
 * The feedback dialog. First it says what would be sent and that the log files stay on the device; the
 * Tally form (an iframe) loads only after "Continue", so Tally sees nothing before the user decides.
 * The body is mounted only while the dialog is open, so every opening starts again at the explanation.
 */
export function FeedbackDialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const t = useTranslations("feedback");
  const ta = useTranslations("app");
  const { feedbackFrom, closeFeedback } = useStore();
  return (
    <dialog className="helpdlg fbdlg" ref={dialogRef} aria-labelledby="feedbackTitle" onClose={() => { if (!dialogRef.current?.open) closeFeedback(); }} onClick={(e) => { if (e.target === e.currentTarget) dialogRef.current?.close(); }}>
      <div className="hd"><h2 id="feedbackTitle">{t("title")}</h2><button className="btn" onClick={() => dialogRef.current?.close()}>{ta("close")}</button></div>
      <div className="bd">{feedbackFrom && <FeedbackBody from={feedbackFrom} />}</div>
    </dialog>
  );
}

function FeedbackBody({ from }: { from: FeedbackFrom }) {
  const t = useTranslations("feedback");
  const { files, view, tab, settings } = useStore();
  const online = useOnline();
  const [withContext, setWithContext] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const locale = settings.locale;
  const place = files.length === 0 ? "start" : view === "sessions" ? `sessions/${tab}` : view;
  const ctx = feedbackContext({
    files, locale, from, place, version: APP_VERSION,
    device: window.matchMedia("(max-width: 760px)").matches ? "phone" : "desktop",
  });

  if (!online) return <p className="note">{t("offline")}</p>;

  if (loaded) {
    return (
      <>
        <iframe title={t("formTitle")} src={feedbackUrl(locale, withContext ? ctx : null)} />
        <p className="hint">{withContext ? t("contextOn") : t("contextOff")} {t("logsNote")}</p>
      </>
    );
  }

  const rows: [string, string][] = [
    [t("ctxVersion"), ctx.version],
    [t("ctxLanguage"), ctx.locale.toUpperCase()],
    [t("ctxDevice"), t(`device_${ctx.device}`)],
    [t("ctxWhere"), ctx.where],
    [t("ctxSensors"), ctx.sensors || t("ctxNone")],
  ];
  return (
    <>
      <p>{t("intro")}</p>
      <h3>{t("contextTitle")}</h3>
      <dl className="ctx">{rows.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <label className="check"><input type="checkbox" checked={withContext} onChange={(e) => setWithContext(e.target.checked)} /> {t("contextCheck")}</label>
      <p className="hint">{t("notSent")}</p>
      <p className="hint">{t("tally")} <a href={`/legal#${locale}`}>{t("privacyLink")}</a></p>
      <div><button className="btn primary" onClick={() => setLoaded(true)}>{t("continue")}</button></div>
    </>
  );
}
