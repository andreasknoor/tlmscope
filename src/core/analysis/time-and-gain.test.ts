import { describe, expect, it } from "vitest";
import { parseLog } from "../adapters/registry.ts";
import { demoFlightTlm } from "../demo/demo-flight.ts";
import type { Session } from "../model/types.ts";
import { medianOf } from "./grid.ts";
import { analyseSession, type Result } from "./index.ts";

const value = <T>(r: Result<T>): T => {
  if (!r.available) throw new Error("not available");
  return r.value;
};
const demo = (): Session => parseLog(demoFlightTlm(), "demo-flight.TLM").sessions[0];

describe("median", () => {
  it("is the middle value for an odd count and the mean of the two middle values for an even count", () => {
    expect(medianOf([3, 1, 2])).toBe(2);
    expect(medianOf([4, 1, 3, 2])).toBe(2.5);
    expect(medianOf([46.1, 39.6, 49.8, 68])).toBeCloseTo(47.95, 6);
    expect(medianOf([5, 5])).toBe(5);
  });
  it("ignores missing values and gives null without any", () => {
    expect(medianOf([null, 4, null, 2])).toBe(3);
    expect(medianOf([null, null])).toBeNull();
    expect(medianOf([])).toBeNull();
  });
});

describe("airtime", () => {
  it("counts the first and the last second", () => {
    const p = value(analyseSession(demo()).profile);
    expect(p.airtimeS).toBe(p.airEnd! - p.airStart! + 1);
  });
});

describe("height gain of a climb", () => {
  it("starts from the first known height when the first second is missing, not from 0 m", () => {
    const full = value(analyseSession(demo()).profile);
    const c = full.climbs[1];
    const alt = demo().channels.get("altitude")!;
    const s = demo();
    const ch = s.channels.get("altitude")!;
    // The climb starts high in the air: a start from 0 m would add that height to the gain.
    const startHeight = alt.v[alt.t.findIndex((t) => Math.floor(t) === c.start)];
    expect(startHeight).toBeGreaterThan(20);
    for (let i = 0; i < ch.t.length; i++) if (Math.floor(ch.t[i]) === c.start) ch.v[i] = NaN;
    const gap = value(analyseSession(s).profile).climbs[1];
    expect(gap.start).toBe(c.start);
    expect(Math.abs(gap.gainM - c.gainM)).toBeLessThan(5);
    expect(gap.gainM).toBeLessThan(startHeight + c.gainM - 10);
  });
});
