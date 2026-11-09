import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Grid } from "../../analysis/grid.ts";
import { loadSample, MAIN_SAMPLE, SAMPLES_DIR } from "../../test-helpers.ts";
import { modelHeader, encodeTlm } from "./encode.ts";
import { readHeaders } from "./index.ts";
import { parseLog } from "../registry.ts";

const SUPRA = "TelemetryLog supra .tlm";
const hasSupra = existsSync(join(SAMPLES_DIR, SUPRA));
const supra = () => loadSample(SUPRA);
const R = 6_371_000;
const rad = Math.PI / 180;

describe("model block in the header", () => {
  it("reads the name whatever the model slot", () => {
    for (const slot of [1, 2, 9, 30]) expect(readHeaders([modelHeader("Supra Fly", slot).subarray(4)])).toMatchObject({ modelName: "Supra Fly", modelSlot: slot });
  });

  it("reads a name that starts right at byte 6", () => {
    const h = new Uint8Array(32);
    h.set([0x08, 0x00, 0x00, 0x00, 0x10, 0x27, ...new TextEncoder().encode("Supra Fly")]);
    expect(readHeaders([h])).toMatchObject({ modelName: "Supra Fly", modelSlot: 9 });
  });

  it("keeps the slot in the session details", () => {
    const log = parseLog(encodeTlm([{ headers: [modelHeader("Slot Test", 5)], records: [] }]), "x.TLM");
    expect(log.sessions[0]).toMatchObject({ modelName: "Slot Test", meta: { modelSlot: 5 } });
  });
});

describe.skipIf(!hasSupra)("Supra Fly log (real GPS)", () => {
  it("reads the model name from the log, not from the file name", () => {
    expect(new Set(supra().sessions.map((s) => s.modelName))).toEqual(new Set(["Supra Fly"]));
    expect(supra().sessions[0].meta).toMatchObject({ modelSlot: 9 });
  });

  it("does not warn about the clock record", { timeout: 60_000 }, () => {
    expect(supra().warnings).toEqual([]);
  });

  it("decodes GPS consistently: speed matches the positions, course matches the bearing", () => {
    const g = new Grid(supra().sessions[128]);
    const lat = g.get("gps.lat"), lon = g.get("gps.lon"), speed = g.get("ground_speed"), course = g.get("heading");
    const ratios: number[] = [];
    const diffs: number[] = [];
    for (let k = 1; k < g.n; k++) {
      if (lat[k] === null || lat[k - 1] === null || lon[k] === null || lon[k - 1] === null) continue;
      const dy = (lat[k]! - lat[k - 1]!) * rad * R;
      const dx = (lon[k]! - lon[k - 1]!) * rad * R * Math.cos(lat[k]! * rad);
      const d = Math.hypot(dx, dy);
      if (speed[k] !== null && speed[k]! > 10) ratios.push(d / speed[k]!);
      if (d > 8 && course[k] !== null) {
        const diff = Math.abs((Math.atan2(dx, dy) / rad + 360) % 360 - course[k]!) % 360;
        diffs.push(diff > 180 ? 360 - diff : diff);
      }
    }
    const median = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
    expect(median(ratios)).toBeGreaterThan(0.85);
    expect(median(ratios)).toBeLessThan(1.1);
    expect(median(diffs)).toBeLessThan(6);
  });

  it("does not average labels or whole counts on the grid", () => {
    const g = new Grid(supra().sessions[112]);
    for (const id of ["gps.fix", "gps.satellites", "flight_mode"]) for (const v of g.get(id)) if (v !== null) expect(Number.isInteger(v)).toBe(true);
  });
});

// The main sample keeps its name and slot.
describe.skipIf(!existsSync(join(SAMPLES_DIR, MAIN_SAMPLE)))("Easy Glider log", () => {
  it("still reads its name and slot 2", () => {
    expect(loadSample(MAIN_SAMPLE).sessions[15]).toMatchObject({ modelName: "Easy Glider 4", meta: { modelSlot: 2 } });
  });
});
