import { rate, THRESHOLDS, type Level } from "./thresholds.ts";

/** One flight of one pack: the resistance estimate and the conditions it was measured in. */
export interface AgeingPoint {
  timeMs: number;
  /** Charge cycles reported by the pack, if any. */
  cycles: number | null;
  /** Internal resistance per cell in mΩ, from the voltage drop under load. */
  resistance: number;
  /** Typical battery temperature during the flight, if the pack reports it. */
  tempC: number | null;
}

export interface Ageing {
  /** All points, in time order; `used` is false for cold flights, which read high. */
  points: (AgeingPoint & { used: boolean })[];
  /** True when there are enough points for a trend. */
  enough: boolean;
  /** Why there is no trend yet. */
  missing: { points: number; days: number } | null;
  /** Fitted resistance now (mΩ per cell). */
  current: number | null;
  /** The fitted line over the trend window, for drawing. */
  fit: { fromMs: number; from: number; toMs: number; to: number } | null;
  /** Change per 10 charge cycles (mΩ). */
  perTenCycles: number | null;
  /** Charge cycles until the retire level at the current rate; null when not rising or too far away. */
  cyclesToRetire: number | null;
  level: Level | null;
}

export const AGEING = {
  /** Points needed for a trend. */
  minPoints: 5,
  /** Days the points must span. */
  minDays: 14,
  /** The trend uses the latest points only, so it follows recent wear. */
  window: 10,
  /** Below this battery temperature the estimate reads high and is left out of the trend. */
  minTempC: 15,
  /** Forecasts further out than this are not shown. */
  horizonCycles: 150,
} as const;

const DAY = 86_400_000;

/**
 * Resistance trend of one battery pack over its flights.
 * The x axis is the pack's charge-cycle count when every point has one, otherwise the flight order.
 */
export function batteryAgeing(input: AgeingPoint[]): Ageing {
  const points = [...input].sort((a, b) => a.timeMs - b.timeMs).map((p) => ({ ...p, used: p.tempC === null || p.tempC >= AGEING.minTempC }));
  const usable = points.filter((p) => p.used);
  const recent = usable.slice(-AGEING.window);
  const days = recent.length ? (recent[recent.length - 1].timeMs - recent[0].timeMs) / DAY : 0;
  const empty = { points, current: null, fit: null, perTenCycles: null, cyclesToRetire: null, level: null };
  if (recent.length < AGEING.minPoints || days < AGEING.minDays) {
    return { ...empty, enough: false, missing: { points: usable.length, days: Math.floor(days) } };
  }
  const byCycles = recent.every((p) => p.cycles !== null) && new Set(recent.map((p) => p.cycles)).size >= 3;
  const xs = recent.map((p, i) => (byCycles ? p.cycles! : i));
  const ys = recent.map((p) => p.resistance);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  const slope = den ? num / den : 0;
  const current = my + slope * (xs[xs.length - 1] - mx);
  const retire = THRESHOLDS.resistancePerCellMilliOhm.steps[2];
  let cyclesToRetire: number | null = null;
  if (byCycles && current >= retire) cyclesToRetire = 0;
  else if (byCycles && slope > 0) {
    const n = Math.round((retire - current) / slope);
    cyclesToRetire = n <= AGEING.horizonCycles ? n : null;
  }
  return {
    points, enough: true, missing: null, current,
    fit: { fromMs: recent[0].timeMs, from: my + slope * (xs[0] - mx), toMs: recent[recent.length - 1].timeMs, to: current },
    perTenCycles: byCycles ? slope * 10 : null,
    cyclesToRetire,
    level: rate(current, THRESHOLDS.resistancePerCellMilliOhm),
  };
}
