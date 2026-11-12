"use client";

import { maxOf } from "@/core/analysis/grid";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Meter, Tile, useLevelWord, LEVEL_COLOR } from "../bits";
import { LineChart } from "../charts/LineChart";
import { jumpTo } from "../charts/sync";
import { axisNum, clock, num } from "../format";
import { useStore, useUnits } from "../store";
import { rate, THRESHOLDS } from "@/core/analysis";
import { PhaseLegend } from "./Overview";
import { CapacityInput } from "./CapacityInput";
import { ConsumptionCard, EfficiencyCard } from "./ratings";

function Gauge({ pct }: { pct: number }) {
  const level = rate(pct, THRESHOLDS.batteryUsedPct)!;
  const { settings } = useStore();
  return (
    <>
      <div style={{ position: "relative", height: 14, background: "var(--grid)", borderRadius: 7, overflow: "hidden" }} role="img" aria-label={`${num(settings.locale, pct, 0)} %`}>
        <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${Math.min(100, pct)}%`, background: LEVEL_COLOR[level], opacity: level === 3 ? 0.6 : 1 }} />
        <div style={{ position: "absolute", left: "80%", top: 0, bottom: 0, width: 2, background: "var(--ink-2)" }} />
      </div>
      <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-3)" }}>
        <span>0 %</span><span>{num(settings.locale, pct, 0)} %</span><span>80 %</span>
      </div>
    </>
  );
}

export function EnergyTab() {
  const t = useTranslations();
  const word = useLevelWord();
  const { selected: e, settings } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const U = useUnits();
  const g = a.grid;
  const p = a.profile.available ? a.profile.value : null;
  const u = a.batteryUse.available ? a.batteryUse.value : null;
  const thr = useMemo(() => [{ data: g.get(g.has("throttle_output") ? "throttle_output" : "throttle_command"), color: "--s-motor", unit: "%", fill: 0.15 }], [g]);
  const amps = useMemo(() => [{ data: g.get("motor_current"), color: "--s-motor", unit: "A", fill: 0.1 }], [g]);
  const rpm = useMemo(() => [{ data: g.get("rpm_electrical"), color: "--s-4", unit: "1/min", digits: 0 }], [g]);
  const maxA = Math.max(0, maxOf(g.get("motor_current", "max")) ?? 0);
  const flight = a.kind === "flight" && p;

  return (
    <>
      <div className="grid g4">
        {u && u.usedPct !== null ? (
          <div className="card rating">
            <div className="top3"><span className="lbl">{t("rating.used")}</span><Meter level={u.level!} /></div>
            <div className="word">{word("used", u.level)}</div>
            <Gauge pct={u.usedPct} />
            <div className="hint">{t("energy.usedText", { used: num(loc, u.usedMah, 0), capacity: u.capacityMah! })}{u.capacitySource === "user" ? t("rating.yourCapacity") : ""}</div>
          </div>
        ) : <Tile label={t("rating.used")} value={u ? num(loc, u.usedMah, 0) : "–"} unit={u ? " mAh" : ""} />}
        {flight && a.consumption ? <ConsumptionCard a={a} /> : <Tile label={t("rating.consumption")} value={p?.mahPerMin != null ? num(loc, p.mahPerMin, 0) : "–"} unit={p?.mahPerMin != null ? " mAh/min" : ""}
          sub={!flight ? t("energy.onlyFlights") : p.mahPerMin != null ? t("energy.needsOtherFlights") : undefined} />}
        {flight && a.efficiency ? <EfficiencyCard a={a} /> : <Tile label={t("rating.efficiency")} value="–"
          sub={!flight ? t("energy.onlyFlights") : p.basis !== "height" ? t("energy.needsHeight") : p.mPer100mAh != null ? t("energy.needsOtherFlights") : undefined} />}
        <Tile label={t("overview.motorTime")} value={clock(p?.motorSecs ?? 0)} unit=" min" sub={`max ${num(loc, maxA, 1)} A`} />
      </div>
      {u && u.capacitySource !== "battery" && <CapacityInput key={e!.model.key} />}
      {thr[0].data.some((x) => x !== null) && (
        <LineChart syncKey={e!.key} title={t("overview.throttle")} series={thr} phases={flight ? p.phases : null} height={150} yMax={100}
          yFormat={(x) => `${axisNum(loc, x)} %`} extra={flight ? <PhaseLegend kinds={[...new Set(p.phases.map((x) => x.kind))]} /> : null} />
      )}
      {g.has("motor_current") && <div className="lv-more"><LineChart syncKey={e!.key} title={t("energy.motorCurrent")} series={amps} height={150} yFormat={(x) => `${axisNum(loc, x)} A`} /></div>}
      {g.has("rpm_electrical") && (
        <div className="lv-more"><LineChart syncKey={e!.key} title={t("energy.rpm")} series={rpm} height={130} yFormat={(x) => `${axisNum(loc, x / 1000)}k`} extra={<div className="sub">{t("energy.rpmHint")}</div>} /></div>
      )}
      {flight && p.climbs.length > 0 && (
        <div className="card">
          <h3>{t("energy.eachClimb")}</h3>
          <div className="scroll"><table className="tbl">
            <thead><tr><th>{t("height.start")}</th><th className="r">{t("height.duration")}</th><th className="r">{t("energy.gained")}</th><th className="r">{t("energy.chargeUsed")}</th><th>{t("energy.efficiency")}</th><th className="r lv-more">{U.u("height")} / 100 mAh</th></tr></thead>
            <tbody>
              {p.climbs.map((c) => {
                const lvl = c.mPer100mAh !== null && a.baseline?.efficiency ? rate(c.mPer100mAh / a.baseline.efficiency, THRESHOLDS.efficiencyRatio) : null;
                return (
                  <tr key={c.start} className="clickable" onClick={() => jumpTo(e!.key, c.start)}>
                    <td className="num">{clock(c.start)}</td>
                    <td className="r num">{c.end - c.start + 1} s</td>
                    <td className="r num">+{U.fmt("height", c.gainM)}</td>
                    <td className="r num">{c.mah === null ? "–" : `${num(loc, c.mah, 0)} mAh`}</td>
                    <td>{lvl ? <><Meter level={lvl} /> {word("efficiency", lvl)}</> : <span style={{ color: "var(--ink-3)" }}>{c.mPer100mAh === null ? t("energy.tooShort") : "–"}</span>}</td>
                    <td className="r num lv-more">{U.n("height", c.mPer100mAh)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          <p className="note">{t("energy.note")}</p>
        </div>
      )}
    </>
  );
}
