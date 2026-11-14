"use client";

import { maxOf } from "@/core/analysis/grid";
import { useTranslations } from "next-intl";
import { useOnline } from "../offline";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Legend, Tile, useLevelWord } from "../bits";
import { FlightMap, LINE_STYLES, MARKER_STYLES, PATH_MODES, type LineStyle, type MarkerStyle, type PathMode } from "../charts/FlightMap";
import { Replay } from "../charts/Replay";
import { LineChart, PHASE_COLOR } from "../charts/LineChart";
import { Strip } from "../charts/Strip";
import { axisNum, clock, cssVar, mix, num, withAlpha } from "../format";
import { useStore, useUnits } from "../store";
import { levelColor } from "./Link";
import { PhaseLegend } from "./Overview";

/** Glide colour on the map. */
const MAP_GLIDE = "--s-alt";

type ColourBy = "phase" | "height" | "signal";

function GpsView() {
  const t = useTranslations();
  const online = useOnline();
  const { selected: e, settings, entries } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const U = useUnits();
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
  const [lineStyle, setLineStyle] = useState<LineStyle>("thin");
  const [pathMode, setPathMode] = useState<PathMode>("full");
  const [markerStyle, setMarkerStyle] = useState<MarkerStyle>("plane");
  const [shadow, setShadow] = useState(true);
  const [marker, setMarker] = useState<number | null>(null);
  // Full screen: map and replay fill the browser window. Esc closes; the page behind does not scroll.
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [full]);
  const alt = g.get("altitude");
  const top = Math.max(1, maxOf(alt) ?? 0);
  // On the map, glides are blue: the chart grey would vanish next to the grey ground shadow.
  const colorAt = useCallback((i: number) => {
    if (colourBy === "height") return mix(cssVar("--h-low"), cssVar("--h-high"), Math.max(0, alt[i] ?? 0) / top);
    if (colourBy === "signal") return levelColor(sig?.levels[i] ?? null) ?? cssVar("--ink-3");
    const k = p?.phaseAt[i];
    return cssVar(k === "glide" || k === "unpowered" || !k ? MAP_GLIDE : PHASE_COLOR[k]);
  }, [colourBy, alt, top, sig, p]);
  const hasHeight = p?.basis === "height";
  // The stork flaps its wings in motor climbs and glides otherwise.
  const flapping = useMemo(() => p?.phaseAt.map((k) => k === "motor") ?? [], [p]);
  const air = useMemo(() => ({ start: p?.airStart ?? null, end: p?.airEnd ?? null }), [p]);
  const thrId = g.has("throttle_output") ? "throttle_output" : "throttle_command";
  // The chart to follow the model: height, or the throttle when there is no usable height.
  const followSeries = useMemo(() => hasHeight
    ? [{ data: U.series("height", alt), color: "--s-alt", unit: U.u("height"), fill: 0.12 }]
    : [{ data: g.get(thrId), color: "--s-motor", unit: "%", fill: 0.15 }], [hasHeight, alt, g, thrId, U]);
  const distSeries = useMemo(() => [{ data: U.series("distance", tr?.distance ?? []), color: "--s-5", unit: U.u("distance"), digits: 0, fill: 0.1 }], [tr, U]);
  if (!tr) return null;

  return (
    <>
      <div className="grid g4">
        <Tile label={t("path.farthest")} value={U.n("distance", tr.maxDistanceM)} unit={` ${U.u("distance")}`} />
        <Tile label={t("path.distance")} value={U.n("longDistance", tr.pathLengthM, 2)} unit={` ${U.u("longDistance")}`} />
        <Tile label={t("path.typicalSpeed")} value={tr.medianSpeed === null ? "–" : U.n("speed", tr.medianSpeed)} unit={tr.medianSpeed === null ? "" : ` ${U.u("speed")}`} sub={t("path.overGround")} />
        <Tile label={t("path.topSpeed")} value={tr.maxSpeed === null ? "–" : U.n("speed", tr.maxSpeed)} unit={tr.maxSpeed === null ? "" : ` ${U.u("speed")}`} sub={t("path.overGround")} />
      </div>
      {tr.airborneOnly && <p className="note">{t("path.gpsNote")}{tr.jumps > 0 && ` ${t("path.gpsJumps", { n: tr.jumps })}`}</p>}
      <div id="map" className={`mapgroup${full ? " full" : ""}`} role={full ? "dialog" : undefined} aria-modal={full || undefined} aria-label={full ? t("path.map") : undefined}>
      <div className="chart">
        <div className="ch"><b>{t("path.map")}</b>
          <button className="btn" onClick={() => setFull(!full)} aria-pressed={full}>{full ? `✕ ${t("path.closeFull")}` : `⤢ ${t("path.full")}`}</button>
        </div>
        {/* The tools sit over the map on wide screens and above it on phones (CSS). */}
        <div className="mapbox">
          {online && <div className="tools">
            <div className="seg" role="group">
              <button aria-pressed={pitch > 0} onClick={() => setPitch(55)}>{t("path.view3d")}</button>
              <button aria-pressed={pitch === 0} onClick={() => setPitch(0)}>{t("path.viewTop")}</button>
            </div>
            <div className="seg" role="group" aria-label={t("path.colour")}>
              {(["phase", "height", "signal"] as const).map((c) => (
                <button key={c} aria-pressed={colourBy === c} onClick={() => setColourBy(c)}>{t(`path.by${c[0].toUpperCase()}${c.slice(1)}`)}</button>
              ))}
            </div>
            <select className="mapselect" aria-label={t("path.line")} value={lineStyle} onChange={(ev) => setLineStyle(ev.target.value as LineStyle)}>
              {LINE_STYLES.map((l) => <option key={l} value={l}>{t(`path.line_${l}`)}</option>)}
            </select>
            <select className="mapselect" aria-label={t("path.pathMode")} title={t("path.pathModeHint")} value={pathMode} onChange={(ev) => setPathMode(ev.target.value as PathMode)}>
              {PATH_MODES.map((m) => <option key={m} value={m}>{t(`path.pathMode_${m}`)}</option>)}
            </select>
            <select className="mapselect" aria-label={t("path.marker")} value={markerStyle} onChange={(ev) => setMarkerStyle(ev.target.value as MarkerStyle)}>
              {MARKER_STYLES.map((k) => <option key={k} value={k}>{t(`path.marker_${k}`)}</option>)}
            </select>
            <div className="seg"><button aria-pressed={shadow} onClick={() => setShadow(!shadow)} title={t("path.shadowHint")}>{t("path.shadow")}</button></div>
          </div>}
          <div className="mapwrap">
            {!online ? <div className="card empty" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 16 }}>{t("path.mapOffline")}</div> : <FlightMap track={tr} height={alt} colorAt={colorAt} marker={marker} pitch={pitch} lineStyle={lineStyle} pathMode={pathMode} markerStyle={markerStyle} shadow={shadow} flapping={flapping} air={air} spots={spots} failedText={t("path.mapFailed")} />}
          </div>
        </div>
        {!online ? null : colourBy === "phase" && p ? <PhaseLegend glide={MAP_GLIDE} kinds={[...new Set(p.phases.map((x) => x.kind))].filter((k) => k !== "ground")} />
          : colourBy === "height" ? <Legend items={[[`linear-gradient(90deg, var(--h-low), var(--h-high))`, `0 – ${U.fmt("height", top)}`]]} />
          : <Legend items={[[cssVar("--good"), word("signal", 4)], [withAlpha(cssVar("--good"), 0.45), word("signal", 3)], [cssVar("--warn"), word("signal", 2)], [cssVar("--crit"), word("signal", 1)]]} />}
      </div>
      {online && spots.length > 0 && <p className="hint">{t("thermals.mapLegend")}</p>}
      <Replay a={a} syncKey={e!.key} clatter={markerStyle === "stork"} />
      </div>
      <LineChart syncKey={e!.key} title={t(hasHeight ? "path.follow" : "path.followThrottle")} series={followSeries} phases={p?.phases} height={150}
        yMax={hasHeight ? undefined : 100} yFormat={(x) => `${axisNum(loc, x)} ${hasHeight ? U.u("height") : "%"}`}
        readout={(i) => `${num(loc, followSeries[0].data[i], 0)} ${hasHeight ? U.u("height") : "%"} · ${t("path.away", { d: U.fmt("distance", tr.distance[i]) })}`} onCursor={setMarker} />
      <div className="lv-more"><LineChart syncKey={e!.key} title={t("path.distFromStart")} series={distSeries} height={130} yFormat={(x) => `${axisNum(loc, x)} ${U.u("distance")}`} onCursor={setMarker} /></div>
    </>
  );
}

function NoGpsView() {
  const t = useTranslations();
  const { selected: e, settings } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const U = useUnits();
  const p = a.profile.available ? a.profile.value : null;
  const c = a.circling.available ? a.circling.value : null;
  const hasHeight = p?.basis === "height";
  // Height, or the throttle when there is no usable height.
  const series = useMemo(() => hasHeight
    ? [{ data: U.series("height", a.grid.get("altitude")), color: "--s-alt", unit: U.u("height"), fill: 0.12 }]
    : [{ data: a.grid.get(a.grid.has("throttle_output") ? "throttle_output" : "throttle_command"), color: "--s-motor", unit: "%", fill: 0.15 }], [a, hasHeight, U]);
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
          <LineChart syncKey={e!.key} title={t(hasHeight ? "overview.height" : "overview.throttle")} series={series} phases={p.phases} height={170}
            yMax={hasHeight ? undefined : 100} yFormat={(x) => `${axisNum(loc, x)} ${hasHeight ? U.u("height") : "%"}`}
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
