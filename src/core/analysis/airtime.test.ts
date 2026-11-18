import { describe, expect, it } from "vitest";
import { normaliseSession } from "../model/normalise.ts";
import type { Channel, Session } from "../model/types.ts";
import { analyseSession } from "./index.ts";

function channel(id: string, v: number[], unit = ""): Channel {
  return { id, unit, kind: "numeric", origin: "measured", source: { sensor: "test", field: id }, t: Float64Array.from(v.map((_, i) => i)), v: Float64Array.from(v), q: new Uint8Array(v.length) } as Channel;
}

/** Height in metres: a run of seconds in the air (a gentle wave around 40 m) or on the ground. */
const air = (n: number) => Array.from({ length: n }, (_, i) => 40 + 10 * Math.sin(i / 10));
const ground = (n: number) => new Array<number>(n).fill(0);

function airtime(height: number[]): number {
  const s = { index: 0, start: { utcMs: null, zone: "utc" }, durationS: height.length, modelName: null, source: { format: "test" }, raw: [], meta: {},
    channels: new Map([channel("altitude", height, "m"), channel("throttle_command", new Array(height.length).fill(0), "%")].map((c) => [c.id, c])) } as unknown as Session;
  normaliseSession(s);
  const p = analyseSession(s).profile;
  return p.available ? p.value.airtimeS : -1;
}

describe("time in the air with several flights in one session", () => {
  it("leaves out a long pause on the ground between two flights", () => {
    expect(airtime([...ground(60), ...air(200), ...ground(200), ...air(200), ...ground(60)])).toBe(400);
  });

  it("counts a short stop as flying", () => {
    expect(airtime([...ground(60), ...air(200), ...ground(60), ...air(200), ...ground(60)])).toBe(460);
  });

  it("is the whole stretch for one flight", () => {
    expect(airtime([...ground(60), ...air(300), ...ground(60)])).toBe(300);
  });
});
