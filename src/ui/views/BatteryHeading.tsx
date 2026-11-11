"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { MAX_BATTERY_NAME, useStore } from "../store";

/**
 * Heading of a battery card: its name ("Battery A" or the user's own), a way to rename it,
 * and the ID the pack reports, with a button to copy it. Names are kept in the browser per ID.
 */
export function BatteryHeading({ id, letter }: { id: string; letter: string }) {
  const t = useTranslations("batteries");
  const tb = useTranslations("battery");
  const { settings, setSettings } = useStore();
  const own = settings.batteryNames[id] ?? null;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(own ?? "");
  const [copied, setCopied] = useState(false);

  const save = (name: string) => {
    const names = { ...settings.batteryNames };
    const clean = name.trim().slice(0, MAX_BATTERY_NAME);
    if (clean) names[id] = clean;
    else delete names[id];
    setSettings({ batteryNames: names });
    setEditing(false);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard may be blocked */ }
  };

  return (
    <div className="bathead">
      {editing ? (
        <form className="capform" onSubmit={(ev) => { ev.preventDefault(); save(text); }}>
          <label>
            <span>{t("nameLabel")}</span>
            <input autoFocus value={text} maxLength={MAX_BATTERY_NAME} placeholder={tb("name", { letter })} onChange={(ev) => setText(ev.target.value)}
              onKeyDown={(ev) => { if (ev.key === "Escape") { setText(own ?? ""); setEditing(false); } }} />
          </label>
          <button className="btn primary" type="submit">{t("save")}</button>
          <button className="btn" type="button" onClick={() => { setText(own ?? ""); setEditing(false); }}>{t("cancel")}</button>
        </form>
      ) : (
        <h3>
          {own ?? tb("name", { letter })}
          {own && <span className="hint"> ({tb("name", { letter })})</span>}
          <button className="linkbtn" type="button" onClick={() => { setText(own ?? ""); setEditing(true); }}>{t(own ? "rename" : "giveName")}</button>
        </h3>
      )}
      <div className="hint batid">
        ID <span className="mono">{id}</span>
        <button className="linkbtn" type="button" onClick={copy} aria-label={t("copyId")}>{copied ? t("copied") : t("copy")}</button>
      </div>
    </div>
  );
}
