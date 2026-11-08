import type { Session } from "../model/types.ts";
import { Grid, maxOf, medianOf, sumOf, type Series } from "./grid.ts";
import { withNeeds, type Result } from "./requirements.ts";

export type SessionKind = "flight" | "ground-test" | "powered-on" | "transmitter-only";
export type PhaseKind = "ground" | "motor" | "glide" | "lift";

export interface Phase { kind: PhaseKind; start: number; end: number }
export interface Climb extends Phase { kind: "motor"; gainM: number; mah: number | null; mPer100mAh: number | null }
export interface Lift extends Phase { kind: "lift"; gainM: number }

/** Analysis settings. Changing them changes results, so they live here, not in the UI. */
export const FLIGHT = {
  /** A session is a flight once it climbs above this height (m). */
  flightAltitudeM: 10,
  /** Without altitude: a flight once ground speed exceeds this (m/s). */
  flightGroundSpeed: 5,
  /** Airborne while above this height (m). */
  airborneAltitudeM: 3,
  /** Motor on above this throttle (%) or this current (A). */
  motorThrottlePct: 5,
  motorCurrentA: 1,
  /** Motor pauses up to this long (s) belong to the same climb. */
  motorGapS: 5,
  /** Lift: climbing faster than this (m/s, 9 s average) … */
  liftClimbRate: 0.2,
  /** … with the motor off for at least this long (s) … */
  liftMotorOffS: 8,
  /** … for at least this long (s). */
  liftMinS: 10,
  /** Climbs shorter than this (s) are throttle blips. */
  climbMinS: 2,
} as const;

export interface FlightProfile {
  kind: SessionKind;
  /** Seconds on the analysis grid (1 s per step). */
  n: number;
  motor: boolean[];
  motorSecs: number;
  maxAltitudeM: number | null;
  airStart: number | null;
  airEnd: number | null;
  airtimeS: number;
  phases: Phase[];
  phaseAt: (PhaseKind | null)[];
  climbs: Climb[];
  lifts: Lift[];
  liftGainM: number;
  liftSecs: number;
  glideSecs: number;
  /** Median sink rate while gliding (m/s, positive = sinking). */
  glideSinkRate: number | null;
  /** Height gained per 100 mAh over all motor climbs. */
  mPer100mAh: number | null;
  /** 9-second average of the climb rate, per second. */
  smoothedClimb: Series;
}

const motorChannels = ["throttle_output", "motor_current", "throttle_command"];

/** Motor on/off per second, from whatever motor channels the session has. */
function motorOn(g: Grid): boolean[] {
  const thr = g.get(g.has("throttle_output") ? "throttle_output" : "throttle_command");
  const amps = g.get("motor_current");
  return Array.from({ length: g.n }, (_, i) => (thr[i] ?? 0) > FLIGHT.motorThrottlePct || (amps[i] ?? 0) > FLIGHT.motorCurrentA);
}

/** Classification of a session. Works with whatever channels exist. */
export function classify(session: Session, g = new Grid(session)): SessionKind {
  if (session.channels.size === 0) return "transmitter-only";
  const alt = maxOf(g.get("altitude"));
  const speed = maxOf(g.get("ground_speed"));
  if ((alt ?? 0) > FLIGHT.flightAltitudeM || (alt === null && (speed ?? 0) > FLIGHT.flightGroundSpeed)) return "flight";
  if (motorOn(g).some(Boolean)) return "ground-test";
  return "powered-on";
}

function runs<T>(labels: T[]): { kind: T; start: number; end: number }[] {
  const out: { kind: T; start: number; end: number }[] = [];
  labels.forEach((k, i) => {
    const last = out[out.length - 1];
    if (last && last.kind === k) last.end = i;
    else out.push({ kind: k, start: i, end: i });
  });
  return out;
}

/** Flight phases, climbs, lift and glide. Needs height and some motor channel. */
export function flightProfile(session: Session, g = new Grid(session)): Result<FlightProfile> {
  return withNeeds(session, ["altitude", motorChannels], () => {
    const n = g.n;
    const alt = g.get("altitude");
    const climb = g.get("climb_rate");
    const amps = g.get("motor_current");
    const kind = classify(session, g);
    const motor = motorOn(g);

    const smoothedClimb: Series = Array.from({ length: n }, (_, i) => {
      let s = 0, c = 0;
      for (let k = i - 4; k <= i + 4; k++) if (k >= 0 && k < n && climb[k] !== null) { s += climb[k]!; c++; }
      return c ? s / c : null;
    });

    let airStart: number | null = null;
    let airEnd: number | null = null;
    if (kind === "flight") {
      for (let i = 0; i < n; i++) if ((alt[i] ?? -Infinity) > FLIGHT.airborneAltitudeM) { airStart ??= i; airEnd = i; }
    }

    // motor pauses up to motorGapS belong to the same climb
    const motorMerged = motor.slice();
    for (let i = 0; i < n; i++) {
      if (motor[i]) continue;
      let j = i;
      while (j < n && !motor[j]) j++;
      if (i > 0 && j < n && j - i <= FLIGHT.motorGapS) for (let k = i; k < j; k++) motorMerged[k] = true;
      i = j;
    }
    const motorOffFor = (i: number) => !motorMerged.slice(Math.max(0, i - FLIGHT.liftMotorOffS), i + 1).some(Boolean);
    const raw: PhaseKind[] = Array.from({ length: n }, (_, i) => {
      if (motorMerged[i]) return "motor";
      if (airStart === null || i < airStart || i > airEnd!) return "ground";
      return (smoothedClimb[i] ?? 0) > FLIGHT.liftClimbRate && motorOffFor(i) ? "lift" : "glide";
    });
    const first = runs(raw).map((p, k, all) => ({
      ...p,
      kind: (p.kind === "lift" && p.end - p.start < FLIGHT.liftMinS) ||
        (p.kind === "motor" && p.end - p.start < FLIGHT.climbMinS && all[k - 1]?.kind !== "ground")
        ? ("glide" as PhaseKind) : p.kind,
    }));
    const phases: Phase[] = [];
    for (const p of first) {
      const last = phases[phases.length - 1];
      if (last && last.kind === p.kind) last.end = p.end;
      else phases.push({ ...p });
    }
    const phaseAt: (PhaseKind | null)[] = new Array(n).fill(null);
    for (const p of phases) for (let i = p.start; i <= p.end; i++) phaseAt[i] = p.kind;

    const climbs: Climb[] = phases.filter((p) => p.kind === "motor").map((p) => {
      const a0 = alt[p.start] ?? 0;
      let top = a0;
      for (let i = p.start; i <= Math.min(n - 1, p.end + 8); i++) if (alt[i] !== null) top = Math.max(top, alt[i]!);
      const mah = g.has("motor_current") ? sumOf(amps.slice(p.start, p.end + 1)) / 3.6 : null;
      return { kind: "motor", start: p.start, end: p.end, gainM: top - a0, mah, mPer100mAh: mah !== null && mah > 5 ? ((top - a0) / mah) * 100 : null };
    });
    const lifts: Lift[] = phases.filter((p) => p.kind === "lift").map((p) => {
      const a0 = alt[p.start] ?? 0;
      return { kind: "lift", start: p.start, end: p.end, gainM: (alt[p.end] ?? a0) - a0 };
    });
    const glideIdx: number[] = [];
    for (let i = 0; i < n; i++) if (raw[i] === "glide" && (alt[i] ?? 0) > 5) glideIdx.push(i);
    const climbMah = climbs.reduce((s, c) => s + (c.mah ?? 0), 0);
    const climbGain = climbs.reduce((s, c) => s + c.gainM, 0);

    return {
      kind, n, motor,
      motorSecs: motor.filter(Boolean).length,
      maxAltitudeM: maxOf(alt),
      airStart, airEnd,
      airtimeS: airStart === null ? 0 : airEnd! - airStart,
      phases, phaseAt, climbs, lifts,
      liftGainM: lifts.reduce((s, l) => s + Math.max(0, l.gainM), 0),
      liftSecs: lifts.reduce((s, l) => s + l.end - l.start + 1, 0),
      glideSecs: glideIdx.length,
      glideSinkRate: glideIdx.length > 20 ? -(medianOf(glideIdx.map((i) => climb[i])) ?? 0) : null,
      mPer100mAh: climbMah > 20 ? (climbGain / climbMah) * 100 : null,
      smoothedClimb,
    };
  });
}

export interface Circling {
  /** Signed turn rate per second (°/s); 0 when not turning. The sign gives the direction. */
  turnRate: number[];
  periods: { start: number; end: number; direction: 1 | -1; circles: number; degrees: number }[];
  circles: number;
  turningSecs: number;
}

export const CIRCLING = { minTurnRate: 15, maxGapS: 2 } as const;

/**
 * Turns and full circles from the rotation sensors. In a turn the model rotates about
 * its pitch and yaw axes; together they give the turn rate, the yaw sign the direction.
 */
export function circling(session: Session, profile: FlightProfile, g = new Grid(session)): Result<Circling> {
  return withNeeds(session, ["rotation_rate.pitch", "rotation_rate.yaw"], () => {
    const pitch = g.get("rotation_rate.pitch");
    const yaw = g.get("rotation_rate.yaw");
    const n = g.n;
    const inAir = (i: number) => profile.airStart !== null && i >= profile.airStart && i <= profile.airEnd!;
    const turnRate = Array.from({ length: n }, (_, i) => {
      if (!inAir(i) || pitch[i] === null) return 0;
      let ys = 0;
      for (let k = i - 2; k <= i + 2; k++) ys += yaw[k] ?? 0;
      const w = Math.hypot(pitch[i]!, yaw[i] ?? 0);
      return w > CIRCLING.minTurnRate ? w * (Math.sign(ys) || 1) : 0;
    });
    const periods: Circling["periods"] = [];
    for (let i = 0; i < n; i++) {
      if (!turnRate[i]) continue;
      const dir = Math.sign(turnRate[i]) as 1 | -1;
      let j = i, deg = 0, gap = 0;
      while (j < n && gap <= CIRCLING.maxGapS) {
        if (Math.sign(turnRate[j]) === dir) { deg += Math.abs(turnRate[j]); gap = 0; } else gap++;
        j++;
      }
      const end = j - gap - 1;
      if (deg >= 360) periods.push({ start: i, end, direction: dir, circles: Math.floor(deg / 360), degrees: deg });
      i = Math.max(i, end);
    }
    return {
      turnRate, periods,
      circles: periods.reduce((s, p) => s + p.circles, 0),
      turningSecs: turnRate.filter((v) => v !== 0).length,
    };
  });
}

