import { describe, expect, it } from "vitest";
import { batteryAgeing, type AgeingPoint } from "./ageing.ts";
import { resistanceScale } from "./thresholds.ts";

const DAY = 86_400_000;
const series = (n: number, r: (i: number) => number, opts: { stepDays?: number; temp?: (i: number) => number | null; cycles?: boolean } = {}): AgeingPoint[] =>
  Array.from({ length: n }, (_, i) => ({ timeMs: i * (opts.stepDays ?? 4) * DAY, cycles: opts.cycles === false ? null : 20 + i, resistance: r(i), tempC: opts.temp ? opts.temp(i) : 22 }));

describe("battery ageing", () => {
  it("needs at least 5 flights over 2 weeks", () => {
    const a = batteryAgeing(series(4, () => 6));
    expect(a.enough).toBe(false);
    expect(a.missing).toEqual({ points: 4, days: 12 });
    expect(batteryAgeing(series(5, () => 6, { stepDays: 1 })).enough).toBe(false);
  });

  it("forecasts the cycles left until the retire level for a pack that wears", () => {
    const a = batteryAgeing(series(12, (i) => 9 + 0.2 * i));
    expect(a.enough).toBe(true);
    expect(a.current).toBeCloseTo(11.2, 5);
    expect(a.perTenCycles).toBeCloseTo(2, 5);
    expect(a.cyclesToRetire).toBe(44); // 20 mΩ, the rule for 1500 mAh
    expect(a.level).toBe(3);
  });

  it("scales the retire level with the pack's capacity", () => {
    const a = batteryAgeing(series(12, (i) => 9 + 0.2 * i), resistanceScale(2200));
    expect(a.steps).toEqual([6.8, 10.2, 13.6]);
    expect(a.cyclesToRetire).toBe(12);
    expect(a.level).toBe(2);
  });

  it("gives no forecast for a stable pack or one far from the limit", () => {
    expect(batteryAgeing(series(10, () => 6)).cyclesToRetire).toBeNull();
    expect(batteryAgeing(series(10, (i) => 6 + 0.01 * i)).cyclesToRetire).toBeNull();
  });

  it("leaves cold flights out of the trend", () => {
    const a = batteryAgeing(series(10, (i) => (i % 2 ? 12 : 6), { temp: (i) => (i % 2 ? 8 : 22) }));
    expect(a.points.filter((p) => !p.used)).toHaveLength(5);
    expect(a.current).toBeCloseTo(6, 5);
  });

  it("uses flight order without cycle counts and then makes no cycle forecast", () => {
    const a = batteryAgeing(series(8, (i) => 8 + 0.3 * i, { cycles: false }));
    expect(a.enough).toBe(true);
    expect(a.perTenCycles).toBeNull();
    expect(a.cyclesToRetire).toBeNull();
  });
});
