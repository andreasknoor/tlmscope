"use client";

import { useTranslations } from "next-intl";
import type { RefObject } from "react";
import { OPERATOR, REPO_URL } from "@/legal/contact";
import { useRich } from "../bits";

const ST_COLOR: Record<string, string> = { ok: "var(--good)", exp: "var(--warn)", spec: "var(--warn)", raw: "var(--ink-3)", part: "var(--warn)" };

export function Help({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const t = useTranslations("help");
  const ta = useTranslations("app");
  const tf = useTranslations("footer");
  const rich = useRich();
  const st = (k: string) => <span className="st"><span className="kdot" style={{ background: ST_COLOR[k] }} />{t(`st.${k}`)}</span>;
  const radios: [string, string, string][] = [["r1", "r1w", "ok"], ["r2", "r2w", "ok"], ["r3", "r3w", "exp"]];
  const data: [string, string, string][] = [["d1", "d1n", "ok"], ["d2", "d2n", "ok"], ["d3", "d3n", "ok"], ["d4", "d4n", "ok"], ["d5", "d5n", "ok"], ["d6", "d6n", "ok"], ["d7", "d7n", "part"], ["d8", "d8n", "gps"], ["d9", "d9n", "raw"]];
  return (
    <dialog className="helpdlg" ref={dialogRef} aria-labelledby="helpTitle" onClick={(e) => { if (e.target === e.currentTarget) dialogRef.current?.close(); }}>
      <div className="hd"><h2 id="helpTitle">{t("title")}</h2><button className="btn" onClick={() => dialogRef.current?.close()}>{ta("close")}</button></div>
      <div className="bd">
        <p>{rich("help.intro")}</p>
        <p><b>{t("youCan")}</b></p>
        <h3>{t("transmitters")}</h3>
        <div className="scroll"><table className="tbl"><thead><tr><th>{t("transmitter")}</th><th>{t("whereLogs")}</th><th>{t("status")}</th></tr></thead>
          <tbody>{radios.map(([r, w, s]) => <tr key={r}><td>{t(r)}</td><td>{rich(`help.${w}`)}</td><td>{st(s)}</td></tr>)}</tbody></table></div>
        <h3>{t("whatYouSee")}</h3>
        <p className="hint">{t("whatHint")}</p>
        <div className="scroll"><table className="tbl"><thead><tr><th>{t("data")}</th><th>{t("needs")}</th><th>{t("status")}</th></tr></thead>
          <tbody>{data.map(([d, n, s]) => <tr key={d}><td>{t(d)}</td><td>{t(n)}</td><td>{st(s)}</td></tr>)}</tbody></table></div>
        <h3>{t("notSupported")}</h3>
        <ul>{["n1", "n2", "n3", "n4", "n5", "n6", "n7"].map((k) => <li key={k}>{rich(`help.${k}`)}</li>)}</ul>
        <h3>{t("private")}</h3>
        <p>{t("privateText")}</p>
        <h3>{t("getLogs")}</h3>
        <ul><li>{rich("help.g1")}</li><li>{rich("help.g2")}</li></ul>
        <h3>{t("about")}</h3>
        <p>{t("aboutText", { name: OPERATOR.name })}</p>
        <p><a href={REPO_URL} target="_blank" rel="noopener noreferrer">{t("aboutLink")}</a> · <a href="legal">{tf("legal")}</a></p>
        <p className="note">{t("independent")}</p>
      </div>
    </dialog>
  );
}
