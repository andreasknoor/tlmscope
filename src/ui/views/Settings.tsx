"use client";

import { useTranslations } from "next-intl";
import { useState, type RefObject } from "react";
import { useRich } from "../bits";
import { isCapacity, useStore } from "../store";
import { THEMES } from "../theme";
import { UNIT_SYSTEMS } from "../units";

/** "My settings": everything the user can set, kept in this browser only. */
export function SettingsDialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const t = useTranslations("settings");
  const ta = useTranslations("app");
  const { settings, setSettings, models } = useStore();
  const rich = useRich();
  const nameOf = (key: string) => models.find((m) => m.key === key)?.name ?? (key || ta("unknownModel"));
  const capacities = Object.entries(settings.capacities).sort(([a], [b]) => a.localeCompare(b));
  const names = Object.entries(settings.batteryNames).sort(([, a], [, b]) => a.localeCompare(b));
  const removeName = (id: string) => {
    const next = { ...settings.batteryNames };
    delete next[id];
    setSettings({ batteryNames: next });
  };
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
          <span>{t("units")}</span>
          <div className="seg" role="group" aria-label={t("units")}>
            {UNIT_SYSTEMS.map((u) => <button key={u} aria-pressed={settings.units === u} onClick={() => setSettings({ units: u })}>{t(`units_${u}`)}</button>)}
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
        <p className="hint">{rich("settings.batteriesHint")}</p>
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

        <h3>{t("batteryNames")}</h3>
        <p className="hint">{t("batteryNamesHint")}</p>
        {names.length > 0 ? (
          <div className="scroll"><table className="tbl">
            <thead><tr><th>{t("batteryNames")}</th><th>ID</th><th /></tr></thead>
            <tbody>{names.map(([id, name]) => (
              <tr key={id}><td>{name}</td><td className="mono hint">{id}</td><td className="r"><button className="btn" onClick={() => removeName(id)}>{t("remove")}</button></td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="hint">{t("noBatteryNames")}</p>}

        <LogbookSettings />

        <p className="note">{t("local")}</p>
      </div>
    </dialog>
  );
}

/** "My logbook": off unless switched on here; switching it off asks whether to keep what is stored. */
function LogbookSettings() {
  const t = useTranslations("logbook");
  const { settings, setSettings, book, bookClear, openLogbook } = useStore();
  const [stopping, setStopping] = useState(false);
  const stored = Object.keys(book.sessions).length;
  const turn = (on: boolean) => {
    if (on === settings.logbook) return;
    setSettings(on ? { logbook: true, logbookHintSeen: true } : { logbook: false });
    // Ask the browser not to clear the logbook on its own when space runs low.
    if (on) void navigator.storage?.persist?.().catch(() => false);
    setStopping(!on && (stored > 0 || Object.keys(book.models).length > 0));
  };
  return (
    <>
      <h3 id="set-logbook">{t("title")}</h3>
      <p className="hint">{t("settingsHint")}</p>
      <div className="setting">
        <span>{t("record")}</span>
        <div className="seg" role="group" aria-label={t("record")}>
          <button aria-pressed={!settings.logbook} onClick={() => turn(false)}>{t("off")}</button>
          <button aria-pressed={settings.logbook} onClick={() => turn(true)}>{t("on")}</button>
        </div>
      </div>
      {stopping && (
        <div className="infobox bookconfirm" role="status">
          <span>{t("stopQuestion", { n: stored })}</span>
          <span className="bookacts">
            <button className="btn" onClick={() => { bookClear(); setStopping(false); }}>{t("delete")}</button>
            <button className="btn" onClick={() => setStopping(false)}>{t("keep")}</button>
          </span>
        </div>
      )}
      {settings.logbook && (
        <>
          <div className="setting">
            <span>{t("newModels")}</span>
            <div className="seg" role="group" aria-label={t("newModels")}>
              <button aria-pressed={settings.logbookAsk} onClick={() => setSettings({ logbookAsk: true })}>{t("ask")}</button>
              <button aria-pressed={!settings.logbookAsk} onClick={() => setSettings({ logbookAsk: false })}>{t("auto")}</button>
            </div>
          </div>
          <p className="hint">{t("earlier")} {t("browserOnly")}</p>
        </>
      )}
      {(settings.logbook || stored > 0) && <p><button className="btn" onClick={openLogbook}>{t("open")}</button></p>}
    </>
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
