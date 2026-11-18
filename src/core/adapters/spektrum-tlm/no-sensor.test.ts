import { describe, expect, it } from "vitest";
import { noSensor } from "./index.ts";

const v = (...x: number[]) => ({ v: Float64Array.from(x) });

describe("battery temperature without a sensor", () => {
  it("is a constant zero over the whole session", () => {
    expect(noSensor(v(...new Array(50).fill(0)))).toBe(true);
    expect(noSensor(v(...new Array(50).fill(0), NaN, NaN))).toBe(true);
  });

  it("is real as soon as one reading differs, including a cold 0 at the start", () => {
    expect(noSensor(v(0, 0, 0, 1, ...new Array(50).fill(0)))).toBe(false);
    expect(noSensor(v(...new Array(50).fill(21)))).toBe(false);
  });

  it("needs enough readings, and a missing channel is not one", () => {
    expect(noSensor(v(0, 0, 0))).toBe(false);
    expect(noSensor(undefined)).toBe(false);
  });
});
