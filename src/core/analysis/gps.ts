import type { Session } from "../model/types.ts";
import { Grid, maxOf, medianOf, type Series } from "./grid.ts";
import { withNeeds, type Result } from "./requirements.ts";

export interface Track {
  /** Position per second (null where there was no fix). */
  lat: Series;
  lon: Series;
  /** Metres east and north of the first fix. */
  east: Series;
  north: Series;
  /** Distance from the first fix in metres. */
  distance: Series;
  home: { lat: number; lon: number };
  maxDistanceM: number;
  /** Length of the path over ground in metres. */
  pathLengthM: number;
  /** Ground speed per second (m/s), from the GPS speed channel or from positions. */
  speed: Series;
  medianSpeed: number | null;
  maxSpeed: number | null;
}

const EARTH_RADIUS = 6_371_000;
const rad = Math.PI / 180;

/** Track over ground from GPS positions. */
export function track(session: Session, g = new Grid(session)): Result<Track> {
  return withNeeds(session, ["gps.lat", "gps.lon"], () => {
    const lat = g.get("gps.lat", "last");
    const lon = g.get("gps.lon", "last");
    const first = lat.findIndex((v, i) => v !== null && lon[i] !== null);
    if (first < 0) return null;
    const home = { lat: lat[first]!, lon: lon[first]! };
    const kx = EARTH_RADIUS * rad * Math.cos(home.lat * rad);
    const ky = EARTH_RADIUS * rad;
    const east: Series = lat.map((v, i) => (v === null || lon[i] === null ? null : (lon[i]! - home.lon) * kx));
    const north: Series = lat.map((v) => (v === null ? null : (v - home.lat) * ky));
    const distance: Series = east.map((x, i) => (x === null ? null : Math.hypot(x, north[i]!)));
    let pathLengthM = 0;
    let prev = -1;
    const fromPositions: Series = new Array(g.n).fill(null);
    for (let i = 0; i < g.n; i++) {
      if (east[i] === null) continue;
      if (prev >= 0) {
        const d = Math.hypot(east[i]! - east[prev]!, north[i]! - north[prev]!);
        pathLengthM += d;
        fromPositions[i] = d / (i - prev);
      }
      prev = i;
    }
    const speed = g.has("ground_speed") ? g.get("ground_speed") : fromPositions;
    return {
      lat, lon, east, north, distance, home,
      maxDistanceM: maxOf(distance) ?? 0,
      pathLengthM,
      speed,
      medianSpeed: medianOf(speed.map((s) => (s !== null && s > 1 ? s : null))),
      maxSpeed: maxOf(speed),
    };
  });
}
