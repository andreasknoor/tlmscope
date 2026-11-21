/**
 * The second model of the demo file: a 3D aerobatic plane without a vario.
 *
 * A ground test (motor run on the bench) and, seven minutes later, a 6½ minute flight:
 * take-off in FM1 (AS3X + SAFE), loops and rolls in FM2 (AS3X), knife edge with one low pass
 * far out where the link gets weak (with one hold, half a second of failsafe), hover and torque roll in FM3 (AS3X + heading hold), tumbles
 * up to 7 g, harrier passes and the landing back in FM1. Height comes from the GPS only.
 * A second smart battery (4S 2200). The receiver has one remote receiver (B), mounted badly: it fades far more
 * than the main receiver in the knife edge and the tumbles. All values are invented and deterministic.
 */
import { modelHeader, Packet, sensorHeader, type EncodedRecord } from "../adapters/spektrum-tlm/encode.ts";
import { DEMO_HOME, DEMO_START_UNIX } from "./demo-flight.ts";

/** Ground test 53 minutes after the glider's start, the flight seven minutes after that. */
export const DEMO_GROUND_TEST_UNIX = DEMO_START_UNIX + 53 * 60;
export const DEMO_3D_UNIX = DEMO_START_UNIX + 60 * 60;
export const DEMO_3D_MODEL = "Demo 3D";
/** AS3X gains roll / pitch / yaw from the gain knob. */
export const DEMO_3D_GAINS = [45, 55, 70] as const;

const CAPACITY_MAH = 2200;
/** Start of the hold on the low pass far out, in seconds from power-up, and its length in records (0.1 s each). */
export const DEMO_3D_HOLD_AT_S = 124;
const HOLD_AT_S = DEMO_3D_HOLD_AT_S;
const HOLD_RECORDS = 6;
const CELLS = 4;
const BATTERY_ID = [0x5a, 0x91, 0x3c, 0x7e, 0x08, 0xb2, 0x01, 0x01];

type Phase = "ground" | "takeoff" | "loops" | "knife" | "hover" | "tumbles" | "harrier" | "landing";

function phaseAt(t: number): Phase {
  if (t < 20) return "ground";
  if (t < 35) return "takeoff";
  if (t < 90) return "loops";
  if (t < 150) return "knife";
  if (t < 210) return "hover";
  if (t < 285) return "tumbles";
  if (t < 330) return "harrier";
  if (t < 360) return "landing";
  return "ground";
}

/** Flight mode switch: FM1 for take-off and landing, FM2 for aerobatics, FM3 for the hover. */
function modeAt(t: number): 0 | 1 | 2 {
  if (t < 40 || t >= 330) return 0;
  if (t >= 150 && t < 210) return 2;
  return 1;
}
/** Functions per mode: 1 = AS3X, 2 = SAFE, 4 = heading hold. */
const MODE_BITS = [1 | 2, 1, 1 | 4];

function noise(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

interface State {
  t: number; east: number; north: number; alt: number; heading: number; speed: number;
  roll: number; pitch: number; yaw: number; g: number;
  throttle: number; amps: number; mah: number; escT: number; battT: number; rxV: number; mode: 0 | 1 | 2;
}

const DT = 0.1;
const range = (from: number, to: number, t: number) => Math.max(0, Math.min(1, (t - from) / (to - from)));

/** The flight at 10 Hz. */
function simulateFlight(): State[] {
  const out: State[] = [];
  const s: State = { t: 0, east: -60, north: 0, alt: 0, heading: 90, speed: 0, roll: 0, pitch: 0, yaw: 0, g: 1, throttle: 0, amps: 0, mah: 0, escT: 24, battT: 23, rxV: 7.4, mode: 0 };
  for (let k = 0; k <= 390 / DT; k++) {
    const t = k * DT, ph = phaseAt(t);
    let speed = 0, climb = 0, turn = 0, roll = noise(k) * 4, pitch = noise(k * 2) * 4, yaw = noise(k * 3) * 4, g = 1, throttle = 0, amps = 0;
    let farOut = false;
    switch (ph) {
      case "takeoff":
        speed = Math.min(18, 1.6 * (t - 20)); climb = t > 26 ? 4 : 0; throttle = 70; amps = 20 + noise(k) * 1.5; break;
      case "loops": {
        const loop = Math.sin((2 * Math.PI * (t - 35)) / 8);
        speed = 20 + 4 * loop; climb = 9 * loop + (50 - s.alt) * 0.2;
        pitch = 45 + noise(k * 2) * 6;
        // A slow roll every 10 s.
        if ((t - 35) % 10 < 1.5) roll = 400 + noise(k) * 20;
        g = 1 + 3.5 * Math.max(0, loop) + noise(k * 5) * 0.1;
        throttle = 70 + 30 * Math.max(0, loop); amps = 13 + 8 * Math.max(0, loop) + noise(k) * 1.2; break;
      }
      case "knife": {
        // One low pass far out (112–135 s): the link gets weak there.
        farOut = t >= 112 && t < 135;
        speed = 18; climb = ((farOut ? 6 : 30) - s.alt) * 0.3;
        yaw = noise(k * 3) * 8; g = 1.2 + noise(k * 5) * 0.1;
        throttle = 60; amps = 14 + noise(k) * 1.2; break;
      }
      case "hover": {
        speed = Math.max(0.4, 18 - 3 * (t - 150)); climb = (15 - s.alt) * 0.3;
        // Torque roll: the plane turns around its own axis in the hover.
        if (t >= 175 && t < 205) yaw = 200 + noise(k * 3) * 15;
        throttle = 55 + noise(k) * 3; amps = 19 + noise(k) * 1.5; break;
      }
      case "tumbles": {
        const a = Math.sin(t * 1.9), burst = Math.max(0, Math.sin(t * 2.3)) ** 2;
        speed = 12 + 8 * Math.sin(t / 3); climb = (40 - s.alt) * 0.25 + 6 * Math.sin(t / 2);
        roll = 600 * Math.sin(t * 2); pitch = 500 * Math.cos(t * 1.7); yaw = 300 * Math.sin(t * 1.3);
        g = a < -0.92 ? -3 : 1 + 6 * Math.max(0, a) ** 3;
        throttle = 30 + 70 * burst; amps = 10 + 38 * burst + noise(k) * 1.5; break;
      }
      case "harrier":
        speed = 6.5; climb = (10 - s.alt) * 0.3; turn = 10; pitch = noise(k * 2) * 10;
        throttle = 50; amps = 15 + noise(k) * 1.2; break;
      case "landing":
        speed = Math.max(0, 12 * (1 - range(330, 352, t))); climb = s.alt > 0 ? -s.alt / Math.max(2, 348 - t) : 0;
        throttle = 20 * (1 - range(330, 345, t)); amps = throttle > 1 ? 5 : 0; break;
      case "ground":
        break;
    }
    // Stay in front of the pilot; on the far pass fly straight out until 123 s, then come back.
    const dist = Math.hypot(s.east, s.north);
    const steer = (away: boolean) => {
      const want = (Math.atan2(away ? s.east : -s.east, away ? s.north : -s.north) * 180) / Math.PI;
      const diff = ((want - s.heading + 540) % 360) - 180;
      turn = Math.max(-45, Math.min(45, diff));
    };
    if (farOut) steer(t < 123);
    else if (ph !== "ground" && ph !== "hover" && dist > 130) steer(false);
    s.heading = (s.heading + turn * DT + 360) % 360;
    s.alt = ph === "ground" ? 0 : Math.max(0, s.alt + climb * DT);
    const h = (s.heading * Math.PI) / 180;
    s.east += Math.sin(h) * speed * DT;
    s.north += Math.cos(h) * speed * DT;
    s.mah += (amps * DT) / 3.6;
    s.escT += (24 + amps * 1.6 - s.escT) * 0.008;
    s.battT += (23 + amps * 1.1 - s.battT) * 0.004;
    // HV servos pull the receiver voltage down in the tumbles.
    const load = (Math.abs(roll) + Math.abs(pitch)) / 1100;
    s.rxV = 7.4 - 0.45 * load + noise(k * 9) * 0.01;
    Object.assign(s, { t, speed, roll, pitch, yaw, g: g + (ph === "ground" ? 0 : noise(k * 7) * 0.05), throttle, amps, mode: modeAt(t) });
    out.push({ ...s });
  }
  return out;
}

/** The bench run: 45 s standing, motor up to full and back between 15 and 27 s. */
function simulateGroundTest(): State[] {
  const out: State[] = [];
  let mah = 0, escT = 22, battT = 22;
  for (let k = 0; k <= 45 / DT; k++) {
    const t = k * DT;
    const throttle = t < 15 || t > 27 ? 0 : 100 * Math.sin((Math.PI * (t - 15)) / 12);
    const amps = throttle > 1 ? throttle * 0.5 + noise(k) * 0.8 : 0;
    mah += (amps * DT) / 3.6;
    escT += (22 + amps * 0.9 - escT) * 0.004;
    battT += (22 + amps * 0.75 - battT) * 0.002;
    out.push({ t, east: -80, north: -20, alt: 0, heading: 90, speed: 0, roll: noise(k) * 3, pitch: noise(k * 2) * 3, yaw: noise(k * 3) * 3, g: 1 + noise(k * 7) * 0.02, throttle, amps, mah, escT, battT, rxV: 7.4 + noise(k * 9) * 0.01, mode: 0 });
  }
  return out;
}

/** Records of one session from the simulated states; the 0x7c packet gives the wall-clock start. */
function records(sim: State[], startUnix: number, tickBase: number, mahBefore: number): EncodedRecord[] {
  const recs: EncodedRecord[] = [];
  const kx = 6_371_000 * (Math.PI / 180) * Math.cos((DEMO_HOME.lat * Math.PI) / 180);
  const ky = 6_371_000 * (Math.PI / 180);
  let frameLosses = 0, fades = 0, fadesB = 0, holds = 0;
  // The hold: half a second without any frame, in the middle of the low pass far out.
  const holdFrom = sim.findIndex((s) => s.t >= HOLD_AT_S);
  const inHold = (i: number) => holdFrom >= 0 && i >= holdFrom && i < holdFrom + HOLD_RECORDS;
  sim.forEach((s, i) => {
    const tick = tickBase + i * 10;
    const dist = Math.hypot(s.east, s.north);
    // Low and far out the signal drops sharply (trees between pilot and model).
    const shade = s.alt < 10 && dist > 200 ? 13 : 0;
    const dbm = inHold(i) ? -91 + Math.round(noise(i * 5)) : Math.round(-44 - 0.1 * dist - s.alt * 0.05 - shade + noise(i * 5) * 2);
    if (inHold(i)) {
      // 45 frames in a row lost on every receiver; counted once when it ends.
      frameLosses += 8; fades += 8; fadesB += 8;
      if (i === holdFrom + HOLD_RECORDS - 1) holds++;
    } else if (dbm < -80) frameLosses++;
    if (dbm < -68 && noise(i * 13) > 0.4) fades++;
    // Remote receiver B sits where the fuselage shades it on its side and upside down.
    const sideways = Math.abs(s.yaw) > 60 || Math.abs(s.roll) > 250 || Math.abs(s.pitch) > 250;
    if ((dbm < -64 && noise(i * 17) > 0.2) || (sideways && noise(i * 19) > 0.55)) fadesB++;
    if (i === 1) recs.push({ tick, packet: new Packet(0x7c).u32le(8, startUnix).b });
    const cellV = 4.18 - ((mahBefore + s.mah) / CAPACITY_MAH) * 0.55;
    if (i % 2 === 0) {
      const v = CELLS * cellV - s.amps * 0.022;
      recs.push({ tick: tick + 1, packet: new Packet(0x20).u16be(2, s.throttle > 1 ? 2000 + s.throttle * 45 : 0).u16be(4, v * 100).u16be(6, s.escT * 10).u16be(8, s.amps * 100)
        .u16be(10, (s.escT - 6) * 10).u8(12, 0xff).u8(13, s.rxV / 0.05).u8(14, s.throttle * 2).u8(15, s.throttle * 1.8).b });
    }
    recs.push({ tick: tick + 2, packet: new Packet(0x7f).u16be(2, fades).u16be(4, fadesB).u16be(6, 0xffff).u16be(8, 0xffff).u16be(10, frameLosses).u16be(12, holds).u16be(14, s.rxV * 100).b });
    recs.push({ tick: tick + 3, packet: new Packet(0x7e).u16be(2, 0xffff).u16be(4, 0xffff).u16be(6, 0x7fff).i8(8, dbm).i8(9, Math.max(1, Math.min(100, 100 + (dbm + 50) * 1.6))).u16be(14, 900 + Math.floor(i / 10)).b });
    if (i % 3 === 0) {
      recs.push({ tick: tick + 4, packet: new Packet(0x14).i16be(2, noise(i) * 30).i16be(4, noise(i * 2) * 30).i16be(6, -s.g * 100).i16be(8, 60).i16be(10, 60).i16be(12, 700).i16be(14, -300).b });
      recs.push({ tick: tick + 5, packet: new Packet(0x1a).i16be(2, s.roll * 10).i16be(4, s.pitch * 10).i16be(6, s.yaw * 10).i16be(8, 6000).i16be(10, 5000).i16be(12, 3000).b });
    }
    if (i % 5 === 0) {
      // Flight controller status, pages rotating; page 0x80 carries the AS3X gains.
      const page = 0x80 + ((i / 5) % 3);
      const p = new Packet(0x05).u8(2, MODE_BITS[s.mode]).u8(3, 2).u8(4, 0x80 + s.mode).u8(5, page);
      if (page === 0x80) p.u8(6, DEMO_3D_GAINS[0]).u8(7, DEMO_3D_GAINS[1]).u8(8, DEMO_3D_GAINS[2]);
      if (page === 0x82) p.u8(6, 45).u8(7, 45).u8(8, 30).u8(9, 30);
      recs.push({ tick: tick + 6, packet: p.b });
      const lat = DEMO_HOME.lat + s.north / ky, lon = DEMO_HOME.lon + s.east / kx;
      const bcdDeg = (d: number) => Math.floor(d) * 1_000_000 + Math.round((d - Math.floor(d)) * 60 * 10_000);
      const gpsAlt = 312 + s.alt;
      recs.push({ tick: tick + 7, packet: new Packet(0x16).bcdLe(2, 2, (gpsAlt % 1000) * 10).bcdLe(4, 4, bcdDeg(lat)).bcdLe(8, 4, bcdDeg(lon)).bcdLe(12, 2, s.heading * 10).bcdLe(14, 1, 9).u8(15, 1 | 2 | 8 | 16 | 32).b });
      recs.push({ tick: tick + 8, packet: new Packet(0x17).bcdLe(2, 2, (s.speed / 0.514444) * 10).bcdLe(4, 4, 150500).bcdLe(8, 1, 12).bcdLe(9, 1, Math.floor(gpsAlt / 1000)).b });
    }
    if (i % 25 === 0) {
      const kind = (i / 25) % 4;
      const sag = s.amps * 0.0055;
      const cells = [0, 1, 2, 3].map((c) => (cellV - sag - c * 0.002) * 1000);
      if (kind === 0) recs.push({ tick: tick + 9, packet: new Packet(0x42).u8(2, 0x00).i8(3, s.battT).u16le(10, Math.min(...cells)).u16le(12, Math.max(...cells)).b });
      if (kind === 1) recs.push({ tick: tick + 9, packet: new Packet(0x42).u8(2, 0x10).i8(3, s.battT).u16le(4, cells[0]).u16le(6, cells[1]).u16le(8, cells[2]).u16le(10, cells[3]).u16le(12, 0xffff).u16le(14, 0xffff).b });
      if (kind === 2) { const p = new Packet(0x42).u8(2, 0x80).u8(3, 1).u8(4, CELLS).u8(5, 0).u16le(6, 38); p.b.set(BATTERY_ID, 8); recs.push({ tick: tick + 9, packet: p.b }); }
      if (kind === 3) recs.push({ tick: tick + 9, packet: new Packet(0x42).u8(2, 0x90).u16le(4, CAPACITY_MAH).u16le(6, 450).u16le(8, 3000).u16le(10, 3300).u16le(12, 4200).i8(14, -20).i8(15, 60).b });
    }
  });
  return recs.sort((a, b) => a.tick - b.tick);
}

const HEADERS = () => [modelHeader(DEMO_3D_MODEL, 5), ...[0x20, 0x42, 0x14, 0x1a, 0x16, 0x17].map((id) => sensorHeader(id)), sensorHeader(0x02, 0x7e)];

/** The bench run before the flight. */
export function demoGroundTestSession(): { headers: Uint8Array[]; records: EncodedRecord[] } {
  return { headers: HEADERS(), records: records(simulateGroundTest(), DEMO_GROUND_TEST_UNIX, 120_000 + 53 * 60 * 100, 0) };
}

/** The 3D flight, on the same battery as the bench run. */
export function demo3dSession(): { headers: Uint8Array[]; records: EncodedRecord[] } {
  const bench = simulateGroundTest().at(-1)!.mah;
  return { headers: HEADERS(), records: records(simulateFlight(), DEMO_3D_UNIX, 120_000 + 60 * 60 * 100, bench) };
}
