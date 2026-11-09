import { Q, type Session } from "../model/types.ts";
import type { FlightProfile } from "./flight.ts";
import { Grid, maxOf, medianOf, minOf, valid } from "./grid.ts";
import { withNeeds, type Result } from "./requirements.ts";
import { rate, THRESHOLDS, type Level } from "./thresholds.ts";

/** Resting LiPo cell voltage → state of charge (%), from published charts. An estimate. */
const LIPO_REST: [number, number][] = [
  [3.5, 0], [3.68, 10], [3.73, 20], [3.77, 30], [3.8, 40], [3.84, 50], [3.87, 60], [3.92, 70], [3.97, 80], [4.06, 90], [4.2, 100],
];

export function lipoChargePct(cellV: number | null): number | null {
  if (cellV === null) return null;
  if (cellV <= LIPO_REST[0][0]) return 0;
  if (cellV >= 4.2) return 100;
  for (let i = 1; i < LIPO_REST.length; i++) {
    if (cellV <= LIPO_REST[i][0]) {
      const [v0, p0] = LIPO_REST[i - 1];
      const [v1, p1] = LIPO_REST[i];
      return p0 + ((p1 - p0) * (cellV - v0)) / (v1 - v0);
    }
  }
  return null;
}

export interface BatteryUse {
  usedMah: number;
  capacityMah: number | null;
  /** True when the capacity was not reported by the battery but assumed. */
  capacityAssumed: boolean;
  usedPct: number | null;
  level: Level | null;
}

export interface BatteryCondition {
  cells: number;
  /** Estimated from voltage sag under load, includes wiring and connectors. */
  resistancePerCellMilliOhm: number;
  level: Level | null;
  /** Voltage drop at 20 A. */
  dropAt20A: number;
  lowestLoadedV: number | null;
}

export interface ChargeEstimate {
  cells: number;
  startCellV: number | null;
  endCellV: number | null;
  startPct: number | null;
  endPct: number | null;
}

export interface CellBalance {
  maxSpreadMv: number;
  level: Level | null;
}

const hasFrozen = (session: Session, id: string) => {
  const ch = session.channels.get(id);
  return !!ch && ch.q.some((q) => (q & Q.FROZEN) !== 0);
};

/** Number of cells: reported by the battery, else estimated from the highest pack voltage. */
export function cellCount(session: Session, g = new Grid(session)): number | null {
  if (session.battery?.cells) return session.battery.cells;
  const vmax = maxOf(g.get("pack_voltage"));
  return vmax === null ? null : Math.max(1, Math.ceil(vmax / 4.25));
}

export function batteryUse(session: Session, assumedCapacityMah?: number): Result<BatteryUse> {
  return withNeeds(session, ["consumed_mah"], () => {
    const ch = session.channels.get("consumed_mah")!;
    const usedMah = ch.v[ch.v.length - 1];
    const reported = session.battery?.capacityMah ?? null;
    const capacityMah = reported ?? assumedCapacityMah ?? null;
    const usedPct = capacityMah ? (usedMah / capacityMah) * 100 : null;
    return { usedMah, capacityMah, capacityAssumed: reported === null && capacityMah !== null, usedPct, level: rate(usedPct, THRESHOLDS.batteryUsedPct) };
  });
}

/** Internal resistance from the slope of pack voltage over motor current (least squares). */
export function batteryCondition(session: Session, g = new Grid(session)): Result<BatteryCondition> {
  return withNeeds(session, ["pack_voltage", "motor_current"], () => {
    if (hasFrozen(session, "pack_voltage")) return null;
    const amps = g.get("motor_current");
    const volts = g.get("pack_voltage");
    const idx: number[] = [];
    for (let i = 0; i < g.n; i++) if (amps[i] !== null && volts[i] !== null) idx.push(i);
    if (idx.length < 30 || (maxOf(amps) ?? 0) <= 5) return null;
    const mx = idx.reduce((s, i) => s + amps[i]!, 0) / idx.length;
    const my = idx.reduce((s, i) => s + volts[i]!, 0) / idx.length;
    let num = 0, den = 0;
    for (const i of idx) { num += (amps[i]! - mx) * (volts[i]! - my); den += (amps[i]! - mx) ** 2; }
    // Without a spread in current there is no slope; a voltage that rises with load is a data problem, not a battery value.
    if (!(den > 0)) return null;
    const packOhm = -num / den;
    if (!Number.isFinite(packOhm) || packOhm <= 0) return null;
    const cells = cellCount(session, g) ?? 1;
    const perCell = (packOhm * 1000) / cells;
    return { cells, resistancePerCellMilliOhm: perCell, level: rate(perCell, THRESHOLDS.resistancePerCellMilliOhm), dropAt20A: packOhm * 20, lowestLoadedV: minOf(volts) };
  });
}

/** Charge at start and end, from the resting pack voltage. */
export function chargeEstimate(session: Session, profile: FlightProfile | null, g = new Grid(session)): Result<ChargeEstimate> {
  return withNeeds(session, ["pack_voltage"], () => {
    const volts = g.get("pack_voltage");
    const cells = cellCount(session, g);
    if (!cells) return null;
    // Voltage only drops under load, so the early maximum is the resting value.
    const start = maxOf(volts.slice(0, 30));
    const motor = profile?.motor ?? new Array(g.n).fill(false);
    const restIdx: number[] = [];
    for (let i = Math.max(0, g.n - 25); i < g.n; i++) if (!motor[i] && !motor[i - 1] && !motor[i - 2]) restIdx.push(i);
    const end = medianOf(restIdx.map((i) => volts[i]));
    const startCellV = start === null ? null : start / cells;
    const endCellV = end === null ? null : end / cells;
    return { cells, startCellV, endCellV, startPct: lipoChargePct(startCellV), endPct: lipoChargePct(endCellV) };
  });
}

/** Largest voltage difference between cells. Not judged when the cell data is frozen. */
export function cellBalance(session: Session, g = new Grid(session)): Result<CellBalance> {
  const ids = [1, 2, 3, 4, 5, 6].map((k) => `cell_voltage.${k}`).filter((id) => session.channels.has(id));
  return withNeeds(session, ["cell_voltage.1", "cell_voltage.2"], () => {
    if (ids.some((id) => hasFrozen(session, id))) return null;
    const series = ids.map((id) => g.get(id));
    let spread = 0;
    for (let i = 0; i < g.n; i++) {
      const v = valid(series.map((s) => s[i]));
      if (v.length === ids.length) spread = Math.max(spread, Math.max(...v) - Math.min(...v));
    }
    const mv = spread * 1000;
    return { maxSpreadMv: mv, level: rate(mv, THRESHOLDS.cellSpreadMv) };
  });
}
