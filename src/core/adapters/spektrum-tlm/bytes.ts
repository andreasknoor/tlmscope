/** Byte helpers. Spektrum X-Bus packets are big-endian, except Smart Battery (0x42) and GPS (0x16/0x17). */

export const u8 = (b: Uint8Array, o: number): number => b[o];
export const i8 = (b: Uint8Array, o: number): number => (b[o] << 24) >> 24;
export const u16be = (b: Uint8Array, o: number): number => (b[o] << 8) | b[o + 1];
export const i16be = (b: Uint8Array, o: number): number => (u16be(b, o) << 16) >> 16;
export const u16le = (b: Uint8Array, o: number): number => b[o] | (b[o + 1] << 8);
export const u32le = (b: Uint8Array, o: number): number =>
  (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/**
 * Packed BCD, little-endian byte order (least significant byte first), two digits per byte.
 * Returns null if any nibble is not a decimal digit.
 */
export function bcdLe(b: Uint8Array, o: number, len: number): number | null {
  let v = 0;
  for (let k = len - 1; k >= 0; k--) {
    const byte = b[o + k];
    const hi = byte >> 4;
    const lo = byte & 0x0f;
    if (hi > 9 || lo > 9) return null;
    v = v * 100 + hi * 10 + lo;
  }
  return v;
}

export const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(" ");

export const ascii = (b: Uint8Array): string =>
  Array.from(b, (x) => (x >= 32 && x < 127 ? String.fromCharCode(x) : " ")).join("");
