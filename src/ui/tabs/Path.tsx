"use client";

import { maxOf } from "@/core/analysis/grid";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { Alert, Legend, Tile, useLevelWord } from "../bits";
import { FlightMap } from "../charts/FlightMap";
import { Replay } from "../charts/Replay";
import { LineChart, PHASE_COLOR } from "../charts/LineChart";
import { Strip } from "../charts/Strip";
import { axisNum, clock, cssVar, mix, num, withAlpha } from "../format";
import { useStore } from "../store";
import { levelColor } from "./Link";
import { PhaseLegend } from "./Overview";

/** Glide colour on the map. */
const MAP_GLIDE = "--s-alt";

type ColourBy = "phase" | "height" | "signal";

function GpsView() {
  const t = useTranslations();
  const { selected: e, settings, entries } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const g = a.grid;
  const tr = a.track.available ? a.track.value : null;
  // Thermal centres of every loaded flight within a few kilometres of this launch point.
  const spots = useMemo(() => {
    if (!tr) return [];
    const near = (lat: number, lon: number) => Math.hypot((lat - tr.home.lat) * 111_000, (lon - tr.home.lon) * 111_000 * Math.cos((tr.home.lat * Math.PI) / 180)) < 5000;
    return entries.flatMap((x) => (x.a.thermals?.list ?? [])
      .filter((th) => th.centre && near(th.centre.lat, th.centre.lon))
      .map((th) => ({ lat: th.centre!.lat, lon: th.centre!.lon, climb: th.avgClimb, own: x.key === e!.key })));
  }, [entries, tr, e]);
  const p = a.profile.available ? a.profile.value : null;
  const sig = a.signal.available ? a.signal.value : null;
  const word = useLevelWord();
  const [colourBy, setColourBy] = useState<ColourBy>("phase");
  const [pitch, setPitch] = useState(55);
  const [marker, setMarker] = useState<number | null>(null);
  const alt = g.get("altitude");
  const top = Math.max(1, maxOf(alt) ?? 0);
  // On the map, glides are blue: the chart grey would vanish next to the grey ground shadow.
  const colorAt = useCallback((i: number) => {
    if (colourBy === "height") return mix(cssVar("--h-low"), cssVar("--h-high"), Math.max(0, alt[i] ?? 0) / top);
    if (colourBy === "signal") return levelColor(sig?.levels[i] ?? null) ?? cssVar("--ink-3");
    const k = p?.phaseAt[i];
    return cssVar(k === "glide" || !k ? MAP_GLIDE : PHASE_COLOR[k]);
  }, [colourBy, alt, top, sig, p]);
  const altSeries = useMemo(() => [{ data: alt, color: "--s-alt", unit: "m", fill: 0.12 }], [alt]);
  const distSeries = useMemo(() => [{ data: tr?.distance ?? [], color: "--s-5", unit: "m", digits: 0, fill: 0.1 }], [tr]);
  if (!tr) return null;

  return (
    <>
      <div className="grid g4">
        <Tile label={t("path.farthest")} value={num(loc, tr.maxDistanceM, 0)} unit=" m" />
        <Tile label={t("path.distance")} value={num(loc, tr.pathLengthM / 1000, 2)} unit=" km" />
        <Tile label={t("path.typicalSpeed")} value={num(loc, (tr.medianSpeed ?? 0) * 3.6, 0)} unit=" km/h" sub={t("path.overGround")} />
        <Tile label={t("path.topSpeed")} value={num(loc, (tr.maxSpeed ?? 0) * 3.6, 0)} unit=" km/h" sub={t("path.overGround")} />
      </div>
      <div className="chart">
        <div className="ch"><b>{t("path.map")}</b><span className="ro"> </span></div>
        <div className="mapwrap">
          <FlightMap track={tr} height={alt} colorAt={colorAt} marker={marker} pitch={pitch} spots={spots} failedText={t("path.mapFailed")} />
          <div className="tools">
            <div className="seg" role="group">
              <button aria-pressed={pitch > 0} onClick={() => setPitch(55)}>{t("path.view3d")}</button>
              <button aria-pressed={pitch === 0} onClick={() => setPitch(0)}>{t("path.viewTop")}</button>
            </div>
            <div className="seg" role="group" aria-label={t("path.colour")}>
              {(["phase", "height", "signal"] as const).map((c) => (
                <button key={c} aria-pressed={colourBy === c} onClick={() => setColourBy(c)}>{t(`path.by${c[0].toUpperCase()}${c.slice(1)}`)}</button>
              ))}
            </div>
          </div>
        </div>
        {colourBy === "phase" && p ? <PhaseLegend glide={MAP_GLIDE} kinds={[...new Set(p.phases.map((x) => x.kind))].filter((k) => k !== "ground")} />
          : colourBy === "height" ? <Legend items={[[`linear-gradient(90deg, var(--h-low), var(--h-high))`, `0 – ${num(loc, top, 0)} m`]]} />
          : <Legend items={[[cssVar("--good"), word("signal", 4)], [withAlpha(cssVar("--good"), 0.45), word("signal", 3)], [cssVar("--warn"), word("signal", 2)], [cssVar("--crit"), word("signal", 1)]]} />}
      </div>
      {spots.length > 0 && <p className="hint">{t("thermals.mapLegend")}</p>}
      <Replay a={a} syncKey={e!.key} />
      <LineChart syncKey={e!.key} title={t("path.follow")} series={altSeries} phases={p?.phases} height={150} yFormat={(x) => `${axisNum(loc, x)} m`}
        readout={(i) => `${num(loc, alt[i], 0)} m · ${t("path.away", { d: num(loc, tr.distance[i], 0) })}`} onCursor={setMarker} />
      <div className="lv-more"><LineChart syncKey={e!.key} title={t("path.distFromStart")} series={distSeries} height={130} yFormat={(x) => `${axisNum(loc, x)} m`} onCursor={setMarker} /></div>
    </>
  );
}

function NoGpsView() {
  const t = useTranslations();
  const { selected: e, settings } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const p = a.profile.available ? a.profile.value : null;
  const c = a.circling.available ? a.circling.value : null;
  const altSeries = useMemo(() => [{ data: a.grid.get("altitude"), color: "--s-alt", unit: "m", fill: 0.12 }], [a]);
  const circleColor = useCallback((i: number) => {
    if (!c) return null;
    const period = c.periods.find((x) => i >= x.start && i <= x.end);
    if (period) return cssVar(period.direction > 0 ? "--s-alt" : "--s-4");
    return c.turnRate[i] ? withAlpha(cssVar("--s-glide"), 0.7) : null;
  }, [c]);
  const oneWay = c ? c.periods.filter((x) => x.direction > 0).reduce((s, x) => s + x.circles, 0) : 0;

  return (
    <>
      <Alert level="info" title={t("path.noGpsTitle")}>{t("path.noGpsText")}</Alert>
      {c && p && (
        <>
          <div className="sectionhead"><h2 style={{ fontSize: 18 }}>{t("path.rotationTitle")}</h2></div>
          <div className="grid g3">
            <Tile label={t("path.circles")} value={c.circles} sub={t("path.periods", { n: c.periods.length })} />
            <Tile label={t("path.turning")} value={num(loc, (c.turningSecs / Math.max(1, p.airtimeS)) * 100, 0)} unit=" %" sub={t("path.ofAirtime", { turning: clock(c.turningSecs), airtime: clock(p.airtimeS) })} />
            <Tile label={t("path.direction")} value={<>{oneWay}<small> {t("path.oneWay")}</small> · {c.circles - oneWay}<small> {t("path.otherWay")}</small></>} sub={t("path.directionNote")} />
          </div>
          <Strip syncKey={e!.key} label={t("path.circling")} n={a.grid.n} colorAt={circleColor}
            right={<Legend style={{ padding: 0 }} items={[["var(--s-alt)", t("path.oneWay")], ["var(--s-4)", t("path.otherWay")], [withAlpha(cssVar("--s-glide"), 0.7), t("path.partialTurn")]]} />} />
          <Replay a={a} syncKey={e!.key} />
          <LineChart syncKey={e!.key} title={t("overview.height")} series={altSeries} phases={p.phases} height={170} yFormat={(x) => `${axisNum(loc, x)} m`}
            extra={<PhaseLegend kinds={[...new Set(p.phases.map((x) => x.kind))]} />} />
          <p className="note">{t("path.circlingNote")}</p>
        </>
      )}
    </>
  );
}

export function PathTab() {
  const t = useTranslations("path");
  const { selected: e } = useStore();
  if (e!.a.kind !== "flight") return <div className="card empty">{t("noFlight")}</div>;
  return e!.a.track.available ? <GpsView /> : <NoGpsView />;
}
