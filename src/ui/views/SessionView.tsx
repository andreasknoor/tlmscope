"use client";

import { useTranslations } from "next-intl";
import { Alert } from "../bits";
import { clock, dayLabel, duration, timeLabel } from "../format";
import { KIND_COLOR } from "../Shell";
import { useStore, type Tab } from "../store";
import { AircraftTab } from "../tabs/Aircraft";
import { BatteryTab } from "../tabs/Battery";
import { EnergyTab } from "../tabs/Energy";
import { HeightTab } from "../tabs/Height";
import { LinkTab } from "../tabs/Link";
import { OverviewTab } from "../tabs/Overview";
import { PathTab } from "../tabs/Path";
import { RawTab } from "../tabs/Raw";

const TABS: Tab[] = ["overview", "height", "path", "energy", "battery", "link", "aircraft", "raw"];

export function SessionView() {
  const t = useTranslations();
  const { selected: e, visible, step, select, tab, setTab, settings, demo } = useStore();
  if (!e) return null;
  const loc = settings.locale;
  const s = e.a.session;
  const p = e.a.profile.available ? e.a.profile.value : null;
  const pos = visible.findIndex((x) => x.key === e.key);
  const current: Tab = tab === "raw" && !settings.details ? "overview" : tab;
  const isDemo = demo && e.file.fileName.startsWith("demo-");

  return (
    <>
      <div className="mpicker">
        <button className="btn" onClick={() => step(-1)} aria-label={t("app.prevSession")}>‹</button>
        <select value={e.key} aria-label={t("app.session")} onChange={(ev) => select(ev.target.value)}>
          {visible.map((x) => (
            <option key={x.key} value={x.key}>
              {x.startMs !== null ? `${dayLabel(loc, x.startMs)} ${timeLabel(loc, x.startMs)}` : "?"} · {t(`kind.${x.a.kind}`)}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => step(1)} aria-label={t("app.nextSession")}>›</button>
      </div>
      <div className="shead">
        <div>
          <h1>{t(`kind.${e.a.kind}`)}{e.startMs !== null ? ` · ${dayLabel(loc, e.startMs)}, ${timeLabel(loc, e.startMs)}` : ""}</h1>
          <div className="sub">
            <span className="pill"><span className="kdot" style={{ background: KIND_COLOR[e.a.kind] }} />
              {e.a.kind === "flight" && p ? t("app.airtime", { time: clock(p.airtimeS) }) : t("app.sessionDuration", { time: duration(loc, s.durationS) })}
            </span>
            <span>{s.modelName ?? t("app.unknownModel")}</span>
            {e.batteryLetter ? <span className="pill">{t("battery.name", { letter: e.batteryLetter })} · {t("app.cycles", { n: s.battery?.chargeCycles ?? "?" })}</span>
              : e.a.kind !== "transmitter-only" ? <span className="pill">{t("app.batteryNotIdentified")}</span> : null}
            <span className="lv-more mono">{e.file.fileName} · #{s.index} · {t("app.records", { n: Number(s.meta.records ?? 0) })}</span>
          </div>
        </div>
        <div className="navbtns">
          <button className="btn" disabled={pos <= 0} onClick={() => step(-1)}>‹ {t("app.prev")}</button>
          <button className="btn" disabled={pos >= visible.length - 1} onClick={() => step(1)}>{t("app.next")} ›</button>
        </div>
      </div>
      {isDemo && <div className="simbanner"><b>Demo</b><span className="hint">{t("app.demoBanner")}</span></div>}
      {e.a.kind === "transmitter-only" ? (
        <Alert level="info" title={t("app.transmitterOnly")}>{t("app.transmitterOnlyText")}</Alert>
      ) : (
        <>
          <div className="tabs" role="tablist">
            {TABS.map((k) => (
              <button key={k} role="tab" className={k === "raw" ? "lv-more" : ""} aria-selected={current === k} onClick={() => setTab(k)}>{t(`tabs.${k}`)}</button>
            ))}
          </div>
          <div className="stack" role="tabpanel">
            {current === "overview" && <OverviewTab />}
            {current === "height" && <HeightTab />}
            {current === "path" && <PathTab />}
            {current === "energy" && <EnergyTab />}
            {current === "battery" && <BatteryTab />}
            {current === "link" && <LinkTab />}
            {current === "aircraft" && <AircraftTab />}
            {current === "raw" && <RawTab />}
          </div>
        </>
      )}
    </>
  );
}
