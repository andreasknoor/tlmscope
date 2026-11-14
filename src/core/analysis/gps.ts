import type { Session } from "../model/types.ts";
import type { FlightProfile } from "./flight.ts";
import { Grid, maxOf, medianOf, type Series } from "./grid.ts";
import { withNeeds, type Result } from "./requirements.ts";

/** Analysis settings for the GPS track. */
export const GPS = {
  /**
   * Between two fixes, a speed above this (m/s, about 540 km/h) is a GPS jump, not flight. A fix that jumps is
   * left out of the track, the distances and the speeds. After this many jumps in a row the new position is
   * taken as real (the receiver found a new fix), so a lasting shift does not delete the rest of the track.
   */
  maxPlausibleSpeed: 150,
  jumpsInARow: 5,
} as const;

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
  /** Ground speed per second (m/s), from the GPS speed channel or from positions; null where implausible. */
  speed: Series;
  medianSpeed: number | null;
  maxSpeed: number | null;
  /** True when distances and speeds count only the time in the air (else the whole session). */
  airborneOnly: boolean;
  /** Number of fixes left out as GPS jumps. */
  jumps: number;
}

const EARTH_RADIUS = 6_371_000;
const rad = Math.PI / 180;

/**
 * Track over ground from GPS positions. With the flight profile, distances and speeds count only the time in
 * the air (the receiver's noise on the ground is not flight); GPS jumps are left out in any case.
 */
export function track(session: Session, g = new Grid(session), profile: FlightProfile | null = null): Result<Track> {
  return withNeeds(session, ["gps.lat", "gps.lon"], () => {
    const lat0 = g.get("gps.lat", "last");
    const lon0 = g.get("gps.lon", "last");
    const first = lat0.findIndex((v, i) => v !== null && lon0[i] !== null);
    if (first < 0) return null;
    const home = { lat: lat0[first]!, lon: lon0[first]! };
    const kx = EARTH_RADIUS * rad * Math.cos(home.lat * rad);
    const ky = EARTH_RADIUS * rad;
    const win = profile && profile.airStart !== null ? { from: profile.airStart, to: profile.airEnd! } : null;
    const inWin = (i: number) => !win || (i >= win.from && i <= win.to);

    // Walk the fixes: a fix that would need an impossible speed to reach is a jump and is dropped.
    const lat: Series = new Array(g.n).fill(null);
    const lon: Series = new Array(g.n).fill(null);
    const east: Series = new Array(g.n).fill(null);
    const north: Series = new Array(g.n).fill(null);
    const fromPositions: Series = new Array(g.n).fill(null);
    let pathLengthM = 0, jumps = 0, inARow = 0, prev = -1;
    for (let i = 0; i < g.n; i++) {
      if (lat0[i] === null || lon0[i] === null) continue;
      const e = (lon0[i]! - home.lon) * kx, nn = (lat0[i]! - home.lat) * ky;
      let jumped = false;
      if (prev >= 0) {
        const d = Math.hypot(e - east[prev]!, nn - north[prev]!);
        const v = d / (i - prev);
        if (v > GPS.maxPlausibleSpeed && inARow < GPS.jumpsInARow) { inARow++; jumps++; continue; }
        jumped = v > GPS.maxPlausibleSpeed;
        if (!jumped && inWin(prev) && inWin(i)) pathLengthM += d;
        if (!jumped) fromPositions[i] = v;
      }
      inARow = 0;
      lat[i] = lat0[i]; lon[i] = lon0[i]; east[i] = e; north[i] = nn;
      prev = i;
    }
    const distance: Series = east.map((x, i) => (x === null ? null : Math.hypot(x, north[i]!)));
    // The GPS speed channel can spike too.
    const speed: Series = (g.has("ground_speed") ? g.get("ground_speed") : fromPositions).map((v) => (v !== null && v > GPS.maxPlausibleSpeed ? null : v));
    const inAir = (series: Series): Series => series.map((v, i) => (inWin(i) ? v : null));
    return {
      lat, lon, east, north, distance, home,
      maxDistanceM: maxOf(inAir(distance)) ?? 0,
      pathLengthM,
      speed,
      medianSpeed: medianOf(inAir(speed).map((s) => (s !== null && s > 1 ? s : null))),
      maxSpeed: maxOf(inAir(speed)),
      airborneOnly: win !== null,
      jumps,
    };
  });
}
