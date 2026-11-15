import { describe, expect, it } from "vitest";
import { parseLog } from "../adapters/registry.ts";
import { demoFlightTlm } from "../demo/demo-flight.ts";
import type { Session } from "../model/types.ts";
import { analyseSession, type Result } from "./index.ts";

const value = <T>(r: Result<T>): T => {
  if (!r.available) throw new Error("not available");
  return r.value;
};
const demo = () => parseLog(demoFlightTlm(), "demo-flight.TLM").sessions[0];
const THROTTLE = ["throttle_output", "throttle_command"];

/** Sets the channel to `v` in the last `secs` seconds of the session. */
function setTail(s: Session, id: string, secs: number, v: number) {
  const ch = s.channels.get(id);
  if (!ch) return false;
  const from = ch.t[ch.t.length - 1] - secs;
  for (let i = 0; i < ch.t.length; i++) if (ch.t[i] >= from) ch.v[i] = v;
  return true;
}

describe("charge at the end of a flight", () => {
  it("reads the end voltage after landing although the throttle channel stays above zero without current", () => {
    const s = demo();
    // Throttle hold or a disarmed controller: the receiver still reports throttle, but no current flows.
    expect(THROTTLE.map((id) => setTail(s, id, 60, 30)).some(Boolean)).toBe(true);
    expect(setTail(s, "motor_current", 60, 0)).toBe(true);
    const c = value(analyseSession(s).charge);
    expect(c.endCellV).not.toBeNull();
    expect(c.endUnderLoad).toBe(false);
  });

  it("says so instead of guessing when the log ends with the motor under load", () => {
    const s = demo();
    THROTTLE.forEach((id) => setTail(s, id, 60, 80));
    setTail(s, "motor_current", 60, 25);
    const c = value(analyseSession(s).charge);
    expect(c.endCellV).toBeNull();
    expect(c.endUnderLoad).toBe(true);
  });

  it("keeps the end voltage of the unchanged demo flight", () => {
    const c = value(analyseSession(demo()).charge);
    expect(c.endCellV).not.toBeNull();
    expect(c.endUnderLoad).toBe(false);
  });
});
