"use client";

import { maxOf } from "@/core/analysis/grid";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { FlightProfile } from "@/core/analysis/flight";
import { DetailLink } from "../DetailLink";
import { FeedbackLink, Legend, Tile, useAirtime, useLevelWord, useRich, MoreHint } from "../bits";
import { LineChart, PHASE_COLOR } from "../charts/LineChart";
import { jumpTo } from "../charts/sync";
import { axisNum, clock, duration, num } from "../format";
import { useStore, useUnits } from "../store";
import { ConditionCard, DataCard, IssueAlerts, LinkCard, RxCard, SignalCard, StyleCard, TempCard, UsedCard } from "./ratings";
import { MinMaxCard } from "./MinMax";

/** Colour of each phase; `glide` overrides the glide colour (the map draws glides in a stronger colour than the charts). */
export function PhaseLegend({ kinds, glide }: { kinds: string[]; glide?: string }) {
  const t = useTranslations("phase");
  return <Legend items={kinds.map((k) => [(k === "glide" || k === "unpowered") && glide ? `var(${glide})` : `var(${PHASE_COLOR[k]})`, t(k)] as [string, string])} />;
}

/** Motor runs in the air (without height there are no climbs, but there are runs). */
const runsOf = (p: FlightProfile) => p.motorRuns.length;

export function OverviewTab() {
  const t = useTranslations();
  const rich = useRich();
  const word = useLevelWord();
  const airtime = useAirtime();
  const { selected: e, settings } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const U = useUnits();
  const p = a.profile.available ? a.profile.value : null;
  const g = a.grid;

  const altSeries = useMemo(() => [{ data: U.series("height", g.get("altitude")), color: "--s-alt", unit: U.u("height"), fill: 0.12 }], [g, U]);
  const thrSeries = useMemo(() => [{ data: g.get(g.has("throttle_output") ? "throttle_output" : "throttle_command"), color: "--s-motor", unit: "%", fill: 0.15 }], [g]);

  let summary: React.ReactNode;
  if (a.kind === "flight" && p) {
    const link = a.link.available ? a.link.value.overall : null;
    const used = a.batteryUse.available ? a.batteryUse.value.usedPct : null;
    const height = p.basis === "height";
    const minutes = num(loc, p.airtimeS / 60, 1);
    summary = (
      <>
        {p.maxAltitudeM !== null ? rich("overview.flightAir", { minutes, height: U.fmt("height", p.maxAltitudeM) })
          : rich(p.basis === "motion" ? "overview.flightAirApprox" : "overview.flightAirNoHeight", { minutes })}{" "}
        {rich("overview.flightMotor", { count: height ? p.climbs.length : runsOf(p), time: clock(p.motorSecs) })}{" "}
        {!height ? null : p.lifts.length ? rich("overview.flightLift", { count: p.lifts.length, gain: U.fmt("height", p.liftGainM) }) : t("overview.flightNoLift")}{" "}
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
      case "highest": return U.fmt("height", value, 1);
      case "best-lift": return `+${U.fmt("height", value)}`;
      case "longest-circling": return t("overview.circlesN", { n: value });
      case "hardest-load": return `${num(loc, value, 1)} g`;
      case "weakest-signal": return `${num(loc, value, 0)}\u00a0dBm`;
      default: return t("overview.perSecond", { n: value });
    }
  };

  return (
    <>
      <p className="summary">{summary}</p>
      {a.kind === "flight" && p && p.basis !== "height" && <p className="note">{t(p.heightSource === "gps" ? "overview.gpsHeight" : "overview.noHeight")}</p>}
      <IssueAlerts a={a} />
      {a.kind === "flight" && p && p.basis !== "height" ? (
        <>
          <div className="grid g4">
            <Tile label={t("overview.airtime")} value={airtime(p)} unit={"\u00a0min"} />
            {p.maxAltitudeM !== null
              ? <Tile label={t("overview.highest")} value={U.n("height", p.maxAltitudeM)} unit={`\u00a0${U.u("height")}`} sub={t("overview.fromGps")} more={<DetailLink a={a} k="highest" />} />
              : <Tile label={t("overview.highest")} value="–" sub={t("overview.noHeightShort")} />}
            <Tile label={t("overview.motorTime")} value={clock(p.motorSecs)} unit={"\u00a0min"} sub={t("overview.climbs", { n: runsOf(p) })} more={<DetailLink a={a} k="motor" />} />
            <Tile label={t("overview.lift")} value="–" sub={t(p.heightSource === "gps" ? "overview.needsSensor" : "overview.noHeightShort")} />
          </div>
          {p.heightSource === "gps" && (
            <LineChart syncKey={e!.key} title={t("overview.heightGps")} series={altSeries} phases={p.phases} height={180}
              yFormat={(x) => `${axisNum(loc, x)}\u00a0${U.u("height")}`} rest={`max ${U.fmt("height", p.maxAltitudeM, 1)}`} />
          )}
          {thrSeries[0].data.some((x) => x !== null) && (
            <LineChart syncKey={e!.key} title={t("overview.throttle")} series={thrSeries} phases={p.phases} yMax={100} yFormat={(x) => `${axisNum(loc, x)}\u00a0%`}
              extra={<PhaseLegend kinds={[...new Set(p.phases.map((x) => x.kind))]} />}
              readout={(i) => `${num(loc, thrSeries[0].data[i], 0)} % · ${p.phaseAt[i] ? t(`phase.${p.phaseAt[i]}`) : ""}`} />
          )}
        </>
      ) : a.kind === "flight" && p ? (
        <>
          <div className="grid g4">
            <Tile label={t("overview.airtime")} value={airtime(p)} unit={"\u00a0min"} />
            <Tile label={t("overview.highest")} value={U.n("height", p.maxAltitudeM)} unit={`\u00a0${U.u("height")}`} more={<DetailLink a={a} k="highest" />} />
            <Tile label={t("overview.motorTime")} value={clock(p.motorSecs)} unit={"\u00a0min"} sub={t("overview.climbs", { n: p.climbs.length })} more={<DetailLink a={a} k="motor" />} />
            <Tile label={t("overview.lift")} value={p.lifts.length ? `+${U.n("height", p.liftGainM)}` : "0"} unit={p.lifts.length ? `\u00a0${U.u("height")}` : ""}
              sub={p.lifts.length ? `${p.lifts.length}× · ${clock(p.liftSecs)}\u00a0min` : t("overview.noThermals")} more={<DetailLink a={a} k="lift" />} />
          </div>
          <LineChart syncKey={e!.key} title={t("overview.height")} series={altSeries} phases={p.phases} height={210}
            extra={<PhaseLegend kinds={[...new Set(p.phases.map((x) => x.kind))]} />} yFormat={(x) => `${axisNum(loc, x)}\u00a0${U.u("height")}`}
            rest={`max ${U.fmt("height", p.maxAltitudeM, 1)}`}
            readout={(i) => `${num(loc, altSeries[0].data[i], 1)}\u00a0${U.u("height")} · ${p.phaseAt[i] ? t(`phase.${p.phaseAt[i]}`) : ""}`} />
        </>
      ) : (
        thrSeries[0].data.some((x) => x !== null) && <LineChart syncKey={e!.key} title={t("overview.throttle")} series={thrSeries} yMax={100} yFormat={(x) => `${axisNum(loc, x)}\u00a0%`} />
      )}
      <div className="sectionhead"><h2>{t("overview.health")}</h2><p>{t("overview.healthHint")}</p></div>
      <div className="grid g4">
        <LinkCard a={a} more={<DetailLink a={a} k="link" />} /><SignalCard a={a} more={<DetailLink a={a} k="signal" />} />
        <UsedCard a={a} more={<DetailLink a={a} k="used" />} /><ConditionCard a={a} more={<DetailLink a={a} k="condition" />} />
        <TempCard a={a} /><RxCard a={a} more={<DetailLink a={a} k="rx" />} /><StyleCard a={a} /><DataCard a={a} more={<DetailLink a={a} k="data" />} />
      </div>
      <p className="fbnote"><FeedbackLink entry="rating">{t("feedback.rating")}</FeedbackLink></p>
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
      <MoreHint items={[t("more.minMax"), t("more.raw")]} />
      <MinMaxCard a={a} syncKey={e!.key} />
    </>
  );
}
