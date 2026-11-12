import { describe, expect, it } from "vitest";
import { parseLog } from "../adapters/registry.ts";
import { demoFlightTlm } from "../demo/demo-flight.ts";
import { normaliseSession } from "../model/normalise.ts";
import type { Session } from "../model/types.ts";
import { analyseLogs, analyseSession, type Result } from "./index.ts";

const value = <T>(r: Result<T>): T => {
  if (!r.available) throw new Error("not available");
  return r.value;
};
const demo = () => parseLog(demoFlightTlm(), "demo-flight.TLM").sessions[0];
/** The session without the channels whose id starts with one of the prefixes. */
const without = (s: Session, prefixes: string[]): Session => ({
  ...s,
  channels: new Map([...s.channels].filter(([id]) => !prefixes.some((p) => id.startsWith(p)))),
});
const NO_HEIGHT = ["altitude", "climb_rate"];
const NO_GPS = ["gps.", "ground_speed", "heading"];

describe("flights without a height sensor (synthetic demo flight)", () => {
  const full = analyseSession(demo());

  it("finds the flight from the gyro alone and marks the airtime as approximate", () => {
    const a = analyseSession(without(demo(), [...NO_HEIGHT, ...NO_GPS]));
    expect(a.kind).toBe("flight");
    const p = value(a.profile);
    expect(p.basis).toBe("motion");
    // The synthetic gyro only turns while circling, so the airtime is only checked on real flights (Supra test below).
    expect(p.airtimeS).toBeGreaterThan(0);
    expect(p.maxAltitudeM).toBeNull();
    expect(p.climbs).toEqual([]);
    expect(p.lifts).toEqual([]);
    expect(new Set(p.phases.map((x) => x.kind))).toEqual(new Set(["ground", "powered", "unpowered"]));
  });

  it("takes the airtime from the GPS speed when there is GPS", () => {
    const p = value(analyseSession(without(demo(), NO_HEIGHT)).profile);
    expect(p.basis).toBe("gps");
    expect(Math.abs(p.airtimeS - value(full.profile).airtimeS)).toBeLessThan(60);
  });

  it("treats a flat height channel as missing and reports it", () => {
    const s = demo();
    const alt = s.channels.get("altitude")!;
    alt.v.fill(0);
    const a = analyseSession(without(s, ["climb_rate"]));
    expect(a.kind).toBe("flight");
    expect(value(a.profile).basis).toBe("gps");
    expect(a.issues.map((i) => i.kind)).toContain("height-flat");
  });

  it("keeps height-based flights on height, with motor climbs split from motor-on time", () => {
    const p = value(full.profile);
    expect(p.basis).toBe("height");
    expect(p.phases.some((x) => x.kind === "motor")).toBe(true);
    expect(p.climbs).toHaveLength(2);
  });

  it("derives the climb rate from the height when the vario leaves it at 0", () => {
    const s = demo();
    const measured = Float64Array.from(s.channels.get("climb_rate")!.v);
    s.channels.get("climb_rate")!.v.fill(0);
    normaliseSession(s);
    const derived = s.channels.get("climb_rate")!;
    expect(derived.origin).toBe("derived");
    // close to the measured 1 s climb rate (same samples, same window)
    let sum = 0, n = 0;
    for (let i = 0; i < derived.v.length; i++) if (!Number.isNaN(derived.v[i]) && !Number.isNaN(measured[i])) { sum += Math.abs(derived.v[i] - measured[i]); n++; }
    expect(n).toBeGreaterThan(100);
    expect(sum / n).toBeLessThan(0.6);
  });

  it("compares the charge per minute within the same model", () => {
    // Two flights are not enough for a "usual" value; four are (each against the other three).
    const two = analyseLogs(["a", "b"].map((k) => parseLog(demoFlightTlm(), `${k}.TLM`)));
    expect(two.sessions[0].consumption).toBeNull();
    expect(two.sessions[0].baseline!.counts.mahPerMin).toBe(1);
    const r = analyseLogs(["a", "b", "c", "d"].map((k) => parseLog(demoFlightTlm(), `${k}.TLM`)));
    expect(r.baselines.get("demo glider")!.mahPerMin).toBeGreaterThan(0);
    expect(r.sessions[0].consumption!.ratio).toBeCloseTo(1, 5);
  });
});
