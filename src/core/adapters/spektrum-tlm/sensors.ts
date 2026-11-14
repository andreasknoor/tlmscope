import type { ChannelId, Unit } from "../../model/types.ts";
import { bcdLe, i16be, i8, u16be, u16le, u32le } from "./bytes.ts";

/**
 * Spektrum X-Bus sensor packets (16 bytes: byte 0 = sensor id, byte 1 = secondary id).
 * Each definition decodes one packet into fields. A field with `channel` feeds that
 * canonical channel; every field also shows up in the data inventory.
 *
 * Sources: Spektrum "spektrumTelemetrySensors.h" structure layouts, checked against
 * the sample logs. Anything marked unverified is a reading of the bytes, not a spec.
 */
export interface Field {
  name: string;
  unit: Unit | string;
  value: number | null;
  channel?: ChannelId;
  /** Cumulative device counter; converted to counts since session start. */
  counter?: boolean;
  /** Value is an index for a categorical channel. */
  categorical?: boolean;
}

export interface SensorDef {
  label: string;
  understood: "full" | "partial" | "none";
  note?: string;
  decode(p: Uint8Array): Field[];
}

const none16 = (v: number, scale: number) => (v === 0xffff ? null : v * scale);
const none8 = (v: number, scale: number) => (v === 0xff ? null : v * scale);
const r = (v: number | null, d = 3) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Stream key: sensor id, plus the message type for Smart Battery packets. */
export function streamKey(p: Uint8Array): string {
  const id = p[0];
  const k = "0x" + id.toString(16).padStart(2, "0");
  if (id === 0x42) return `${k}/0x${(p[2] & 0xf0).toString(16).padStart(2, "0")}`;
  if (id === 0x7a) return `${k}/${p[1]}`;
  return k;
}

export const SENSORS: Record<string, SensorDef> = {
  "0x20": {
    label: "ESC (Smart ESC, e.g. Avian)",
    understood: "full",
    decode: (p) => [
      { name: "Motor speed (electrical)", unit: "1/min", value: none16(u16be(p, 2), 10), channel: "rpm_electrical" },
      { name: "Input voltage", unit: "V", value: r(none16(u16be(p, 4), 0.01)), channel: "pack_voltage" },
      { name: "Controller temperature", unit: "°C", value: r(none16(u16be(p, 6), 0.1)), channel: "temperature.esc" },
      { name: "Motor current", unit: "A", value: r(none16(u16be(p, 8), 0.01)), channel: "motor_current" },
      { name: "BEC temperature", unit: "°C", value: r(none16(u16be(p, 10), 0.1)), channel: "temperature.bec" },
      { name: "BEC current", unit: "A", value: r(none8(p[12], 0.1)), channel: "bec_current" },
      { name: "BEC voltage", unit: "V", value: r(none8(p[13], 0.05)), channel: "bec_voltage" },
      { name: "Throttle", unit: "%", value: none8(p[14], 0.5), channel: "throttle_output" },
      { name: "Power output", unit: "%", value: none8(p[15], 0.5), channel: "power_output" },
    ],
  },
  "0x40": {
    label: "Vario",
    understood: "full",
    decode: (p) => {
      const v = (o: number) => i16be(p, o) / 10;
      return [
        { name: "Altitude", unit: "m", value: v(2), channel: "altitude" },
        { name: "Climb rate 0.25 s", unit: "m/s", value: v(4), channel: "climb_rate.0_25s" },
        { name: "Climb rate 0.5 s", unit: "m/s", value: v(6), channel: "climb_rate.0_5s" },
        { name: "Climb rate 1.0 s", unit: "m/s", value: v(8), channel: "climb_rate" },
        { name: "Climb rate 1.5 s", unit: "m/s", value: v(10), channel: "climb_rate.1_5s" },
        { name: "Climb rate 2.0 s", unit: "m/s", value: v(12), channel: "climb_rate.2_0s" },
        { name: "Climb rate 3.0 s", unit: "m/s", value: v(14), channel: "climb_rate.3_0s" },
      ];
    },
  },
  "0x7f": {
    label: "Flight log (link quality)",
    understood: "full",
    note: "Counters are cumulative since receiver power-up; channels hold counts since session start.",
    decode: (p) => [
      { name: "Fades A", unit: "count", value: none16(u16be(p, 2), 1), channel: "fades.a", counter: true },
      { name: "Fades B", unit: "count", value: none16(u16be(p, 4), 1), channel: "fades.b", counter: true },
      { name: "Fades L", unit: "count", value: none16(u16be(p, 6), 1), channel: "fades.l", counter: true },
      { name: "Fades R", unit: "count", value: none16(u16be(p, 8), 1), channel: "fades.r", counter: true },
      { name: "Frame losses", unit: "count", value: none16(u16be(p, 10), 1), channel: "frame_losses", counter: true },
      { name: "Holds", unit: "count", value: none16(u16be(p, 12), 1), channel: "holds", counter: true },
      { name: "Receiver voltage", unit: "V", value: r(none16(u16be(p, 14), 0.01)), channel: "rx_voltage" },
    ],
  },
  "0x7e": {
    label: "RPM / signal",
    understood: "partial",
    note: "Offset 8 = signal in dBm, offset 9 = signal in % (meaning unverified). Offset 14 counts seconds (Supra log: 48 → 581 in 533 s), most likely the receiver's time since power-on.",
    decode: (p) => {
      const dbm = i8(p, 8);
      const pct = i8(p, 9);
      const temp = i16be(p, 6);
      return [
        { name: "Signal", unit: "dBm", value: dbm < -1 ? dbm : null, channel: "signal_dbm" },
        { name: "Signal quality", unit: "%", value: pct > 0 ? pct : null, channel: "signal_quality" },
        { name: "Pulse time", unit: "µs", value: none16(u16be(p, 2), 1) },
        { name: "Voltage", unit: "V", value: r(none16(u16be(p, 4), 0.01)) },
        { name: "Temperature", unit: "°F", value: temp === 0x7fff ? null : temp },
        { name: "Unknown counter @14", unit: "?", value: u16be(p, 14), channel: "raw:spektrum.0x7e.u16@14" },
      ];
    },
  },
  "0x14": {
    label: "G-meter",
    understood: "full",
    decode: (p) => {
      const g = (o: number) => i16be(p, o) / 100;
      return [
        { name: "G x", unit: "g", value: g(2), channel: "accel.x" },
        { name: "G y", unit: "g", value: g(4), channel: "accel.y" },
        { name: "G z", unit: "g", value: g(6), channel: "accel.z" },
        { name: "Max g x", unit: "g", value: g(8), channel: "accel.max_x" },
        { name: "Max g y", unit: "g", value: g(10), channel: "accel.max_y" },
        { name: "Max g z", unit: "g", value: g(12), channel: "accel.max_z" },
        { name: "Min g z", unit: "g", value: g(14), channel: "accel.min_z" },
      ];
    },
  },
  "0x1a": {
    label: "Gyro",
    understood: "full",
    note: "Axes mapped as x = roll, y = pitch, z = yaw. Checked on the sample flights: y is positive in every turn, z gives the direction.",
    decode: (p) => {
      const w = (o: number) => i16be(p, o) / 10;
      return [
        { name: "Rate x (roll)", unit: "°/s", value: w(2), channel: "rotation_rate.roll" },
        { name: "Rate y (pitch)", unit: "°/s", value: w(4), channel: "rotation_rate.pitch" },
        { name: "Rate z (yaw)", unit: "°/s", value: w(6), channel: "rotation_rate.yaw" },
        { name: "Max rate x", unit: "°/s", value: w(8), channel: "rotation_rate.max_roll" },
        { name: "Max rate y", unit: "°/s", value: w(10), channel: "rotation_rate.max_pitch" },
        { name: "Max rate z", unit: "°/s", value: w(12), channel: "rotation_rate.max_yaw" },
      ];
    },
  },
  "0x05": {
    label: "Flight controller status (AS3X / SAFE)",
    understood: "partial",
    note: "Byte 2 looks like the stabilization mode index (0-based, unverified); byte 4 is 0x80 + the same index. Byte 5 cycles 0x80–0x82 like a page number. Pages 0x81 and 0x82 stay the same within a mode (gains?); page 0x80 changes in flight (live values, not decoded).",
    decode: (p) => [
      { name: "Stabilization mode index (unverified)", unit: "", value: p[2], channel: "flight_mode", categorical: true },
      { name: "Byte 3", unit: "", value: p[3] },
      { name: "Byte 4", unit: "", value: p[4] },
      { name: "Page (byte 5)", unit: "", value: p[5] },
      { name: "Page value 1", unit: "", value: p[6] },
      { name: "Page value 2", unit: "", value: p[7] },
      { name: "Page value 3", unit: "", value: p[8] },
      { name: "Page value 4", unit: "", value: p[9] },
    ],
  },
  "0x42/0x00": {
    label: "Smart battery · live values",
    understood: "partial",
    note: "Little-endian. Fields often arrive partly filled; current and used mAh are sparse and not used.",
    decode: (p) => {
      const vmin = u16le(p, 10);
      const vmax = u16le(p, 12);
      const cellsValid = vmin > 0 && vmax > 0;
      const cur = u32le(p, 4);
      const mah = u16le(p, 8);
      return [
        { name: "Battery temperature", unit: "°C", value: cellsValid ? i8(p, 3) : null, channel: "temperature.battery" },
        { name: "Current (unreliable)", unit: "A", value: cur === 0xffffffff ? null : cur / 1000 },
        { name: "Used (unreliable)", unit: "mAh", value: mah === 0xffff ? null : mah },
        { name: "Lowest cell", unit: "V", value: vmin ? vmin / 1000 : null, channel: "cell_voltage_min" },
        { name: "Highest cell", unit: "V", value: vmax ? vmax / 1000 : null, channel: "cell_voltage_max" },
      ];
    },
  },
  "0x42/0x10": {
    label: "Smart battery · cells 1–6",
    understood: "full",
    decode: (p) => {
      const cells = [0, 1, 2, 3, 4, 5].map((k) => u16le(p, 4 + 2 * k));
      const anyCell = cells.some((c) => c !== 0 && c !== 0xffff);
      return [
        { name: "Battery temperature", unit: "°C", value: anyCell ? i8(p, 3) : null, channel: "temperature.battery" },
        ...cells.map((c, k): Field => ({
          name: `Cell ${k + 1}`, unit: "V", value: c === 0 || c === 0xffff ? null : c / 1000, channel: `cell_voltage.${k + 1}`,
        })),
      ];
    },
  },
  "0x42/0x80": {
    label: "Smart battery · identity",
    understood: "full",
    decode: (p) => {
      const ok = p[3] !== 0 && p[8] !== 0 && p[15] !== 0;
      return [
        { name: "Chemistry (1 = LiPo)", unit: "", value: ok ? p[3] : null },
        { name: "Cells", unit: "", value: ok ? p[4] : null },
        { name: "Manufacturer", unit: "", value: ok ? p[5] : null },
        { name: "Charge cycles", unit: "", value: ok ? u16le(p, 6) : null },
      ];
    },
  },
  "0x42/0x90": {
    label: "Smart battery · limits",
    understood: "full",
    decode: (p) => {
      const ok = p.subarray(4).some((x) => x !== 0);
      const v = (x: number) => (ok ? x : null);
      return [
        { name: "Capacity", unit: "mAh", value: v(u16le(p, 4)) },
        { name: "Discharge rating (0.1 C units, unverified)", unit: "C", value: v(u16le(p, 6) / 10) },
        { name: "Empty, hard limit", unit: "V", value: v(u16le(p, 8) / 1000) },
        { name: "Empty, 0 % charge", unit: "V", value: v(u16le(p, 10) / 1000) },
        { name: "Full", unit: "V", value: v(u16le(p, 12) / 1000) },
        { name: "Min temperature", unit: "°C", value: v(i8(p, 14)) },
        { name: "Max temperature", unit: "°C", value: v(i8(p, 15)) },
      ];
    },
  },
  "0x0c": {
    label: "Text generator",
    understood: "full",
    note: "Byte 2 = line number, 13 ASCII characters. Here: the Avian ESC programming-menu text.",
    decode: (p) => [{ name: "Line", unit: "", value: p[2] }],
  },
  "0x7c": {
    label: "Clock",
    understood: "partial",
    note: "Bytes 8–11: Unix time (seconds, little-endian) once per session. Other bytes always zero in the samples.",
    decode: (p) => [{ name: "Start time (Unix)", unit: "s", value: u32le(p, 8) }],
  },
  "0x16": {
    label: "GPS location",
    understood: "full",
    note: "Little-endian BCD as in the specification. Checked against a real GPS log (Supra Fly, 2025/26): positions, course and HDOP are consistent. The altitude equals the vario height (relative to the take-off spot) to 0.1 m.",
    decode: (p) => decodeGpsLoc(p),
  },
  "0x17": {
    label: "GPS status",
    understood: "full",
    note: "Little-endian BCD as in the specification. Checked against a real GPS log: the ground speed (knots) matches the distance between positions. Records that are all zero carry no data.",
    decode: (p) => decodeGpsStat(p),
  },
  "0x7a/1": {
    label: "Transmitter stick positions",
    understood: "partial",
    note: "Only in AutoLog files. Signed 12-bit values (−2047…2047), little-endian, about 35 per second. Offset 4 is the throttle stick (matches the ESC throttle, r = 0.88). In flight, offset 6 follows the pitch rate (r = −0.72) and offset 8 the roll rate (r = +0.76): elevator and aileron. Offset 10 is probably the rudder (no link to the yaw rate in the sample flights; the model may not use it). Offset 2 changes only between sessions, like a knob or slider. Signs and whether trims and rates are included are not verified.",
    decode: (p) => {
      const v = (o: number) => (((p[o] | (p[o + 1] << 8)) << 16) >> 16);
      return [
        { name: "Knob or slider? @2", unit: "", value: v(2), channel: "raw:spektrum.0x7a.@2" },
        { name: "Throttle stick", unit: "%", value: Math.round(((v(4) + 2047) / 4094) * 1000) / 10, channel: "throttle_command" },
        { name: "Elevator stick @6", unit: "", value: v(6), channel: "raw:spektrum.0x7a.@6" },
        { name: "Aileron stick @8", unit: "", value: v(8), channel: "raw:spektrum.0x7a.@8" },
        { name: "Rudder stick? @10", unit: "", value: v(10), channel: "raw:spektrum.0x7a.@10" },
        { name: "Value @12", unit: "", value: v(12) },
      ];
    },
  },
  "0x7a/0": {
    label: "Transmitter status bits",
    understood: "partial",
    note: "Only in AutoLog files, alternating with the stick positions. Bytes 2–3 are a 16-bit field (little-endian) that changes only when a switch is moved; it looks like eight two-bit switch positions. Bit 14 is the throttle hold: set means the motor is locked (checked against the ESC: the motor never ran with it set). The other switch fields are not mapped yet.",
    decode: (p) => [
      { name: "Byte 2", unit: "", value: p[2] },
      { name: "Byte 3", unit: "", value: p[3] },
      { name: "Throttle hold (bit 14)", unit: "", value: (p[3] >> 6) & 1 },
    ],
  },
  "0x00": { label: "Empty slot", understood: "none", note: "No sensor id. Mostly zeros; some records carry fragments of other packets.", decode: () => [] },
};

/** Labels for sensors we know by name but do not decode. */
export const KNOWN_UNDECODED: Record<string, string> = {
  "0x76": "Unknown 0x76",
  "0x12": "Altitude sensor (declared; the Supra header pairs it with 0x40, the vario)",
  "0x11": "Airspeed sensor (declared, only zeros seen)",
  "0x50": "User-defined sensor (probably; content unknown)",
  "0xff": "Damaged record (no sensor)",
};

/** GPS flags, byte 15 of 0x16. */
export const GPS_FLAG = { NORTH: 1, EAST: 2, LON_OVER_99: 4, FIX_VALID: 8, DATA_RECEIVED: 16, FIX_3D: 32, NEGATIVE_ALT: 128 } as const;

/** BCD "DDMM.MMMM" (8 digits) to decimal degrees; null for minutes of 60 or more (damaged data). */
function bcdDegrees(v: number | null): number | null {
  if (v === null) return null;
  const deg = Math.floor(v / 1_000_000);
  const minutes = (v % 1_000_000) / 10_000;
  return minutes >= 60 ? null : deg + minutes / 60;
}

export function decodeGpsLoc(p: Uint8Array): Field[] {
  const flags = p[15];
  const altLow = bcdLe(p, 2, 2);
  let lat = bcdDegrees(bcdLe(p, 4, 4));
  let lon = bcdDegrees(bcdLe(p, 8, 4));
  if (lat !== null && !(flags & GPS_FLAG.NORTH)) lat = -lat;
  if (lon !== null) {
    if (flags & GPS_FLAG.LON_OVER_99) lon += 100;
    if (!(flags & GPS_FLAG.EAST)) lon = -lon;
  }
  // A position off the globe is damaged data; it would also break the map.
  const onGlobe = lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  if (!onGlobe) lat = lon = null;
  const fix = (flags & GPS_FLAG.FIX_VALID) !== 0 && onGlobe;
  const course = bcdLe(p, 12, 2);
  const hdop = bcdLe(p, 14, 1);
  return [
    { name: "Latitude", unit: "°", value: fix ? lat : null, channel: "gps.lat" },
    { name: "Longitude", unit: "°", value: fix ? lon : null, channel: "gps.lon" },
    { name: "Altitude, low part", unit: "m", value: altLow === null ? null : altLow / 10 },
    { name: "Course", unit: "°", value: fix && course !== null ? course / 10 : null, channel: "heading" },
    { name: "HDOP", unit: "", value: hdop === null ? null : hdop / 10, channel: "gps.hdop" },
    { name: "Fix (0 none, 1 2D, 2 3D)", unit: "", value: fix ? (flags & GPS_FLAG.FIX_3D ? 2 : 1) : 0, channel: "gps.fix", categorical: true },
    { name: "Flags", unit: "", value: flags },
  ];
}

export function decodeGpsStat(p: Uint8Array): Field[] {
  const speedKnots = bcdLe(p, 2, 2);
  const utc = bcdLe(p, 4, 4);
  const sats = bcdLe(p, 8, 1);
  const altHigh = bcdLe(p, 9, 1);
  return [
    { name: "Ground speed", unit: "m/s", value: speedKnots === null ? null : r((speedKnots / 10) * 0.514444), channel: "ground_speed" },
    { name: "UTC time (HHMMSS.S)", unit: "", value: utc === null ? null : utc / 10 },
    { name: "Satellites", unit: "count", value: sats, channel: "gps.satellites" },
    { name: "Altitude, thousands", unit: "km", value: altHigh },
  ];
}

export const GPS_FIX_CATEGORIES = ["No fix", "2D fix", "3D fix"];
