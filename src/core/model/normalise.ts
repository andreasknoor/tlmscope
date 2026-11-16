import { catalogue } from "./catalogue.ts";
import { Q, type Channel, type Session } from "./types.ts";

/**
 * Turns cumulative device counters (e.g. frame losses since receiver power-up) into
 * counts since the session start. A drop in the raw value means the device restarted
 * its counter; the new raw value is then added on top.
 */
export function toSessionCounter(raw: ArrayLike<number>): Float64Array {
  const out = new Float64Array(raw.length);
  let total = 0;
  let prev = NaN;
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    if (Number.isNaN(r)) {
      out[i] = NaN;
      continue;
    }
    if (!Number.isNaN(prev)) total += r >= prev ? r - prev : r;
    prev = r;
    out[i] = total;
  }
  return out;
}

/** Charge used since session start in mAh, integrated from a current channel in A (trapezoid rule). */
export function integrateMah(current: Channel): Channel {
  const n = current.t.length;
  const v = new Float64Array(n);
  const q = new Uint8Array(n).fill(Q.DERIVED);
  let total = 0;
  let lastT = NaN;
  let lastA = NaN;
  for (let i = 0; i < n; i++) {
    const a = current.v[i];
    if (!Number.isNaN(a)) {
      if (!Number.isNaN(lastA)) total += ((lastA + a) / 2) * (current.t[i] - lastT) / 3.6;
      lastA = a;
      lastT = current.t[i];
    }
    v[i] = total;
  }
  return {
    id: "consumed_mah",
    unit: "mAh",
    kind: "numeric",
    t: current.t,
    v,
    q,
    nominalRateHz: current.nominalRateHz,
    origin: "derived",
    source: { sensor: current.source.sensor, field: "motor current, integrated over time" },
  };
}

/** Value range of a channel between two times, ignoring "no data" samples. */
function rangeBetween(ch: Channel, t0: number, t1: number): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < ch.t.length; i++) {
    if (ch.t[i] < t0) continue;
    if (ch.t[i] > t1) break;
    const v = ch.v[i];
    if (Number.isNaN(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return hi - lo;
}

/**
 * Flags samples FROZEN where a channel that should follow the load (see `frozenCheck`
 * in the catalogue) keeps exactly the same value while the load changes.
 * Returns the ids of channels that had frozen samples.
 */
export function flagFrozen(session: Session): string[] {
  const flagged: string[] = [];
  for (const ch of session.channels.values()) {
    const rule = catalogue(ch.id)?.frozenCheck;
    if (!rule) continue;
    const ref = session.channels.get(rule.whileVarying);
    if (!ref) continue;
    const idx: number[] = [];
    for (let i = 0; i < ch.t.length; i++) if (!Number.isNaN(ch.v[i])) idx.push(i);
    if (idx.length < 2) continue;
    const span = ch.t[idx[idx.length - 1]] - ch.t[idx[0]];
    let any = false;
    let s = 0;
    while (s < idx.length) {
      let e = s;
      while (e + 1 < idx.length && ch.v[idx[e + 1]] === ch.v[idx[s]]) e++;
      const t0 = ch.t[idx[s]];
      const t1 = ch.t[idx[e]];
      if (t1 - t0 >= rule.minSeconds && t1 - t0 >= rule.minShare * span && rangeBetween(ref, t0, t1) >= rule.minDelta) {
        for (let k = s; k <= e; k++) ch.q[idx[k]] |= Q.FROZEN;
        any = true;
      }
      s = e + 1;
    }
    if (any) flagged.push(ch.id);
  }
  return flagged;
}

/** Seconds over which a derived climb rate is measured (like the vario's 1 s field). */
const CLIMB_WINDOW_S = 1;

/** Climb rate in m/s from the altitude channel: height change over about one second. */
export function deriveClimbRate(altitude: Channel): Channel {
  const n = altitude.t.length;
  const v = new Float64Array(n).fill(NaN);
  const q = new Uint8Array(n).fill(Q.DERIVED | Q.NO_DATA);
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(altitude.v[i])) continue;
    // j: the latest sample at least one window before i
    while (j + 1 < i && altitude.t[i] - altitude.t[j + 1] >= CLIMB_WINDOW_S) j++;
    const dt = altitude.t[i] - altitude.t[j];
    if (j < i && dt >= CLIMB_WINDOW_S && !Number.isNaN(altitude.v[j])) {
      v[i] = (altitude.v[i] - altitude.v[j]) / dt;
      q[i] = Q.DERIVED;
    }
  }
  return {
    id: "climb_rate",
    unit: "m/s",
    kind: "numeric",
    t: altitude.t,
    v,
    q,
    nominalRateHz: altitude.nominalRateHz,
    origin: "derived",
    source: { sensor: altitude.source.sensor, field: "altitude change per second" },
  };
}

/** True if the channel is missing or only ever reports 0 (some varios leave the 1 s field empty). */
function emptyOrZero(ch: Channel | undefined): boolean {
  if (!ch) return true;
  for (const x of ch.v) if (!Number.isNaN(x) && x !== 0) return false;
  return true;
}

/** Format-neutral steps run on every session after the adapter. */
export function normaliseSession(session: Session): void {
  const current = session.channels.get("motor_current");
  if (current && !session.channels.has("consumed_mah")) session.channels.set("consumed_mah", integrateMah(current));
  const altitude = session.channels.get("altitude");
  if (altitude && emptyOrZero(session.channels.get("climb_rate")) && rangeBetween(altitude, -Infinity, Infinity) > 2) {
    session.channels.set("climb_rate", deriveClimbRate(altitude));
    session.meta.derivedClimbRate = true;
  }
  // After the climb rate: a climb rate from GPS heights would be noise.
  if (!session.channels.has("altitude")) {
    const h = heightFromGps(session);
    if (h) {
      session.channels.set("altitude", h);
      session.meta.heightFromGps = true;
    }
  }
  const frozen = flagFrozen(session);
  if (frozen.length) session.meta.frozenChannels = frozen;
}

/** Settings for the height above ground from GPS altitudes (used only without a height sensor). */
export const GPS_HEIGHT = {
  /** Standing still below this ground speed (m/s) … */
  stillMs: 1,
  /** … and moving above this one (m/s). */
  movingMs: 5,
  /** The GPS altitude settles for about a minute after the first fix; still samples that early do not set the ground level. */
  settleS: 60,
  /** Fewest still samples that set the ground level. */
  minSamples: 20,
} as const;

/** True for a height channel worked out from GPS altitudes rather than measured by a height sensor. */
export const isGpsHeight = (ch: Channel | undefined): boolean => ch?.id === "altitude" && ch.origin === "derived";

/**
 * Height above ground from the GPS altitude, for sessions without a height sensor. The ground
 * level is the median altitude standing still after the last movement (after landing); without
 * enough of those, standing still before the first movement (once the GPS has settled), else
 * standing still at any time. Null without GPS altitude, ground speed or enough still samples.
 */
export function heightFromGps(session: Session): Channel | null {
  const alt = session.channels.get("gps.altitude");
  const speed = session.channels.get("ground_speed");
  if (!alt || !speed) return null;
  // Ground speed at each altitude sample: the latest speed sample at or before it.
  const still: boolean[] = [], moving: boolean[] = [];
  let j = -1, lastSpeed = NaN;
  for (let i = 0; i < alt.t.length; i++) {
    while (j + 1 < speed.t.length && speed.t[j + 1] <= alt.t[i]) { j++; if (!Number.isNaN(speed.v[j])) lastSpeed = speed.v[j]; }
    still.push(!Number.isNaN(alt.v[i]) && lastSpeed < GPS_HEIGHT.stillMs);
    moving.push(!Number.isNaN(alt.v[i]) && lastSpeed > GPS_HEIGHT.movingMs);
  }
  const valid = [...alt.v.keys()].filter((i) => !Number.isNaN(alt.v[i]));
  if (!valid.length) return null;
  const firstFix = alt.t[valid[0]];
  const firstMove = moving.indexOf(true), lastMove = moving.lastIndexOf(true);
  const pick = (from: number, to: number, after = -Infinity) => {
    const out: number[] = [];
    for (let i = Math.max(0, from); i <= to && i < alt.t.length; i++) if (still[i] && alt.t[i] >= after) out.push(alt.v[i]);
    return out.length >= GPS_HEIGHT.minSamples ? out : null;
  };
  const end = alt.t.length - 1;
  const ground = (lastMove >= 0 ? pick(lastMove + 1, end) ?? pick(0, firstMove - 1, firstFix + GPS_HEIGHT.settleS) : null) ?? pick(0, end);
  if (!ground) return null;
  const level = ground.slice().sort((a, b) => a - b)[Math.floor(ground.length / 2)];
  const v = new Float64Array(alt.v.length);
  const q = new Uint8Array(alt.v.length);
  for (let i = 0; i < v.length; i++) {
    v[i] = alt.v[i] - level;
    q[i] = alt.q[i] | Q.DERIVED;
  }
  return {
    id: "altitude", unit: "m", kind: "numeric", t: alt.t, v, q, nominalRateHz: alt.nominalRateHz, origin: "derived",
    source: { sensor: alt.source.sensor, field: "GPS altitude minus the ground level", note: `Ground level ${Math.round(level * 10) / 10} m (GPS altitude standing still). Less exact than a height sensor: about ±5–10 m.` },
  };
}
