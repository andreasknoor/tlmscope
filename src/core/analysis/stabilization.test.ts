import { describe, expect, it } from "vitest";
import type { Channel, Session } from "../model/types.ts";
import type { FlightProfile } from "./flight.ts";
import { Grid } from "./grid.ts";
import { stabilization } from "./stabilization.ts";

/** One categorical channel with a value per second; null = no sample in that second. */
function channel(id: string, perSecond: (number | null)[]): Channel {
  const t: number[] = [], v: number[] = [];
  perSecond.forEach((x, k) => { if (x !== null) { t.push(k + 0.5); v.push(x); } });
  return { id, unit: "", kind: "categorical", origin: "measured", source: { sensor: "test", field: "test" }, t: Float64Array.from(t), v: Float64Array.from(v), q: new Uint8Array(t.length) };
}

function session(fm: (number | null)[], st?: (number | null)[], gain?: [(number | null)[], (number | null)[], (number | null)[]]): Session {
  const channels = new Map<string, Channel>([["flight_mode", channel("flight_mode", fm)]]);
  if (st) channels.set("stabilization", channel("stabilization", st));
  if (gain) ["roll", "pitch", "yaw"].forEach((a, k) => channels.set(`as3x_gain.${a}`, channel(`as3x_gain.${a}`, gain[k])));
  return { index: 0, start: { utcMs: null, zone: "utc" }, durationS: fm.length, modelName: null, source: { format: "test" }, channels, raw: [], meta: {} } as unknown as Session;
}

const run = <T>(n: number, v: T): T[] => new Array(n).fill(v);
const air = (airStart: number, airEnd: number) => ({ airStart, airEnd }) as FlightProfile;

describe("stabilization time", () => {
  it("groups modes with the same functions and counts only the time in the air", () => {
    // 10 s on the ground in mode 1, then 60 s mode 1, 30 s mode 2 (both AS3X + heading hold), 20 s mode 3 (SAFE)
    const fm = [...run(70, 0), ...run(30, 1), ...run(20, 2)];
    const st = [...run(100, 5), ...run(20, 3)];
    const r = stabilization(new Grid(session(fm, st)), air(10, 119));
    expect(r.inAir).toBe(true);
    expect(r.uses).toEqual([
      { bits: 5, modes: [0, 1], seconds: 90, gain: null },
      { bits: 3, modes: [2], seconds: 20, gain: null },
    ]);
  });

  it("lists no stabilization like any other function", () => {
    const r = stabilization(new Grid(session(run(50, 0), run(50, 0))), null);
    expect(r.inAir).toBe(false);
    expect(r.uses).toEqual([{ bits: 0, modes: [0], seconds: 50, gain: null }]);
  });

  it("leaves out a mode passed for a moment while flicking the switch", () => {
    const fm = [...run(30, 0), 1, ...run(40, 2)];
    const r = stabilization(new Grid(session(fm, [...run(31, 5), ...run(40, 3)])), null);
    expect(r.uses.map((u) => u.modes)).toEqual([[2], [0]]);
  });

  it("bridges short gaps but not long ones", () => {
    const fm = [...run(20, 0), ...run(3, null), ...run(20, 0), ...run(30, null), ...run(10, 0)];
    const r = stabilization(new Grid(session(fm, fm.map((x) => (x === null ? null : 1)))), null);
    expect(r.uses[0].seconds).toBe(53);
  });

  it("gives the typical AS3X gain of each use, none without AS3X", () => {
    // Mode 1 (AS3X) 40 s at gain 12/15/18 with the knob turned to 40/50/60 for 5 s; mode 2 (off) 20 s.
    const fm = [...run(40, 0), ...run(20, 1)];
    const gain = (r: number, hi: number) => [...run(35, r), ...run(5, hi), ...run(20, 0)];
    const res = stabilization(new Grid(session(fm, [...run(40, 1), ...run(20, 0)], [gain(12, 40), gain(15, 50), gain(18, 60)])), null);
    expect(res.uses).toEqual([
      { bits: 1, modes: [0], seconds: 40, gain: [12, 15, 18] },
      { bits: 0, modes: [1], seconds: 20, gain: null },
    ]);
  });

  it("says when the receiver reports no flight mode", () => {
    const s = session([0]);
    s.channels.clear();
    expect(stabilization(new Grid(s), null)).toEqual({ reported: false, inAir: false, uses: [] });
  });
});
