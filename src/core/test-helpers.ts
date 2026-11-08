import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseLog } from "./adapters/registry.ts";
import type { LogFile, Session } from "./model/types.ts";

export const SAMPLES_DIR = join(import.meta.dirname, "../../samples");
export const MAIN_SAMPLE = "Easy_Glider_4.TLM";

/** The real logs are private and not in the repository; tests that need them are skipped without them. */
export const hasSamples = existsSync(join(SAMPLES_DIR, MAIN_SAMPLE));

const cache = new Map<string, LogFile>();

/** Parses a sample file once per test run. */
export function loadSample(name: string): LogFile {
  let log = cache.get(name);
  if (!log) {
    log = parseLog(new Uint8Array(readFileSync(join(SAMPLES_DIR, name))), name);
    cache.set(name, log);
  }
  return log;
}

export const sampleNames = (): string[] => (existsSync(SAMPLES_DIR) ? readdirSync(SAMPLES_DIR).filter((f) => /\.tlm$/i.test(f)).sort() : []);

export function channelMax(s: Session, id: string): number | null {
  const ch = s.channels.get(id);
  if (!ch) return null;
  let m = -Infinity;
  for (const v of ch.v) if (!Number.isNaN(v) && v > m) m = v;
  return m === -Infinity ? null : m;
}

export function channelLast(s: Session, id: string): number | null {
  const ch = s.channels.get(id);
  return ch ? ch.v[ch.v.length - 1] : null;
}
