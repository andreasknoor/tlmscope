import type { LogFile } from "@/core/model/types";
import type { Locale } from "./format";

/** The Tally forms, one per language (the form id is the last part of its address). */
export const FEEDBACK_FORMS: Record<Locale, string> = { en: "Yj0BJz", de: "lae2YV" };

/** Where the feedback was started: the header button, the link under the ratings, the end of a tab, an error box, the start page. */
export type FeedbackEntry = "header" | "rating" | "tab" | "error" | "start";

/** Where and why the dialog was opened. `detail` is a short fixed word such as the kind of file error, never free text. */
export interface FeedbackFrom {
  entry: FeedbackEntry;
  detail?: string;
}

/** What is sent along with a message when the user agrees: nothing from inside a log. */
export interface FeedbackContext {
  version: string;
  locale: Locale;
  device: "phone" | "desktop";
  /** The place in the app and the entry point, e.g. "sessions/link · tab". */
  where: string;
  /** Sensor type codes found in the loaded files, e.g. "0x20,0x42/0x10". */
  sensors: string;
}

/** Only sensor type codes of the Spektrum format ("0x20", "0x42/0x10") are passed on; any other source key could carry names. */
const SENSOR_KEY = /^0x[0-9a-f]{2}(\/0x[0-9a-f]{2})?$/;
/** Fixed words only, so a detail can never carry user text. */
const DETAIL = /^[a-z-]{1,20}$/;
/** Keeps the address short even for files with many sensor types. */
const MAX_SENSORS = 40;

/** The sensor type codes of all loaded files, each once, sorted. */
export function sensorCodes(files: LogFile[]): string[] {
  const keys = new Set<string>();
  for (const f of files) for (const s of f.sessions) for (const r of s.raw) if (SENSOR_KEY.test(r.key)) keys.add(r.key);
  return [...keys].sort().slice(0, MAX_SENSORS);
}

/** `place` is the view or "sessions/<tab>"; "start" when nothing is loaded. */
export function feedbackContext(o: { files: LogFile[]; locale: Locale; device: "phone" | "desktop"; place: string; from: FeedbackFrom; version: string }): FeedbackContext {
  const detail = o.from.detail && DETAIL.test(o.from.detail) ? `:${o.from.detail}` : "";
  return {
    version: o.version,
    locale: o.locale,
    device: o.device,
    where: `${o.place} · ${o.from.entry}${detail}`,
    sensors: sensorCodes(o.files).join(","),
  };
}

/**
 * The address of the form for the iframe. Tally fills hidden fields from query parameters of the same name.
 * Without a context (the user switched it off) only the display options are in the address.
 */
export function feedbackUrl(locale: Locale, ctx: FeedbackContext | null): string {
  const q = new URLSearchParams({ alignLeft: "1", hideTitle: "1", transparentBackground: "1" });
  if (ctx) for (const [k, v] of Object.entries(ctx)) q.set(k, v);
  return `https://tally.so/embed/${FEEDBACK_FORMS[locale]}?${q}`;
}
