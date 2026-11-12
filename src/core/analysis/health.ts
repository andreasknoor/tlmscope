import { Q, type Session } from "../model/types.ts";
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
  level: Level | null;
  /** True when a hold happened in the air; this overrides the voltage level. */
  holdInAir: boolean;
}

export function receiverPower(session: Session, link: LinkAnalysis | null, g = new Grid(session)): Result<ReceiverPower> {
  return withNeeds(session, ["rx_voltage"], () => {
    const rxMinV = minOf(g.get("rx_voltage", "min"));
    const holdInAir = (link?.holdsAirborne ?? 0) > 0;
    return { rxMinV, becMinV: minOf(g.get("bec_voltage", "min")), holdInAir, level: holdInAir ? 1 : rate(rxMinV, THRESHOLDS.rxVoltage) };
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
