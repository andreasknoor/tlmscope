"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { Legend, Tile } from "../bits";
import { LineChart } from "../charts/LineChart";
import { Strip } from "../charts/Strip";
import { axisNum, cssVar, num } from "../format";
import { useStore, useUnits } from "../store";
import { RxCard, StyleCard, TempCard } from "./ratings";

const MODE_COLORS = ["--s-alt", "--s-motor", "--s-4", "--s-lift", "--s-5"];
const DISABLED_COLOR = "--s-ground";

export function AircraftTab() {
  const t = useTranslations();
  const { selected: e, settings } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const U = useUnits();
  const g = a.grid;
  const p = a.profile.available ? a.profile.value : null;
  const temps = useMemo(() => [
    { id: "temperature.esc", color: "--s-motor", label: t("aircraft.controller") },
    { id: "temperature.bec", color: "--s-alt", label: t("aircraft.bec") },
    { id: "temperature.battery", color: "--s-lift", label: t("aircraft.battery") },
  ].filter((s) => g.has(s.id)).map((s) => ({ data: U.series("temp", g.filled(s.id)), color: s.color, unit: U.u("temp"), digits: 0, label: s.label })), [g, t, U]);
  const power = useMemo(() => [
    { id: "rx_voltage", color: "--s-alt", label: t("aircraft.receiver") },
    { id: "bec_voltage", color: "--s-motor", label: t("aircraft.becOut") },
  ].filter((s) => g.has(s.id)).map((s) => ({ data: g.get(s.id, "min"), color: s.color, unit: "V", digits: 2, label: s.label })), [g, t]);
  const load = useMemo(() => [{ data: g.magnitudeMax(["accel.x", "accel.y", "accel.z"]), color: "--s-4", unit: "g", digits: 1 }], [g]);
  const fm = g.get("flight_mode", "last");
  const modes = [...new Set(fm.filter((x): x is number => x !== null))].sort();
  const hasGaps = fm.some((x) => x === null);
  const fmColor = useCallback((i: number) => {
    const m = g.get("flight_mode", "last")[i];
    // No value from the receiver counts as "disabled".
    return cssVar(m === null ? DISABLED_COLOR : MODE_COLORS[m % MODE_COLORS.length]);
  }, [g]);

  return (
    <>
      <div className="grid g4">
        <TempCard a={a} /><RxCard a={a} /><StyleCard a={a} />
        <Tile label={t("aircraft.flightMode")} value={modes.length ? t("aircraft.modes", { list: modes.map((m) => m + 1).join(", ") }) : t("aircraft.disabled")} sub={t("aircraft.flightModeHint")} />
      </div>
      {temps.length > 0 && <LineChart syncKey={e!.key} title={t("rating.temps")} series={temps} height={160} yMin={U.v("temp", 0)!} yFormat={(x) => `${axisNum(loc, x)} ${U.u("temp")}`}
        extra={<Legend items={temps.map((s) => [`var(${s.color})`, s.label, true])} />} />}
      {power.length > 0 && <div className="lv-more"><LineChart syncKey={e!.key} title={t("rating.rx")} series={power} height={140} yMin={4} yMax={6.5}
        yFormat={(x) => `${num(loc, x, 1)} V`} bands={[{ from: 4, to: 4.8, color: "--crit", alpha: 0.1 }]}
        extra={<Legend items={power.map((s) => [`var(${s.color})`, s.label, true])} />} /></div>}
      {g.has("accel.x") && <div className="lv-more"><LineChart syncKey={e!.key} title={t("aircraft.load")} series={load} phases={a.kind === "flight" ? p?.phases : null} height={140} yFormat={(x) => `${axisNum(loc, x)} g`} /></div>}
      {modes.length > 0 && <div className="lv-more"><Strip syncKey={e!.key} label={t("aircraft.fmOverTime")} n={g.n} colorAt={fmColor}
        right={<Legend style={{ padding: 0 }} items={[
          ...modes.map((m): [string, string] => [`var(${MODE_COLORS[m % MODE_COLORS.length]})`, t("aircraft.mode", { n: m + 1 })]),
          ...(hasGaps ? [[`var(${DISABLED_COLOR})`, t("aircraft.disabled")] as [string, string]] : []),
        ]} />} /></div>}
    </>
  );
}
