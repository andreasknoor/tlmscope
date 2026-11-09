import { describe, expect, it } from "vitest";
import { analyseLogs } from "../../analysis/index.ts";
import { MAX_GRID_S } from "../../analysis/grid.ts";
import { demoFlightTlm } from "../../demo/demo-flight.ts";
import { batteryLetter } from "../../../ui/format.ts";
import { parseLog } from "../registry.ts";
import { HEADER_SIZE, RECORD_SIZE } from "./blocks.ts";
import { decodeGpsLoc, GPS_FLAG } from "./sensors.ts";

/** Damaged files must still open quickly, keep the good data and say what was skipped. */
const demo = demoFlightTlm();
const good = analyseLogs([parseLog(demo, "demo.TLM")]).sessions[0];

/** Byte offset of data record `k` (after the header run). */
function recordAt(d: Uint8Array, k: number): number {
  let i = 0;
  while (d[i] === 0xff && d[i + 1] === 0xff && d[i + 2] === 0xff && d[i + 3] === 0xff) i += HEADER_SIZE;
  return i + k * RECORD_SIZE;
}
const setTick = (d: Uint8Array, at: number, tick: number) => new DataView(d.buffer, d.byteOffset).setUint32(at, tick >>> 0, true);
const lastRecord = (d: Uint8Array) => d.length - RECORD_SIZE;

function open(d: Uint8Array) {
  const log = parseLog(d, "damaged.TLM");
  return { log, a: analyseLogs([log]).sessions };
}

describe("damaged files", () => {
  it("ignores a last record whose timestamp jumps a month ahead", () => {
    const d = demo.slice();
    setTick(d, lastRecord(d), 0x10000000);
    const { log, a } = open(d);
    expect(a[0].grid.n).toBe(good.grid.n);
    expect(log.sessions[0].durationS).toBeCloseTo(good.session.durationS, 0);
    expect(log.warnings.map((w) => w.code)).toContain("implausible-time");
  });

  it("ignores a single timestamp that jumps in the middle", () => {
    const d = demo.slice();
    setTick(d, recordAt(d, 500), 0x0fffffff);
    const { a } = open(d);
    expect(a[0].grid.n).toBe(good.grid.n);
    expect(a[0].kind).toBe("flight");
  });

  it("never reports a negative duration when the last record goes back in time", () => {
    const d = demo.slice();
    setTick(d, lastRecord(d), 0);
    const { log } = open(d);
    expect(log.sessions[0].durationS).toBeGreaterThan(0);
  });

  it("reads FF FF FF FF in a timestamp as a damaged record, not as a new session", () => {
    const d = demo.slice();
    setTick(d, recordAt(d, 500), 0xffffffff);
    const { log, a } = open(d);
    expect(log.sessions).toHaveLength(1);
    expect(a[0].kind).toBe("flight");
    expect(a[0].grid.n).toBe(good.grid.n);
    expect(log.warnings.map((w) => w.code)).toContain("damaged-records");
  });

  it("still splits real sessions at header runs", () => {
    const both = new Uint8Array(demo.length * 2);
    both.set(demo);
    both.set(demo, demo.length);
    expect(parseLog(both, "two.TLM").sessions).toHaveLength(2);
  });

  it("keeps the good part of a cut-off file", () => {
    const { log, a } = open(demo.slice(0, Math.floor(demo.length / 2) + 7));
    expect(log.warnings.map((w) => w.code)).toContain("trailing-bytes");
    expect(a[0].grid.n).toBeLessThan(good.grid.n);
    expect(a[0].grid.n).toBeGreaterThan(good.grid.n / 3);
  });

  it("refuses random bytes with a .TLM name quickly instead of running out of memory", () => {
    const junk = new Uint8Array(1_000_000);
    let x = 12345;
    for (let i = 0; i < junk.length; i++) junk[i] = (x = (x * 1103515245 + 12345) >>> 0) >>> 24;
    const t0 = performance.now();
    expect(() => parseLog(junk, "junk.TLM")).toThrow(/no telemetry/);
    expect(performance.now() - t0).toBeLessThan(5000);
  });

  it("caps the analysis grid at 24 hours", () => {
    expect(MAX_GRID_S).toBe(86_400);
    const d = demo.slice();
    // Two neighbouring records far ahead agree with each other, but not with the session.
    setTick(d, lastRecord(d) - RECORD_SIZE, 0x20000000);
    setTick(d, lastRecord(d), 0x20000001);
    const { a } = open(d);
    expect(a[0].grid.n).toBe(good.grid.n);
  });
});

describe("damaged GPS positions", () => {
  const packet = (bytes: number[]) => { const p = new Uint8Array(16); p.set(bytes); return p; };
  const flags = GPS_FLAG.NORTH | GPS_FLAG.EAST | GPS_FLAG.FIX_VALID;
  const value = (p: Uint8Array, name: string) => decodeGpsLoc(p).find((f) => f.name === name)?.value;

  it("drops a latitude above 90°", () => {
    // 95°10.0000' N
    const p = packet([0x16, 0, 0, 0, 0x00, 0x00, 0x10, 0x95, 0x00, 0x00, 0x24, 0x13, 0, 0, 0, flags]);
    expect(value(p, "Latitude")).toBeNull();
    expect(value(p, "Longitude")).toBeNull();
    expect(value(p, "Fix (0 none, 1 2D, 2 3D)")).toBe(0);
  });

  it("drops minutes of 60 or more", () => {
    // 52°75.0000'
    const p = packet([0x16, 0, 0, 0, 0x00, 0x00, 0x75, 0x52, 0x00, 0x00, 0x24, 0x13, 0, 0, 0, flags]);
    expect(value(p, "Latitude")).toBeNull();
  });
});

describe("battery names", () => {
  it("go from A to Z and then on with two letters", () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(batteryLetter)).toEqual(["A", "B", "Z", "AA", "AB", "AZ", "BA"]);
  });
});
