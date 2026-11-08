import type { LogFile, Session } from "../model/types.ts";
import { batteryCondition, batteryUse, cellBalance, chargeEstimate, type BatteryCondition, type BatteryUse, type CellBalance, type ChargeEstimate } from "./battery.ts";
import { circling, classify, flightProfile, type Circling, type FlightProfile, type SessionKind } from "./flight.ts";
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
  /** Compared with the pilot's other flights (set by `analyseLogs`). */
  efficiency: { ratio: number; level: Level | null } | null;
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
  return {
    session, kind, grid, profile,
    circling: circ,
    link, signal,
    batteryUse: batteryUse(session, opts.assumedCapacityMah),
    batteryCondition: batteryCondition(session, grid),
    charge: chargeEstimate(session, p, grid),
    cellBalance: cellBalance(session, grid),
    temperatures: temperatures(session, grid),
    receiverPower: receiverPower(session, val(link), grid),
    loads: ld,
    issues: dataIssues(session, kind, opts.batteryExpected ?? false),
    moments: p && kind === "flight" ? moments(p, grid, { circling: val(circ), loads: val(ld), signal: val(signal), link: val(link) }) : [],
    efficiency: null,
    sinkComparison: null,
  };
}

export interface LogsAnalysis {
  sessions: SessionAnalysis[];
  /** Median height per 100 mAh over all flights; the reference for "better / worse than usual". */
  efficiencyBaseline: number | null;
  /** Median glide sink rate over all flights. */
  sinkBaseline: number | null;
}

/**
 * Analyses all sessions of one or more files. Comparisons ("better than usual") use the
 * other flights in the same files; no data from other sessions enters a session's own values.
 */
export function analyseLogs(logs: LogFile[], opts: Omit<AnalysisOptions, "batteryExpected"> = {}): LogsAnalysis {
  const all = logs.flatMap((l) => l.sessions);
  const batteryExpected = all.some((s) => s.battery);
  const sessions = all.map((s) => analyseSession(s, { ...opts, batteryExpected }));
  const flights = sessions.filter((a) => a.kind === "flight");
  const efficiencyBaseline = medianOf(flights.map((a) => val(a.profile)?.mPer100mAh ?? null));
  const sinkBaseline = medianOf(flights.map((a) => val(a.profile)?.glideSinkRate ?? null));
  for (const a of flights) {
    const p = val(a.profile);
    if (p?.mPer100mAh != null && efficiencyBaseline) {
      const ratio = p.mPer100mAh / efficiencyBaseline;
      a.efficiency = { ratio, level: rate(ratio, THRESHOLDS.efficiencyRatio) };
    }
    if (p?.glideSinkRate != null && sinkBaseline) a.sinkComparison = { ratio: p.glideSinkRate / sinkBaseline };
  }
  return { sessions, efficiencyBaseline, sinkBaseline };
}

export * from "./thresholds.ts";
export type { SessionKind, FlightProfile, Circling, LinkAnalysis, SignalAnalysis, BatteryUse, BatteryCondition, ChargeEstimate, CellBalance, Temperatures, ReceiverPower, Loads, DataIssue, Moment, Result };
