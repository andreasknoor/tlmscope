import { describe, expect, it } from "vitest";
import type { Channel } from "../model/types.ts";
import { steadyMinV } from "./health.ts";

/** Receiver voltage readings 8 times a second; a run is [start s, end s, volts]. Single readings override the value. */
function volts(runs: [number, number, number][], single: Record<string, number> = {}): Channel {
  const t: number[] = [], v: number[] = [];
  for (const [a, b, x] of runs) for (let s = a; s <= b + 1e-9; s += 0.125) { t.push(Math.round(s * 1000) / 1000); v.push(single[String(Math.round(s * 1000) / 1000)] ?? x); }
  return { id: "rx_voltage", unit: "V", kind: "numeric", origin: "measured", source: { sensor: "test", field: "test" }, t: Float64Array.from(t), v: Float64Array.from(v), q: new Uint8Array(t.length) };
}

describe("receiver voltage without switching off and on", () => {
  it("leaves out the collapse when the battery is unplugged after the flight", () => {
    expect(steadyMinV(volts([[0, 100, 5.4]], { "100": 2.3 }), [20, 80])).toBe(5.4);
  });

  it("leaves out a low first reading after power-up", () => {
    expect(steadyMinV(volts([[10, 100, 5.4]], { "10": 2.27 }), [20, 80])).toBe(5.4);
  });

  it("leaves out a battery change between two flights of one session", () => {
    expect(steadyMinV(volts([[0, 50, 6], [70, 120, 6]], { "50": 2.5 }), [10, 110])).toBe(6);
  });

  it("keeps a sag while the receiver keeps running", () => {
    expect(steadyMinV(volts([[0, 100, 5.4]], { "40": 4.1 }), [20, 80])).toBe(4.1);
  });

  it("keeps the last reading when the data ends in the air", () => {
    expect(steadyMinV(volts([[0, 60, 5.4]], { "60": 3.2 }), [20, 80])).toBe(3.2);
  });

  it("keeps a low reading before a short restart in the air (brown-out)", () => {
    expect(steadyMinV(volts([[0, 40, 5.4], [42, 100, 5.4]], { "40": 3.5 }), [20, 80])).toBe(3.5);
  });
});
