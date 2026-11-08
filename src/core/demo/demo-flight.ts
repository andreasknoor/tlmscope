/**
 * A synthetic demo flight in the Spektrum .TLM format.
 *
 * Nine minutes with two motor climbs, a thermal with circles, glides, a landing,
 * a smart battery and a GPS track. All values are invented and deterministic.
 * Used for the "Load demo flight" button, the README screenshot and end-to-end tests.
 */
import { encodeTlm, modelHeader, Packet, sensorHeader, type EncodedRecord } from "../adapters/spektrum-tlm/encode.ts";

/** Start: 14 June 2026, 14:05 UTC. Home: an invented field. */
export const DEMO_START_UNIX = Date.UTC(2026, 5, 14, 14, 5, 0) / 1000;
export const DEMO_HOME = { lat: 51.1235, lon: 10.4127 };

type Phase = "ground" | "motor" | "glide" | "thermal" | "landing";

/** Seconds → phase of the scripted flight. */
function phaseAt(t: number): Phase {
  if (t < 10) return "ground";
  if (t < 42) return "motor";
  if (t < 105) return "glide";
  if (t < 205) return "thermal";
  if (t < 300) return "glide";
  if (t < 322) return "motor";
  if (t < 470) return "glide";
  if (t < 515) return "landing";
  return "ground";
}

/** Deterministic noise in −1…1. */
function noise(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

interface State { t: number; alt: number; climb: number; heading: number; turnRate: number; east: number; north: number; amps: number; throttle: number; mah: number; cellV: number; escT: number; battT: number; g: number }

/** Simulates the flight at 10 Hz. */
function simulate(): State[] {
  const dt = 0.1;
  const out: State[] = [];
  const s: State = { t: 0, alt: 0, climb: 0, heading: 250, turnRate: 0, east: 0, north: 0, amps: 0, throttle: 0, mah: 0, cellV: 4.18, escT: 24, battT: 22, g: 1 };
  const wind = { east: 1.8, north: 0.6 };
  for (let k = 0; k <= 540 / dt; k++) {
    const t = k * dt;
    const ph = phaseAt(t);
    let climb = 0, turn = 0, speed = 0;
    s.throttle = 0; s.amps = 0;
    switch (ph) {
      case "motor": s.throttle = 100; s.amps = 19.5 + noise(k) * 0.6; climb = 3.4; speed = 13; turn = 0; break;
      case "glide": climb = -0.85 + noise(k * 7) * 0.25; speed = 11; turn = Math.sin(t / 14) * 14; break;
      case "thermal": climb = 1.15 + Math.sin(t / 6) * 0.5; speed = 10; turn = 26; break;
      case "landing": climb = -s.alt / Math.max(4, 515 - t); speed = 9; turn = t < 490 ? 9 : 0; break;
      case "ground": climb = 0; speed = 0; s.alt = 0; break;
    }
    // steer home when far out
    const dist = Math.hypot(s.east, s.north);
    if (ph !== "ground" && ph !== "thermal" && dist > 330) {
      const want = (Math.atan2(-s.east, -s.north) * 180) / Math.PI;
      const diff = ((want - s.heading + 540) % 360) - 180;
      turn = Math.max(-20, Math.min(20, diff));
    }
    s.turnRate = turn;
    s.heading = (s.heading + turn * dt + 360) % 360;
    s.climb = climb;
    s.alt = Math.max(0, s.alt + climb * dt);
    if (ph !== "ground") {
      const h = (s.heading * Math.PI) / 180;
      s.east += (Math.sin(h) * speed + wind.east) * dt;
      s.north += (Math.cos(h) * speed + wind.north) * dt;
    }
    s.mah += (s.amps * dt) / 3.6;
    s.cellV = 4.18 - (s.mah / 2200) * 0.55;
    s.escT += ((s.amps > 1 ? 46 : 26) - s.escT) * 0.004;
    s.battT += ((s.amps > 1 ? 34 : 24) - s.battT) * 0.002;
    const bank = Math.atan((Math.abs(turn) * Math.PI / 180) * speed / 9.81);
    s.g = (ph === "ground" ? 1 : 1 / Math.cos(bank)) + noise(k * 3) * 0.04 + (Math.abs(t - 43) < 0.5 ? 1.4 : 0);
    s.t = t;
    out.push({ ...s });
  }
  return out;
}

export function demoFlightTlm(): Uint8Array {
  const sim = simulate();
  const recs: EncodedRecord[] = [];
  const base = 120_000; // ticks since transmitter start
  const at = (i: number) => base + i * 10;
  const every = (i: number, n: number) => i % n === 0;
  const kx = 6_371_000 * (Math.PI / 180) * Math.cos((DEMO_HOME.lat * Math.PI) / 180);
  const ky = 6_371_000 * (Math.PI / 180);
  let frameLosses = 0, fades = 0;

  sim.forEach((s, i) => {
    const tick = at(i);
    const dist = Math.hypot(s.east, s.north);
    const dbm = Math.round(-42 - 0.1 * dist - s.alt * 0.05 + noise(i * 5) * 2);
    if (dbm < -80 && noise(i * 11) > 0.6) frameLosses++;
    if (dbm < -70 && noise(i * 13) > 0.5) fades++;
    if (i === 1) recs.push({ tick, packet: new Packet(0x7c).u32le(8, DEMO_START_UNIX).b });
    // vario, 10 Hz
    recs.push({ tick, packet: new Packet(0x40).i16be(2, s.alt * 10).i16be(4, s.climb * 10).i16be(6, s.climb * 10).i16be(8, s.climb * 10).i16be(10, s.climb * 10).i16be(12, s.climb * 10).i16be(14, s.climb * 10).b });
    if (every(i, 2)) {
      // ESC, 5 Hz
      const v = 3 * s.cellV - s.amps * 0.018;
      recs.push({ tick: tick + 1, packet: new Packet(0x20).u16be(2, s.throttle ? 5500 + noise(i) * 60 : 0).u16be(4, v * 100).u16be(6, s.escT * 10).u16be(8, s.amps * 100)
        .u16be(10, (s.escT - 2) * 10).u8(12, 0xff).u8(13, 6.0 / 0.05).u8(14, s.throttle * 2).u8(15, s.throttle * 2).b });
    }
    if (every(i, 1)) {
      // flight log and signal, 10 Hz
      recs.push({ tick: tick + 2, packet: new Packet(0x7f).u16be(2, fades).u16be(4, 0xffff).u16be(6, 0xffff).u16be(8, 0xffff).u16be(10, frameLosses).u16be(12, 0).u16be(14, 598 - (s.amps > 1 ? 4 : 0)).b });
      recs.push({ tick: tick + 3, packet: new Packet(0x7e).u16be(2, 0xffff).u16be(4, 0xffff).u16be(6, 0x7fff).i8(8, dbm).i8(9, Math.max(1, Math.min(100, 100 + (dbm + 50) * 1.6))).u16be(14, 900 + Math.floor(i / 10)).b });
    }
    if (every(i, 3)) {
      // g-meter and gyro, ~3 Hz
      const w = s.turnRate, bank = Math.atan((Math.abs(w) * Math.PI / 180) * 11 / 9.81);
      recs.push({ tick: tick + 4, packet: new Packet(0x14).i16be(2, noise(i) * 4).i16be(4, noise(i * 2) * 4).i16be(6, -s.g * 100).i16be(8, 20).i16be(10, 20).i16be(12, 250).i16be(14, -120).b });
      recs.push({ tick: tick + 5, packet: new Packet(0x1a).i16be(2, noise(i * 4) * 60).i16be(4, Math.abs(w) * Math.sin(bank) * 10 + noise(i * 6) * 20).i16be(6, w * Math.cos(bank) * 10).i16be(8, 900).i16be(10, 700).i16be(12, 500).b });
    }
    if (every(i, 5)) {
      // flight controller status, 2 Hz
      recs.push({ tick: tick + 6, packet: new Packet(0x05).u8(2, 0).u8(3, 2).u8(4, 0x80).u8(5, 0x80 + ((i / 5) % 3)).b });
      // GPS, 2 Hz
      const lat = DEMO_HOME.lat + s.north / ky, lon = DEMO_HOME.lon + s.east / kx;
      const bcdDeg = (d: number) => Math.floor(d) * 1_000_000 + Math.round((d - Math.floor(d)) * 60 * 10_000);
      const gpsAlt = 312 + s.alt;
      recs.push({ tick: tick + 7, packet: new Packet(0x16).bcdLe(2, 2, (gpsAlt % 1000) * 10).bcdLe(4, 4, bcdDeg(lat)).bcdLe(8, 4, bcdDeg(lon)).bcdLe(12, 2, s.heading * 10).bcdLe(14, 1, 9).u8(15, 1 | 2 | 8 | 16 | 32).b });
      const speed = i > 0 ? Math.hypot(s.east - sim[i - 1].east, s.north - sim[i - 1].north) / 0.1 : 0;
      recs.push({ tick: tick + 8, packet: new Packet(0x17).bcdLe(2, 2, (speed / 0.514444) * 10).bcdLe(4, 4, 140500).bcdLe(8, 1, 11).bcdLe(9, 1, Math.floor(gpsAlt / 1000)).b });
    }
    if (every(i, 25)) {
      // smart battery, rotating message types, 0.4 Hz each
      const kind = (i / 25) % 4;
      const sag = s.amps * 0.006;
      const cells = [s.cellV - sag, s.cellV - sag - 0.002, s.cellV - sag - 0.004].map((c) => c * 1000);
      if (kind === 0) recs.push({ tick: tick + 9, packet: new Packet(0x42).u8(2, 0x00).i8(3, s.battT).u16le(10, Math.min(...cells)).u16le(12, Math.max(...cells)).b });
      if (kind === 1) recs.push({ tick: tick + 9, packet: new Packet(0x42).u8(2, 0x10).i8(3, s.battT).u16le(4, cells[0]).u16le(6, cells[1]).u16le(8, cells[2]).u16le(10, 0xffff).u16le(12, 0xffff).u16le(14, 0xffff).b });
      if (kind === 2) { const p = new Packet(0x42).u8(2, 0x80).u8(3, 1).u8(4, 3).u8(5, 0).u16le(6, 12); p.b.set([0xd3, 0x40, 0xde, 0x11, 0x2a, 0x7c, 0x01, 0x01], 8); recs.push({ tick: tick + 9, packet: p.b }); }
      if (kind === 3) recs.push({ tick: tick + 9, packet: new Packet(0x42).u8(2, 0x90).u16le(4, 2200).u16le(6, 300).u16le(8, 3000).u16le(10, 3300).u16le(12, 4200).i8(14, -20).i8(15, 60).b });
    }
  });
  recs.sort((a, b) => a.tick - b.tick);
  const headers = [modelHeader("Demo Glider"), ...[0x20, 0x42, 0x40, 0x14, 0x1a, 0x16, 0x17].map((id) => sensorHeader(id)), sensorHeader(0x02, 0x7e)];
  return encodeTlm([{ headers, records: recs }]);
}
