import { describe, expect, it } from "vitest";
import { parseLog } from "../adapters/registry.ts";
import { demoFlightTlm } from "../demo/demo-flight.ts";
import type { Session } from "../model/types.ts";
import { analyseSession, type Result } from "./index.ts";
import { GPS, track } from "./gps.ts";

const value = <T>(r: Result<T>): T => {
  if (!r.available) throw new Error("not available");
  return r.value;
};
const demo = (): Session => parseLog(demoFlightTlm(), "demo-flight.TLM").sessions[0];
/** Adds `delta` to every sample of a channel whose second satisfies `pick`. */
const bump = (s: Session, id: string, delta: (sec: number, k: number) => number, pick: (sec: number) => boolean) => {
  const ch = s.channels.get(id)!;
  let k = 0;
  for (let i = 0; i < ch.t.length; i++) { const sec = Math.floor(ch.t[i]); if (pick(sec)) ch.v[i] += delta(sec, k++); }
};

describe("GPS track", () => {
  const base = analyseSession(demo());
  const t0 = value(base.track);
  const p0 = value(base.profile);

  it("counts distances and speeds only in the air", () => {
    expect(t0.airborneOnly).toBe(true);
    // Receiver noise on the ground, well before the launch, adds to the path of the whole session but not to the flight.
    const s = demo();
    const quiet = p0.airStart! - 3;
    expect(quiet).toBeGreaterThan(4);
    bump(s, "gps.lat", (_sec, k) => (k % 2 ? 0.0001 : -0.0001), (sec) => sec < quiet);
    const noisy = analyseSession(s);
    expect(value(noisy.track).pathLengthM).toBeCloseTo(t0.pathLengthM, 0);
    // The first fix is the home point, so the farthest distance moves by at most the size of the noise (about 11 m).
    expect(Math.abs(value(noisy.track).maxDistanceM - t0.maxDistanceM)).toBeLessThan(15);
    // Without a profile (not known to be airborne) the same noise is counted.
    expect(value(track(s, undefined, null)).pathLengthM).toBeGreaterThan(t0.pathLengthM + 20);
    expect(value(track(s, undefined, null)).airborneOnly).toBe(false);
  });

  it("leaves a GPS jump out of the track, the distances and the speeds", () => {
    const s = demo();
    const mid = Math.floor((p0.airStart! + p0.airEnd!) / 2);
    // One fix a degree of latitude (about 111 km) away: an impossible position.
    bump(s, "gps.lat", () => 1, (sec) => sec === mid);
    const a = analyseSession(s);
    const t = value(a.track);
    expect(t.jumps).toBeGreaterThanOrEqual(1);
    expect(t.lat[mid]).toBeNull();
    expect(t.pathLengthM).toBeCloseTo(t0.pathLengthM, -1);
    expect(t.maxDistanceM).toBeCloseTo(t0.maxDistanceM, 0);
    expect(t.maxSpeed!).toBeLessThanOrEqual(GPS.maxPlausibleSpeed);
    // The clean flight has no jumps.
    expect(t0.jumps).toBe(0);
  });

  it("takes a lasting new position as real after a few jumps in a row, so the rest of the track is kept", () => {
    const s = demo();
    const from = p0.airStart! + 20;
    // The fixes from here on are 1° further north: a new fix, not five bad ones.
    bump(s, "gps.lat", () => 1, (sec) => sec >= from);
    const t = value(analyseSession(s).track);
    expect(t.jumps).toBe(GPS.jumpsInARow);
    expect(t.lat[p0.airEnd!]).not.toBeNull();
  });

  it("drops an impossible value of the GPS speed channel", () => {
    const s = demo();
    const mid = Math.floor((p0.airStart! + p0.airEnd!) / 2);
    bump(s, "ground_speed", () => 900, (sec) => sec === mid);
    const t = value(analyseSession(s).track);
    expect(t.speed[mid]).toBeNull();
    expect(t.maxSpeed!).toBeLessThanOrEqual(GPS.maxPlausibleSpeed);
  });
});
