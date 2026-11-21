import { describe, expect, it } from "vitest";
import { parseLog } from "../adapters/registry.ts";
import { analyseLogs, batteryUse, withCapacities, type Result } from "../analysis/index.ts";
import { DEMO_3D_GAINS, DEMO_3D_HOLD_AT_S, DEMO_3D_MODEL } from "./demo-3d.ts";
import { demoFileTlm } from "./demo-file.ts";
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

  describe("battery capacity", () => {
    const noReport = { ...a.session, battery: undefined };

    it("prefers the capacity the battery reports over the user's", () => {
      expect(value(batteryUse(a.session, 5000))).toMatchObject({ capacityMah: 2200, capacitySource: "battery" });
    });

    it("rates nothing without a capacity, and uses the user's when given", () => {
      const none = value(batteryUse(noReport));
      expect(none).toMatchObject({ capacityMah: null, capacitySource: null, usedPct: null, level: null });
      expect(none.usedMah).toBeGreaterThan(0);
      const user = value(batteryUse(noReport, 4000));
      expect(user).toMatchObject({ capacityMah: 4000, capacitySource: "user" });
      expect(user.usedPct).toBeCloseTo((none.usedMah / 4000) * 100, 6);
      expect(user.level).not.toBeNull();
    });

    it("applies user capacities without analysing again", () => {
      const logs = analyseLogs([{ ...log, sessions: [noReport] }]);
      const rated = withCapacities(logs, () => 3000);
      expect(value(rated.sessions[0].batteryUse).capacitySource).toBe("user");
      expect(rated.sessions[0].grid).toBe(logs.sessions[0].grid);
      expect(value(logs.sessions[0].batteryUse).capacitySource).toBeNull();
    });
  });
});

describe("demo file: glider, then the 3D model's bench run and flight", () => {
  const log = parseLog(demoFileTlm(), "demo-flight.TLM");
  const [glider, bench, flight] = analyseLogs([log]).sessions;

  it("holds three sessions of two models, an hour apart", () => {
    expect(log.warnings).toEqual([]);
    expect(log.sessions.map((s) => s.modelName)).toEqual(["Demo Glider", DEMO_3D_MODEL, DEMO_3D_MODEL]);
    expect([glider.kind, bench.kind, flight.kind]).toEqual(["flight", "ground-test", "flight"]);
    expect((flight.session.start.utcMs! - glider.session.start.utcMs!) / 60_000).toBeCloseTo(60, 0);
  });

  it("keeps the glider as it was", () => {
    const alone = analyseLogs([parseLog(demoFlightTlm(), "demo-flight.TLM")]).sessions[0];
    expect(value(glider.profile).airtimeS).toBe(value(alone.profile).airtimeS);
    expect(value(glider.link).frameLosses).toBe(value(alone.link).frameLosses);
  });

  it("flies the 3D model with height from GPS only, hard, on a second battery", () => {
    const p = value(flight.profile);
    expect(p.basis).toBe("gps");
    expect(p.heightSource).toBe("gps");
    expect(p.maxAltitudeM!).toBeGreaterThan(40);
    expect(p.airtimeS).toBeGreaterThan(290);
    expect(p.airtimeS).toBeLessThan(350);
    expect(value(flight.loads).style).toBe("hard");
    expect(flight.session.battery).toMatchObject({ cells: 4, capacityMah: 2200, chargeCycles: 38 });
    expect(flight.session.battery!.id).not.toBe(glider.session.battery!.id);
    const used = value(flight.batteryUse).usedPct!;
    expect(used).toBeGreaterThan(55);
    expect(used).toBeLessThan(70);
  });

  it("uses all three flight modes with their functions and the gain from the knob", () => {
    const uses = flight.stabilization.uses;
    expect(uses.map((u) => u.bits).sort()).toEqual([1, 3, 5]);
    for (const u of uses) expect(u.gain).toEqual([...DEMO_3D_GAINS]);
  });

  it("has one weak stretch on the far pass, with one hold in it", () => {
    const l = value(flight.link), s = value(flight.signal);
    expect(l.holdsAirborne).toBe(1);
    expect(l.overall!.level).toBe(1);
    expect(l.worstSecond!.at).toBeGreaterThanOrEqual(DEMO_3D_HOLD_AT_S);
    expect(l.worstSecond!.at).toBeLessThan(DEMO_3D_HOLD_AT_S + 2);
    expect(s.minDbm!).toBeLessThan(-85);
    expect(s.minAt!).toBeGreaterThan(110);
    expect(s.minAt!).toBeLessThan(140);
  });

  it("has a badly placed remote receiver B that fades far more than A", () => {
    const l = value(flight.link);
    expect(l.fades.b!).toBeGreaterThan(2 * l.fades.a!);
    expect(l.moveRemote).toEqual(["b"]);
  });

  it("runs the motor on the bench without flying", () => {
    expect(value(bench.profile).motorSecs).toBeGreaterThan(5);
    expect(bench.session.battery!.id).toBe(flight.session.battery!.id);
  });
});
