import { describe, expect, it } from "vitest";
import { normaliseSession } from "../model/normalise.ts";
import type { Channel, Session } from "../model/types.ts";
import { analyseSession } from "./index.ts";
import { STRONG_SIGNAL_DBM } from "./thresholds.ts";

function channel(id: string, v: number[], unit = ""): Channel {
  return { id, unit, kind: "numeric", origin: "measured", source: { sensor: "test", field: id }, t: Float64Array.from(v.map((_, i) => i)), v: Float64Array.from(v), q: new Uint8Array(v.length) } as Channel;
}

function session(channels: Channel[]): Session {
  const s = { index: 0, start: { utcMs: null, zone: "utc" }, durationS: channels[0].t.length, modelName: null, source: { format: "test" }, raw: [], meta: {}, channels: new Map(channels.map((c) => [c.id, c])) } as unknown as Session;
  normaliseSession(s);
  return s;
}

const run = (n: number, v: number) => new Array<number>(n).fill(v);
/** 60 s on the ground, 300 s flying, 60 s on the ground. */
const flying = [...run(60, 0), ...run(300, 1), ...run(60, 0)];
/** A frame-loss counter that rises by `perSecond(i)` in second i. */
const counter = (perSecond: (i: number) => number) => { let c = 0; return flying.map((_, i) => (c += perSecond(i))); };

function flight(dbm: number[], losses: number[]) {
  const a = analyseSession(session([
    channel("frame_losses", losses), channel("holds", run(420, 0)), channel("signal_dbm", dbm, "dBm"),
    channel("throttle_command", flying.map((x) => x * 80), "%"), channel("ground_speed", flying.map((x) => x * 30), "m/s"),
  ]));
  return a.link.available ? a.link.value : null;
}

describe("frame losses at a strong signal", () => {
  // First half of the flight strong (−65 dBm), second half weak (−88 dBm).
  const dbm = flying.map((_, i) => (i < 210 ? -65 : -88));

  it("are counted only in the seconds with a strong signal", () => {
    // Losses only in the weak half: distance, not the installation.
    const weakOnly = flight(dbm, counter((i) => (i >= 210 && i < 360 ? 3 : 0)));
    expect(weakOnly?.frameLossesPerMinute).toBeGreaterThan(20);
    expect(weakOnly?.strongSignal?.perMinute).toBe(0);
    // Losses in the strong half as well: something else than distance.
    const everywhere = flight(dbm, counter((i) => (i >= 60 && i < 360 ? 1 : 0)));
    expect(everywhere?.strongSignal?.perMinute).toBeCloseTo(60, 0);
    expect(everywhere?.strongSignal?.secs).toBe(150);
  });

  it("need a minute of strong signal, and signal strength at all", () => {
    expect(flight(run(420, STRONG_SIGNAL_DBM - 1), counter(() => 1))?.strongSignal).toBeNull();
    const a = analyseSession(session([channel("frame_losses", counter(() => 1)), channel("throttle_command", flying.map((x) => x * 80), "%"), channel("ground_speed", flying.map((x) => x * 30), "m/s")]));
    expect(a.link.available && a.link.value.strongSignal).toBeNull();
  });
});
