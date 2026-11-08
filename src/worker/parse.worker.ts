/// <reference lib="webworker" />
import { parseLog, UnsupportedFormatError } from "../core/adapters/registry.ts";

export interface ParseRequest { id: number; name: string; buffer: ArrayBuffer }
export type ParseResponse =
  | { id: number; ok: true; log: ReturnType<typeof parseLog> }
  | { id: number; ok: false; unsupported: boolean; message: string };

self.onmessage = (e: MessageEvent<ParseRequest>) => {
  const { id, name, buffer } = e.data;
  try {
    const log = parseLog(new Uint8Array(buffer), name);
    (self as unknown as Worker).postMessage({ id, ok: true, log } satisfies ParseResponse);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id, ok: false, unsupported: err instanceof UnsupportedFormatError, message: err instanceof Error ? err.message : String(err),
    } satisfies ParseResponse);
  }
};
