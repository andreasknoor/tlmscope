import { Q, type Channel, type Session } from "../model/types.ts";
import type { Circling, FlightProfile } from "./flight.ts";
import { Grid, maxOf, minOf } from "./grid.ts";
import type { LinkAnalysis, SignalAnalysis } from "./link.ts";
import { withNeeds, type Result } from "./requirements.ts";
import { rate, THRESHOLDS, type Level } from "./thresholds.ts";

export interface Temperatures {
  escMaxC: number | null;
  becMaxC: number | null;
  batteryMaxC: number | null;
  escLevel: Level | null;
  batteryLevel: Level | null;
  /** The worse of controller and battery. */
  level: Level | null;
}

export function temperatures(session: Session, g = new Grid(session)): Result<Temperatures> {
  return withNeeds(session, [["temperature.esc", "temperature.battery", "temperature.bec"]], () => {
    const escMaxC = maxOf(g.get("temperature.esc", "max"));
    const becMaxC = maxOf(g.get("temperature.bec", "max"));
    const batteryMaxC = maxOf(g.get("temperature.battery", "max"));
    const own = session.battery?.maxTempC;
    const battScale = own ? { ...THRESHOLDS.batteryTempC, steps: [45, 55, own] as [number, number, number] } : THRESHOLDS.batteryTempC;
    const escLevel = rate(escMaxC, THRESHOLDS.escTempC);
    const batteryLevel = rate(batteryMaxC, battScale);
    const levels = [escLevel, batteryLevel].filter((l): l is Level => l !== null);
    return { escMaxC, becMaxC, batteryMaxC, escLevel, batteryLevel, level: levels.length ? (Math.min(...levels) as Level) : null };
  });
}

export interface ReceiverPower {
  rxMinV: number | null;
  becMinV: number | null;
  /** From the voltage only: a hold is a radio link problem and rated there. */
  level: Level | null;
}

/**
 * Switching off and on: a receiver reports a collapsing voltage just before it goes quiet
 * (battery unplugged) and some report a low first value after power-up. Readings within
 * `edgeS` of the start or end of a run of readings (runs are split by pauses of at least
 * `gapS`) are left out, but in the air only at a pause of at least `offS`: nobody plugs a
 * battery in during a flight, while a brown-out restarts the receiver within moments.
 */
export const POWER_EDGE = { gapS: 1, edgeS: 0.5, offS: 5 } as const;

/**
 * Lowest voltage without the readings at switching off and on (see `POWER_EDGE`); `air` is
 * the airborne time in seconds. When that leaves nothing (very few readings), all readings count.
 */
export function steadyMinV(ch: Channel | undefined, air: [number, number] | null): number | null {
  if (!ch) return null;
  const idx = [...ch.v.keys()].filter((i) => !Number.isNaN(ch.v[i]));
  const t = idx.map((i) => ch.t[i]);
  let min: number | null = null, all: number | null = null;
  // Runs of readings without a pause of gapS; the pause before a run's start and after its end (Infinity at the ends of the data).
  let runStart = 0;
  for (let k = 0; k <= idx.length; k++) {
    if (k < idx.length && (k === 0 || t[k] - t[k - 1] < POWER_EDGE.gapS)) continue;
    const runEnd = k - 1;
    const pauseBefore = runStart === 0 ? Infinity : t[runStart] - t[runStart - 1];
    const pauseAfter = runEnd === idx.length - 1 ? Infinity : t[runEnd + 1] - t[runEnd];
    for (let j = runStart; j <= runEnd; j++) {
      const v = ch.v[idx[j]];
      if (all === null || v < all) all = v;
      const inAir = air !== null && t[j] >= air[0] && t[j] < air[1] + 1;
      const leftOut = (pause: number) => (pause === Infinity ? !inAir : !inAir || pause >= POWER_EDGE.offS);
      if (t[j] - t[runStart] <= POWER_EDGE.edgeS && leftOut(pauseBefore)) continue;
      if (t[runEnd] - t[j] <= POWER_EDGE.edgeS && leftOut(pauseAfter)) continue;
      if (min === null || v < min) min = v;
    }
    runStart = k;
  }
  return min ?? all;
}

export function receiverPower(session: Session, profile: FlightProfile | null = null): Result<ReceiverPower> {
  return withNeeds(session, ["rx_voltage"], () => {
    const air: [number, number] | null = profile && profile.airStart !== null ? [profile.airStart, profile.airEnd!] : null;
    const rxMinV = steadyMinV(session.channels.get("rx_voltage"), air);
    return { rxMinV, becMinV: steadyMinV(session.channels.get("bec_voltage"), air), level: rate(rxMinV, THRESHOLDS.rxVoltage) };
  });
}

export type FlyingStyle = "gentle" | "moderate" | "sporty" | "hard";

export interface Loads {
  maxG: number;
  maxAt: number;
  maxRotation: number | null;
  /** Descriptive, not a quality rating. */
  style: FlyingStyle;
}

export const STYLE_LIMITS = { gentle: 2.5, moderate: 4, sporty: 6 } as const;

/**
 * Seconds left out at both ends of the airborne time: the throw of a hand launch and the
 * touchdown are the hardest jolts of many flights, but they say nothing about the flying.
 */
export const LOAD_EDGE_S = 3;

/** Strongest load and fastest rotation; in a flight only while airborne, without launch and touchdown. */
export function loads(session: Session, g = new Grid(session), profile: FlightProfile | null = null): Result<Loads> {
  return withNeeds(session, ["accel.x", "accel.y", "accel.z"], () => {
    let w0 = 0, w1 = g.n - 1;
    if (profile && profile.kind === "flight" && profile.airStart !== null) {
      w0 = profile.airStart;
      w1 = profile.airEnd!;
      if (w1 - w0 > 4 * LOAD_EDGE_S) { w0 += LOAD_EDGE_S; w1 -= LOAD_EDGE_S; }
    }
    const mag = g.magnitudeMax(["accel.x", "accel.y", "accel.z"]).slice(w0, w1 + 1);
    const maxG = maxOf(mag);
    if (maxG === null) return null;
    const rot = ["rotation_rate.roll", "rotation_rate.pitch", "rotation_rate.yaw"]
      .filter((id) => g.has(id))
      .map((id) => Math.max(Math.abs(maxOf(g.get(id, "max").slice(w0, w1 + 1)) ?? 0), Math.abs(minOf(g.get(id, "min").slice(w0, w1 + 1)) ?? 0)));
    const style: FlyingStyle = maxG < STYLE_LIMITS.gentle ? "gentle" : maxG < STYLE_LIMITS.moderate ? "moderate" : maxG < STYLE_LIMITS.sporty ? "sporty" : "hard";
    return { maxG, maxAt: w0 + mag.indexOf(maxG), maxRotation: rot.length ? Math.max(...rot) : null, style };
  });
}

export type DataIssue =
  | { kind: "frozen"; level: 1; channels: string[]; values: Record<string, number> }
  | { kind: "battery-not-reporting"; level: 2 }
  | { kind: "no-cell-voltages"; level: 2 }
  | { kind: "height-flat"; level: 2 };

/**
 * Problems with the data itself. `batteryExpected` is true when other sessions of the
 * same files had a reporting battery, so a missing one is worth mentioning. `heightFlat`:
 * the session has a height channel that never changed.
 */
export function dataIssues(session: Session, kind: string, batteryExpected: boolean, heightFlat = false): DataIssue[] {
  const issues: DataIssue[] = [];
  const frozen = [...session.channels.values()].filter((c) => c.q.some((q) => (q & Q.FROZEN) !== 0));
  if (frozen.length) {
    const values: Record<string, number> = {};
    for (const c of frozen) {
      const i = c.q.findIndex((q) => (q & Q.FROZEN) !== 0);
      values[c.id] = c.v[i];
    }
    issues.push({ kind: "frozen", level: 1, channels: frozen.map((c) => c.id), values });
  }
  if (kind === "flight") {
    if (heightFlat) issues.push({ kind: "height-flat", level: 2 });
    if (!session.battery && batteryExpected) issues.push({ kind: "battery-not-reporting", level: 2 });
    if (session.battery && !session.channels.has("cell_voltage.1")) issues.push({ kind: "no-cell-voltages", level: 2 });
  }
  return issues;
}

export type MomentKind = "highest" | "best-lift" | "longest-circling" | "hardest-load" | "weakest-signal" | "most-frame-losses";
export interface Moment { kind: MomentKind; at: number; value: number }

/** Notable points of a flight, to jump to in the charts. */
export function moments(
  profile: FlightProfile, g: Grid, extra: { circling: Circling | null; loads: Loads | null; signal: SignalAnalysis | null; link: LinkAnalysis | null },
): Moment[] {
  const out: Moment[] = [];
  const alt = g.get("altitude");
  if (profile.maxAltitudeM !== null) out.push({ kind: "highest", at: alt.indexOf(profile.maxAltitudeM), value: profile.maxAltitudeM });
  const bestLift = [...profile.lifts].sort((a, b) => b.gainM - a.gainM)[0];
  if (bestLift) out.push({ kind: "best-lift", at: bestLift.start, value: bestLift.gainM });
  const longest = extra.circling ? [...extra.circling.periods].sort((a, b) => b.circles - a.circles)[0] : undefined;
  if (longest) out.push({ kind: "longest-circling", at: longest.start, value: longest.circles });
  if (extra.loads) out.push({ kind: "hardest-load", at: extra.loads.maxAt, value: extra.loads.maxG });
  if (extra.signal?.minDbm != null && extra.signal.minAt != null) out.push({ kind: "weakest-signal", at: extra.signal.minAt, value: extra.signal.minDbm });
  if (extra.link?.worstSecond) out.push({ kind: "most-frame-losses", at: extra.link.worstSecond.at, value: extra.link.worstSecond.frameLosses });
  return out;
}
