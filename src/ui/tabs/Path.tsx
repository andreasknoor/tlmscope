"use client";

import { attitudeFromPath } from "@/core/analysis";
import { maxOf } from "@/core/analysis/grid";
import { useTranslations } from "next-intl";
import { useOnline } from "../offline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Legend, Tile, useLevelWord, MoreHint } from "../bits";
import { FlightMap, LINE_STYLES, MARKER_STYLES, PATH_MODES, type LineStyle, type MarkerStyle, type PathMode } from "../charts/FlightMap";
import type { MapPrefs } from "../map-prefs";
import { Replay } from "../charts/Replay";
import { requestPlay } from "../charts/sync";
import { LineChart, PHASE_COLOR } from "../charts/LineChart";
import { Strip } from "../charts/Strip";
import { axisNum, clock, cssVar, mix, num, withAlpha } from "../format";
import { useStore, useUnits } from "../store";
import { levelColor } from "./Link";
import { PhaseLegend } from "./Overview";

/** Ends of the dBm colour scale on the map: red at or below the low end, green at or above the high end. */
const DBM_LOW = -90;
const DBM_HIGH = -65;
/** Yellow point of the scale, where frame losses start to rise (see THRESHOLDS.signalDbm). */
const DBM_MID = -80;

/** Map colour for a dBm value: red below −90, yellow around −80 (where frame losses start), green from −65. */
export function dbmColor(v: number | null): string | null {
  if (v === null) return null;
  const mid = DBM_MID;
  if (v <= mid) return mix(cssVar("--crit"), cssVar("--warn"), Math.max(0, (v - DBM_LOW) / (mid - DBM_LOW)));
  return mix(cssVar("--warn"), cssVar("--good"), Math.min(1, (v - mid) / (DBM_HIGH - mid)));
}

/** Glide colour on the map. */
const MAP_GLIDE = "--s-alt";

function GpsView() {
  const t = useTranslations();
  const online = useOnline();
  const { selected: e, settings, entries, setSettings } = useStore();
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
  // The map options are saved settings, so they stay the same from flight to flight.
  const m = settings.map;
  const setMap = (patch: Partial<MapPrefs>) => setSettings({ map: { ...m, ...patch } });
  const { colourBy, line: lineStyle, path: pathMode, marker: markerStyle, shadow } = m;
  const setColourBy = (colourBy: MapPrefs["colourBy"]) => setMap({ colourBy });
  const setLineStyle = (line: LineStyle) => setMap({ line });
  const setPathMode = (path: PathMode) => setMap({ path });
  const setMarkerStyle = (marker: MarkerStyle) => setMap({ marker });
  const setShadow = (shadow: boolean) => setMap({ shadow });
  /** How the map is viewed: from a tilted angle, from above, or with the camera following the model (always tilted). Following is not saved. */
  const [following, setFollowing] = useState(false);
  const view = following ? "follow" : m.view;
  const pitch = view === "map" ? 0 : 55;
  const chase = following;
  /** Relief the follow view switched on for itself; null when not following or once changed by hand, so the saved choice counts. */
  const [followRelief, setFollowRelief] = useState<boolean | null>(null);
  const relief = followRelief ?? m.relief;
  const chooseView = (v: "3d" | "map" | "follow") => {
    if (v === view) return;
    if (v === "follow") { setFollowRelief(true); setFollowing(true); requestPlay(e!.key); return; }
    setFollowRelief(null);
    setFollowing(false);
    if (v !== m.view) setMap({ view: v });
  };
  const toggleRelief = () => { setFollowRelief(null); setMap({ relief: !relief }); };
  const [opts, setOpts] = useState(false);
  const optRef = useRef<HTMLDivElement>(null);
  // The options panel closes on Escape and on a click outside it.
  useEffect(() => {
    if (!opts) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setOpts(false); };
    const onDown = (ev: MouseEvent) => { if (!optRef.current?.contains(ev.target as Node)) setOpts(false); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [opts]);
  /** Height of the model above the ground below it, reported by the map while the relief or chase view is on. */
  const [agl, setAgl] = useState<number | null>(null);
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
  // With details on, the signal colour is a smooth dBm scale instead of the four levels.
  const dbm = g.get("signal_dbm");
  const dbmScale = settings.details && sig !== null;
  const top = Math.max(1, maxOf(alt) ?? 0);
  // On the map, glides are blue: the chart grey would vanish next to the grey ground shadow.
  const colorAt = useCallback((i: number) => {
    if (colourBy === "height") return mix(cssVar("--h-low"), cssVar("--h-high"), Math.max(0, alt[i] ?? 0) / top);
    if (colourBy === "signal") return (dbmScale ? dbmColor(dbm[i]) : levelColor(sig?.levels[i] ?? null)) ?? cssVar("--ink-3");
    const k = p?.phaseAt[i];
    return cssVar(k === "glide" || k === "unpowered" || !k ? MAP_GLIDE : PHASE_COLOR[k]);
  }, [colourBy, alt, top, sig, p, dbmScale, dbm]);
  const hasHeight = p?.maxAltitudeM != null;
  // The stork flaps its wings in motor climbs and glides otherwise.
  const flapping = useMemo(() => p?.phaseAt.map((k) => k === "motor") ?? [], [p]);
  const air = useMemo(() => ({ start: p?.airStart ?? null, end: p?.airEnd ?? null }), [p]);
  const thrId = g.has("throttle_output") ? "throttle_output" : "throttle_command";
  // The chart to follow the model: height, or the throttle when there is no usable height.
  const followSeries = useMemo(() => hasHeight
    ? [{ data: U.series("height", alt), color: "--s-alt", unit: U.u("height"), fill: 0.12 }]
    : [{ data: g.get(thrId), color: "--s-motor", unit: "%", fill: 0.15 }], [hasHeight, alt, g, thrId, U]);
  const course = useMemo(() => attitudeFromPath(tr?.east ?? [], tr?.north ?? [], alt).heading, [tr, alt]);
  const climbSeries = g.get("climb_rate");
  const speedSeries = useMemo(() => [{ data: U.series("speed", tr?.speed ?? []), color: "--s-4", unit: U.u("speed"), digits: 0, fill: 0.12 }], [tr, U]);
  const distSeries = useMemo(() => [{ data: U.series("distance", tr?.distance ?? []), color: "--s-5", unit: U.u("distance"), digits: 0, fill: 0.1 }], [tr, U]);
  if (!tr) return null;

  return (
    <>
      <div className="grid g4">
        <Tile label={t("path.farthest")} value={U.n("distance", tr.maxDistanceM)} unit={`\u00a0${U.u("distance")}`} />
        <Tile label={t("path.distance")} value={U.n("longDistance", tr.pathLengthM, 2)} unit={`\u00a0${U.u("longDistance")}`} />
        <Tile label={t("path.typicalSpeed")} value={tr.medianSpeed === null ? "–" : U.n("speed", tr.medianSpeed)} unit={tr.medianSpeed === null ? "" : `\u00a0${U.u("speed")}`} sub={t("path.overGround")} />
        <Tile label={t("path.topSpeed")} value={tr.maxSpeed === null ? "–" : U.n("speed", tr.maxSpeed)} unit={tr.maxSpeed === null ? "" : `\u00a0${U.u("speed")}`} sub={t("path.overGround")} />
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
            <div className="seg" role="group" aria-label={t("path.view")}>
              <button aria-pressed={view === "3d"} onClick={() => chooseView("3d")}>{t("path.view3d")}</button>
              <button aria-pressed={view === "map"} onClick={() => chooseView("map")}>{t("path.viewTop")}</button>
              <button aria-pressed={view === "follow"} onClick={() => chooseView("follow")} title={t("path.chaseHint")}>{t("path.chase")}</button>
            </div>
            <div className="optwrap" ref={optRef}>
              <button className="mapselect" aria-expanded={opts} aria-haspopup="true" onClick={() => setOpts(!opts)}>{t("path.options")} ▾</button>
              {opts && <div className="optpanel" role="group" aria-label={t("path.options")}>
                <details open>
                  <summary>{t("path.colour")}<small>{t(`path.by${colourBy[0].toUpperCase()}${colourBy.slice(1)}`)}</small></summary>
                  <div className="seg" role="group" aria-label={t("path.colour")}>
                    {(["phase", "height", "signal"] as const).map((c) => (
                      <button key={c} aria-pressed={colourBy === c} onClick={() => setColourBy(c)}>{t(`path.by${c[0].toUpperCase()}${c.slice(1)}`)}</button>
                    ))}
                  </div>
                </details>
                <details>
                  <summary>{t("path.secPath")}<small>{t(`path.line_${lineStyle}`)} · {t(`path.pathMode_${pathMode}`)}</small></summary>
                  <label className="optrow"><span>{t("path.line")}</span>
                    <select className="mapselect" value={lineStyle} onChange={(ev) => setLineStyle(ev.target.value as LineStyle)}>
                      {LINE_STYLES.map((l) => <option key={l} value={l}>{t(`path.line_${l}`)}</option>)}
                    </select></label>
                  <label className="optrow" title={t("path.pathModeHint")}><span>{t("path.pathMode")}</span>
                    <select className="mapselect" value={pathMode} onChange={(ev) => setPathMode(ev.target.value as PathMode)}>
                      {PATH_MODES.map((m) => <option key={m} value={m}>{t(`path.pathMode_${m}`)}</option>)}
                    </select></label>
                </details>
                <details>
                  <summary>{t("path.secModel")}<small>{t(`path.marker_${markerStyle}`)}</small></summary>
                  <div className="seg" role="group" aria-label={t("path.marker")}>
                    {MARKER_STYLES.map((k) => <button key={k} aria-pressed={markerStyle === k} onClick={() => setMarkerStyle(k)}>{t(`path.marker_${k}`)}</button>)}
                  </div>
                </details>
                <details>
                  <summary>{t("path.secGround")}<small>{relief ? t("path.relief") : shadow ? t("path.shadow") : t("path.plain")}</small></summary>
                  <label className="optrow" title={relief ? t("path.shadowRelief") : t("path.shadowHint")}><span>{t("path.shadow")}</span>
                    <input type="checkbox" checked={shadow && !relief} disabled={relief} onChange={() => setShadow(!shadow)} /></label>
                  <label className="optrow" title={t("path.reliefHint")}><span>{t("path.relief")}</span>
                    <input type="checkbox" checked={relief} onChange={toggleRelief} /></label>
                </details>
              </div>}
            </div>
          </div>}
          <div className="mapwrap">
            {!online ? <div className="card empty" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 16 }}>{t("path.mapOffline")}</div> : <FlightMap track={tr} height={alt} colorAt={colorAt} marker={marker} pitch={pitch} lineStyle={lineStyle} pathMode={pathMode} markerStyle={markerStyle} shadow={shadow} flapping={flapping} air={air} spots={spots} relief={relief} chase={chase} onChaseEnd={() => chooseView("3d")} onGround={setAgl} failedText={t("path.mapFailed")}
              cooperative={{ on: !full, windows: t("path.zoomCtrl"), mac: t("path.zoomCmd"), mobile: t("path.twoFingers") }} />}
            {online && (relief || chase) && marker !== null && (
              <div className="hud" aria-label={t("path.hud")}>
                <div><span>{t("path.hudHeight")}</span><b>{U.fmt("height", Math.max(0, alt[marker] ?? 0))}</b></div>
                {agl !== null && <div><span>{t("path.hudAgl")}</span><b>{U.fmt("height", agl)}</b></div>}
                <div><span>{t("path.hudSpeed")}</span><b>{tr.speed[marker] != null ? U.fmt("speed", tr.speed[marker]!) : "–"}</b></div>
                <div><span>{t("path.hudClimb")}</span><b>{climbSeries[marker] != null ? U.fmt("vspeed", climbSeries[marker]!, 1) : "–"}</b></div>
                {colourBy === "signal" && sig && <div><span>{t("path.hudSignal")}</span><b>{dbm[marker] != null ? `${num(loc, dbm[marker], 0)} dBm` : "–"}</b></div>}
                <div><span>{t("path.hudCourse")}</span><b>{Number.isFinite(course[marker]) ? `${Math.round((course[marker] + 360) % 360)}°` : "–"}</b></div>
              </div>
            )}
          </div>
        </div>
        {!online ? null : colourBy === "phase" && p ? <PhaseLegend glide={MAP_GLIDE} kinds={[...new Set(p.phases.map((x) => x.kind))].filter((k) => k !== "ground")} />
          : colourBy === "height" ? <Legend items={[[`linear-gradient(90deg, var(--h-low), var(--h-high))`, `0 – ${U.fmt("height", top)}`]]} />
          : dbmScale ? <Legend items={[[`linear-gradient(90deg, var(--crit), var(--warn), var(--good))`, `${num(loc, DBM_LOW, 0)} … ${num(loc, DBM_HIGH, 0)} dBm`]]} />
          : <Legend items={[[cssVar("--good"), word("signal", 4)], [withAlpha(cssVar("--good"), 0.45), word("signal", 3)], [cssVar("--warn"), word("signal", 2)], [cssVar("--crit"), word("signal", 1)]]} />}
      </div>
      {online && spots.length > 0 && <p className="hint">{t("thermals.mapLegend")}</p>}
      <Replay a={a} syncKey={e!.key} clatter={markerStyle === "stork"} />
      </div>
      <LineChart syncKey={e!.key} title={t(hasHeight ? "path.follow" : "path.followThrottle")} series={followSeries} phases={p?.phases} height={150}
        yMax={hasHeight ? undefined : 100} yFormat={(x) => `${axisNum(loc, x)} ${hasHeight ? U.u("height") : "%"}`}
        readout={(i) => `${num(loc, followSeries[0].data[i], 0)} ${hasHeight ? U.u("height") : "%"} · ${t("path.away", { d: U.fmt("distance", tr.distance[i]) })}${colourBy === "signal" && sig && dbm[i] != null ? ` · ${num(loc, dbm[i], 0)} dBm` : ""}`} onCursor={setMarker} />
      {speedSeries[0].data.some((x) => x !== null) && (
        <LineChart syncKey={e!.key} title={t("path.groundSpeed")} series={speedSeries} phases={p?.phases} height={150}
          extra={<div className="sub">{t("path.groundSpeedHint")}</div>}
          yMin={0} yFormat={(x) => `${axisNum(loc, x)}\u00a0${U.u("speed")}`} rest={tr.maxSpeed !== null ? `max ${U.fmt("speed", tr.maxSpeed)}` : undefined}
          readout={(i) => `${U.fmt("speed", tr.speed[i])} · ${p?.phaseAt[i] ? t(`phase.${p.phaseAt[i]}`) : ""}`} onCursor={setMarker} />
      )}
      <MoreHint items={[t("more.distance"), sig && t("more.dbmMap")]} />
      <div className="lv-more"><LineChart syncKey={e!.key} title={t("path.distFromStart")} series={distSeries} height={130} yFormat={(x) => `${axisNum(loc, x)}\u00a0${U.u("distance")}`} onCursor={setMarker} /></div>
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
  const hasHeight = p?.maxAltitudeM != null;
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
            <Tile label={t("path.turning")} value={num(loc, (c.turningSecs / Math.max(1, p.airtimeS)) * 100, 0)} unit={"\u00a0%"} sub={t("path.ofAirtime", { turning: clock(c.turningSecs), airtime: clock(p.airtimeS) })} />
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
