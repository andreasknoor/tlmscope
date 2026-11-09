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
  const frozen = flagFrozen(session);
  if (frozen.length) session.meta.frozenChannels = frozen;
}
