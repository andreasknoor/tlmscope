import { describe, expect, it } from "vitest";
import { normaliseSession } from "../model/normalise.ts";
import type { Channel, Session } from "../model/types.ts";
import { analyseSession } from "./index.ts";

function channel(id: string, v: number[], unit = ""): Channel {
  return { id, unit, kind: "numeric", origin: "measured", source: { sensor: "test", field: id }, t: Float64Array.from(v.map((_, i) => i)), v: Float64Array.from(v), q: new Uint8Array(v.length) } as Channel;
}

function session(channels: Channel[]): Session {
  const s = { index: 0, start: { utcMs: null, zone: "utc" }, durationS: channels[0].t.length, modelName: null, source: { format: "test" }, raw: [], meta: {}, channels: new Map(channels.map((c) => [c.id, c])) } as unknown as Session;
  normaliseSession(s);
  return s;
}

const run = (n: number, v: number) => new Array<number>(n).fill(v);
/** 60 s on the ground, 300 s flying, 60 s on the ground; one hold at 200 s; steady receiver voltage. */
const flying = [...run(60, 0), ...run(300, 1), ...run(60, 0)];
const holds = [...run(200, 0), ...run(220, 1)];
const base = [channel("frame_losses", run(420, 5)), channel("holds", holds), channel("rx_voltage", run(420, 7.3), "V"), channel("throttle_command", flying.map((x) => x * 80), "%")];

describe("a hold in the air", () => {
  it("rates the radio link critical, not the receiver power", () => {
    const a = analyseSession(session([...base, channel("ground_speed", flying.map((x) => x * 35), "m/s")]));
    const link = a.link.available ? a.link.value : null;
    expect(link?.holdsAirborne).toBe(1);
    expect(link?.overall?.level).toBe(1);
    expect(link?.levels[200]).toBe(1);
    expect(link?.holdBasis).toBe("gps");
    expect(a.receiverPower.available && a.receiverPower.value.level).toBe(4);
  });

  it("says when the flight time is only estimated from motor and movement", () => {
    const a = analyseSession(session([...base, channel("rotation_rate.roll", flying.map((x, i) => x * (i % 2 ? 40 : -40)), "°/s")]));
    const link = a.link.available ? a.link.value : null;
    expect(link?.holdBasis).toBe("motion");
    expect(link?.holdsAirborne).toBe(1);
  });
});
