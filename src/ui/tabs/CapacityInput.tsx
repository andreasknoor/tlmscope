"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { isCapacity, useStore } from "../store";

/**
 * Lets the user enter the capacity of a battery that does not report one, per model.
 * Kept in the browser's settings; the charge share and its rating follow at once.
 */
export function CapacityInput() {
  const t = useTranslations("energy.capacity");
  const { selected: e, settings, setSettings } = useStore();
  const key = e!.model.key;
  const saved = settings.capacities[key] ?? null;
  const [text, setText] = useState(saved ? String(saved) : "");
  const value = Number(text.replace(/[^\d]/g, ""));
  const valid = isCapacity(value);
  const name = e!.model.name;

  const save = (mah: number | null) => {
    const capacities = { ...settings.capacities };
    if (mah === null) delete capacities[key];
    else capacities[key] = mah;
    setSettings({ capacities });
    if (mah === null) setText("");
  };

  return (
    <div className="card capacity">
      <h3>{t("title")}</h3>
      <p className="hint">{saved ? t("savedHint", { mah: saved }) : settings.defaultCapacityMah ? t("defaultHint", { mah: settings.defaultCapacityMah }) : t("hint")}</p>
      <form className="capform" onSubmit={(ev) => { ev.preventDefault(); if (valid) save(value); }}>
        <label>
          <span>{name ? t("label", { model: name }) : t("labelNoModel")}</span>
          <span className="capfield"><input inputMode="numeric" value={text} onChange={(ev) => setText(ev.target.value)} placeholder="2200" aria-invalid={text !== "" && !valid} /> mAh</span>
        </label>
        <button className="btn primary" type="submit" disabled={!valid || value === saved}>{t("save")}</button>
        {saved !== null && <button className="btn" type="button" onClick={() => save(null)}>{t("remove")}</button>}
      </form>
      {text !== "" && !valid && <p className="hint">{t("invalid")}</p>}
    </div>
  );
}
