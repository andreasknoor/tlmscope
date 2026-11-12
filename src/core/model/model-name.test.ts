import { describe, expect, it } from "vitest";
import { parseLog } from "../adapters/registry.ts";
import { analyseLogs } from "../analysis/index.ts";
import { demoFlightTlm } from "../demo/demo-flight.ts";
import { modelKey, modelNameFromFileName } from "./model-name.ts";

describe("model name from the file name", () => {
  it.each([
    ["Easy_Glider_4.TLM", "Easy Glider 4"],
    ["002~Easy Glider 4_20261003.TLM", "Easy Glider 4"],
    ["017~Radian XL_20261018_2.TLM", "Radian XL"],
    ["Easy Glider-2026-10-03-121530.csv", "Easy Glider"],
    ["logs/AutoLog/001~Apprentice STS_20261025.TLM", "Apprentice STS"],
    [".TLM", null],
  ])("%s → %s", (file, name) => {
    expect(modelNameFromFileName(file)).toBe(name);
  });

  it("groups names regardless of case and spacing", () => {
    expect(modelKey(" Easy  Glider 4")).toBe(modelKey("easy glider 4"));
    expect(modelKey(null)).toBe("");
  });
});

/** The demo flight with its model name in the header blanked out. */
function demoWithoutName(): Uint8Array {
  const data = demoFlightTlm().slice();
  const name = new TextEncoder().encode("Demo Glider");
  for (let i = 0; i + name.length <= data.length; i++) {
    if (name.every((b, k) => data[i + k] === b)) { data.fill(0, i, i + name.length); break; }
  }
  return data;
}

describe("model name in parsed logs", () => {
  it("prefers the name in the log over the file name", () => {
    const log = parseLog(demoFlightTlm(), "002~Something Else_20260614.TLM");
    expect(log.sessions[0].modelName).toBe("Demo Glider");
    expect(log.sessions[0].meta.modelNameSource).toBeUndefined();
  });

  it("falls back to the file name when the log has no name", () => {
    const log = parseLog(demoWithoutName(), "002~Easy Glider 4_20261003.TLM");
    expect(log.sessions[0].modelName).toBe("Easy Glider 4");
    expect(log.sessions[0].meta.modelNameSource).toBe("file name");
  });
});

describe("comparisons per model", () => {
  it("never compares flights of different models", () => {
    const a = parseLog(demoFlightTlm(), "a.TLM");
    const b = parseLog(demoFlightTlm(), "b.TLM");
    b.sessions[0].modelName = "Other Plane";
    const r = analyseLogs([a, b]);
    expect([...r.baselines.keys()].sort()).toEqual(["demo glider", "other plane"]);
    expect(r.baselines.get("demo glider")!.flights).toBe(1);
    // Each model has one flight: nothing to compare with, and never the other model.
    for (const s of r.sessions) {
      expect(s.baseline).toBeNull();
      expect(s.efficiency).toBeNull();
      expect(s.consumption).toBeNull();
      expect(s.sinkComparison).toBeNull();
    }
  });

  it("compares flights of the same model, whatever the spelling", () => {
    const a = parseLog(demoFlightTlm(), "a.TLM");
    const b = parseLog(demoFlightTlm(), "b.TLM");
    b.sessions[0].modelName = "demo  glider";
    const r = analyseLogs([a, b]);
    expect(r.baselines.size).toBe(1);
    expect(r.baselines.get("demo glider")!.flights).toBe(2);
    // each flight is compared with the other one only
    expect(r.sessions[0].baseline!.flights).toBe(1);
  });
});
