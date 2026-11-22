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
  /** dBm: the margin of the signal, not the link itself (frame losses decide that). Spektrum publishes no dBm limits. */
  signalDbm: { steps: [-70, -80, -85], basis: "Own flights: ≈19 frame losses/min at −75…−80 dBm, ≈68 at −80…−85, ≈200 at −85…−90. Forum rule of thumb: below −85 dBm is poor reception." },
  /** Frame losses in the last 60 s. Any hold while airborne is level 1. */
  frameLossesPerMinute: { steps: [20, 100, Infinity], basis: "Spektrum receiver manuals (e.g. AR8020T, AR10410T): \"In the air it's normal to experience as many as 100 frame losses per minute of flight.\"" },
  /** Link quality in % (e.g. CRSF/ELRS). Not researched yet; used only by future adapters. */
  linkQualityPct: { steps: [90, 70, 50], basis: "Placeholder until an EdgeTX adapter exists." },
  /** Volts at the receiver. */
  rxVoltage: { steps: [5.2, 4.8, 4.0], basis: "Spektrum receiver manuals (AR8360T, AR9020, AR8020T …): stay above 4.8 V with all servos loaded; below 3.5 V the receiver browns out. 5.2 V and 4.0 V are TLMscope's own steps in between, no source." },
  /** Percent of capacity used. */
  batteryUsedPct: { steps: [50, 70, 80], basis: "Common 80 % rule (hobby practice)." },
  /** Internal resistance per cell in mΩ, estimated from voltage sag in flight (includes wiring). */
  /**
   * mΩ per cell, for a pack of `RESISTANCE_REF_MAH`; use `resistanceScale()` for a given pack. No manufacturer limit
   * exists (Spektrum included). Hobby rules of thumb for packs of about 1300–1500 mAh: < 10 excellent, 10–15 fine,
   * 15–20 aged, > 20 retire (e.g. Oscar Liang; Roger's Hobby Center: 12–20 ageing, > 20 retire). Resistance falls with
   * capacity, so the steps are scaled by it. TLMscope's value is estimated from the voltage sag in flight and includes
   * wires and connectors, unlike a charger's reading.
   */
  resistancePerCellMilliOhm: { steps: [10, 15, 20], basis: "Hobby rules of thumb for packs of about 1500 mAh: < 10 excellent, 10–15 fine, 15–20 aged, > 20 retire; scaled by capacity. No manufacturer limit." },
  /** °C. The battery's own max temperature replaces the last step when it reports one. */
  batteryTempC: { steps: [45, 55, 60], basis: "35–45 °C after a flight is normal, 60 °C is the common ceiling." },
  /** °C. No limit published for Avian ESCs. */
  escTempC: { steps: [50, 70, 85], basis: "No manufacturer limit published." },
  /** Largest difference between cells in mV. */
  cellSpreadMv: { steps: [10, 20, 40], basis: "Not researched yet." },
  /** Climb efficiency relative to the pilot's own median. */
  efficiencyRatio: { steps: [1.1, 0.9, 0.7], basis: "Comparison with the other flights of the same model in the loaded files." },
  /** Usual charge per minute in the air divided by this flight's (above 1 = used less than usual). */
  consumptionRatio: { steps: [1.1, 0.9, 0.7], basis: "Comparison with the other flights of the same model in the loaded files." },
} satisfies Record<string, Scale>;

/** The pack size (mAh) the resistance rule of thumb is written for. */
export const RESISTANCE_REF_MAH = 1500;

/**
 * The resistance steps for a pack of the given capacity: resistance falls with capacity (a cell of twice the
 * capacity has about half the resistance), so the steps of `RESISTANCE_REF_MAH` are scaled by REF / capacity,
 * limited to a factor of 0.25…4. Without a capacity the unscaled rule applies. Own logs agree: new 2200 mAh packs
 * read 5–6 mΩ per cell, a worn one 15–16 mΩ, against scaled steps of 6.8 / 10.2 / 13.6.
 */
export function resistanceScale(capacityMah: number | null | undefined): Scale {
  const base = THRESHOLDS.resistancePerCellMilliOhm;
  if (!capacityMah || !(capacityMah > 0)) return base;
  const f = Math.min(4, Math.max(0.25, RESISTANCE_REF_MAH / capacityMah));
  return { steps: base.steps.map((s) => Math.round(s * f * 10) / 10) as [number, number, number], basis: base.basis };
}

/**
 * A signal at or above this (dBm) counts as strong. Frame losses above the "high" level in the seconds with such a
 * signal cannot come from distance: they point to the installation, antenna position or interference.
 */
export const STRONG_SIGNAL_DBM = -75;

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
