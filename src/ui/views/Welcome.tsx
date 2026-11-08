"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useStore } from "../store";

export function Welcome() {
  const t = useTranslations("welcome");
  const { addFiles, loadDemo, openHelp } = useStore();
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <h1>{t("title")}</h1>
      <p className="summary">{t("lead")}</p>
      <div
        className={`bigdrop ${over ? "over" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") input.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); addFiles([...e.dataTransfer.files]); }}
      >
        <b>{t("drop")}</b>
        <span className="hint">{t("choose")}</span>
        <input ref={input} type="file" accept=".tlm,.TLM" multiple hidden onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn primary" onClick={loadDemo}>{t("demo")}</button>
        <button className="btn" onClick={openHelp}>{t("whoFor")}</button>
      </div>
      <p className="hint">{t("demoHint")}</p>
      <p className="hint">{t("private")}</p>
      <p className="note">{t("where")}</p>
    </>
  );
}
