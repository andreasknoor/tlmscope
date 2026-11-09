"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MlMap } from "maplibre-gl";
import type { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer } from "@deck.gl/core";
import { attitudeFromPath, type Track } from "@/core/analysis";
import { maxOf, minOf } from "@/core/analysis/grid";
import { cssVar } from "../format";
import { ADEBAR_LANDED } from "./sync";
import { NEST_TOP, planeMesh, storkMeshes, STORK_BEAK_HINGE, STORK_SHOULDER, type Mesh, type V } from "./plane-mesh";

/** Free vector tiles without an API key (decision D3: MapLibre). */
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/** How the flight path is drawn, chosen in the map tools. */
export type LineStyle = "thin" | "thinDashed" | "thick" | "thickDashed";
export const LINE_STYLES: LineStyle[] = ["thin", "thinDashed", "thick", "thickDashed"];
const LINE_WIDTH = { thin: 2, thick: 4 };
/** How the model is shown in the replay. */
export type MarkerStyle = "plane" | "dot" | "stork";
export const MARKER_STYLES: MarkerStyle[] = ["plane", "dot", "stork"];
/** Dash and gap length in pixels. */
const DASH: [number, number] = [10, 7];

interface Props {
  track: Track;
  /** Height per second in metres, used for the 3D path. */
  height: (number | null)[];
  /** Colour per second as CSS colour. */
  colorAt: (i: number) => string;
  marker: number | null;
  pitch: number;
  lineStyle: LineStyle;
  markerStyle: MarkerStyle;
  /** Draw the path projected onto the ground. */
  shadow: boolean;
  /** Seconds in which the stork flaps its wings (motor climbs); otherwise it glides. */
  flapping?: boolean[];
  /** First and last airborne second: before and after, the stork sits in its nest at the start point. */
  air?: { start: number | null; end: number | null };
  /** Thermal centres to mark: strength in m/s, `own` for this flight. */
  spots?: { lat: number; lon: number; climb: number; own: boolean }[];
  /** Shown when the map cannot be loaded. */
  failedText: string;
}

/** Space around the track (px); in 3D a third of the height stays free at the top, where the path rises. */
const FIT_PADDING = 30;
const PITCH_TOP_SHARE = 0.33;
/** A tilted view shows the ground foreshortened; zooming in this much lets the track fill the frame again. */
const PITCH_ZOOM = 0.4;

/** Moves the camera so the track fills the map. Returns the zoom for the whole track (top view). */
function fitTrack(map: MlMap, bounds: [[number, number], [number, number]], pitch: number): number | null {
  const top = pitch > 0 ? Math.round(map.getContainer().clientHeight * PITCH_TOP_SHARE) : FIT_PADDING;
  const cam = map.cameraForBounds(bounds, { padding: { top, bottom: FIT_PADDING, left: FIT_PADDING, right: FIT_PADDING } });
  if (!cam?.center || cam.zoom === undefined) return null;
  map.jumpTo({ center: cam.center, zoom: cam.zoom + (pitch > 0 ? PITCH_ZOOM : 0), pitch });
  return cam.zoom;
}

/**
 * On-screen wingspan of the model in the replay (px): small while the whole track is in view,
 * growing as you zoom in, within these limits. Never smaller than PLANE_MIN_M in real size.
 */
const PLANE_FIT_PX = 24;
const PLANE_PX_MIN = 14;
const PLANE_PX_MAX = 72;
/** Growth per zoom level (1 would keep the real size; less keeps it readable when zoomed out). */
const PLANE_GROWTH = 0.75;
const PLANE_MIN_M = 1.5;
/** Stork: wing beats per second, beat amplitude and the slight upward angle of the wings in a glide (degrees). */
const FLAP_HZ = 1.8;
const FLAP_AMP = 30;
const GLIDE_DIHEDRAL = 5;
/** How fast the stork switches between flapping and gliding (share per second). */
const FLAP_BLEND_RATE = 2.5;
/** A cursor jump of more than this many seconds moves the model at once instead of gliding there. */
const MAX_GLIDE_JUMP = 5;
/** Stork after landing (real time, ms): hop into the nest, then clatter the beak. */
const HOP_MS = 1600;
const CLAP_MS = 1500;
const CLAP_HZ = 7;
const CLAP_DEG = 24;
/** Wings folded along the body while sitting (degrees swept back), and how fast they fold (share per second). */
const FOLD_DEG = 80;
const FOLD_RATE = 2.5;
/** Storks circling in thermals: airspeed (m/s), lowest height and spacing (m). */
const THERMAL_STORK_SPEED = 9;
const THERMAL_STORK_BASE = 40;
const THERMAL_STORK_STEP = 22;

type Pose = "nest" | "fly" | "hop" | "launch";
/**
 * Where the stork is at second `t`: in its nest before take-off and after landing; hopping out of it
 * right after take-off (`launchAt`) and into it right after landing (`landAt`), both in real time (ms).
 */
function storkPose(t: number, air: Props["air"], launchAt: number, landAt: number, now: number): Pose {
  if (air?.start != null && t < air.start) return "nest";
  if (air?.end != null && t > air.end) return landAt && now - landAt < HOP_MS ? "hop" : "nest";
  return launchAt && now - launchAt < HOP_MS ? "launch" : "fly";
}
const planePx = (zoom: number, fitZoom: number) =>
  Math.min(PLANE_PX_MAX, Math.max(PLANE_PX_MIN, PLANE_FIT_PX * 2 ** ((zoom - fitZoom) * PLANE_GROWTH)));
/** Ground metres per screen pixel at the map centre (MapLibre uses 512 px tiles). */
const metresPerPixel = (lat: number, zoom: number) => (40_075_016.7 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);

/** The text colour, moved a quarter towards mid grey so the lighting can show the shape. */
const planeColor = (ink: [number, number, number]): [number, number, number] => ink.map((c) => Math.round(c + (128 - c) * 0.25)) as [number, number, number];

type M3 = [V, V, V];
const rad = Math.PI / 180;
/** Rotation matrix (columns) for deck.gl's [pitch, yaw, roll] in degrees, as SimpleMeshLayer builds it. */
function rotation(pitch: number, yaw: number, roll: number): M3 {
  const sp = Math.sin(pitch * rad), cp = Math.cos(pitch * rad), sw = Math.sin(yaw * rad), cw = Math.cos(yaw * rad), sr = Math.sin(roll * rad), cr = Math.cos(roll * rad);
  return [[cw * cp, sw * cp, -sp], [-sw * cr + cw * sp * sr, cw * cr + sw * sp * sr, cp * sr], [sw * sr + cw * sp * cr, -cw * sr + sw * sp * cr, cp * cr]];
}
const apply = (m: M3, v: V): V => [0, 1, 2].map((k) => m[0][k] * v[0] + m[1][k] * v[1] + m[2][k] * v[2]) as V;
/** m · (rotation about the z axis by `a` degrees; positive sweeps +y backwards). */
function timesRotZ(m: M3, a: number): M3 {
  const c = Math.cos(a * rad), s = Math.sin(a * rad);
  return [apply(m, [c, s, 0]), apply(m, [-s, c, 0]), m[2]];
}
/** m · (rotation about the y axis by `a` degrees; positive tips the nose down). */
function timesRotY(m: M3, a: number): M3 {
  const c = Math.cos(a * rad), s = Math.sin(a * rad);
  return [apply(m, [c, 0, -s]), m[1], apply(m, [s, 0, c])];
}
/** m · (rotation about the x axis by `a` degrees). */
function timesRotX(m: M3, a: number): M3 {
  const c = Math.cos(a * rad), s = Math.sin(a * rad);
  return [m[0], apply(m, [0, c, s]), apply(m, [0, -s, c])];
}
/** 4×4 column-major matrix from rotation columns and a translation in metres. */
const mat4 = (m: M3, t: V) => [...m[0], 0, ...m[1], 0, ...m[2], 0, ...t, 1];

const toRgb = (c: string): [number, number, number] => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
  if (m) return [+m[1], +m[2], +m[3]];
  const h = c.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Map with the flight path in 3D. Libraries load only in the browser. */
export function FlightMap({ track, height, colorAt, marker, pitch, lineStyle, markerStyle, shadow: showShadow, flapping, air, spots = [], failedText }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const layersRef = useRef<typeof import("@deck.gl/layers") | null>(null);
  const meshRef = useRef<typeof import("@deck.gl/mesh-layers") | null>(null);
  const extRef = useRef<typeof import("@deck.gl/extensions") | null>(null);
  const fitZoomRef = useRef<number | null>(null);
  /** Layers that do not move with the replay; the model layers are added on every frame. */
  const staticRef = useRef<Layer[]>([]);
  /** Shown position (fractional second), its glide towards the cursor, and the stork's wing beat. */
  const anim = useRef({ shown: null as number | null, from: 0, to: 0, start: 0, dur: 0, lastChange: 0, blend: 0, phase: 0, prevT: 0, frame: 0, fold: 0, launchAt: 0, landAt: 0, prevShown: null as number | null });
  const drawRef = useRef<() => void>(() => {});
  // The animation loop reads the latest props through refs, so it keeps running across renders.
  const live = useRef({ markerStyle, flapping, air });
  useEffect(() => { live.current = { markerStyle, flapping, air }; }, [markerStyle, flapping, air]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: MlMap | null = null;
    let resize: ResizeObserver | null = null;
    const st = anim.current;
    Promise.all([import("maplibre-gl"), import("@deck.gl/mapbox"), import("@deck.gl/layers"), import("@deck.gl/mesh-layers"), import("@deck.gl/extensions")]).then(([ml, dm, layers, mesh, ext]) => {
      if (cancelled || !el.current) return;
      ml.setWorkerUrl(new URL("maplibre/maplibre-gl-worker.mjs", window.location.href).href);
      const pts = track.lat.map((la, i) => (la === null || track.lon[i] === null ? null : [track.lon[i]!, la] as [number, number])).filter(Boolean) as [number, number][];
      const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
      if (!pts.length) { setFailed(true); return; }
      const bounds: [[number, number], [number, number]] = [[minOf(lons)!, minOf(lats)!], [maxOf(lons)!, maxOf(lats)!]];
      map = new ml.Map({
        container: el.current,
        style: MAP_STYLE,
        bounds,
        pitch,
        // Tilt down to almost ground level (MapLibre's default stops at 60°). Above 90° the camera
        // would look up from below the ground, which the deck.gl path layer does not support.
        maxPitch: 85,
        attributionControl: { compact: true },
      });
      const m = map;
      fitZoomRef.current = fitTrack(m, bounds, pitch);
      // The container changes size (full screen, window): resize the map and fit the track again.
      let first = true;
      resize = new ResizeObserver(() => {
        if (first) { first = false; return; }
        m.resize();
        fitZoomRef.current = fitTrack(m, bounds, m.getPitch()) ?? fitZoomRef.current;
      });
      resize.observe(el.current);
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right");
      const overlay = new dm.MapboxOverlay({ interleaved: false, layers: [] });
      map.addControl(overlay);
      mapRef.current = map;
      overlayRef.current = overlay;
      layersRef.current = layers;
      meshRef.current = mesh;
      extRef.current = ext;
      // The model keeps about the same size on screen, so it follows the zoom.
      m.on("zoom", () => drawRef.current());
      setReady(true);
    }).catch((err: unknown) => {
      // Offline, blocked or no WebGL: show a note instead of breaking the page.
      console.error("Map could not be shown", err);
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(st.frame);
      st.frame = 0;
      resize?.disconnect();
      map?.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, [track, pitch === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mapRef.current?.easeTo({ pitch, duration: 600 });
  }, [pitch]);

  // Path data changes rarely; keeping it stable lets the replay move the marker without re-uploading the path.
  // One line per stretch with a fix, coloured per point, so dashes run on along the whole line.
  const pathData = useMemo(() => {
    const lines: { path: [number, number, number][]; colors: [number, number, number][] }[] = [];
    const shadow: [number, number][] = [];
    let cur: (typeof lines)[number] | null = null;
    for (let i = 0; i < track.lat.length; i++) {
      if (track.lat[i] === null || track.lon[i] === null) { cur = null; continue; }
      const p: [number, number, number] = [track.lon[i]!, track.lat[i]!, Math.max(0, height[i] ?? 0)];
      shadow.push([p[0], p[1]]);
      if (!cur) { cur = { path: [], colors: [] }; lines.push(cur); }
      // Skip a point that repeats the last one (the model standing on the ground): deck.gl's
      // dashed billboard lines divide by the segment length and throw zero-length segments off to infinity.
      const last = cur.path[cur.path.length - 1];
      if (last && last[0] === p[0] && last[1] === p[1] && Math.abs(last[2] - p[2]) < 0.01) continue;
      cur.path.push(p);
      cur.colors.push(toRgb(colorAt(i)));
    }
    return { lines: lines.filter((l) => l.path.length > 1), shadow: [{ path: shadow }] };
  }, [track, height, colorAt]);

  const attitude = useMemo(() => attitudeFromPath(track.east, track.north, height), [track, height]);
  const mesh = useMemo(() => planeMesh(), []);
  const stork = useMemo(() => storkMeshes(), []);

  // Static layers: rebuilt when the path, its look or the thermals change.
  useEffect(() => {
    const layers = layersRef.current, ext = extRef.current;
    if (!ready || !layers || !ext) return;
    const { lines, shadow } = pathData;
    const dashed = lineStyle === "thinDashed" || lineStyle === "thickDashed";
    const width = LINE_WIDTH[lineStyle.startsWith("thin") ? "thin" : "thick"];
    staticRef.current = [
      // Ground shadow, kept faint so it does not read as a second path.
      ...(showShadow ? [new layers.PathLayer({ id: "shadow", data: shadow, getPath: (d: { path: [number, number][] }) => d.path, getColor: [60, 70, 80, 55], getWidth: 1.5, widthUnits: "pixels" })] : []),
      new layers.PathLayer({
        // A new id when dashes are switched on or off: deck.gl cannot add or drop an extension on a live layer.
        id: dashed ? "path-dashed" : "path", data: lines,
        getPath: (d: (typeof lines)[number]) => d.path, getColor: (d: (typeof lines)[number]) => d.colors,
        getWidth: width, widthUnits: "pixels", billboard: true, capRounded: !dashed, jointRounded: true,
        ...(dashed ? { extensions: [new ext.PathStyleExtension({ dash: true, dashMode: "path" })], getDashArray: DASH, dashUnits: "pixels" } : {}),
      }),
      new layers.ScatterplotLayer({
        id: "thermals", data: spots, getPosition: (d: (typeof spots)[number]) => [d.lon, d.lat, 0],
        getFillColor: (d: (typeof spots)[number]) => [...toRgb(cssVar("--s-lift")), d.own ? 170 : 90] as [number, number, number, number],
        getLineColor: toRgb(cssVar("--ink")), stroked: true, getLineWidth: (d: (typeof spots)[number]) => (d.own ? 2 : 0), lineWidthUnits: "pixels",
        getRadius: (d: (typeof spots)[number]) => 12 + Math.max(0, d.climb) * 14, radiusUnits: "meters",
      }),
      new layers.ScatterplotLayer({ id: "home", data: [track.home], getPosition: (d: Track["home"]) => [d.lon, d.lat, 0], getFillColor: toRgb(cssVar("--ink")), getRadius: 6, radiusUnits: "pixels", billboard: true }),
    ];
    drawRef.current();
  }, [ready, track, pathData, spots, lineStyle, showShadow]);

  // The model layers for the shown (fractional) second, drawn together with the static layers.
  useEffect(() => {
    const draw = () => {
      const overlay = overlayRef.current, layers = layersRef.current, meshLayers = meshRef.current, map = mapRef.current;
      if (!ready || !overlay || !layers || !meshLayers || !map) return;
      const st = anim.current, now = performance.now();
      // Without a cursor the stork waits in its nest (a second before take-off).
      const t = st.shown ?? (markerStyle === "stork" ? Math.max(0, (air?.start ?? 1) - 1) : null);
      const zoom = map.getZoom();
      const sizeAt = (lat: number) => Math.max(PLANE_MIN_M, planePx(zoom, fitZoomRef.current ?? zoom) * metresPerPixel(lat, zoom));
      const material = { ambient: 0.45, diffuse: 0.75, shininess: 24, specularColor: [80, 80, 80] as V };
      const model: Layer[] = [];
      const home: V = [track.home.lon, track.home.lat, 0];
      const isStork = markerStyle === "stork";
      const s = sizeAt(home[1]) * 1.2;
      const mesh3 = (id: string, m: Mesh, at: V, matrix: number[], scale = s) =>
        new meshLayers.SimpleMeshLayer({ id, data: [at], mesh: m, getPosition: (d: V) => d, getTransformMatrix: matrix, sizeScale: scale, getColor: [255, 255, 255], material });
      if (isStork) {
        model.push(mesh3("nest", stork.nest, home, mat4(rotation(0, 0, 0), [0, 0, 0])));
        // Storks circling in the thermals: gliding, banked into the turn, a few per thermal by its strength.
        const circling: { at: V; o: V }[] = [];
        spots.forEach((sp, n) => {
          const r = 12 + Math.max(0, sp.climb) * 14;
          const w = THERMAL_STORK_SPEED / r;
          const count = Math.max(1, Math.min(3, Math.round(sp.climb)));
          for (let j = 0; j < count; j++) {
            const th = (w * now) / 1000 + (j * 2 * Math.PI) / count + n;
            const east = r * Math.cos(th), north = r * Math.sin(th);
            const z = THERMAL_STORK_BASE + j * THERMAL_STORK_STEP + 4 * Math.sin(now / 3000 + j + n);
            const heading = (Math.atan2(-Math.sin(th), Math.cos(th)) * 180) / Math.PI;
            const bank = -(Math.atan((THERMAL_STORK_SPEED * THERMAL_STORK_SPEED) / (r * 9.81)) * 180) / Math.PI;
            circling.push({ at: [sp.lon + east / (111_320 * Math.cos(sp.lat * rad)), sp.lat + north / 111_320, z], o: [0, 90 - heading, bank] });
          }
        });
        if (circling.length) {
          model.push(new meshLayers.SimpleMeshLayer({ id: "thermal-storks", data: circling, mesh: stork.glide, getPosition: (d: { at: V }) => d.at, getOrientation: (d: { o: V }) => d.o, sizeScale: s * 0.8, getColor: [255, 255, 255], material }));
        }
      }
      if (t !== null) {
        // Position and attitude between two seconds, so the model moves smoothly.
        const i0 = Math.max(0, Math.floor(t)), i1 = Math.min(track.lat.length - 1, i0 + 1), f = t - i0;
        const ok = (i: number) => track.lat[i] != null && track.lon[i] != null;
        const a = ok(i0) ? i0 : i1, b = ok(i1) ? i1 : a, k = a === b ? 0 : f;
        // The stork is drawn even without a fix here: it may be sitting in its nest.
        if (ok(a) || markerStyle === "stork") {
          const lerp = (x: number, y: number) => x + (y - x) * k;
          let at: V = ok(a) ? [lerp(track.lon[a]!, track.lon[b]!), lerp(track.lat[a]!, track.lat[b]!), lerp(Math.max(0, height[a] ?? 0), Math.max(0, height[b] ?? 0))] : home;
          const turn = ((attitude.heading[b] - attitude.heading[a] + 540) % 360) - 180;
          const heading = attitude.heading[a] + turn * k, climb = lerp(attitude.climb[a], attitude.climb[b]), bank = lerp(attitude.bank[a], attitude.bank[b]);
          // deck.gl takes [pitch (nose down), yaw (from east, anticlockwise), roll (right wing down)].
          let orientation: V = [-climb, 90 - heading, bank];
          const size = sizeAt(at[1]);
          if (markerStyle === "dot") {
            // The dot faces the camera and is drawn on top of the path, so a flat view or the path never hides it.
            model.push(new layers.ScatterplotLayer({ id: "marker", data: [at], getPosition: (d: V) => d, getFillColor: [255, 255, 255], getLineColor: toRgb(cssVar("--ink")), stroked: true, lineWidthUnits: "pixels", getLineWidth: 3, getRadius: 9, radiusUnits: "pixels", billboard: true, parameters: { depthCompare: "always" } }));
          } else if (markerStyle === "plane") {
            model.push(new meshLayers.SimpleMeshLayer({ id: "plane", data: [at], mesh, getPosition: (d: V) => d, getOrientation: orientation, sizeScale: size, getColor: planeColor(toRgb(cssVar("--ink"))), material }));
          } else {
            const pose = storkPose(t, air, st.launchAt, st.landAt, now);
            const inNest: V = [home[0], home[1], (NEST_TOP + 0.03) * s];
            const bearing = (from: V, to: V) => (Math.atan2((to[0] - from[0]) * Math.cos(from[1] * rad), to[1] - from[1]) * 180) / Math.PI;
            if (pose === "nest") {
              // Facing the way it will take off (or came in).
              const h = air?.start != null && t < air.start ? attitude.heading[air.start] : attitude.heading[air?.end ?? a];
              at = inNest; orientation = [0, 90 - h, 0];
            } else if (pose === "hop") {
              // From the landing spot into the nest along a small arc.
              const e = air!.end!;
              const from: V = ok(e) ? [track.lon[e]!, track.lat[e]!, Math.max(0, height[e] ?? 0)] : inNest;
              const u = Math.min(1, (now - st.landAt) / HOP_MS);
              const arc = 4 * Math.max(4, 3 * s) * u * (1 - u);
              at = [from[0] + (inNest[0] - from[0]) * u, from[1] + (inNest[1] - from[1]) * u, from[2] + (inNest[2] - from[2]) * u + arc];
              orientation = [0, 90 - bearing(from, inNest), 0];
            } else if (pose === "launch") {
              // Out of the nest along a small arc, catching up with the model on the path.
              const u = Math.min(1, (now - st.launchAt) / HOP_MS);
              const arc = 4 * Math.max(4, 3 * s) * u * (1 - u);
              const to = at;
              at = [inNest[0] + (to[0] - inNest[0]) * u, inNest[1] + (to[1] - inNest[1]) * u, inNest[2] + (to[2] - inNest[2]) * u + arc];
              if (u < 0.85) orientation = [0, 90 - bearing(inNest, to), 0];
            }
            // Body follows the path; each wing turns about its shoulder (wing beat, or folded back while sitting);
            // the beak halves open about their hinge while clattering.
            const r = rotation(...orientation);
            const wingUp = (GLIDE_DIHEDRAL + st.blend * FLAP_AMP * Math.sin(st.phase)) * (1 - st.fold) - 8 * st.fold;
            const sinceLand = st.landAt ? now - st.landAt - HOP_MS : -1;
            const clatter = pose === "nest" && sinceLand >= 0 && sinceLand < CLAP_MS;
            const open = clatter ? CLAP_DEG * (0.5 + 0.5 * Math.sin((2 * Math.PI * CLAP_HZ * sinceLand) / 1000)) : 0;
            const off = (v: V): V => apply(r, [v[0] * s, v[1] * s, v[2] * s]);
            const wing = (side: 1 | -1) => mat4(timesRotX(timesRotZ(r, side * FOLD_DEG * st.fold), side * wingUp), off([STORK_SHOULDER[0], side * STORK_SHOULDER[1], STORK_SHOULDER[2]]));
            model.push(
              mesh3("stork-body", stork.body, at, mat4(r, [0, 0, 0])),
              mesh3("stork-left", stork.left, at, wing(1)),
              mesh3("stork-right", stork.right, at, wing(-1)),
              mesh3("stork-beak-upper", stork.beakUpper, at, mat4(timesRotY(r, -open), off(STORK_BEAK_HINGE))),
              mesh3("stork-beak-lower", stork.beakLower, at, mat4(timesRotY(r, open * 0.5), off(STORK_BEAK_HINGE))),
            );
          }
        }
      }
      overlay.setProps({ layers: [...staticRef.current, ...model] });
    };
    drawRef.current = draw;
    draw();
  }, [ready, track, height, attitude, mesh, stork, markerStyle, spots, air]);

  // Replay cursor: glide from the shown second to the new one over about the time between two updates.
  useEffect(() => {
    const st = anim.current;
    const now = performance.now();
    if (marker === null || st.shown === null || Math.abs(marker - st.shown) > MAX_GLIDE_JUMP) {
      st.shown = marker; st.from = st.to = marker ?? 0; st.dur = 0;
    } else {
      st.from = st.shown; st.to = marker; st.start = now;
      st.dur = Math.min(1000, Math.max(40, now - st.lastChange));
    }
    st.lastChange = now;
    const tick = (time: number) => {
      const dt = st.prevT ? Math.min(0.1, (time - st.prevT) / 1000) : 0;
      st.prevT = time;
      const gliding = st.dur > 0;
      if (st.shown !== null && gliding) {
        const k = Math.min(1, (time - st.start) / st.dur);
        st.shown = st.from + (st.to - st.from) * k;
        if (k >= 1) st.dur = 0;
      }
      const { markerStyle: style, flapping: flaps, air: airNow } = live.current;
      const stork = style === "stork";
      if (stork) {
        // Landing: the replay moved smoothly past the last airborne second.
        const end = airNow?.end;
        if (end != null && st.shown !== null && st.prevShown !== null && st.prevShown <= end && st.shown > end && gliding) {
          st.landAt = time;
          window.dispatchEvent(new Event(ADEBAR_LANDED));
        }
        if (end == null || st.shown === null || st.shown <= end) st.landAt = 0;
        // Take-off: the replay moved smoothly past the first airborne second.
        const begin = airNow?.start;
        if (begin != null && st.shown !== null && st.prevShown !== null && st.prevShown < begin && st.shown >= begin && gliding) st.launchAt = time;
        if (begin == null || st.shown === null || st.shown < begin) st.launchAt = 0;
        const at = st.shown ?? Math.max(0, (airNow?.start ?? 1) - 1);
        const pose = storkPose(at, airNow, st.launchAt, st.landAt, time);
        const flap = pose === "hop" || pose === "launch" || (pose === "fly" && flaps?.[Math.round(at)]) ? 1 : 0;
        st.blend += Math.max(-FLAP_BLEND_RATE * dt, Math.min(FLAP_BLEND_RATE * dt, flap - st.blend));
        const fold = pose === "nest" ? 1 : 0;
        st.fold += Math.max(-FOLD_RATE * dt, Math.min(FOLD_RATE * dt, fold - st.fold));
        st.phase = (st.phase + dt * 2 * Math.PI * FLAP_HZ) % (2 * Math.PI);
      }
      st.prevShown = st.shown;
      drawRef.current();
      // Keep running while gliding to the cursor or while the stork is chosen (wings, nest and thermal storks move).
      st.frame = st.dur > 0 || stork ? requestAnimationFrame(tick) : 0;
      if (!st.frame) st.prevT = 0;
    };
    if (!st.frame) st.frame = requestAnimationFrame(tick);
  }, [marker, markerStyle, flapping, air]);

  if (failed) return <div className="card empty" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{failedText}</div>;
  return <div ref={el} style={{ position: "absolute", inset: 0 }} />;
}
