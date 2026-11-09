/**
 * Model names. The adapters read the name from the log itself where the format has it;
 * the file name is the fallback, because transmitters name their log files after the model.
 */

/**
 * Model name from a log file name, or null if nothing is left.
 * - Spektrum main log: `Easy_Glider_4.TLM` → "Easy Glider 4"
 * - Spektrum AutoLog: `002~Easy Glider 4_20261003.TLM` → "Easy Glider 4"
 * - EdgeTX: `Easy Glider-2026-10-03-121530.csv` → "Easy Glider"
 */
export function modelNameFromFileName(fileName: string): string | null {
  let s = fileName.replace(/^.*[\\/]/, "").replace(/\.[^.]*$/, "");
  s = s.replace(/^\d+~/, ""); // AutoLog: model slot
  s = s.replace(/_\d{8}(_\d+)?$/, ""); // AutoLog: date, sometimes a counter
  s = s.replace(/-\d{4}-\d{2}-\d{2}-\d{6}$/, ""); // EdgeTX: date and time
  s = s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return s || null;
}

/** Key that groups sessions of the same model: case and spacing do not matter. "" for sessions without a name. */
export function modelKey(name: string | null): string {
  return (name ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}
