import { describe, expect, it } from "vitest";
import { Q, type Channel, type Session } from "../model/types.ts";
import { hasSamples, loadSample, MAIN_SAMPLE } from "../test-helpers.ts";
import { cellCount, lipoChargePct } from "./battery.ts";
import type { Circling, FlightProfile } from "./flight.ts";
import type { Grid } from "./grid.ts";
import { thermals } from "./thermals.ts";
import { analyseLogs, analyseSession, overall, rate, THRESHOLDS, type Result, type SessionAnalysis } from "./index.ts";

const value = <T>(r: Result<T>): T => {
  if (!r.available) throw new Error(`not available, missing ${JSON.stringify(r.missing)}`);
  return r.value;
};
const logs = () => analyseLogs([loadSample(MAIN_SAMPLE)]);
const flight = (index: number): SessionAnalysis => logs().sessions.find((a) => a.session.index === index)!;
const FLIGHTS = [3, 15, 29, 31, 32];

describe.skipIf(!hasSamples)("session classification", () => {
  it("finds the five flights, the ground tests and the transmitter-only power-ups", () => {
    const kinds = logs().sessions.map((a) => a.kind);
    expect(logs().sessions.filter((a) => a.kind === "flight").map((a) => a.session.index)).toEqual(FLIGHTS);
    expect(kinds.filter((k) => k === "transmitter-only")).toHaveLength(5);
    // Short motor checks count too: the ESC reports 0 A at low throttle, but rpm shows the motor turned.
    expect(logs().sessions.filter((a) => a.kind === "ground-test").map((a) => a.session.index)).toEqual([2, 4, 5, 6, 7, 12, 13, 14, 20, 27, 28, 33]);
  });
});

describe.skipIf(!hasSamples)("flight profile (same results as the prototype)", () => {
  it("counts motor climbs and finds no lift in the autumn flights", () => {
    // Flights 15 and 32 each have a short motor run on the ground (after landing, before launch): not a climb.
    expect(FLIGHTS.map((i) => value(flight(i).profile).climbs.length)).toEqual([11, 14, 3, 7, 3]);
    for (const i of FLIGHTS) {
      const p = value(flight(i).profile);
      expect(p.climbs.every((c) => c.end >= p.airStart! && c.start <= p.airEnd!)).toBe(true);
    }
    expect(FLIGHTS.map((i) => value(flight(i).profile).lifts.length)).toEqual([0, 0, 0, 0, 0]);
  });

  it("measures airtime from first to last moment above 3 m", () => {
    // Both the first and the last second count, so one more than the difference of the two (it was 381, 723, 258, 326, 148).
    expect(FLIGHTS.map((i) => value(flight(i).profile).airtimeS)).toEqual([382, 724, 259, 327, 149]);
  });

  it("compares climb efficiency with the median of the same model", () => {
    expect(logs().baselines.get("easy glider 4")!.efficiency).toBeCloseTo(49.8, 1);
    // The other four flights give an even count: the median is the mean of the two middle values (46.1 and 49.8), not the upper one.
    expect(flight(15).baseline!.efficiency).toBeCloseTo(47.93, 1);
    expect(flight(15).efficiency!.level).toBe(4); // 62 m per 100 mAh: better than usual
    // 40 m per 100 mAh against the other four flights (not itself). Their median is the mean of the two middle
    // values, 56 m (it was the upper one, 62 m, and the level 1): 40 / 56 = 0.71 is just above the limit of 0.7.
    expect(flight(29).efficiency!.level).toBe(2);
    expect(flight(29).baseline!.flights).toBe(4);
  });

  it("rates loads, signal and frame losses only while airborne", () => {
    for (const i of FLIGHTS) {
      const a = flight(i);
      const p = value(a.profile);
      const ld = value(a.loads);
      // launch throw and touchdown are left out
      expect(ld.maxAt).toBeGreaterThan(p.airStart!);
      expect(ld.maxAt).toBeLessThan(p.airEnd!);
      const s = value(a.signal);
      expect(s.minAt!).toBeGreaterThanOrEqual(p.airStart!);
      expect(s.minAt!).toBeLessThanOrEqual(p.airEnd!);
      const l = value(a.link);
      const total = a.session.channels.get("frame_losses")!.v.at(-1)!;
      expect(l.frameLosses!).toBeLessThanOrEqual(total);
      if (l.worstSecond) expect(l.worstSecond.at).toBeGreaterThanOrEqual(p.airStart!);
    }
  });

  it("splits the flight into phases that cover every second", () => {
    const p = value(flight(15).profile);
    expect(p.phases[0].start).toBe(0);
    expect(p.phases[p.phases.length - 1].end).toBe(p.n - 1);
    for (let k = 1; k < p.phases.length; k++) expect(p.phases[k].start).toBe(p.phases[k - 1].end + 1);
  });

  it("counts full circles from the rotation sensors", () => {
    expect(FLIGHTS.map((i) => value(flight(i).circling).circles)).toEqual([1, 12, 2, 8, 0]);
  });
});

describe.skipIf(!hasSamples)("radio link and signal (D9 thresholds, 75 % rule)", () => {
  it("rates the link from frame losses per minute", () => {
    expect(FLIGHTS.map((i) => value(flight(i).link).overall!.level)).toEqual([4, 3, 4, 3, 4]);
    expect(FLIGHTS.map((i) => value(flight(i).link).holdsAirborne)).toEqual([0, 0, 0, 0, 0]);
  });

  it("rates every flight's signal as normal and reports the weak share", () => {
    expect(FLIGHTS.map((i) => value(flight(i).signal).overall!.level)).toEqual([3, 3, 3, 3, 3]);
    expect(FLIGHTS.map((i) => Math.round(value(flight(i).signal).overall!.weakShare * 100))).toEqual([10, 24, 15, 17, 15]);
  });
});

describe.skipIf(!hasSamples)("battery", () => {
  it("estimates internal resistance per cell and spots the worn pack of 7 Nov", () => {
    const r = FLIGHTS.map((i) => value(flight(i).batteryCondition));
    expect(r.map((x) => +x.resistancePerCellMilliOhm.toFixed(1))).toEqual([5.0, 6.3, 15.3, 14.6, 16.4]);
    expect(r.map((x) => x.level)).toEqual([4, 4, 1, 2, 1]);
  });

  it("uses the reported capacity, and does not guess one", () => {
    expect(value(flight(15).batteryUse)).toMatchObject({ capacityMah: 2200, capacitySource: "battery" });
    expect(Math.round(value(flight(15).batteryUse).usedPct!)).toBe(33);
    expect(value(flight(31).batteryUse)).toMatchObject({ capacityMah: null, capacitySource: null, usedPct: null, level: null });
  });

  it("estimates charge from the resting voltage", () => {
    expect(lipoChargePct(3.84)).toBe(50);
    expect(lipoChargePct(4.25)).toBe(100);
    const c = value(flight(15).charge);
    expect(c.cells).toBe(3);
    expect(Math.round(c.startPct!)).toBe(96);
  });

  it("does not judge cell balance on frozen data", () => {
    expect(flight(29).cellBalance.available).toBe(false);
    expect(Math.round(value(flight(15).cellBalance).maxSpreadMv)).toBe(17);
  });
});

describe.skipIf(!hasSamples)("data check", () => {
  it("reports frozen cells, a silent battery and a battery without cell voltages", () => {
    expect(flight(29).issues.map((i) => i.kind)).toEqual(["frozen"]);
    expect(flight(31).issues.map((i) => i.kind)).toEqual(["battery-not-reporting"]);
    expect(flight(3).issues.map((i) => i.kind)).toEqual(["no-cell-voltages"]);
    expect(flight(15).issues).toEqual([]);
  });
});

describe.skipIf(!hasSamples)("health", () => {
  it("rates temperatures, receiver power and describes the flying style", () => {
    const a = flight(15);
    expect(value(a.temperatures)).toMatchObject({ escMaxC: 35, batteryMaxC: 37, level: 4 });
    expect(value(a.receiverPower).level).toBe(4);
    expect(value(a.loads).style).toBe("sporty");
  });

  it("lists moments to jump to", () => {
    expect(flight(15).moments.map((m) => m.kind)).toEqual(["highest", "longest-circling", "hardest-load", "weakest-signal", "most-frame-losses"]);
  });
});

describe("missing channels", () => {
  const empty = (channels: [string, number[]][]): Session => ({
    index: 0, start: { utcMs: null, zone: "utc" }, durationS: 10, modelName: null, source: { format: "test" }, raw: [], meta: {},
    channels: new Map(channels.map(([id, v]): [string, Channel] => [id, {
      id, unit: "", kind: "numeric", origin: "measured", source: { sensor: "test", field: id },
      t: Float64Array.from(v.map((_, i) => i)), v: Float64Array.from(v), q: new Uint8Array(v.length),
    }])),
  });

  it("says what is missing instead of failing", () => {
    const a = analyseSession(empty([["rx_voltage", [5.9, 5.8]]]));
    expect(a.kind).toBe("powered-on");
    expect(a.profile).toEqual({ available: false, missing: [["throttle_output", "motor_current", "throttle_command"], ["altitude", "ground_speed", "rotation_rate.roll", "rotation_rate.pitch", "rotation_rate.yaw"]] });
    expect(a.link).toEqual({ available: false, missing: [["frame_losses", "link_quality"]] });
    expect(a.signal.available).toBe(false);
    expect(value(a.receiverPower).rxMinV).toBe(5.8);
  });

  it("classifies a session without channels as transmitter-only", () => {
    expect(analyseSession(empty([])).kind).toBe("transmitter-only");
  });

  it("uses link quality when there are no frame-loss counters", () => {
    const a = analyseSession(empty([["link_quality", [100, 95, 60, 40]]]));
    expect(value(a.link).levels.slice(0, 4)).toEqual([4, 4, 2, 1]);
  });
});

describe("thresholds", () => {
  it("rates higher-is-better and lower-is-better scales", () => {
    expect(rate(-60, THRESHOLDS.signalDbm)).toBe(4);
    expect(rate(-82, THRESHOLDS.signalDbm)).toBe(2);
    expect(rate(-90, THRESHOLDS.signalDbm)).toBe(1);
    expect(rate(150, THRESHOLDS.frameLossesPerMinute)).toBe(2);
    expect(rate(11, THRESHOLDS.resistancePerCellMilliOhm)).toBe(3);
  });

  it("takes the level held for 75 % of the time", () => {
    expect(overall([4, 4, 4, 2])!.level).toBe(4);
    expect(overall([4, 4, 2, 2])!.level).toBe(2);
    expect(overall([])).toBeNull();
  });

  it("flags frozen samples with the FROZEN quality bit", () => {
    expect(Q.FROZEN).toBe(4);
  });
});

describe("battery cells without a smart battery", () => {
  const withPack = (volts: number): Session => ({
    index: 0, start: { utcMs: null, zone: "utc" }, durationS: 1, modelName: null, source: { format: "test" }, raw: [], meta: {},
    channels: new Map<string, Channel>([["pack_voltage", { id: "pack_voltage", unit: "V", kind: "numeric", t: new Float64Array([0]), v: new Float64Array([volts]), q: new Uint8Array(1), nominalRateHz: 1, origin: "measured", source: { sensor: "test", field: "test" } }]]),
  } as unknown as Session);

  it("counts cells of LiPo and high-voltage LiPo packs, full or at storage charge", () => {
    expect(cellCount(withPack(12.6))).toBe(3); // 3S full
    expect(cellCount(withPack(13.05))).toBe(3); // 3S LiHV full (read as 4S before)
    expect(cellCount(withPack(11.4))).toBe(3); // 3S storage
    expect(cellCount(withPack(16.8))).toBe(4); // 4S full
    expect(cellCount(withPack(17.4))).toBe(4); // 4S LiHV full
    expect(cellCount(withPack(15.2))).toBe(4); // 4S storage
    expect(cellCount(withPack(25.2))).toBe(6); // 6S full
    expect(cellCount(withPack(26.1))).toBe(6); // 6S LiHV full
  });
});

describe("thermal circles", () => {
  const lift = (turnRate: number[]) => {
    const n = turnRate.length;
    const alt = Array.from({ length: n }, (_, i) => 100 + i * 0.5);
    const profile = { climbs: [], lifts: [{ kind: "lift", start: 0, end: n - 1, gainM: alt[n - 1] - alt[0] }], mPer100mAh: null } as unknown as FlightProfile;
    const grid = { get: () => alt } as unknown as Grid;
    return thermals(profile, grid, { turnRate } as unknown as Circling, null).list[0];
  };

  it("counts full circles in one direction", () => {
    const t = lift(new Array(48).fill(30)); // 30 °/s for 48 s = 4 circles
    expect(t.circles).toHaveLength(4);
    expect(t.direction).toBe(1);
  });

  it("does not count S-turns as circles", () => {
    // left and right 10 s each, 300 ° per side: never a full circle either way
    const s = Array.from({ length: 60 }, (_, i) => (Math.floor(i / 10) % 2 ? -30 : 30));
    expect(lift(s).circles).toHaveLength(0);
  });

  it("restarts the circle after a turn the other way", () => {
    const t = lift([...new Array(8).fill(30), ...new Array(4).fill(-30), ...new Array(12).fill(30)]);
    expect(t.circles).toHaveLength(1);
    expect(t.circles[0].start).toBe(12);
  });
});
