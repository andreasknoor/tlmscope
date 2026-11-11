import { describe, expect, it } from "vitest";
import { yRange } from "./LineChart";

describe("chart y range", () => {
  it("keeps the given range when the data fits", () => {
    expect(yRange(-90, -40, -100, -30)).toEqual([-100, -30]);
    expect(yRange(0, 100, undefined, 100)).toEqual([0, 100]);
  });

  it("widens instead of cutting off data beyond the given range", () => {
    const [lo, hi] = yRange(-90, -22, -100, -30);
    expect(lo).toBe(-100);
    expect(hi).toBeGreaterThan(-22);
    const [vlo] = yRange(3.05, 4.2, 3.3, 4.3);
    expect(vlo).toBeLessThan(3.05);
  });

  it("works without data and without limits", () => {
    expect(yRange(null, null, -100, -30)).toEqual([-100, -30]);
    expect(yRange(10, 110)).toEqual([0, 116]);
  });
});
