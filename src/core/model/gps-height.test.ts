import { describe, expect, it } from "vitest";
import { negativeFlagWrong, type GpsAltSample } from "../adapters/spektrum-tlm/index.ts";
import { analyseSession } from "../analysis/index.ts";
import { heightFromGps, normaliseSession } from "./normalise.ts";
import type { Channel, Session } from "./types.ts";

function channel(id: string, v: number[], unit = "m"): Channel {
  return { id, unit, kind: "numeric", origin: "measured", source: { sensor: "test", field: id }, t: Float64Array.from(v.map((_, i) => i)), v: Float64Array.from(v), q: new Uint8Array(v.length) } as Channel;
}

function session(channels: Channel[]): Session {
  return { index: 0, start: { utcMs: null, zone: "utc" }, durationS: channels[0].t.length, modelName: null, source: { format: "test" }, raw: [], meta: {}, channels: new Map(channels.map((c) => [c.id, c])) } as unknown as Session;
}

const run = (n: number, v: number) => new Array<number>(n).fill(v);

/** 100 s standing (GPS settling from 30 to 40 m), 200 s flying at 140 m, 100 s standing at 42 m. */
const gpsAlt = [...run(50, 30), ...run(50, 40), ...run(200, 140), ...run(100, 42)];
const speed = [...run(100, 0), ...run(200, 40), ...run(100, 0)];

describe("height from GPS", () => {
  it("measures from the ground level after landing", () => {
    const h = heightFromGps(session([channel("gps.altitude", gpsAlt), channel("ground_speed", speed, "m/s")]))!;
    expect(h.origin).toBe("derived");
    expect(h.v[150]).toBe(98);
    expect(h.v[350]).toBe(0);
  });

  it("uses the time before take-off once the GPS has settled when there is none after landing", () => {
    const h = heightFromGps(session([channel("gps.altitude", gpsAlt.slice(0, 300)), channel("ground_speed", speed.slice(0, 300), "m/s")]))!;
    expect(h.v[150]).toBe(100);
  });

  it("leaves a height sensor alone and adds no climb rate", () => {
    const s = session([channel("altitude", run(400, 5)), channel("gps.altitude", gpsAlt), channel("ground_speed", speed, "m/s")]);
    normaliseSession(s);
    expect(s.channels.get("altitude")!.origin).toBe("measured");
    const g = session([channel("gps.altitude", gpsAlt), channel("ground_speed", speed, "m/s")]);
    normaliseSession(g);
    expect(g.channels.get("altitude")!.origin).toBe("derived");
    expect(g.channels.has("climb_rate")).toBe(false);
  });

  it("gives the highest point but keeps the GPS speed for the time in the air", () => {
    const s = session([channel("gps.altitude", gpsAlt), channel("ground_speed", speed, "m/s"), channel("throttle_command", speed.map((x) => x * 2), "%")]);
    normaliseSession(s);
    const p = analyseSession(s).profile;
    expect(p.available && p.value.basis).toBe("gps");
    expect(p.available && p.value.heightSource).toBe("gps");
    expect(p.available && p.value.maxAltitudeM).toBe(98);
  });
});

describe("GPS negative-altitude flag", () => {
  const samples = (ground: number, air: number, negative: boolean): GpsAltSample[] => [
    ...run(30, 0).map((_, i) => ({ t: i, size: ground, negative, speed: 0 })),
    ...run(30, 0).map((_, i) => ({ t: 30 + i, size: air, negative, speed: 40 })),
  ];

  it("is wrong when it would put the flight below the ground", () => {
    expect(negativeFlagWrong(samples(48, 103, true))).toBe(true);
  });

  it("is kept when the flight is above the ground", () => {
    // Ground at −25 m, flying at −5 m: a real negative altitude.
    expect(negativeFlagWrong(samples(25, 5, true))).toBe(false);
    expect(negativeFlagWrong(samples(48, 103, false))).toBe(false);
  });
});
