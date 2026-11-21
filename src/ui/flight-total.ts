import type { Entry } from "./store";

export interface FlightTotal {
  flights: number;
  /** Seconds in the air, summed over the flights. */
  seconds: number;
  /** Part of `seconds` that is estimated from motor and movement (no height or GPS data). */
  estimatedSeconds: number;
}

export interface SimulatorTotal {
  sessions: number;
  /** Seconds with the sticks moved; sessions without stick positions count with their connected time. */
  activeSeconds: number;
  /** Seconds connected to the simulator. */
  connectedSeconds: number;
}

/**
 * The entries without repeats: a transmitter keeps adding to one log per model, so two copies of
 * that log taken at different times hold the same sessions. A session with the same start and
 * length as one before it is the same session and is left out.
 */
export function uniqueSessions(entries: Entry[]): Entry[] {
  const seen = new Set<string>();
  return entries.filter((e) => {
    if (e.startMs === null) return true;
    const key = `${e.startMs}|${e.a.session.durationS.toFixed(1)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Time in the air over the flights among the entries (sessions that are not flights are not counted). */
export function flightTotal(entries: Entry[]): FlightTotal {
  const out: FlightTotal = { flights: 0, seconds: 0, estimatedSeconds: 0 };
  for (const e of uniqueSessions(entries)) {
    if (e.a.kind !== "flight" || !e.a.profile.available) continue;
    const p = e.a.profile.value;
    out.flights++;
    out.seconds += p.airtimeS;
    if (p.basis === "motion") out.estimatedSeconds += p.airtimeS;
  }
  return out;
}

/** Time in the simulator, kept apart from the time in the air. */
export function simulatorTotal(entries: Entry[]): SimulatorTotal {
  const out: SimulatorTotal = { sessions: 0, activeSeconds: 0, connectedSeconds: 0 };
  for (const e of uniqueSessions(entries)) {
    const s = e.a.simulator;
    if (e.a.kind !== "simulator" || !s) continue;
    out.sessions++;
    out.activeSeconds += s.activeS ?? s.connectedS;
    out.connectedSeconds += s.connectedS;
  }
  return out;
}
