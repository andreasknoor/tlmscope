import { describe, expect, it } from "vitest";
import { parseLog } from "../adapters/registry.ts";
import { analyseLogs, type Result } from "../analysis/index.ts";
import { DEMO_HOME, demoFlightTlm } from "./demo-flight.ts";

const value = <T>(r: Result<T>): T => {
  if (!r.available) throw new Error("not available");
  return r.value;
};

describe("synthetic demo flight (end-to-end, including GPS)", () => {
  const log = parseLog(demoFlightTlm(), "demo-flight.TLM");
  const a = analyseLogs([log]).sessions[0];

  it("reads one flight with a smart battery", () => {
    expect(log.sessions).toHaveLength(1);
    expect(log.warnings).toEqual([]);
    expect(a.kind).toBe("flight");
    expect(a.session.modelName).toBe("Demo Glider");
    expect(a.session.battery).toMatchObject({ cells: 3, capacityMah: 2200, chargeCycles: 12 });
  });

  it("finds both motor climbs and the thermal", () => {
    const p = value(a.profile);
    expect(p.climbs).toHaveLength(2);
    expect(p.lifts).toHaveLength(1);
    expect(p.lifts[0].gainM).toBeGreaterThan(100);
    expect(value(a.circling).circles).toBeGreaterThanOrEqual(5);
  });

  it("describes the thermal: strength, circles, drift with the wind and what it saved", () => {
    const th = a.thermals!;
    expect(th.list).toHaveLength(1);
    const t = th.list[0];
    expect(t.avgClimb).toBeGreaterThan(1);
    expect(t.avgClimb).toBeLessThan(1.5);
    expect(t.best10s!).toBeGreaterThan(t.avgClimb);
    expect(t.circles.length).toBeGreaterThanOrEqual(6);
    expect(t.secsPerCircle!).toBeGreaterThan(10);
    expect(t.secsPerCircle!).toBeLessThan(18);
    // the simulation's wind blows 1.8 m/s east and 0.6 m/s north
    expect(t.drift!.bearingDeg).toBeGreaterThan(55);
    expect(t.drift!.bearingDeg).toBeLessThan(85);
    expect(t.drift!.speedMs).toBeGreaterThan(1.4);
    expect(t.drift!.speedMs).toBeLessThan(2.4);
    // +117 m at the motor's ~3.4 m/s and ~61 m per 100 mAh
    expect(t.savedMotorS!).toBeGreaterThan(28);
    expect(t.savedMotorS!).toBeLessThan(40);
    expect(t.savedMah!).toBeGreaterThan(170);
    expect(t.savedMah!).toBeLessThan(210);
  });

  it("decodes the GPS track back to the simulated home and distances", () => {
    const tr = value(a.track);
    expect(tr.home.lat).toBeCloseTo(DEMO_HOME.lat, 4);
    expect(tr.home.lon).toBeCloseTo(DEMO_HOME.lon, 4);
    expect(tr.maxDistanceM).toBeGreaterThan(250);
    expect(tr.maxDistanceM).toBeLessThan(420);
    expect(tr.medianSpeed!).toBeGreaterThan(8);
    expect(tr.medianSpeed!).toBeLessThan(15);
  });

  it("rates the healthy demo battery as good and finds no data problems", () => {
    expect(value(a.batteryCondition).level).toBe(4);
    expect(a.issues).toEqual([]);
  });
});
