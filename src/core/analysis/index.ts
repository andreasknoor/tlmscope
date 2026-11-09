import { modelKey } from "../model/model-name.ts";
import type { LogFile, Session } from "../model/types.ts";
import { batteryCondition, batteryUse, cellBalance, chargeEstimate, type BatteryCondition, type BatteryUse, type CellBalance, type ChargeEstimate } from "./battery.ts";
import { altitudeFlat, circling, classify, flightProfile, type Circling, type FlightProfile, type SessionKind } from "./flight.ts";
import { track, type Track } from "./gps.ts";
import { thermals, type Thermals } from "./thermals.ts";
import { Grid, medianOf } from "./grid.ts";
import { dataIssues, loads, moments, receiverPower, temperatures, type DataIssue, type Loads, type Moment, type ReceiverPower, type Temperatures } from "./health.ts";
import { linkQuality, signalStrength, type LinkAnalysis, type SignalAnalysis } from "./link.ts";
import type { Result } from "./requirements.ts";
import { rate, THRESHOLDS, type Level } from "./thresholds.ts";

export interface SessionAnalysis {
  session: Session;
  kind: SessionKind;
  grid: Grid;
  profile: Result<FlightProfile>;
  circling: Result<Circling>;
  track: Result<Track>;
  /** Lift phases as thermals; null without a flight profile. */
  thermals: Thermals | null;
  link: Result<LinkAnalysis>;
  signal: Result<SignalAnalysis>;
  batteryUse: Result<BatteryUse>;
  batteryCondition: Result<BatteryCondition>;
  charge: Result<ChargeEstimate>;
  cellBalance: Result<CellBalance>;
  temperatures: Result<Temperatures>;
  receiverPower: Result<ReceiverPower>;
  loads: Result<Loads>;
  issues: DataIssue[];
  moments: Moment[];
  /** Usual values of the flights of the same model (set by `analyseLogs`); null for sessions that are not flights. */
  baseline: Baseline | null;
  /** Compared with the other flights of the same model (set by `analyseLogs`). */
  efficiency: { ratio: number; level: Level | null } | null;
  /** Charge per minute in the air compared with the same model (ratio = usual / this flight). */
  consumption: { ratio: number; level: Level | null } | null;
  sinkComparison: { ratio: number } | null;
}

export interface AnalysisOptions {
  /** Capacity to assume for batteries that do not report one. */
  assumedCapacityMah?: number;
  /** True when a missing smart battery is worth reporting. */
  batteryExpected?: boolean;
}

const val = <T>(r: Result<T>): T | null => (r.available ? r.value : null);

export function analyseSession(session: Session, opts: AnalysisOptions = {}): SessionAnalysis {
  const grid = new Grid(session);
  const kind = classify(session, grid);
  const profile = flightProfile(session, grid);
  const p = val(profile);
  const circ = p ? circling(session, p, grid) : ({ available: false, missing: [] } as Result<Circling>);
  const link = linkQuality(session, p, grid);
  const signal = signalStrength(session, p, grid);
  const ld = loads(session, grid);
  const tr = track(session, grid);
  return {
    session, kind, grid, profile,
    circling: circ,
    track: tr,
    thermals: p && kind === "flight" ? thermals(p, grid, val(circ), val(tr)) : null,
    link, signal,
    batteryUse: batteryUse(session, opts.assumedCapacityMah),
    batteryCondition: batteryCondition(session, grid),
    charge: chargeEstimate(session, p, grid),
    cellBalance: cellBalance(session, grid),
    temperatures: temperatures(session, grid),
    receiverPower: receiverPower(session, val(link), grid),
    loads: ld,
    issues: dataIssues(session, kind, opts.batteryExpected ?? false, altitudeFlat(session, grid)),
    moments: p && kind === "flight" ? moments(p, grid, { circling: val(circ), loads: val(ld), signal: val(signal), link: val(link) }) : [],
    baseline: null,
    efficiency: null,
    consumption: null,
    sinkComparison: null,
  };
}

/** Usual values of one model: medians over its flights in the loaded files. */
export interface Baseline {
  /** Median height per 100 mAh; the reference for "better / worse than usual". */
  efficiency: number | null;
  /** Median glide sink rate. */
  sink: number | null;
  /** Median charge per minute in the air (mAh/min). */
  mahPerMin: number | null;
  /** Number of flights of this model. */
  flights: number;
}

export interface LogsAnalysis {
  sessions: SessionAnalysis[];
  /** Usual values per model, keyed by `modelKey()`. Different models are never compared with each other. */
  baselines: Map<string, Baseline>;
}

/**
 * Analyses all sessions of one or more files. Comparisons ("better than usual") use the
 * other flights of the same model in the same files; no data from other sessions enters a session's own values.
 */
export function analyseLogs(logs: LogFile[], opts: Omit<AnalysisOptions, "batteryExpected"> = {}): LogsAnalysis {
  const all = logs.flatMap((l) => l.sessions);
  const batteryExpected = all.some((s) => s.battery);
  const sessions = all.map((s) => analyseSession(s, { ...opts, batteryExpected }));
  const byModel = new Map<string, SessionAnalysis[]>();
  for (const a of sessions) {
    if (a.kind !== "flight") continue;
    const k = modelKey(a.session.modelName);
    byModel.set(k, [...(byModel.get(k) ?? []), a]);
  }
  const baselines = new Map<string, Baseline>();
  for (const [k, flights] of byModel) {
    const b: Baseline = {
      efficiency: medianOf(flights.map((a) => val(a.profile)?.mPer100mAh ?? null)),
      sink: medianOf(flights.map((a) => val(a.profile)?.glideSinkRate ?? null)),
      mahPerMin: medianOf(flights.map((a) => val(a.profile)?.mahPerMin ?? null)),
      flights: flights.length,
    };
    baselines.set(k, b);
    for (const a of flights) {
      a.baseline = b;
      const p = val(a.profile);
      if (p?.mPer100mAh != null && b.efficiency) {
        const ratio = p.mPer100mAh / b.efficiency;
        a.efficiency = { ratio, level: rate(ratio, THRESHOLDS.efficiencyRatio) };
      }
      if (p?.mahPerMin != null && b.mahPerMin) {
        const ratio = b.mahPerMin / p.mahPerMin;
        a.consumption = { ratio, level: rate(ratio, THRESHOLDS.consumptionRatio) };
      }
      if (p?.glideSinkRate != null && b.sink) a.sinkComparison = { ratio: p.glideSinkRate / b.sink };
      // A flight without motor climbs prices its thermals at the model's usual mAh per metre.
      if (p && p.mPer100mAh == null && b.efficiency && a.thermals?.list.length) {
        a.thermals = thermals(p, a.grid, val(a.circling), val(a.track), b.efficiency);
      }
    }
  }
  return { sessions, baselines };
}

export * from "./thresholds.ts";
export { batteryAgeing, AGEING, type Ageing, type AgeingPoint } from "./ageing.ts";
export type { Thermal, Thermals, ThermalCircle } from "./thermals.ts";
export type { SessionKind, FlightProfile, Circling, Track, LinkAnalysis, SignalAnalysis, BatteryUse, BatteryCondition, ChargeEstimate, CellBalance, Temperatures, ReceiverPower, Loads, DataIssue, Moment, Result };
