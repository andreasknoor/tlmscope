/**
 * All rating thresholds in one place (decision D9 in docs/implementation-plan.md).
 *
 * Every rating has four levels: 4 = best … 1 = worst.
 * `steps` are the limits for levels 4, 3 and 2. Descending steps mean "higher is better".
 */
export type Level = 1 | 2 | 3 | 4;

export interface Scale {
  steps: [number, number, number];
  basis: string;
}

export const THRESHOLDS = {
  /** dBm. Derived from the sample flights: frame losses rise sharply below −80 dBm. */
  signalDbm: { steps: [-70, -80, -85], basis: "Own flights: ≈0.2 frame losses/s at −75…−80 dBm, ≈1/s at −80…−85, ≈4/s below." },
  /** Frame losses in the last 60 s. Any hold while airborne is level 1. */
  frameLossesPerMinute: { steps: [20, 100, Infinity], basis: "Spektrum receiver manuals: up to ~100 per minute in the air is normal." },
  /** Link quality in % (e.g. CRSF/ELRS). Not researched yet; used only by future adapters. */
  linkQualityPct: { steps: [90, 70, 50], basis: "Placeholder until an EdgeTX adapter exists." },
  /** Volts at the receiver. */
  rxVoltage: { steps: [5.2, 4.8, 4.0], basis: "AR8360T manual: stay above 4.8 V under load; DSM receivers drop out below ~3.5 V." },
  /** Percent of capacity used. */
  batteryUsedPct: { steps: [50, 70, 80], basis: "Common 80 % rule (hobby practice)." },
  /** Internal resistance per cell in mΩ, estimated from voltage sag in flight (includes wiring). */
  resistancePerCellMilliOhm: { steps: [10, 12, 15], basis: "LiPo primers: < 10 excellent, 10–12 acceptable, > 15 retire." },
  /** °C. The battery's own max temperature replaces the last step when it reports one. */
  batteryTempC: { steps: [45, 55, 60], basis: "35–45 °C after a flight is normal, 60 °C is the common ceiling." },
  /** °C. No limit published for Avian ESCs. */
  escTempC: { steps: [50, 70, 85], basis: "No manufacturer limit published." },
  /** Largest difference between cells in mV. */
  cellSpreadMv: { steps: [10, 20, 40], basis: "Not researched yet." },
  /** Climb efficiency relative to the pilot's own median. */
  efficiencyRatio: { steps: [1.1, 0.9, 0.7], basis: "Comparison with the other flights in the loaded files." },
} satisfies Record<string, Scale>;

/** Level of a value on a scale. */
export function rate(value: number | null, scale: Scale): Level | null {
  if (value === null || Number.isNaN(value)) return null;
  const [a, b, c] = scale.steps;
  const higherIsBetter = a > c;
  if (higherIsBetter ? value >= a : value <= a) return 4;
  if (higherIsBetter ? value >= b : value <= b) return 3;
  if (higherIsBetter ? value >= c : value <= c) return 2;
  return 1;
}

/** Overall level of a time series of levels: the level held for at least 75 % of the time. */
export const OVERALL_SHARE = 0.75;

export interface Overall {
  level: Level;
  worst: Level;
  /** Share of time at level 2 or worse. */
  weakShare: number;
  /** Share of time per level, index 1…4. */
  shares: Record<Level, number>;
}

export function overall(levels: (Level | null)[]): Overall | null {
  const v = levels.filter((x): x is Level => x !== null).sort((a, b) => a - b);
  if (!v.length) return null;
  const count = (l: Level) => v.filter((x) => x === l).length / v.length;
  return {
    level: v[Math.floor(v.length * (1 - OVERALL_SHARE))],
    worst: v[0],
    weakShare: v.filter((x) => x <= 2).length / v.length,
    shares: { 1: count(1), 2: count(2), 3: count(3), 4: count(4) },
  };
}
