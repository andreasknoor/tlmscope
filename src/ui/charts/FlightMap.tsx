"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MlMap } from "maplibre-gl";
import type { MapboxOverlay } from "@deck.gl/mapbox";
import type { Track } from "@/core/analysis";
import { cssVar } from "../format";

/** Free vector tiles without an API key (decision D3: MapLibre). */
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

interface Props {
  track: Track;
  /** Height per second in metres, used for the 3D path. */
  height: (number | null)[];
  /** Colour per second as CSS colour. */
  colorAt: (i: number) => string;
  marker: number | null;
  pitch: number;
  /** Thermal centres to mark: strength in m/s, `own` for this flight. */
  spots?: { lat: number; lon: number; climb: number; own: boolean }[];
}

const toRgb = (c: string): [number, number, number] => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
  if (m) return [+m[1], +m[2], +m[3]];
  const h = c.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Map with the flight path in 3D. Libraries load only in the browser. */
export function FlightMap({ track, height, colorAt, marker, pitch, spots = [] }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const layersRef = useRef<typeof import("@deck.gl/layers") | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: MlMap | null = null;
    Promise.all([import("maplibre-gl"), import("@deck.gl/mapbox"), import("@deck.gl/layers")]).then(([ml, dm, layers]) => {
      if (cancelled || !el.current) return;
      ml.setWorkerUrl(new URL("maplibre/maplibre-gl-worker.mjs", window.location.href).href);
      const pts = track.lat.map((la, i) => (la === null || track.lon[i] === null ? null : [track.lon[i]!, la] as [number, number])).filter(Boolean) as [number, number][];
      const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
      map = new ml.Map({
        container: el.current,
        style: MAP_STYLE,
        bounds: [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
        fitBoundsOptions: { padding: 60 },
        pitch,
        attributionControl: { compact: true },
      });
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right");
      const overlay = new dm.MapboxOverlay({ interleaved: false, layers: [] });
      map.addControl(overlay);
      mapRef.current = map;
      overlayRef.current = overlay;
      layersRef.current = layers;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, [track, pitch === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mapRef.current?.easeTo({ pitch, duration: 600 });
  }, [pitch]);

  useEffect(() => {
    const overlay = overlayRef.current, layers = layersRef.current;
    if (!ready || !overlay || !layers) return;
    const pos = (i: number): [number, number, number] | null =>
      track.lat[i] === null || track.lon[i] === null ? null : [track.lon[i]!, track.lat[i]!, Math.max(0, height[i] ?? 0)];
    const segments: { path: [number, number, number][]; color: [number, number, number] }[] = [];
    const shadow: [number, number][] = [];
    let prev: [number, number, number] | null = null;
    for (let i = 0; i < track.lat.length; i++) {
      const p = pos(i);
      if (!p) continue;
      shadow.push([p[0], p[1]]);
      if (prev) segments.push({ path: [prev, p], color: toRgb(colorAt(i)) });
      prev = p;
    }
    const m = marker !== null ? pos(marker) : null;
    overlay.setProps({
      layers: [
        new layers.PathLayer({ id: "shadow", data: [{ path: shadow }], getPath: (d: { path: [number, number][] }) => d.path, getColor: [60, 70, 80, 90], getWidth: 2, widthUnits: "pixels" }),
        new layers.PathLayer({ id: "path", data: segments, getPath: (d: (typeof segments)[number]) => d.path, getColor: (d: (typeof segments)[number]) => d.color, getWidth: 3, widthUnits: "pixels", capRounded: true, jointRounded: true }),
        new layers.ScatterplotLayer({
          id: "thermals", data: spots, getPosition: (d: (typeof spots)[number]) => [d.lon, d.lat, 0],
          getFillColor: (d: (typeof spots)[number]) => [...toRgb(cssVar("--s-lift")), d.own ? 170 : 90] as [number, number, number, number],
          getLineColor: toRgb(cssVar("--ink")), stroked: true, getLineWidth: (d: (typeof spots)[number]) => (d.own ? 2 : 0), lineWidthUnits: "pixels",
          getRadius: (d: (typeof spots)[number]) => 12 + Math.max(0, d.climb) * 14, radiusUnits: "meters",
        }),
        new layers.ScatterplotLayer({ id: "home", data: [track.home], getPosition: (d: Track["home"]) => [d.lon, d.lat, 0], getFillColor: toRgb(cssVar("--ink")), getRadius: 6, radiusUnits: "pixels" }),
        ...(m ? [new layers.ScatterplotLayer({ id: "marker", data: [m], getPosition: (d: [number, number, number]) => d, getFillColor: [255, 255, 255], getLineColor: toRgb(cssVar("--ink")), stroked: true, lineWidthUnits: "pixels", getLineWidth: 2.5, getRadius: 7, radiusUnits: "pixels" })] : []),
      ],
    });
  }, [ready, track, height, colorAt, marker, spots]);

  return <div ref={el} style={{ position: "absolute", inset: 0 }} />;
}
