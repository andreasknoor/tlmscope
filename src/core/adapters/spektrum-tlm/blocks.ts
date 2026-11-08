import { u32le } from "./bytes.ts";

/**
 * Splits a .TLM file into sessions.
 *
 * File layout (verified on NX8+ logs):
 * - header block: FF FF FF FF + 32 bytes
 * - data record:  uint32 LE timestamp (10 ms ticks) + 16-byte X-Bus packet
 * A run of consecutive header blocks starts a new session (one per model power-up).
 */
export const HEADER_SIZE = 36;
export const RECORD_SIZE = 20;
export const PACKET_SIZE = 16;

export interface RawSession {
  index: number;
  /** Byte offset of the first header block (or first record if the file starts with data). */
  offset: number;
  headers: Uint8Array[];
  /** Tick (10 ms) per record. */
  ticks: number[];
  /** Byte offset of each record's 16-byte packet. */
  packetOffsets: number[];
}

export interface BlockResult {
  sessions: RawSession[];
  /** Bytes at the end that form neither a header block nor a full record. */
  trailingBytes: number;
  /** Data records that appeared before the first header block. */
  orphanRecords: number;
}

const isHeader = (d: Uint8Array, i: number) =>
  d[i] === 0xff && d[i + 1] === 0xff && d[i + 2] === 0xff && d[i + 3] === 0xff;

export function readBlocks(data: Uint8Array): BlockResult {
  const sessions: RawSession[] = [];
  let cur: RawSession | null = null;
  let inHeader = false;
  let orphanRecords = 0;
  let i = 0;
  while (i + 4 <= data.length) {
    if (isHeader(data, i)) {
      if (i + HEADER_SIZE > data.length) break;
      if (!inHeader) {
        cur = { index: sessions.length, offset: i, headers: [], ticks: [], packetOffsets: [] };
        sessions.push(cur);
        inHeader = true;
      }
      cur!.headers.push(data.subarray(i + 4, i + HEADER_SIZE));
      i += HEADER_SIZE;
      continue;
    }
    if (i + RECORD_SIZE > data.length) break;
    inHeader = false;
    if (!cur) {
      // Data before any header: keep it in an implicit session so nothing is lost.
      cur = { index: 0, offset: i, headers: [], ticks: [], packetOffsets: [] };
      sessions.push(cur);
    }
    if (cur.headers.length === 0) orphanRecords++;
    cur.ticks.push(u32le(data, i));
    cur.packetOffsets.push(i + 4);
    i += RECORD_SIZE;
  }
  return { sessions, trailingBytes: data.length - i, orphanRecords };
}
