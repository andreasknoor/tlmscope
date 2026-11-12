// Supra Fly log: reference values for flights without height.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Session } from "../model/types.ts";
import { loadSample, SAMPLES_DIR } from "../test-helpers.ts";
import { analyseLogs, analyseSession, type Result } from "./index.ts";

const value = <T>(r: Result<T>): T => {
  if (!r.available) throw new Error("not available");
  return r.value;
};
const without = (s: Session, prefixes: string[]): Session => ({
  ...s,
  channels: new Map([...s.channels].filter(([id]) => !prefixes.some((p) => id.startsWith(p)))),
});
const NO_HEIGHT = ["altitude", "climb_rate"];
const NO_GPS = ["gps.", "ground_speed", "heading"];

const SUPRA = "TelemetryLog supra .tlm";

describe.skipIf(!existsSync(join(SAMPLES_DIR, SUPRA)))("Supra Fly log: flights before the vario was fitted", { timeout: 120_000 }, () => {
  const logs = () => analyseLogs([loadSample(SUPRA)]);

  it("shows aerobatic flights as motor off, not as a glide", () => {
    const byIndex = (i: number) => value(logs().sessions.find((a) => a.session.index === i)!.profile);
    const aerobatic = byIndex(109); // sinks about 8.8 m/s with the motor off
    expect(aerobatic.fastSink!.rate).toBeGreaterThan(3);
    expect(aerobatic.glideSinkRate).toBeNull();
    expect(aerobatic.phases.some((p) => p.kind === "glide")).toBe(false);
    const calm = byIndex(111); // about 2.2 m/s: a glide
    expect(calm.fastSink).toBeNull();
    expect(calm.glideSinkRate).toBeLessThan(3);
  });

  it("finds 87 flights: 20 by height, 66 by motion, 1 by GPS", () => {
    const flights = logs().sessions.filter((a) => a.kind === "flight");
    expect(flights).toHaveLength(87);
    const basis = (b: string) => flights.filter((a) => value(a.profile).basis === b).length;
    expect([basis("height"), basis("motion"), basis("gps")]).toEqual([20, 66, 1]);
  });

  it("keeps short ground tests as ground tests", () => {
    const s = logs().sessions;
    expect(s[16].kind).toBe("ground-test");
    expect(s[118].kind).toBe("ground-test");
  });

  it("reports the dead height sensor of the first session", () => {
    const a = logs().sessions[0];
    expect(a.kind).toBe("flight");
    expect(value(a.profile).basis).toBe("gps");
    expect(a.issues.map((i) => i.kind)).toContain("height-flat");
  });

  it("gets an airtime from motion close to the height-based one", () => {
    const log = loadSample(SUPRA);
    for (let i = 108; i < 130; i++) {
      const byHeight = analyseSession(log.sessions[i]);
      if (byHeight.kind !== "flight") continue;
      const byMotion = analyseSession(without(log.sessions[i], [...NO_HEIGHT, ...NO_GPS]));
      expect(byMotion.kind, `#${i}`).toBe("flight");
      expect(Math.abs(value(byMotion.profile).airtimeS - value(byHeight.profile).airtimeS), `#${i}`).toBeLessThan(90);
    }
  });
});
