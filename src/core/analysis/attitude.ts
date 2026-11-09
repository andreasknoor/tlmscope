import type { Series } from "./grid.ts";

/**
 * Approximate attitude per second, estimated from the path (the logs carry no attitude angles):
 * course from the positions, climb angle from height against distance over ground, and bank from
 * the turn rate as in a coordinated turn (tan bank = speed × turn rate / g).
 * All angles in degrees. Used to orient the model in the replay; it is a picture, not a measurement.
 */
export interface Attitude {
  /** Course over ground, 0 = north, clockwise. */
  heading: number[];
  /** Positive = nose up. */
  climb: number[];
  /** Positive = right wing down. */
  bank: number[];
}

const G = 9.81;
/** Seconds on each side used for the course and climb angle. */
const SPAN = 2;
/** Below this distance over ground between the two ends the course is not trusted. */
const MIN_MOVE_M = 2;
const MAX_CLIMB = 60;
const MAX_BANK = 70;

const clamp = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v));
/** Difference b − a of two courses, in −180…180. */
const turn = (a: number, b: number) => ((b - a + 540) % 360) - 180;

/** Nearest index with a position, looking from `i` towards `to` (inclusive). */
function nearest(east: Series, i: number, to: number): number {
  const step = to >= i ? 1 : -1;
  for (let k = i; step > 0 ? k <= to : k >= to; k += step) if (east[k] !== null) return k;
  return -1;
}

/** `east`/`north` in metres per second (null without a fix), `height` in metres per second. */
export function attitudeFromPath(east: Series, north: Series, height: Series): Attitude {
  const n = east.length;
  const heading: (number | null)[] = new Array(n).fill(null);
  const climb: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (east[i] === null) continue;
    const a = nearest(east, Math.max(0, i - SPAN), i);
    const b = nearest(east, Math.min(n - 1, i + SPAN), i);
    if (a < 0 || b < 0 || a === b) continue;
    const de = east[b]! - east[a]!, dn = north[b]! - north[a]!;
    const dist = Math.hypot(de, dn);
    if (dist < MIN_MOVE_M) continue;
    heading[i] = ((Math.atan2(de, dn) * 180) / Math.PI + 360) % 360;
    const ha = height[a], hb = height[b];
    if (ha !== null && hb !== null) climb[i] = clamp((Math.atan2(hb - ha, dist) * 180) / Math.PI, MAX_CLIMB);
  }
  // Carry the last known course through slow or missing seconds, and back-fill the start.
  const first = heading.findIndex((h) => h !== null);
  const filled: number[] = new Array(n).fill(first < 0 ? 0 : heading[first]!);
  for (let i = 0, last = filled[0]; i < n; i++) filled[i] = last = heading[i] ?? last;

  const raw: number[] = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (heading[i] === null || east[i - 1] === null || east[i + 1] === null) continue;
    const rate = (turn(filled[i - 1], filled[i + 1]) / 2) * (Math.PI / 180); // rad/s, positive = right turn
    const speed = Math.hypot(east[i + 1]! - east[i - 1]!, north[i + 1]! - north[i - 1]!) / 2;
    raw[i] = clamp((Math.atan((speed * rate) / G) * 180) / Math.PI, MAX_BANK);
  }
  // A short average keeps the bank from flickering with GPS noise.
  const bank = raw.map((_, i) => {
    let s = 0, c = 0;
    for (let k = Math.max(0, i - 1); k <= Math.min(n - 1, i + 1); k++) { s += raw[k]; c++; }
    return s / c;
  });
  return { heading: filled, climb, bank };
}
