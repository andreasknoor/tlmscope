import { describe, expect, it } from "vitest";
import { encodeTlm, modelHeader, Packet, sensorHeader, type EncodedRecord } from "../adapters/spektrum-tlm/encode.ts";
import { parseLog } from "../adapters/registry.ts";
import { demoFlightTlm } from "../demo/demo-flight.ts";
import { analyseSession } from "./index.ts";
import { classify } from "./flight.ts";
import { isSimulator, simulatorTime } from "./simulator.ts";

interface Options { name?: string; seconds?: number; flownS?: number; rxV?: number; quality?: (s: number) => number; dbm?: number }

/**
 * A session the way a transmitter logs a simulator dongle (WS3000): a link report with 0 V and
 * no fades, a signal block with no dBm and 100 %, and the transmitter's sticks, moved for `flownS`.
 */
function simulatorLog({ name = "WS3000T-RealFlight", seconds = 120, flownS = 60, rxV = 0, quality = () => 100, dbm = -128 }: Options = {}) {
  const records: EncodedRecord[] = [];
  for (let i = 0; i < seconds * 10; i++) {
    const s = i / 10, tick = i * 10;
    const elevator = s < flownS ? Math.round(1500 * Math.sin(s)) : 0;
    records.push({ tick, packet: new Packet(0xff).u16be(2, 0).u16be(4, 0xffff).u16be(6, 0xffff).u16be(8, 0xffff).u16be(10, 0).u16be(12, 0).u16be(14, rxV * 100).b });
    records.push({ tick: tick + 2, packet: new Packet(0x7e).u16be(2, 0xffff).u16be(4, 0xffff).u16be(6, 0x7fff).i8(8, dbm).i8(9, quality(s)).b });
    records.push({ tick: tick + 4, packet: new Packet(0x7a, 1).u16le(2, -610).u16le(4, -2047).u16le(6, elevator).u16le(8, 0).u16le(10, 0).b });
  }
  return parseLog(encodeTlm([{ headers: [modelHeader(name, 1), sensorHeader(0x7e)], records }]), "simulator.TLM").sessions[0];
}

describe("simulator sessions", () => {
  it("are told apart from a model", () => {
    const s = simulatorLog();
    expect(isSimulator(s)).toBe(true);
    expect(classify(s)).toBe("simulator");
    expect(classify(parseLog(demoFlightTlm(), "demo.TLM").sessions[0])).toBe("flight");
  });

  it("are found by their data alone, without the dongle's name", () => {
    expect(isSimulator(simulatorLog({ name: "Aerofly" }))).toBe(true);
  });

  it("allow the small dips a dongle shows over a long evening", () => {
    expect(isSimulator(simulatorLog({ quality: (s) => (s > 50 && s < 52 ? 95 : 100), dbm: -41 }))).toBe(true);
  });

  it("are not a real receiver: voltage, weaker signal or a dropping link quality", () => {
    expect(isSimulator(simulatorLog({ rxV: 5.1 }))).toBe(false);
    expect(isSimulator(simulatorLog({ dbm: -60 }))).toBe(false);
    expect(isSimulator(simulatorLog({ quality: (s) => (s > 50 ? 80 : 100) }))).toBe(false);
  });

  it("read a voltage of 0 as no reading", () => {
    const rx = simulatorLog().channels.get("rx_voltage");
    expect(rx === undefined || Array.from(rx.v).every((v) => Number.isNaN(v))).toBe(true);
  });

  it("count the time with the sticks moved apart from the connected time", () => {
    const t = simulatorTime(simulatorLog());
    expect(t.connectedS).toBeCloseTo(120, 0);
    expect(t.activeS).toBeGreaterThanOrEqual(60);
    expect(t.activeS).toBeLessThanOrEqual(70);
  });

  it("get no receiver, link or flight values in the analysis", () => {
    const a = analyseSession(simulatorLog());
    expect(a.kind).toBe("simulator");
    expect(a.simulator?.activeS).toBeGreaterThan(0);
    expect(a.receiverPower.available).toBe(false);
  });
});
