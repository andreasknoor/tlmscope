import { u32le } from "./bytes.ts";

/**
 * Splits a .TLM file into sessions.
 *
 * File layout (verified on NX8+ logs):
 * - header block: FF FF FF FF + 32 bytes
 * - data record:  uint32 LE timestamp (10 ms ticks) + 16-byte X-Bus packet
 * A run of consecutive header blocks starts a new session (one per model power-up).
 *
 * Damaged files (bad SD card writes, cut-off transfers) are expected. The reader
 * keeps whatever still makes sense and counts what it had to skip.
 */
export const HEADER_SIZE = 36;
export const RECORD_SIZE = 20;
export const PACKET_SIZE = 16;

/** Largest time step between neighbouring records that is still believable (10 min; real logs stay below 1 min). */
export const MAX_TICK_STEP = 60_000;
/** Longest believable session (24 h). Records further away from the session's typical time are dropped. */
export const MAX_SESSION_TICKS = 24 * 3600 * 100;
/** Records looked at when deciding whether FF FF FF FF starts a header or is a damaged timestamp. */
const PROBE = 8;

export interface RawSession {
  index: number;
  /** Byte offset of the first header block (or first record if the file starts with data). */
  offset: number;
  headers: Uint8Array[];
  /** Tick (10 ms) per record. */
  ticks: number[];
  /** Byte offset of each record's 16-byte packet. */
  packetOffsets: number[];
  /** Records dropped because their timestamp does not fit the session. */
  droppedRecords: number;
}

export interface BlockResult {
  sessions: RawSession[];
  /** Bytes at the end that form neither a header block nor a full record. */
  trailingBytes: number;
  /** Data records that appeared before the first header block. */
  orphanRecords: number;
  /** FF FF FF FF sequences read as a damaged record timestamp rather than a header. */
  falseHeaders: number;
}

const isHeader = (d: Uint8Array, i: number) =>
  d[i] === 0xff && d[i + 1] === 0xff && d[i + 2] === 0xff && d[i + 3] === 0xff;

/** Number of records from `start` (up to PROBE) whose timestamps follow each other. A header block ends the run. */
function alignedRun(d: Uint8Array, start: number): number {
  let n = 0;
  let prev: number | null = null;
  for (let i = start; n < PROBE && i + RECORD_SIZE <= d.length && !isHeader(d, i); i += RECORD_SIZE) {
    const t = u32le(d, i);
    if (prev !== null && (t < prev || t - prev > MAX_TICK_STEP)) break;
    prev = t;
    n++;
  }
  return n;
}

/**
 * Between data records, FF FF FF FF is either a new header run or a damaged timestamp.
 * Whichever reading lets the following records line up in time wins; ties go to the header.
 */
function isRealHeader(d: Uint8Array, i: number): boolean {
  let j = i;
  while (j + HEADER_SIZE <= d.length && isHeader(d, j)) j += HEADER_SIZE;
  if (j - i > HEADER_SIZE || j + RECORD_SIZE > d.length) return true;
  return alignedRun(d, j) >= alignedRun(d, i + RECORD_SIZE);
}

/**
 * Drops records whose timestamp fits neither neighbour, then records far away from the
 * session's median time. One damaged timestamp would otherwise stretch a session to days.
 */
function dropImplausibleTicks(s: RawSession): void {
  const n = s.ticks.length;
  if (n < 2) return;
  const near = (a: number, b: number) => Math.abs(s.ticks[a] - s.ticks[b]) <= MAX_TICK_STEP;
  const keep: number[] = [];
  for (let i = 0; i < n; i++) if ((i > 0 && near(i, i - 1)) || (i < n - 1 && near(i, i + 1))) keep.push(i);
  const sorted = keep.map((i) => s.ticks[i]).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const kept = keep.filter((i) => Math.abs(s.ticks[i] - median) <= MAX_SESSION_TICKS);
  if (kept.length === n) return;
  s.droppedRecords = n - kept.length;
  s.ticks = kept.map((i) => s.ticks[i]);
  s.packetOffsets = kept.map((i) => s.packetOffsets[i]);
}

export function readBlocks(data: Uint8Array): BlockResult {
  const sessions: RawSession[] = [];
  let cur: RawSession | null = null;
  let inHeader = false;
  let orphanRecords = 0;
  let falseHeaders = 0;
  let i = 0;
  while (i + 4 <= data.length) {
    if (isHeader(data, i)) {
      if (i + HEADER_SIZE > data.length) break;
      const midData = !inHeader && cur !== null && cur.ticks.length > 0;
      if (!midData || isRealHeader(data, i)) {
        if (!inHeader) {
          cur = { index: sessions.length, offset: i, headers: [], ticks: [], packetOffsets: [], droppedRecords: 0 };
          sessions.push(cur);
          inHeader = true;
        }
        cur!.headers.push(data.subarray(i + 4, i + HEADER_SIZE));
        i += HEADER_SIZE;
        continue;
      }
      falseHeaders++;
    }
    if (i + RECORD_SIZE > data.length) break;
    inHeader = false;
    if (!cur) {
      // Data before any header: keep it in an implicit session so nothing is lost.
      cur = { index: 0, offset: i, headers: [], ticks: [], packetOffsets: [], droppedRecords: 0 };
      sessions.push(cur);
    }
    if (cur.headers.length === 0) orphanRecords++;
    cur.ticks.push(u32le(data, i));
    cur.packetOffsets.push(i + 4);
    i += RECORD_SIZE;
  }
  for (const s of sessions) dropImplausibleTicks(s);
  return { sessions, trailingBytes: data.length - i, orphanRecords, falseHeaders };
}
