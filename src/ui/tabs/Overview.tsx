"use client";

import { maxOf } from "@/core/analysis/grid";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Legend, Tile, useLevelWord, useRich } from "../bits";
import { LineChart, PHASE_COLOR } from "../charts/LineChart";
import { jumpTo } from "../charts/sync";
import { axisNum, clock, duration, num } from "../format";
import { useStore } from "../store";
import { ConditionCard, DataCard, IssueAlerts, LinkCard, RxCard, SignalCard, StyleCard, TempCard, UsedCard } from "./ratings";
import { MinMaxCard } from "./MinMax";

/** Colour of each phase; `glide` overrides the glide colour (the map draws glides in a stronger colour than the charts). */
export function PhaseLegend({ kinds, glide }: { kinds: string[]; glide?: string }) {
  const t = useTranslations("phase");
  return <Legend items={kinds.map((k) => [k === "glide" && glide ? `var(${glide})` : `var(${PHASE_COLOR[k]})`, t(k)] as [string, string])} />;
}

export function OverviewTab() {
  const t = useTranslations();
  const rich = useRich();
  const word = useLevelWord();
  const { selected: e, settings } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const p = a.profile.available ? a.profile.value : null;
  const g = a.grid;

  const altSeries = useMemo(() => [{ data: g.get("altitude"), color: "--s-alt", unit: "m", fill: 0.12 }], [g]);
  const thrSeries = useMemo(() => [{ data: g.get(g.has("throttle_output") ? "throttle_output" : "throttle_command"), color: "--s-motor", unit: "%", fill: 0.15 }], [g]);

  let summary: React.ReactNode;
  if (a.kind === "flight" && p) {
    const link = a.link.available ? a.link.value.overall : null;
    const used = a.batteryUse.available ? a.batteryUse.value.usedPct : null;
    summary = (
      <>
        {rich("overview.flightAir", { minutes: num(loc, p.airtimeS / 60, 1), height: num(loc, p.maxAltitudeM, 0) })}{" "}
        {rich("overview.flightMotor", { count: p.climbs.length, time: clock(p.motorSecs) })}{" "}
        {p.lifts.length ? rich("overview.flightLift", { count: p.lifts.length, gain: num(loc, p.liftGainM, 0) }) : t("overview.flightNoLift")}{" "}
        {link && rich("overview.flightLink", { link: word("link", link.level).toLowerCase() })}{" "}
        {used !== null && rich("overview.flightBattery", { pct: num(loc, used, 0) })}
      </>
    );
  } else if (a.kind === "ground-test" && p) {
    const amps = Math.max(0, maxOf(g.get("motor_current", "max")) ?? 0);
    summary = rich("overview.groundSummary", { time: duration(loc, a.session.durationS), secs: p.motorSecs, amps: num(loc, amps, 1) });
  } else {
    summary = rich("overview.poweredSummary", { time: duration(loc, a.session.durationS) });
  }

  const momentValue = (kind: string, value: number) => {
    switch (kind) {
      case "highest": return `${num(loc, value, 1)} m`;
      case "best-lift": return `+${num(loc, value, 0)} m`;
      case "longest-circling": return t("overview.circlesN", { n: value });
      case "hardest-load": return `${num(loc, value, 1)} g`;
      case "weakest-signal": return `${num(loc, value, 0)} dBm`;
      default: return t("overview.perSecond", { n: value });
    }
  };

  return (
    <>
      <p className="summary">{summary}</p>
      <IssueAlerts a={a} />
      {a.kind === "flight" && p ? (
        <>
          <div className="grid g4">
            <Tile label={t("overview.airtime")} value={clock(p.airtimeS)} unit=" min" />
            <Tile label={t("overview.highest")} value={num(loc, p.maxAltitudeM, 0)} unit=" m" />
            <Tile label={t("overview.motorTime")} value={clock(p.motorSecs)} unit=" min" sub={t("overview.climbs", { n: p.climbs.length })} />
            <Tile label={t("overview.lift")} value={p.lifts.length ? `+${num(loc, p.liftGainM, 0)}` : "0"} unit={p.lifts.length ? " m" : ""}
              sub={p.lifts.length ? `${p.lifts.length}× · ${clock(p.liftSecs)} min` : t("overview.noThermals")} />
          </div>
          <LineChart syncKey={e!.key} title={t("overview.height")} series={altSeries} phases={p.phases} height={210}
            extra={<PhaseLegend kinds={[...new Set(p.phases.map((x) => x.kind))]} />} yFormat={(x) => `${axisNum(loc, x)} m`}
            rest={`max ${num(loc, p.maxAltitudeM, 1)} m`}
            readout={(i) => `${num(loc, altSeries[0].data[i], 1)} m · ${p.phaseAt[i] ? t(`phase.${p.phaseAt[i]}`) : ""}`} />
        </>
      ) : (
        thrSeries[0].data.some((x) => x !== null) && <LineChart syncKey={e!.key} title={t("overview.throttle")} series={thrSeries} yMax={100} yFormat={(x) => `${axisNum(loc, x)} %`} />
      )}
      <div className="sectionhead"><h2>{t("overview.health")}</h2><p>{t("overview.healthHint")}</p></div>
      <div className="grid g4">
        <LinkCard a={a} /><SignalCard a={a} /><UsedCard a={a} /><ConditionCard a={a} />
        <TempCard a={a} /><RxCard a={a} /><StyleCard a={a} /><DataCard a={a} />
      </div>
      {a.moments.length > 0 && (
        <div className="card">
          <h3>{t("overview.moments")}</h3>
          <div className="hint">{t("overview.momentsHint")}</div>
          <table className="tbl"><tbody>
            {a.moments.map((m) => (
              <tr key={m.kind} className="clickable" onClick={() => jumpTo(e!.key, m.at)}>
                <td>{t(`overview.m.${m.kind}`)}</td><td>{momentValue(m.kind, m.value)}</td><td className="r num" style={{ color: "var(--ink-3)" }}>{clock(m.at)}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}
      <MinMaxCard a={a} syncKey={e!.key} />
    </>
  );
}
