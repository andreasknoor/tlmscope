import type { Circling, FlightProfile } from "./flight.ts";
import type { Track } from "./gps.ts";
import type { Grid } from "./grid.ts";

/** One full circle inside a thermal. */
export interface ThermalCircle { start: number; end: number; gainM: number }

export interface Thermal {
  start: number;
  end: number;
  durationS: number;
  gainM: number;
  /** Height gain divided by duration (m/s). */
  avgClimb: number;
  /** Best climb over any 10 seconds (m/s). */
  best10s: number | null;
  /** Full circles, from the rotation sensors; empty without them. */
  circles: ThermalCircle[];
  /** Turn direction sign (as in `Circling`); null without rotation sensors or circles. */
  direction: 1 | -1 | null;
  secsPerCircle: number | null;
  /** Motor time the same height would have cost, at this flight's motor climb rate. */
  savedMotorS: number | null;
  /** Battery charge the same height would have cost, at the flight's (or the pilot's) mAh per metre. */
  savedMah: number | null;
  /** Mean position while in the thermal (GPS only). */
  centre: { lat: number; lon: number; east: number; north: number } | null;
  /** Movement of the thermal centre from the first to the last circle (GPS only). */
  drift: { distanceM: number; bearingDeg: number; speedMs: number } | null;
}

export interface Thermals {
  list: Thermal[];
  totalGainM: number;
  totalSecs: number;
  savedMotorS: number | null;
  savedMah: number | null;
}

/** The window for the best climb. */
export const BEST_CLIMB_WINDOW_S = 10;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Each lift phase as a thermal: strength, circles and what it saved.
 * Circles need the rotation sensors, centre and drift need GPS; the rest needs only height.
 */
export function thermals(profile: FlightProfile, g: Grid, circ: Circling | null, track: Track | null, pilotMPer100mAh: number | null = null): Thermals {
  const alt = g.get("altitude");
  const climbSecs = profile.climbs.reduce((s, c) => s + (c.end - c.start + 1), 0);
  const climbGain = profile.climbs.reduce((s, c) => s + c.gainM, 0);
  const motorRate = climbSecs > 0 && climbGain > 0 ? climbGain / climbSecs : null;
  const mPer100 = profile.mPer100mAh ?? pilotMPer100mAh;

  const list = profile.lifts.map((l): Thermal => {
    const durationS = l.end - l.start + 1;
    let best: number | null = null;
    for (let i = l.start; i + BEST_CLIMB_WINDOW_S <= l.end; i++) {
      const a = alt[i], b = alt[i + BEST_CLIMB_WINDOW_S];
      if (a !== null && b !== null) best = Math.max(best ?? -Infinity, (b - a) / BEST_CLIMB_WINDOW_S);
    }

    const circles: ThermalCircle[] = [];
    let direction: 1 | -1 | null = null;
    if (circ) {
      let deg = 0, from = l.start, sum = 0;
      for (let i = l.start; i <= l.end; i++) {
        const w = circ.turnRate[i] ?? 0;
        sum += w;
        deg += Math.abs(w);
        if (deg >= 360) {
          const a = alt[from], b = alt[i];
          circles.push({ start: from, end: i, gainM: a !== null && b !== null ? b - a : 0 });
          deg -= 360;
          from = i;
        }
      }
      if (circles.length) direction = sum >= 0 ? 1 : -1;
    }

    let centre: Thermal["centre"] = null;
    let drift: Thermal["drift"] = null;
    if (track) {
      const centreOf = (a: number, b: number) => {
        const idx: number[] = [];
        for (let i = a; i <= b; i++) if (track.east[i] !== null && track.north[i] !== null && track.lat[i] !== null && track.lon[i] !== null) idx.push(i);
        if (!idx.length) return null;
        return {
          lat: mean(idx.map((i) => track.lat[i]!)), lon: mean(idx.map((i) => track.lon[i]!)),
          east: mean(idx.map((i) => track.east[i]!)), north: mean(idx.map((i) => track.north[i]!)),
          t: mean(idx),
        };
      };
      const c = centreOf(l.start, l.end);
      if (c) centre = { lat: c.lat, lon: c.lon, east: c.east, north: c.north };
      if (circles.length >= 2) {
        const a = centreOf(circles[0].start, circles[0].end), b = centreOf(circles[circles.length - 1].start, circles[circles.length - 1].end);
        if (a && b && b.t > a.t) {
          const de = b.east - a.east, dn = b.north - a.north, d = Math.hypot(de, dn);
          drift = { distanceM: d, bearingDeg: ((Math.atan2(de, dn) * 180) / Math.PI + 360) % 360, speedMs: d / (b.t - a.t) };
        }
      }
    }

    const gain = Math.max(0, l.gainM);
    return {
      start: l.start, end: l.end, durationS, gainM: l.gainM,
      avgClimb: l.gainM / durationS,
      best10s: best,
      circles, direction,
      secsPerCircle: circles.length ? (circles[circles.length - 1].end - circles[0].start) / circles.length : null,
      savedMotorS: motorRate ? gain / motorRate : null,
      savedMah: mPer100 ? gain / (mPer100 / 100) : null,
      centre, drift,
    };
  });

  const sumOrNull = (xs: (number | null)[]) => (xs.length && xs.every((x) => x !== null) ? xs.reduce<number>((s, x) => s + x!, 0) : null);
  return {
    list,
    totalGainM: list.reduce((s, x) => s + Math.max(0, x.gainM), 0),
    totalSecs: list.reduce((s, x) => s + x.durationS, 0),
    savedMotorS: sumOrNull(list.map((x) => x.savedMotorS)),
    savedMah: sumOrNull(list.map((x) => x.savedMah)),
  };
}
