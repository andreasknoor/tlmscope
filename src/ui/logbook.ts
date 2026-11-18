import type { Locale } from "./format";
import type { Entry } from "./store";

/**
 * The columns of the CSV export, in this order. Names are fixed: a pilot's spreadsheet may be built on them,
 * so a change here is a change for them. Metrics are filled for flights only, over the same part of the flight
 * as the rating cards (the time in the air; the receiver voltage without the moments of switching on and off).
 */
export const LOGBOOK_COLUMNS = [
  "model", "date", "start_time", "type", "session_s", "air_time_s", "air_time_source",
  "frame_losses", "holds", "min_receiver_voltage_v", "battery_id", "used_mah", "file", "session",
] as const;

/** A text cell: quoted when needed, and made harmless for a spreadsheet (a leading = + - @ would run as a formula). */
export function csvText(text: string, sep: string): string {
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return new RegExp(`[${sep}"\\r\\n]`).test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The entries as a CSV file, oldest first as given. English columns; German spreadsheets get a semicolon
 * and a decimal comma, everyone else a comma and a decimal point. Starts with a byte order mark so Excel reads UTF-8.
 */
export function logbookCsv(entries: Entry[], locale: Locale): string {
  const sep = locale === "de" ? ";" : ",";
  const dec = (v: number, digits: number) => (locale === "de" ? v.toFixed(digits).replace(".", ",") : v.toFixed(digits));
  const rows = entries.map((e) => {
    const a = e.a, flight = a.kind === "flight";
    const p = a.profile.available ? a.profile.value : null;
    const d = e.startMs === null ? null : new Date(e.startMs);
    const link = flight && a.link.available ? a.link.value : null;
    const rx = flight && a.receiverPower.available ? a.receiverPower.value.rxMinV : null;
    const used = a.batteryUse.available ? a.batteryUse.value.usedMah : null;
    const cells: (string | null)[] = [
      csvText(e.model.name ?? "", sep),
      d && `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      d && `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
      a.kind,
      String(Math.round(a.session.durationS)),
      flight && p ? String(p.airtimeS) : null,
      flight && p ? p.basis : null,
      link?.frameLosses != null ? String(link.frameLosses) : null,
      link?.holdsAirborne != null ? String(link.holdsAirborne) : null,
      rx != null ? dec(rx, 2) : null,
      a.session.battery?.id ? csvText(String(a.session.battery.id), sep) : null,
      used != null ? String(Math.round(used)) : null,
      csvText(e.file.fileName, sep),
      String(a.session.index),
    ];
    return cells.map((c) => c ?? "").join(sep);
  });
  return `\uFEFF${[LOGBOOK_COLUMNS.join(sep), ...rows].join("\r\n")}\r\n`;
}

/** Saves text as a file in the browser, nothing is sent anywhere. */
export function downloadText(text: string, fileName: string, type = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** tlmscope-logbook-2026-11-18.csv; no model or pilot names in the file name. */
export function logbookFileName(now = new Date()): string {
  return `tlmscope-logbook-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`;
}
