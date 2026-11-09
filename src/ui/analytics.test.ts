import { describe, expect, it } from "vitest";
import { parseLog } from "../core/adapters/registry.ts";
import { demoFlightTlm } from "../core/demo/demo-flight.ts";
import { eventData, sizeBucket } from "./analytics.ts";

describe("usage events", () => {
  it("put files into coarse size classes", () => {
    expect([0, 999_999, 1_000_000, 10_000_000, 10_000_001].map(sizeBucket)).toEqual(["<1 MB", "<1 MB", "1-10 MB", "1-10 MB", ">10 MB"]);
  });

  it("send nothing from inside a log when a file is opened", () => {
    const log = parseLog(demoFlightTlm(), "Secret Model 2026-06-14.TLM");
    const sent = JSON.stringify(eventData({ name: "file-opened", format: log.adapterId, size: sizeBucket(log.sizeBytes) }));
    expect(sent).toBe(JSON.stringify({ format: "spektrum-tlm", size: "<1 MB" }));
    expect(sent).not.toContain("Secret");
    expect(sent).not.toContain(log.sessions[0].modelName!);
  });

  it("send no data for events without details", () => {
    expect(eventData({ name: "demo-loaded" })).toBeUndefined();
  });
});
