import { modelNameFromFileName } from "../model/model-name.ts";
import type { LogAdapter, LogFile } from "../model/types.ts";
import { spektrumTlm } from "./spektrum-tlm/index.ts";

/** All input formats. New formats are added here and nowhere else. */
export const ADAPTERS: LogAdapter[] = [spektrumTlm];

export class UnsupportedFormatError extends Error {
  constructor(fileName: string) {
    super(`No adapter can read "${fileName}".`);
    this.name = "UnsupportedFormatError";
  }
}

export function findAdapter(data: Uint8Array, fileName: string): LogAdapter | undefined {
  const head = data.subarray(0, 64);
  return ADAPTERS.find((a) => a.canRead(head, fileName));
}

/** Parses a log file with the first adapter that accepts it. */
export function parseLog(data: Uint8Array, fileName: string): LogFile {
  const adapter = findAdapter(data, fileName);
  if (!adapter) throw new UnsupportedFormatError(fileName);
  const log = adapter.parse(data, fileName);
  // Sessions without a model name in the log take it from the file name.
  const fromFileName = modelNameFromFileName(fileName);
  for (const s of log.sessions) {
    if (s.modelName || !fromFileName) continue;
    s.modelName = fromFileName;
    s.meta.modelNameSource = "file name";
  }
  return log;
}
