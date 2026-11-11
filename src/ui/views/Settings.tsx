"use client";

import { useTranslations } from "next-intl";
import { useState, type RefObject } from "react";
import { isCapacity, useStore } from "../store";
import { THEMES } from "../theme";

/** "My settings": everything the user can set, kept in this browser only. */
export function SettingsDialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const t = useTranslations("settings");
  const ta = useTranslations("app");
  const { settings, setSettings, models } = useStore();
  const nameOf = (key: string) => models.find((m) => m.key === key)?.name ?? (key || ta("unknownModel"));
  const capacities = Object.entries(settings.capacities).sort(([a], [b]) => a.localeCompare(b));
  const removeCapacity = (key: string) => {
    const next = { ...settings.capacities };
    delete next[key];
    setSettings({ capacities: next });
  };

  return (
    <dialog className="helpdlg setdlg" ref={dialogRef} aria-labelledby="settingsTitle" onClick={(e) => { if (e.target === e.currentTarget) dialogRef.current?.close(); }}>
      <div className="hd"><h2 id="settingsTitle">{t("title")}</h2><button className="btn" onClick={() => dialogRef.current?.close()}>{ta("close")}</button></div>
      <div className="bd">
        <p className="hint">{t("intro")}</p>

        <h3>{t("appearance")}</h3>
        <div className="setting">
          <span>{t("theme")}</span>
          <div className="seg" role="group" aria-label={t("theme")}>
            {THEMES.map((th) => <button key={th} aria-pressed={settings.theme === th} onClick={() => setSettings({ theme: th })}>{t(`theme_${th}`)}</button>)}
          </div>
        </div>
        <div className="setting">
          <span>{t("language")}</span>
          <div className="seg" role="group" aria-label={t("language")}>
            {(["en", "de"] as const).map((l) => <button key={l} aria-pressed={settings.locale === l} onClick={() => setSettings({ locale: l })}>{l === "en" ? "English" : "Deutsch"}</button>)}
          </div>
        </div>
        <div className="setting">
          <span>{t("details")}</span>
          <div className="seg" role="group" aria-label={t("details")}>
            <button aria-pressed={!settings.details} onClick={() => setSettings({ details: false })}>{t("detailsSimple")}</button>
            <button aria-pressed={settings.details} onClick={() => setSettings({ details: true })}>{t("detailsAll")}</button>
          </div>
        </div>

        <h3>{t("batteries")}</h3>
        <p className="hint">{t("batteriesHint")}</p>
        {/* Keyed by the saved value, so the field shows it once the settings are read from storage. */}
        <DefaultCapacity key={settings.defaultCapacityMah ?? "none"} />
        {capacities.length > 0 ? (
          <div className="scroll"><table className="tbl">
            <thead><tr><th>{t("model")}</th><th className="r">{t("capacity")}</th><th /></tr></thead>
            <tbody>{capacities.map(([key, mah]) => (
              <tr key={key}><td>{nameOf(key)}</td><td className="r num">{mah} mAh</td><td className="r"><button className="btn" onClick={() => removeCapacity(key)}>{t("remove")}</button></td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="hint">{t("noCapacities")}</p>}

        <p className="note">{t("local")}</p>
      </div>
    </dialog>
  );
}

function DefaultCapacity() {
  const t = useTranslations("settings");
  const { settings, setSettings } = useStore();
  const [text, setText] = useState(settings.defaultCapacityMah ? String(settings.defaultCapacityMah) : "");
  const value = text.trim() === "" ? null : Number(text.replace(/[^\d]/g, ""));
  const valid = value === null || isCapacity(value);
  return (
    <>
      <form className="setting" onSubmit={(ev) => { ev.preventDefault(); if (valid) setSettings({ defaultCapacityMah: value }); }}>
        <label htmlFor="defaultCapacity">{t("defaultCapacity")}</label>
        <span className="capfield">
          <input id="defaultCapacity" inputMode="numeric" value={text} placeholder={t("none")} onChange={(ev) => setText(ev.target.value)} aria-invalid={!valid} /> mAh
          <button className="btn" type="submit" disabled={!valid || value === settings.defaultCapacityMah}>{t("save")}</button>
        </span>
      </form>
      {!valid && <p className="hint">{t("invalid")}</p>}
    </>
  );
}
