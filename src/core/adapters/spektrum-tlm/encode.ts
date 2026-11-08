/**
 * Writes Spektrum .TLM files. Used for the synthetic demo flight and for tests,
 * so the decoder can be checked against data with known values.
 */

export interface EncodedRecord { tick: number; packet: Uint8Array }

export function header(bytes: number[]): Uint8Array {
  const b = new Uint8Array(36);
  b.set([0xff, 0xff, 0xff, 0xff]);
  b.set(bytes.slice(0, 32), 4);
  return b;
}

export function modelHeader(name: string): Uint8Array {
  const text = Array.from(name.slice(0, 23), (c) => c.charCodeAt(0) & 0x7f);
  return header([0x01, 0x00, 0xb2, 0x00, 0x10, 0x27, 0x02, 0x20, ...text]);
}

export function sensorHeader(id: number, secondary = id): Uint8Array {
  return header([id, secondary, 0xff, 0x01]);
}

/** Concatenates header blocks and records into a file. */
export function encodeTlm(sessions: { headers: Uint8Array[]; records: EncodedRecord[] }[]): Uint8Array {
  let size = 0;
  for (const s of sessions) size += s.headers.length * 36 + s.records.length * 20;
  const out = new Uint8Array(size);
  let o = 0;
  for (const s of sessions) {
    for (const h of s.headers) { out.set(h, o); o += 36; }
    for (const r of s.records) {
      out[o] = r.tick & 0xff; out[o + 1] = (r.tick >>> 8) & 0xff; out[o + 2] = (r.tick >>> 16) & 0xff; out[o + 3] = (r.tick >>> 24) & 0xff;
      out.set(r.packet.subarray(0, 16), o + 4);
      o += 20;
    }
  }
  return out;
}

/** Small packet writer: 16 bytes, id and secondary id preset. */
export class Packet {
  readonly b = new Uint8Array(16);
  constructor(id: number, secondary = 0) { this.b[0] = id; this.b[1] = secondary; }
  u8(o: number, v: number) { this.b[o] = Math.max(0, Math.min(255, Math.round(v))); return this; }
  i8(o: number, v: number) { this.b[o] = Math.round(v) & 0xff; return this; }
  u16be(o: number, v: number) { const x = Math.max(0, Math.min(0xffff, Math.round(v))); this.b[o] = x >> 8; this.b[o + 1] = x & 0xff; return this; }
  i16be(o: number, v: number) { const x = Math.round(v) & 0xffff; this.b[o] = x >> 8; this.b[o + 1] = x & 0xff; return this; }
  u16le(o: number, v: number) { const x = Math.round(v) & 0xffff; this.b[o] = x & 0xff; this.b[o + 1] = x >> 8; return this; }
  u32le(o: number, v: number) { const x = Math.round(v) >>> 0; for (let k = 0; k < 4; k++) this.b[o + k] = (x >>> (8 * k)) & 0xff; return this; }
  /** Little-endian packed BCD with `len` bytes. */
  bcdLe(o: number, len: number, v: number) {
    let x = Math.round(Math.abs(v));
    for (let k = 0; k < len; k++) { const two = x % 100; x = Math.floor(x / 100); this.b[o + k] = ((Math.floor(two / 10)) << 4) | (two % 10); }
    return this;
  }
}
