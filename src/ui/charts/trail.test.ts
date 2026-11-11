import { describe, expect, it } from "vitest";
import { trailUpTo } from "./trail";

const line = (secs: number[]) => ({ path: secs.map((s) => [s, 0, 0] as [number, number, number]), colors: secs.map(() => [0, 0, 0] as [number, number, number]), secs });

describe("trail of the replay", () => {
  const lines = [line([0, 1, 2, 3]), line([10, 11, 12])];

  it("keeps the path up to the shown second", () => {
    expect(trailUpTo(lines, 2).map((l) => l.secs)).toEqual([[0, 1, 2]]);
    expect(trailUpTo(lines, 11).map((l) => l.secs)).toEqual([[0, 1, 2, 3], [10, 11]]);
  });

  it("drops stretches with fewer than two points and keeps whole stretches as they are", () => {
    expect(trailUpTo(lines, 0)).toEqual([]);
    expect(trailUpTo(lines, 10)).toEqual([lines[0]]);
    expect(trailUpTo(lines, 99)[1]).toBe(lines[1]);
  });
});
