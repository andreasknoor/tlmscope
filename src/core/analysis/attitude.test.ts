import { describe, expect, it } from "vitest";
import { attitudeFromPath } from "./attitude.ts";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("attitude from the path", () => {
  it("gives the course, no bank on a straight line, and the climb angle", () => {
    // 20 m/s towards the east, climbing 2 m/s.
    const a = attitudeFromPath(range(20).map((i) => i * 20), range(20).map(() => 0), range(20).map((i) => i * 2));
    expect(a.heading[10]).toBeCloseTo(90, 5);
    expect(a.bank[10]).toBeCloseTo(0, 5);
    expect(a.climb[10]).toBeCloseTo((Math.atan2(2, 20) * 180) / Math.PI, 5);
  });

  it("banks right in a clockwise circle and left in an anticlockwise one", () => {
    // Radius 50 m at 15 m/s: tan(bank) = v² / (r g) ≈ 0.46, about 25°.
    const r = 50, w = 15 / r;
    const cw = attitudeFromPath(range(40).map((t) => r * Math.sin(w * t)), range(40).map((t) => r * Math.cos(w * t)), range(40).map(() => 100));
    const ccw = attitudeFromPath(range(40).map((t) => -r * Math.sin(w * t)), range(40).map((t) => r * Math.cos(w * t)), range(40).map(() => 100));
    expect(cw.bank[20]).toBeGreaterThan(20);
    expect(cw.bank[20]).toBeLessThan(28);
    expect(ccw.bank[20]).toBeCloseTo(-cw.bank[20], 5);
  });

  it("keeps the last course through gaps and while standing", () => {
    const east = [0, 10, 20, 30, null, null, 60, 60, 60, 60, 60];
    const a = attitudeFromPath(east, east.map((e) => (e === null ? null : 0)), east.map(() => null));
    expect(a.heading.every((h) => Math.abs(h - 90) < 1e-9)).toBe(true);
    expect(a.climb.every((c) => c === 0)).toBe(true);
  });
});
