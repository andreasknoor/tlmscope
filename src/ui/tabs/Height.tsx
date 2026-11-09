"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { Missing, Tile } from "../bits";
import { LineChart, PHASE_COLOR } from "../charts/LineChart";
import { Strip } from "../charts/Strip";
import { jumpTo } from "../charts/sync";
import { axisNum, clock, cssVar, num, withAlpha } from "../format";
import { useStore } from "../store";
import { PhaseLegend } from "./Overview";
import { ThermalsCard } from "./Thermals";

export function HeightTab() {
  const t = useTranslations();
  const { selected: e, settings } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const g = a.grid;
  const p = a.profile.available ? a.profile.value : null;
  const altSeries = useMemo(() => [{ data: g.get("altitude"), color: "--s-alt", unit: "m", fill: 0.12 }], [g]);
  const climbSeries = useMemo(() => [{ data: p?.smoothedClimb ?? [], color: "--s-lift", unit: "m/s", digits: 1 }], [p]);
  const phaseColor = useCallback((i: number) => {
    const k = p?.phaseAt[i];
    return k ? (k === "glide" ? withAlpha(cssVar("--s-glide"), 0.6) : cssVar(PHASE_COLOR[k])) : null;
  }, [p]);

  if (!a.profile.available) return <Missing missing={a.profile.missing} />;
  if (a.kind !== "flight" || !p) return <div className="card empty">{t("height.noFlight")}</div>;

  const cmp = (() => {
    const c = a.sinkComparison;
    if (!c) return "";
    if (Math.abs(c.ratio - 1) < 0.07) return t("height.asUsual");
    return c.ratio < 1 ? t("height.better") : t("height.worse");
  })();
  const alt = altSeries[0].data;

  return (
    <>
      <div className="sectionhead"><h2>{t("height.title")}</h2><p>{t("height.hint")}</p></div>
      <LineChart syncKey={e!.key} title={t("overview.height")} series={altSeries} phases={p.phases} height={220}
        extra={<PhaseLegend kinds={[...new Set(p.phases.map((x) => x.kind))]} />} yFormat={(x) => `${axisNum(loc, x)} m`}
        readout={(i) => `${num(loc, alt[i], 1)} m · ${p.phaseAt[i] ? t(`phase.${p.phaseAt[i]}`) : ""}`} />
      <Strip syncKey={e!.key} label={t("height.phases")} n={p.n} colorAt={phaseColor} height={18} />
      <div className="lv-more">
        <LineChart syncKey={e!.key} title={t("height.climbRate")} series={climbSeries} height={150} yMin={-4} yMax={6}
          bands={[{ from: 0.2, to: 6, color: "--s-lift", alpha: 0.07 }]} extra={<div className="sub">{t("height.climbHint")}</div>} />
      </div>
      <div className="grid g3">
        <Tile label={t("height.motorClimbs")} value={p.climbs.length} sub={t("height.withMotor", { gain: num(loc, p.climbs.reduce((s, c) => s + c.gainM, 0), 0) })} />
        <Tile label={t("height.lift")} value={p.lifts.length} sub={p.lifts.length ? `+${num(loc, p.liftGainM, 0)} m · ${clock(p.liftSecs)} min` : t("height.noneFound")} />
        <Tile label={t("height.gliding")} value={clock(p.glideSecs)} unit=" min"
          sub={p.glideSinkRate !== null ? t("height.sinking", { rate: num(loc, p.glideSinkRate, 1), cmp }) : undefined} />
      </div>
      {!p.lifts.length && <p className="note">{t("height.noLift")}</p>}
      {a.thermals && <ThermalsCard thermals={a.thermals} />}
      <div className="card">
        <h3>{t("height.byPhase")}</h3>
        <div className="scroll"><table className="tbl">
          <thead><tr><th>{t("height.start")}</th><th>{t("height.phase")}</th><th className="r">{t("height.duration")}</th><th className="r">{t("height.heightChange")}</th><th className="r lv-more">{t("height.avgClimb")}</th></tr></thead>
          <tbody>
            {p.phases.map((ph) => {
              const a0 = alt[ph.start], a1 = alt[ph.end], d = ph.end - ph.start + 1;
              const diff = a0 !== null && a1 !== null ? a1 - a0 : null;
              return (
                <tr key={ph.start} className="clickable" onClick={() => jumpTo(e!.key, ph.start)}>
                  <td className="num">{clock(ph.start)}</td>
                  <td><span className="kdot" style={{ background: `var(${PHASE_COLOR[ph.kind]})` }} /> {t(`phase.${ph.kind}`)}</td>
                  <td className="r num">{clock(d)}</td>
                  <td className="r num">{diff === null ? "–" : `${diff >= 0 ? "+" : ""}${num(loc, diff, 0)} m`}</td>
                  <td className="r num lv-more">{diff === null ? "–" : `${num(loc, diff / d, 1)} m/s`}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
      <p className="note">{t("height.sinkNote")}</p>
    </>
  );
}
