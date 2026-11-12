import type { Session } from "../model/types.ts";
import { Grid, maxOf, medianOf, minOf, sumOf, type Series } from "./grid.ts";
import { withNeeds, type Result } from "./requirements.ts";

export type SessionKind = "flight" | "ground-test" | "powered-on" | "transmitter-only";
/**
 * Phases per second. "motor" = climbing with the motor; "powered" = motor on without a
 * measured climb (level flight, or no height sensor); "unpowered" = motor off without
 * a height sensor, so glide and lift cannot be told apart.
 */
export type PhaseKind = "ground" | "motor" | "powered" | "glide" | "lift" | "unpowered";
/** Where the airborne time of a flight comes from. */
export type FlightBasis = "height" | "gps" | "motion";

export interface Phase { kind: PhaseKind; start: number; end: number }
/** One run of the motor (pauses up to `motorGapS` included) and the height it gained. */
export interface Climb extends Phase { kind: "motor"; gainM: number; mah: number | null; mPer100mAh: number | null }
export interface Lift extends Phase { kind: "lift"; gainM: number }

/** Analysis settings. Changing them changes results, so they live here, not in the UI. */
export const FLIGHT = {
  /** A session is a flight once it climbs above this height (m). */
  flightAltitudeM: 10,
  /** A height channel that varies less than this (m) is not usable (sensor missing or dead). */
  usableAltitudeRangeM: 2,
  /** Without usable height: a flight once the GPS ground speed exceeds this (m/s) … */
  flightGroundSpeed: 5,
  /** … for at least this long (s). */
  flightGroundSpeedS: 10,
  /**
   * Without height and GPS: a second is "moving" when a rotation rate exceeds this (°/s),
   * and a session with this many moving seconds is a flight. Checked on 28 sessions with a
   * working height sensor (two models): same result as the height in all of them.
   */
  motionRateDps: 20,
  motionMinS: 30,
  /**
   * Airborne by motion: from the first to the last 10 s window with at least 4 moving seconds.
   * Against the height-based airtime of 25 flights (two models): within −48 … +76 s.
   */
  motionWindowS: 10,
  motionWindowMinS: 4,
  /** With the motor on, climbing faster than this (m/s, 9 s average) is a motor climb; slower is "motor on". */
  motorClimbRate: 0.5,
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
  /** Source of the airborne time. Only "height" gives climbs, lift, glide and height values. */
  basis: FlightBasis;
  /** Seconds on the analysis grid (1 s per step). */
  n: number;
  motor: boolean[];
  /** Seconds with the motor on: in the motor runs of a flight (not on the ground), else in the whole session. */
  motorSecs: number;
  /** Runs of the motor that reach into the airborne time (pauses up to `motorGapS` included). */
  motorRuns: { start: number; end: number }[];
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
  /** Charge used per minute in the air (mAh/min). */
  mahPerMin: number | null;
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

const ROTATION = ["rotation_rate.roll", "rotation_rate.pitch", "rotation_rate.yaw"];

/** The altitude series if the session has a height channel that actually varies; else null. */
function usableAltitude(g: Grid): Series | null {
  if (!g.has("altitude")) return null;
  const alt = g.get("altitude");
  const hi = maxOf(alt), lo = minOf(alt);
  return hi !== null && lo !== null && hi - lo > FLIGHT.usableAltitudeRangeM ? alt : null;
}

/** True if the session has a height channel that never varies (sensor present but dead). */
export function altitudeFlat(session: Session, g = new Grid(session)): boolean {
  return g.has("altitude") && usableAltitude(g) === null;
}

/** Per second: GPS ground speed above the flight limit. */
function gpsMoving(g: Grid): boolean[] | null {
  if (!g.has("ground_speed")) return null;
  const v = g.get("ground_speed");
  return v.map((x) => (x ?? 0) > FLIGHT.flightGroundSpeed);
}

/** Per second: any rotation rate above the motion limit. */
function moving(g: Grid): boolean[] | null {
  const axes = ROTATION.filter((id) => g.has(id)).map((id) => g.get(id));
  if (!axes.length) return null;
  return Array.from({ length: g.n }, (_, i) => axes.some((a) => Math.abs(a[i] ?? 0) > FLIGHT.motionRateDps));
}

const count = (a: boolean[] | null) => (a ? a.reduce((s, x) => s + (x ? 1 : 0), 0) : 0);

/** Classification of a session. Works with whatever channels exist: height, then GPS, then motion. */
export function classify(session: Session, g = new Grid(session)): SessionKind {
  if (session.channels.size === 0) return "transmitter-only";
  const alt = usableAltitude(g);
  if (alt) {
    if ((maxOf(alt) ?? 0) > FLIGHT.flightAltitudeM) return "flight";
  } else if (count(gpsMoving(g)) >= FLIGHT.flightGroundSpeedS || count(moving(g)) >= FLIGHT.motionMinS) return "flight";
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

/** First and last second of the airborne time, by the given basis. */
function airWindow(g: Grid, basis: FlightBasis, alt: Series | null): [number | null, number | null] {
  let s: number | null = null, e: number | null = null;
  if (basis === "height") {
    for (let i = 0; i < g.n; i++) if ((alt![i] ?? -Infinity) > FLIGHT.airborneAltitudeM) { s ??= i; e = i; }
  } else if (basis === "gps") {
    gpsMoving(g)!.forEach((m, i) => { if (m) { s ??= i; e = i; } });
  } else {
    const mv = moving(g) ?? [];
    const w = FLIGHT.motionWindowS;
    for (let k = 0; k + w <= mv.length; k++) {
      let c = 0;
      for (let i = k; i < k + w; i++) if (mv[i]) c++;
      if (c < FLIGHT.motionWindowMinS) continue;
      const first = mv.indexOf(true, k);
      let last = k + w - 1;
      while (!mv[last]) last--;
      s ??= first;
      e = last;
    }
  }
  return [s, e];
}

/**
 * Flight phases, climbs, lift and glide. Needs a motor channel and something that shows
 * the model is in the air: height, GPS speed or rotation rates. Without height there are
 * no climbs, lift or glide; the phases are then only motor on and off.
 */
export function flightProfile(session: Session, g = new Grid(session)): Result<FlightProfile> {
  return withNeeds(session, [motorChannels, ["altitude", "ground_speed", ...ROTATION]], () => {
    const n = g.n;
    const alt = usableAltitude(g);
    const basis: FlightBasis = alt ? "height" : gpsMoving(g) && count(gpsMoving(g)) >= FLIGHT.flightGroundSpeedS ? "gps" : "motion";
    const climb = alt ? g.get("climb_rate") : new Array<number | null>(n).fill(null);
    const amps = g.get("motor_current");
    const kind = classify(session, g);
    const motor = motorOn(g);

    const smoothedClimb: Series = Array.from({ length: n }, (_, i) => {
      let s = 0, c = 0;
      for (let k = i - 4; k <= i + 4; k++) if (k >= 0 && k < n && climb[k] !== null) { s += climb[k]!; c++; }
      return c ? s / c : null;
    });

    const [airStart, airEnd] = kind === "flight" ? airWindow(g, basis, alt) : [null, null];

    // motor pauses up to motorGapS belong to the same motor run
    const motorMerged = motor.slice();
    for (let i = 0; i < n; i++) {
      if (motor[i]) continue;
      let j = i;
      while (j < n && !motor[j]) j++;
      if (i > 0 && j < n && j - i <= FLIGHT.motorGapS) for (let k = i; k < j; k++) motorMerged[k] = true;
      i = j;
    }
    const inAir = (i: number) => airStart !== null && i >= airStart && i <= airEnd!;
    const motorOffFor = (i: number) => !motorMerged.slice(Math.max(0, i - FLIGHT.liftMotorOffS), i + 1).some(Boolean);
    const raw: PhaseKind[] = Array.from({ length: n }, (_, i) => {
      if (motorMerged[i]) return alt && (smoothedClimb[i] ?? 0) > FLIGHT.motorClimbRate ? "motor" : "powered";
      if (!inAir(i)) return "ground";
      if (!alt) return "unpowered";
      return (smoothedClimb[i] ?? 0) > FLIGHT.liftClimbRate && motorOffFor(i) ? "lift" : "glide";
    });
    // Short pieces are noise: a short lift is glide, a short motor climb or motor-on piece joins its neighbour.
    const first = runs(raw).map((p, k, all) => {
      const len = p.end - p.start;
      if (p.kind === "lift" && len < FLIGHT.liftMinS) return { ...p, kind: "glide" as PhaseKind };
      if ((p.kind === "motor" || p.kind === "powered") && len < FLIGHT.climbMinS && all[k - 1]?.kind !== "ground") {
        const nb = all[k - 1]?.kind ?? all[k + 1]?.kind;
        if (nb === "motor" || nb === "powered") return { ...p, kind: nb };
        return { ...p, kind: (alt ? "glide" : "unpowered") as PhaseKind };
      }
      return p;
    });
    const phases: Phase[] = [];
    for (const p of first) {
      const last = phases[phases.length - 1];
      if (last && last.kind === p.kind) last.end = p.end;
      else phases.push({ ...p });
    }
    const phaseAt: (PhaseKind | null)[] = new Array(n).fill(null);
    for (const p of phases) for (let i = p.start; i <= p.end; i++) phaseAt[i] = p.kind;

    // Motor runs (climbs): every run of the motor in the air, whether or not this second climbs.
    // The display phases above split a run into "motor climb" and "motor on"; the climbs and the
    // efficiency keep the whole run, so their values stay comparable between versions.
    // A run on the ground (a motor test before the launch, a blip after landing) is not a climb.
    // A run that starts on the ground and lifts off (hand launch with the motor on) is.
    const runLabels = Array.from({ length: n }, (_, i) => (motorMerged[i] ? "m" : inAir(i) ? "a" : "g"));
    const reachesAir = (p: { start: number; end: number }) => airStart === null || (p.end >= airStart && p.start <= airEnd!);
    const motorRuns = runs(runLabels)
      .filter((p, k, all) => p.kind === "m" && !(p.end - p.start < FLIGHT.climbMinS && all[k - 1]?.kind !== "g") && reachesAir(p))
      .map(({ start, end }) => ({ start, end }));
    const climbs: Climb[] = !alt ? [] : motorRuns.map((p) => {
      const a0 = alt[p.start] ?? 0;
      let top = a0;
      for (let i = p.start; i <= Math.min(n - 1, p.end + 8); i++) if (alt[i] !== null) top = Math.max(top, alt[i]!);
      const mah = g.has("motor_current") ? sumOf(amps.slice(p.start, p.end + 1)) / 3.6 : null;
      return { kind: "motor", start: p.start, end: p.end, gainM: top - a0, mah, mPer100mAh: mah !== null && mah > 5 ? ((top - a0) / mah) * 100 : null };
    });
    const lifts: Lift[] = !alt ? [] : phases.filter((p) => p.kind === "lift").map((p) => {
      const a0 = alt[p.start] ?? 0;
      return { kind: "lift", start: p.start, end: p.end, gainM: (alt[p.end] ?? a0) - a0 };
    });
    const glideIdx: number[] = [];
    if (alt) for (let i = 0; i < n; i++) if (raw[i] === "glide" && (alt[i] ?? 0) > 5) glideIdx.push(i);
    const climbMah = climbs.reduce((s, c) => s + (c.mah ?? 0), 0);
    const climbGain = climbs.reduce((s, c) => s + c.gainM, 0);
    const airtimeS = airStart === null ? 0 : airEnd! - airStart;

    // charge per minute in the air, from the consumed-charge channel
    let mahPerMin: number | null = null;
    if (airStart !== null && airtimeS >= 60 && g.has("consumed_mah")) {
      const used = g.filled("consumed_mah", "last");
      const a = used[airStart], b = used[airEnd!];
      if (a !== null && b !== null && b > a) mahPerMin = (b - a) / (airtimeS / 60);
    }

    return {
      kind, basis, n, motor,
      motorSecs: airStart === null ? motor.filter(Boolean).length : motorRuns.reduce((s, r) => s + motor.slice(r.start, r.end + 1).filter(Boolean).length, 0),
      motorRuns,
      maxAltitudeM: alt ? maxOf(alt) : null,
      airStart, airEnd, airtimeS,
      phases, phaseAt, climbs, lifts,
      liftGainM: lifts.reduce((s, l) => s + Math.max(0, l.gainM), 0),
      liftSecs: lifts.reduce((s, l) => s + l.end - l.start + 1, 0),
      glideSecs: glideIdx.length,
      glideSinkRate: glideIdx.length > 20 ? -(medianOf(glideIdx.map((i) => climb[i])) ?? 0) : null,
      mPer100mAh: climbMah > 20 ? (climbGain / climbMah) * 100 : null,
      mahPerMin,
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

