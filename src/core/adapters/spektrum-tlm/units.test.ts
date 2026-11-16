import { describe, expect, it } from "vitest";
import { integrateMah, toSessionCounter } from "../../model/normalise.ts";
import { Q, type Channel } from "../../model/types.ts";
import { parseLog } from "../registry.ts";
import { readBlocks } from "./blocks.ts";
import { encodeTlm, modelHeader, Packet } from "./encode.ts";
import { bcdLe } from "./bytes.ts";
import { decodeGpsLoc, decodeGpsStat, GPS_FLAG, SENSORS } from "./sensors.ts";

const packet = (bytes: number[]) => {
  const p = new Uint8Array(16);
  p.set(bytes);
  return p;
};
const field = (fields: { name: string; value: number | null }[], name: string) => fields.find((f) => f.name === name)?.value;

describe("counters", () => {
  it("starts at zero and keeps counting across a device restart", () => {
    expect([...toSessionCounter([180, 181, 185, 2, 4])]).toEqual([0, 1, 5, 7, 9]);
  });
  it("keeps gaps as no data", () => {
    expect([...toSessionCounter([3, NaN, 5])]).toEqual([0, NaN, 2]);
  });
});

describe("charge integration", () => {
  it("integrates 10 A over 36 s to 100 mAh", () => {
    const ch: Channel = {
      id: "motor_current", unit: "A", kind: "numeric", origin: "measured", source: { sensor: "test", field: "test" },
      t: Float64Array.from([0, 18, 36]), v: Float64Array.from([10, 10, 10]), q: new Uint8Array(3),
    };
    const mah = integrateMah(ch);
    expect(mah.v[2]).toBeCloseTo(100, 6);
    expect(mah.origin).toBe("derived");
    expect(mah.q[0] & Q.DERIVED).toBe(Q.DERIVED);
  });
});

describe("block reader", () => {
  it("splits sessions at runs of header blocks and reports leftover bytes", () => {
    const hdr = [0xff, 0xff, 0xff, 0xff, ...new Array(32).fill(0)];
    const rec = (tick: number) => [tick & 0xff, (tick >> 8) & 0xff, 0, 0, 0x40, ...new Array(15).fill(0)];
    const bytes = new Uint8Array([...hdr, ...hdr, ...rec(100), ...rec(110), ...hdr, ...rec(5), 1, 2, 3]);
    const r = readBlocks(bytes);
    expect(r.sessions.map((s) => s.ticks)).toEqual([[100, 110], [5]]);
    expect(r.sessions[0].headers).toHaveLength(2);
    expect(r.trailingBytes).toBe(3);
  });
});

describe("ESC packet (0x20)", () => {
  it("decodes the scaled values and treats 0xFF/0xFFFF as no data", () => {
    // rpm 0, 11.47 V, 23.0 °C, 0 A, 24.0 °C BEC, BEC current none, 6.05 V BEC, throttle 0
    const f = SENSORS["0x20"].decode(packet([0x20, 0, 0, 0, 0x04, 0x7b, 0x00, 0xe6, 0, 0, 0x00, 0xf0, 0xff, 0x79, 0, 0]));
    expect(field(f, "Input voltage")).toBe(11.47);
    expect(field(f, "Controller temperature")).toBe(23);
    expect(field(f, "BEC temperature")).toBe(24);
    expect(field(f, "BEC current")).toBeNull();
    expect(field(f, "BEC voltage")).toBe(6.05);
  });
});

describe("GPS packets (from the specification, no real log yet)", () => {
  it("reads little-endian BCD", () => {
    expect(bcdLe(Uint8Array.from([0x34, 0x12]), 0, 2)).toBe(1234);
    expect(bcdLe(Uint8Array.from([0x3a]), 0, 1)).toBeNull();
  });

  it("decodes position, course and fix", () => {
    // 52°31.1234' N, 13°24.5678' E, altitude low 123.4 m, course 270.5°, HDOP 0.9
    const p = packet([
      0x16, 0,
      0x34, 0x12, // altitude low 1234 -> 123.4 m
      0x34, 0x12, 0x31, 0x52, // 52311234
      0x78, 0x56, 0x24, 0x13, // 13245678
      0x05, 0x27, // course 2705 -> 270.5
      0x09, // HDOP 0.9
      GPS_FLAG.NORTH | GPS_FLAG.EAST | GPS_FLAG.FIX_VALID | GPS_FLAG.FIX_3D,
    ]);
    const f = decodeGpsLoc(p);
    expect(field(f, "Latitude")).toBeCloseTo(52 + 31.1234 / 60, 8);
    expect(field(f, "Longitude")).toBeCloseTo(13 + 24.5678 / 60, 8);
    expect(field(f, "Course")).toBe(270.5);
    expect(field(f, "HDOP")).toBe(0.9);
    expect(field(f, "Fix (0 none, 1 2D, 2 3D)")).toBe(2);
  });

  it("applies south, west and the over-99° longitude flag, and hides positions without fix", () => {
    const base = [0x16, 0, 0, 0, 0x00, 0x00, 0x30, 0x33, 0x00, 0x00, 0x15, 0x51];
    const sw = decodeGpsLoc(packet([...base, 0, 0, 0, GPS_FLAG.FIX_VALID | GPS_FLAG.LON_OVER_99]));
    expect(field(sw, "Latitude")).toBeCloseTo(-33.5, 8);
    expect(field(sw, "Longitude")).toBeCloseTo(-151.25, 8);
    const noFix = decodeGpsLoc(packet([...base, 0, 0, 0, GPS_FLAG.NORTH]));
    expect(field(noFix, "Latitude")).toBeNull();
  });

  it("decodes speed and satellites", () => {
    const f = decodeGpsStat(packet([0x17, 0, 0x50, 0x01, 0, 0, 0, 0, 0x09, 0x01]));
    expect(field(f, "Ground speed")).toBeCloseTo(15 * 0.514444, 3); // 15.0 knots
    expect(field(f, "Satellites")).toBe(9);
  });
});

describe("flight controller status (0x05)", () => {
  it("takes the flight mode from byte 4 and keeps byte 2 as the active functions", () => {
    const f = SENSORS["0x05"].decode(packet([0x05, 0, 0x03, 0x02, 0x82, 0x81]));
    expect(field(f, "Flight mode")).toBe(2);
    expect(field(f, "Active functions (byte 2)")).toBe(3);
    expect(field(SENSORS["0x05"].decode(packet([0x05, 0, 0x05, 0x02, 0x80])), "Flight mode")).toBe(0);
    expect(field(SENSORS["0x05"].decode(packet([0x05, 0, 0x05, 0x02, 0x00])), "Flight mode")).toBeNull();
  });
});

describe("transmitter switches (0x7a/0)", () => {
  it("reads switches A to H and the throttle hold", () => {
    const f = SENSORS["0x7a/0"].decode(packet([0x7a, 0, 0b0010_1001, 0x40]));
    expect(field(f, "Switch A")).toBe(1);
    expect(field(f, "Switch B")).toBe(2);
    expect(field(f, "Switch C")).toBe(2);
    expect(field(f, "Switch D")).toBe(0);
    expect(field(f, "Switch H")).toBe(1);
    expect(field(f, "Throttle hold (bit 14)")).toBe(1);
  });
});

describe("flight log with id 0xFF", () => {
  const flightLog = (id: number, fades: number, losses: number) =>
    new Packet(id).u16be(2, fades).u16be(4, 0xffff).u16be(6, 0xffff).u16be(8, 0xffff).u16be(10, losses).u16be(12, 0).u16be(14, 614).b;
  const parse = (records: Uint8Array[]) =>
    parseLog(encodeTlm([{ headers: [modelHeader("Test")], records: records.map((packet, k) => ({ tick: 1000 + k * 10, packet })) }]), "t.TLM").sessions[0];

  it("feeds link quality and receiver voltage when the session has no 0x7F", () => {
    const s = parse([flightLog(0xff, 3, 4), flightLog(0xff, 5, 7)]);
    expect([...s.channels.get("frame_losses")!.v]).toEqual([0, 3]);
    expect(s.channels.get("rx_voltage")!.v[0]).toBeCloseTo(6.14, 6);
    expect(s.channels.has("fades.b")).toBe(false);
  });

  it("is ignored next to 0x7F, whose counters it does not match", () => {
    const s = parse([flightLog(0x7f, 0, 0), flightLog(0xff, 90, 90), flightLog(0x7f, 1, 2)]);
    expect([...s.channels.get("frame_losses")!.v]).toEqual([0, 2]);
  });
});
