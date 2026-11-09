"use client";

import { parseLog, UnsupportedFormatError } from "@/core/adapters/registry";
import type { LogFile } from "@/core/model/types";
import type { ParseRequest, ParseResponse } from "@/worker/parse.worker";

export type LoadResult = { ok: true; log: LogFile } | { ok: false; unsupported: boolean; message: string };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (r: LoadResult) => void>();
const progress = new Map<number, (share: number) => void>();

/** Kept as a plain expression so the bundler recognises and bundles the worker. */
const createWorker = () => new Worker(new URL("../worker/parse.worker", import.meta.url), { type: "module" });

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = createWorker();
    worker.onmessage = (e: MessageEvent<ParseResponse>) => {
      const r = e.data;
      if ("progress" in r) { progress.get(r.id)?.(r.progress); return; }
      const done = pending.get(r.id);
      pending.delete(r.id);
      progress.delete(r.id);
      done?.(r.ok ? { ok: true, log: r.log } : { ok: false, unsupported: r.unsupported, message: r.message });
    };
    // A crashed worker (e.g. out of memory) answers nothing more: fail everything still waiting
    // and start a fresh worker for the next file. Parsing on the main thread would only crash the page.
    const fail = (message: string) => {
      worker?.terminate();
      worker = null;
      for (const done of pending.values()) done({ ok: false, unsupported: false, message });
      pending.clear();
      progress.clear();
    };
    worker.onerror = (e) => { e.preventDefault(); fail(e.message || "The file reader stopped unexpectedly."); };
    worker.onmessageerror = () => fail("The file reader sent an unreadable result.");
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

/** Parses a log file off the main thread when possible; `onProgress` gets the share done (0…1). */
export async function loadBuffer(buffer: ArrayBuffer, name: string, onProgress?: (share: number) => void): Promise<LoadResult> {
  const w = getWorker();
  if (!w) return parseHere(buffer, name);
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    if (onProgress) progress.set(id, onProgress);
    w.postMessage({ id, name, buffer } satisfies ParseRequest, [buffer]);
  });
}
