import { describe, expect, it } from "vitest";
import { demoFlightTlm } from "../../demo/demo-flight.ts";
import { parseLog } from "../registry.ts";
import { HEADER_SIZE, RECORD_SIZE } from "./blocks.ts";
import { streamKey, unwrapPacket } from "./sensors.ts";

/** The demo flight with every GPS packet sent the way a Remote ID module (Spektrum SkyID) sends it: 0x27, type in byte 1. */
function asRemoteId(src: Uint8Array): { data: Uint8Array; wrapped: number } {
  const d = src.slice();
  let i = 0;
  while (d[i] === 0xff && d[i + 1] === 0xff && d[i + 2] === 0xff && d[i + 3] === 0xff) i += HEADER_SIZE;
  let wrapped = 0;
  for (; i + RECORD_SIZE <= d.length; i += RECORD_SIZE) {
    const p = i + 4;
    if (d[p] !== 0x16 && d[p] !== 0x17) continue;
    d[p + 1] = d[p];
    d[p] = 0x27;
    wrapped++;
  }
  return { data: d, wrapped };
}

const GPS_CHANNELS = ["gps.lat", "gps.lon", "gps.altitude", "gps.hdop", "gps.fix", "gps.satellites", "ground_speed", "heading"];

describe("GPS from a Remote ID module (0x27)", () => {
  it("unwraps only GPS packets", () => {
    const loc = Uint8Array.from([0x27, 0x16, 0x70, 0x14, 0x88, 0x18, 0x52, 0x32, 0x68, 0x68, 0x54, 0x16, 0, 0, 0x48, 0x3d]);
    const u = unwrapPacket(loc);
    expect(u[0]).toBe(0x16);
    expect(u[1]).toBe(0);
    expect(Array.from(u.subarray(2))).toEqual(Array.from(loc.subarray(2)));
    expect(loc[0]).toBe(0x27); // the file data is left as it is
    const text = Uint8Array.from([0x27, 0x27, 0, 0x80, ...new Array(12).fill(0x41)]);
    expect(unwrapPacket(text)).toBe(text);
    expect(streamKey(text)).toBe("0x27/0x27");
  });

  it("gives the same track as normal GPS packets", () => {
    const demo = demoFlightTlm();
    const { data, wrapped } = asRemoteId(demo);
    expect(wrapped).toBeGreaterThan(100);
    const normal = parseLog(demo, "gps.TLM").sessions[0];
    const remote = parseLog(data, "remote-id.TLM").sessions[0];
    for (const id of GPS_CHANNELS) {
      const a = normal.channels.get(id);
      const b = remote.channels.get(id);
      expect(a, id).toBeDefined();
      expect(b, id).toBeDefined();
      expect(Array.from(b!.t), id).toEqual(Array.from(a!.t));
      expect(Array.from(b!.v), id).toEqual(Array.from(a!.v));
    }
  });
});
