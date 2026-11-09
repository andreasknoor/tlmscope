"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MlMap } from "maplibre-gl";
import type { MapboxOverlay } from "@deck.gl/mapbox";
import { attitudeFromPath, type Track } from "@/core/analysis";
import { maxOf, minOf } from "@/core/analysis/grid";
import { cssVar } from "../format";
import { planeMesh } from "./plane-mesh";

/** Free vector tiles without an API key (decision D3: MapLibre). */
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/** How the flight path is drawn, chosen in the map tools. */
export type LineStyle = "thin" | "thinDashed" | "thick" | "thickDashed";
export const LINE_STYLES: LineStyle[] = ["thick", "thickDashed", "thin", "thinDashed"];
const LINE_WIDTH = { thin: 2, thick: 4 };
/** How the model is shown in the replay. */
export type MarkerStyle = "plane" | "dot";
export const MARKER_STYLES: MarkerStyle[] = ["plane", "dot"];
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
const planePx = (zoom: number, fitZoom: number) =>
  Math.min(PLANE_PX_MAX, Math.max(PLANE_PX_MIN, PLANE_FIT_PX * 2 ** ((zoom - fitZoom) * PLANE_GROWTH)));
/** Ground metres per screen pixel at the map centre (MapLibre uses 512 px tiles). */
const metresPerPixel = (lat: number, zoom: number) => (40_075_016.7 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);

/** The text colour, moved a quarter towards mid grey so the lighting can show the shape. */
const planeColor = (ink: [number, number, number]): [number, number, number] => ink.map((c) => Math.round(c + (128 - c) * 0.25)) as [number, number, number];

const toRgb = (c: string): [number, number, number] => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
  if (m) return [+m[1], +m[2], +m[3]];
  const h = c.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Map with the flight path in 3D. Libraries load only in the browser. */
export function FlightMap({ track, height, colorAt, marker, pitch, lineStyle, markerStyle, shadow: showShadow, spots = [], failedText }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const layersRef = useRef<typeof import("@deck.gl/layers") | null>(null);
  const meshRef = useRef<typeof import("@deck.gl/mesh-layers") | null>(null);
  const extRef = useRef<typeof import("@deck.gl/extensions") | null>(null);
  const fitZoomRef = useRef<number | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: MlMap | null = null;
    let resize: ResizeObserver | null = null;
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
      setZoom(m.getZoom());
      m.on("zoom", () => setZoom(m.getZoom()));
      setReady(true);
    }).catch((err: unknown) => {
      // Offline, blocked or no WebGL: show a note instead of breaking the page.
      console.error("Map could not be shown", err);
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
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
      cur.path.push(p);
      cur.colors.push(toRgb(colorAt(i)));
    }
    return { lines: lines.filter((l) => l.path.length > 1), shadow: [{ path: shadow }] };
  }, [track, height, colorAt]);

  const attitude = useMemo(() => attitudeFromPath(track.east, track.north, height), [track, height]);
  const mesh = useMemo(() => planeMesh(), []);

  useEffect(() => {
    const overlay = overlayRef.current, layers = layersRef.current, meshLayers = meshRef.current, ext = extRef.current;
    if (!ready || !overlay || !layers || !meshLayers || !ext) return;
    const { lines, shadow } = pathData;
    const dashed = lineStyle === "thinDashed" || lineStyle === "thickDashed";
    const width = LINE_WIDTH[lineStyle.startsWith("thin") ? "thin" : "thick"];
    const pos = (i: number): [number, number, number] | null =>
      track.lat[i] === null || track.lon[i] === null ? null : [track.lon[i]!, track.lat[i]!, Math.max(0, height[i] ?? 0)];
    const m = marker !== null ? pos(marker) : null;
    overlay.setProps({
      layers: [
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
        // The model, turned along the path. deck.gl takes [pitch (nose down), yaw (from east, anticlockwise), roll (right wing down)].
        // The dot faces the camera and is drawn on top of the path, so a flat view or the path never hides it.
        ...(m && markerStyle === "dot" ? [new layers.ScatterplotLayer({ id: "marker", data: [m], getPosition: (d: [number, number, number]) => d, getFillColor: [255, 255, 255], getLineColor: toRgb(cssVar("--ink")), stroked: true, lineWidthUnits: "pixels", getLineWidth: 3, getRadius: 9, radiusUnits: "pixels", billboard: true, parameters: { depthCompare: "always" } })] : []),
        ...(m && marker !== null && markerStyle === "plane" ? [new meshLayers.SimpleMeshLayer({
          id: "plane", data: [m], mesh, getPosition: (d: [number, number, number]) => d,
          getOrientation: [-attitude.climb[marker], 90 - attitude.heading[marker], attitude.bank[marker]],
          sizeScale: Math.max(PLANE_MIN_M, planePx(zoom ?? 15, fitZoomRef.current ?? zoom ?? 15) * metresPerPixel(m[1], zoom ?? 15)),
          getColor: planeColor(toRgb(cssVar("--ink"))),
          material: { ambient: 0.45, diffuse: 0.75, shininess: 24, specularColor: [80, 80, 80] },
        })] : []),
      ],
    });
  }, [ready, track, height, pathData, marker, spots, attitude, mesh, zoom, lineStyle, markerStyle, showShadow]);

  if (failed) return <div className="card empty" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{failedText}</div>;
  return <div ref={el} style={{ position: "absolute", inset: 0 }} />;
}
