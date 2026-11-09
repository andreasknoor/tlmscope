/// <reference lib="webworker" />
import { parseLog, UnsupportedFormatError } from "../core/adapters/registry.ts";

export interface ParseRequest { id: number; name: string; buffer: ArrayBuffer }
export type ParseResponse =
  | { id: number; progress: number }
  | { id: number; ok: true; log: ReturnType<typeof parseLog> }
  | { id: number; ok: false; unsupported: boolean; message: string };

self.onmessage = (e: MessageEvent<ParseRequest>) => {
  const { id, name, buffer } = e.data;
  try {
    // Report progress in steps of 2 % at most, so messages do not pile up.
    let last = -1;
    const log = parseLog(new Uint8Array(buffer), name, (share) => {
      if (share - last < 0.02 && share < 1) return;
      last = share;
      (self as unknown as Worker).postMessage({ id, progress: share } satisfies ParseResponse);
    });
    (self as unknown as Worker).postMessage({ id, ok: true, log } satisfies ParseResponse);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id, ok: false, unsupported: err instanceof UnsupportedFormatError, message: err instanceof Error ? err.message : String(err),
    } satisfies ParseResponse);
  }
};
