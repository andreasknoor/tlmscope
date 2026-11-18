import type { Entry } from "./store";

export interface FlightTotal {
  flights: number;
  /** Seconds in the air, summed over the flights. */
  seconds: number;
  /** Part of `seconds` that is estimated from motor and movement (no height or GPS data). */
  estimatedSeconds: number;
}

/** Time in the air over the flights among the entries (sessions that are not flights are not counted). */
export function flightTotal(entries: Entry[]): FlightTotal {
  const out: FlightTotal = { flights: 0, seconds: 0, estimatedSeconds: 0 };
  for (const e of entries) {
    if (e.a.kind !== "flight" || !e.a.profile.available) continue;
    const p = e.a.profile.value;
    out.flights++;
    out.seconds += p.airtimeS;
    if (p.basis === "motion") out.estimatedSeconds += p.airtimeS;
  }
  return out;
}
