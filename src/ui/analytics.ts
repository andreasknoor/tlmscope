/**
 * Anonymous usage events for Umami (see the privacy page, section 5).
 * Events describe what was used, never what is in a log: no file or model names, no values.
 * Without Umami (local runs, "Do Not Track", blockers) every call does nothing.
 */

type EventData = Record<string, string>;

declare global {
  interface Window { umami?: { track(event: string, data?: EventData): void } }
}

export type AppEvent =
  | { name: "demo-loaded" }
  | { name: "file-opened"; format: string; size: SizeBucket }
  | { name: "file-error"; kind: "unsupported" | "read-error" | "too-large" }
  | { name: "view-error"; view: string }
  | { name: "tab-opened"; tab: string }
  | { name: "feedback-opened"; from: "header" | "rating" | "tab" | "error" | "start" };

export type SizeBucket = "<1 MB" | "1-10 MB" | ">10 MB";

/** Coarse file size, so the event says nothing about one particular file. */
export function sizeBucket(bytes: number): SizeBucket {
  return bytes < 1_000_000 ? "<1 MB" : bytes <= 10_000_000 ? "1-10 MB" : ">10 MB";
}

/** The event payload as sent: everything except the name. */
export function eventData(e: AppEvent): EventData | undefined {
  const data = Object.fromEntries(Object.entries(e).filter(([k]) => k !== "name")) as EventData;
  return Object.keys(data).length ? data : undefined;
}

export function track(e: AppEvent): void {
  try {
    window.umami?.track(e.name, eventData(e));
  } catch {
    /* counting must never break the app */
  }
}
