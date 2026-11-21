"use client";

import { useTranslations } from "next-intl";
import { useState, type RefObject } from "react";
import { useRich } from "../bits";
import { isCapacity, useStore, type SettingsTab } from "../store";
import { THEMES } from "../theme";
import { UNIT_SYSTEMS } from "../units";

const TABS: SettingsTab[] = ["display", "batteries", "logbook"];

/**
 * "My settings": everything the user can set, kept in this browser only. Three tabs, each short enough
 * to need no scrolling; the current state shows under each tab, so it can be seen without opening it.
 */
export function SettingsDialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const t = useTranslations("settings");
  const tl = useTranslations("logbook");
  const ta = useTranslations("app");
  const { settings, setSettings, models, settingsTab: tab, setSettingsTab } = useStore();
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
  const summary: Record<SettingsTab, string> = {
    display: [t(`theme_${settings.theme}`), t(`unitsShort_${settings.units}`), settings.locale === "en" ? "English" : "Deutsch", settings.details ? t("detailsAll") : t("detailsSimple")].join(" · "),
    batteries: t("batteriesSummary", { caps: capacities.length + (settings.defaultCapacityMah ? 1 : 0), names: names.length }),
    logbook: settings.logbook ? `${tl("on")} · ${settings.logbookAsk ? tl("ask") : tl("auto")}` : tl("off"),
  };
  // Arrow keys move between the tabs, as in any tab list.
  const onTabKey = (ev: React.KeyboardEvent) => {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    const next = TABS[(TABS.indexOf(tab) + (ev.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    setSettingsTab(next);
    requestAnimationFrame(() => document.getElementById(`settab-${next}`)?.focus());
  };

  return (
    <dialog className="helpdlg setdlg" ref={dialogRef} aria-labelledby="settingsTitle" onClick={(e) => { if (e.target === e.currentTarget) dialogRef.current?.close(); }}>
      <div className="hd"><h2 id="settingsTitle">{t("title")}</h2><button className="btn" onClick={() => dialogRef.current?.close()}>{ta("close")}</button></div>
      <div className="settabs" role="tablist" aria-label={t("title")} onKeyDown={onTabKey}>
        {TABS.map((k) => (
          <button key={k} id={`settab-${k}`} role="tab" aria-selected={tab === k} aria-controls="setpanel" tabIndex={tab === k ? 0 : -1} onClick={() => setSettingsTab(k)}>
            {t(`tab_${k}`)}<small>{summary[k]}</small>
          </button>
        ))}
      </div>
      <div className="bd" id="setpanel" role="tabpanel" aria-labelledby={`settab-${tab}`}>
        {tab === "display" && (
          <>
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
          </>
        )}

        {tab === "batteries" && (
          <>
            <p className="hint">{rich("settings.batteriesHint")}</p>
            {/* Keyed by the saved value, so the field shows it once the settings are read from storage. */}
            <DefaultCapacity key={settings.defaultCapacityMah ?? "none"} />
            {capacities.length > 0 ? (
              <div className="scroll"><table className="tbl">
                <tbody>{capacities.map(([key, mah]) => (
                  <tr key={key}><td>{nameOf(key)}</td><td className="r num">{mah} mAh</td>
                    <td className="r"><button className="iconbtn sq" title={t("remove")} aria-label={`${t("remove")}: ${nameOf(key)}`} onClick={() => removeCapacity(key)}>✕</button></td></tr>
                ))}</tbody>
              </table></div>
            ) : <p className="hint">{t("noCapacities")}</p>}

            <h3>{t("batteryNames")}</h3>
            <p className="hint">{t("batteryNamesHint")}</p>
            {names.length > 0 ? (
              <div className="scroll"><table className="tbl">
                <tbody>{names.map(([id, name]) => (
                  <tr key={id}><td>{name}</td><td className="mono hint">{id}</td>
                    <td className="r"><button className="iconbtn sq" title={t("remove")} aria-label={`${t("remove")}: ${name}`} onClick={() => removeName(id)}>✕</button></td></tr>
                ))}</tbody>
              </table></div>
            ) : <p className="hint">{t("noBatteryNames")}</p>}
          </>
        )}

        {tab === "logbook" && <LogbookSettings />}

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
      <p className="hint">{t("settingsShort")}</p>
      <details className="whatstored"><summary>{t("whatStored")}</summary><p className="hint">{t("settingsHint")}</p></details>
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
          <p className="hint">{t("newModelsHint")}</p>
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
