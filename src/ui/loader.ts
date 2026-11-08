"use client";

import { parseLog, UnsupportedFormatError } from "@/core/adapters/registry";
import type { LogFile } from "@/core/model/types";
import type { ParseRequest, ParseResponse } from "@/worker/parse.worker";

export type LoadResult = { ok: true; log: LogFile } | { ok: false; unsupported: boolean; message: string };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (r: LoadResult) => void>();

/** Kept as a plain expression so the bundler recognises and bundles the worker. */
const createWorker = () => new Worker(new URL("../worker/parse.worker", import.meta.url), { type: "module" });

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = createWorker();
    worker.onmessage = (e: MessageEvent<ParseResponse>) => {
      const r = e.data;
      const done = pending.get(r.id);
      pending.delete(r.id);
      done?.(r.ok ? { ok: true, log: r.log } : { ok: false, unsupported: r.unsupported, message: r.message });
    };
    worker.onerror = () => {
      // Fall back to the main thread for everything still waiting.
      worker = null;
    };
    return worker;
  } catch {
    return null;
  }
}

function parseHere(buffer: ArrayBuffer, name: string): LoadResult {
  try {
    return { ok: true, log: parseLog(new Uint8Array(buffer), name) };
  } catch (err) {
    return { ok: false, unsupported: err instanceof UnsupportedFormatError, message: err instanceof Error ? err.message : String(err) };
  }
}

/** Parses a log file off the main thread when possible. */
export async function loadBuffer(buffer: ArrayBuffer, name: string): Promise<LoadResult> {
  const w = getWorker();
  if (!w) return parseHere(buffer, name);
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ id, name, buffer } satisfies ParseRequest, [buffer]);
  });
}
