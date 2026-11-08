"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { DetailRows, Legend, RatingCard, useLevelWord, useRich } from "../bits";
import { LineChart } from "../charts/LineChart";
import { Scatter } from "../charts/Scatter";
import { num } from "../format";
import { useStore } from "../store";
import { cellCount } from "@/core/analysis/battery";
import { ConditionCard, IssueAlerts } from "./ratings";

export function BatteryTab() {
  const t = useTranslations();
  const rich = useRich();
  const word = useLevelWord();
  const { selected: e, settings, go } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const g = a.grid;
  const b = a.session.battery;
  const p = a.profile.available ? a.profile.value : null;
  const ch = a.charge.available ? a.charge.value : null;
  const cond = a.batteryCondition.available ? a.batteryCondition.value : null;
  const cells = cellCount(a.session, g) ?? 3;
  const perCell = useMemo(() => [{ data: g.get("pack_voltage").map((v) => (v === null ? null : v / cells)), color: "--s-alt", unit: "V", digits: 2 }], [g, cells]);
  const cellSeries = useMemo(() => [1, 2, 3, 4, 5, 6].filter((k) => g.has(`cell_voltage.${k}`))
    .map((k, i) => ({ data: g.get(`cell_voltage.${k}`), color: ["--s-alt", "--s-motor", "--s-lift", "--s-4", "--s-5", "--ink-3"][i], unit: "V", digits: 3, label: String(k) })), [g]);
  const sagPoints = useMemo(() => {
    const amps = g.get("motor_current"), volts = g.get("pack_voltage");
    const out: [number, number][] = [];
    for (let i = 0; i < g.n; i++) if (amps[i] !== null && volts[i] !== null) out.push([amps[i]!, volts[i]!]);
    return out;
  }, [g]);
  const allCells = cellSeries.flatMap((s) => s.data.filter((x): x is number => x !== null));
  const bal = a.cellBalance.available ? a.cellBalance.value : null;
  const frozen = a.issues.some((i) => i.kind === "frozen");

  return (
    <>
      <IssueAlerts a={a} />
      <div className="grid g3">
        <div className="card">
          <div className="lbl">{t("battery.which")}</div>
          <h3 style={{ fontSize: 24 }}>{e!.batteryLetter ? t("battery.name", { letter: e!.batteryLetter }) : t("battery.notIdentified")}</h3>
          <div className="hint">
            {b ? rich("battery.identity", { chem: b.chemistry ?? "?", cells: b.cells ?? "?", capacity: b.capacityMah ?? "?", cycles: b.chargeCycles ?? "?" }) : t("battery.noIdentity")}
          </div>
          {b && <div className="hint lv-exp mono">ID {b.id} · {b.emptyCellV} / {b.fullCellV} V · {b.dischargeRatingC} C</div>}
          {b && <a href="#batteries" className="hint" onClick={(ev) => { ev.preventDefault(); go("batteries"); }}>{t("battery.history")}</a>}
        </div>
        <div className="card">
          <div className="lbl">{t("battery.charge")}</div>
          <div className="num" style={{ display: "flex", gap: 12, alignItems: "baseline", font: "600 30px var(--display)" }}>
            {ch?.startPct != null ? `${num(loc, ch.startPct, 0)} %` : "–"} <span style={{ fontSize: 18, color: "var(--ink-3)" }}>→</span> {ch?.endPct != null ? `${num(loc, ch.endPct, 0)} %` : "–"}
          </div>
          <div className="hint">{t("battery.chargeHint")}</div>
          <DetailRows rows={ch ? [[t("battery.perCellStart"), `${num(loc, ch.startCellV, 2)} V`], [t("battery.perCellEnd"), `${num(loc, ch.endCellV, 2)} V`]] : null} />
        </div>
        <ConditionCard a={a} />
      </div>
      {g.has("pack_voltage") && (
        <LineChart syncKey={e!.key} title={t("battery.voltage")} series={perCell} phases={a.kind === "flight" ? p?.phases : null} height={170} yMin={3.3} yMax={4.3}
          yFormat={(x) => `${num(loc, x, 1)} V`} bands={[{ from: 3.3, to: 3.5, color: "--crit", alpha: 0.1 }, { from: 3.5, to: 3.7, color: "--warn", alpha: 0.1 }]}
          extra={<div className="sub">{t("battery.voltageHint")}</div>} />
      )}
      {cellSeries.length > 0 && (
        <div className="lv-std">
          <LineChart syncKey={e!.key} title={t("battery.cells")} series={cellSeries} height={160} yMin={Math.min(...allCells) - 0.02} yMax={Math.max(...allCells) + 0.02}
            yFormat={(x) => num(loc, x, 2)} extra={<Legend items={cellSeries.map((s, i) => [`var(${s.color})`, t("battery.cell", { n: i + 1 }), true])} />} />
        </div>
      )}
      {cellSeries.length > 1 && (
        <div className="grid g3 lv-std">
          <RatingCard name={t("rating.balance")} level={bal?.level ?? null} word={word("balance", bal?.level ?? null)}
            hint={bal ? t("rating.balanceHint", { mv: num(loc, bal.maxSpreadMv, 0) }) : frozen ? t("rating.balanceFrozen") : ""} />
        </div>
      )}
      {cond && sagPoints.length > 0 && (
        <div className="lv-exp">
          <Scatter title={t("battery.sag")} note={t("battery.sagHint")} points={sagPoints} xLabel={t("energy.motorCurrent") + " (A)"} yLabel="V" color="--s-alt"
            slope={-(cond.resistancePerCellMilliOhm * cond.cells) / 1000} />
        </div>
      )}
    </>
  );
}
