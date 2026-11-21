import { csvText } from "./logbook";
import type { Locale } from "./format";
import type { Entry } from "./store";

/**
 * "My logbook": the flights and simulator sessions of every file the user has opened, kept in this
 * browser only and only when the user switched it on in the settings. Not the files themselves: one
 * short record per session. A transmitter keeps adding to one log per model, so a session is known
 * by its start and length; opening the same file again adds only its new sessions and refreshes the others.
 */
export const MY_LOGBOOK_KEY = "tlmscope.logbook";

export interface BookSession {
  /** Start, ms since 1970 (UTC). */
  start: number;
  /** Session length, s. */
  dur: number;
  /** `modelKey()` of the model name; "" for a session without a name. */
  model: string;
  kind: "flight" | "simulator";
  /** Flight: time in the air. Simulator: time with the sticks moved (the connected time without stick data). */
  s: number;
  /** Simulator: connected time. */
  c?: number;
  /** Flight: time estimated from motor and movement (no height or GPS). */
  est?: boolean;
  /** Name of the file the session was last seen in. */
  file: string;
}

export interface BookModel {
  name: string | null;
  /** Counted (the user's own model) or not (logs of other pilots); new sessions are recorded only when counted. */
  on: boolean;
}

export interface MyLogbook {
  v: 1;
  sessions: Record<string, BookSession>;
  models: Record<string, BookModel>;
  /** Files left out by the user, by name; their sessions stay stored but are not counted. */
  offFiles: string[];
}

export const EMPTY_LOGBOOK: MyLogbook = { v: 1, sessions: {}, models: {}, offFiles: [] };

export const sessionKey = (start: number, dur: number) => `${start}|${dur.toFixed(1)}`;

const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e7;
const isStart = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1e14;
const MAX_TEXT = 200;
const text = (v: unknown): string | null => (typeof v === "string" ? v.slice(0, MAX_TEXT) : null);

/** A stored or imported logbook, every value checked; anything that does not fit is dropped. */
export function parseLogbook(raw: unknown): MyLogbook {
  const out: MyLogbook = { v: 1, sessions: {}, models: {}, offFiles: [] };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  if (r.models && typeof r.models === "object") {
    for (const [k, m] of Object.entries(r.models as Record<string, unknown>)) {
      if (!m || typeof m !== "object" || k.length > MAX_TEXT) continue;
      const mm = m as Record<string, unknown>;
      if (typeof mm.on !== "boolean") continue;
      out.models[k] = { name: text(mm.name), on: mm.on };
    }
  }
  if (r.sessions && typeof r.sessions === "object") {
    for (const s of Object.values(r.sessions as Record<string, unknown>)) {
      if (!s || typeof s !== "object") continue;
      const x = s as Record<string, unknown>;
      const model = text(x.model), file = text(x.file);
      if (!isStart(x.start) || !isTime(x.dur) || !isTime(x.s) || model === null || file === null) continue;
      if (x.kind !== "flight" && x.kind !== "simulator") continue;
      const b: BookSession = { start: x.start, dur: x.dur, model, kind: x.kind, s: x.s, file };
      if (x.kind === "simulator" && isTime(x.c)) b.c = x.c;
      if (x.kind === "flight" && x.est === true) b.est = true;
      out.sessions[sessionKey(b.start, b.dur)] = b;
      if (!out.models[model]) out.models[model] = { name: null, on: true };
    }
  }
  if (Array.isArray(r.offFiles)) out.offFiles = [...new Set(r.offFiles.map(text).filter((f): f is string => f !== null))];
  return out;
}

export function readLogbook(): MyLogbook {
  try {
    const raw = localStorage.getItem(MY_LOGBOOK_KEY);
    return raw ? parseLogbook(JSON.parse(raw)) : EMPTY_LOGBOOK;
  } catch {
    return EMPTY_LOGBOOK;
  }
}

/** False when the browser refused (storage full or blocked). */
export function writeLogbook(book: MyLogbook | null): boolean {
  try {
    if (book === null) localStorage.removeItem(MY_LOGBOOK_KEY);
    else localStorage.setItem(MY_LOGBOOK_KEY, JSON.stringify(book));
    return true;
  } catch {
    return false;
  }
}

/** What a loaded session adds to the logbook; null for sessions it does not keep (not a flight or simulator, no start time). */
function bookSession(e: Entry): BookSession | null {
  if (e.startMs === null) return null;
  const a = e.a, base = { start: e.startMs, dur: Math.round(a.session.durationS * 10) / 10, model: e.model.key, file: e.file.fileName };
  if (a.kind === "flight" && a.profile.available) {
    const p = a.profile.value;
    return { ...base, kind: "flight", s: p.airtimeS, ...(p.basis === "motion" ? { est: true } : {}) };
  }
  if (a.kind === "simulator" && a.simulator) return { ...base, kind: "simulator", s: a.simulator.activeS ?? a.simulator.connectedS, c: a.simulator.connectedS };
  return null;
}

/** Loaded sessions the logbook could keep: flights and simulator sessions with a start time, never the demo. */
export function bookable(entries: Entry[], demoFile: string): Entry[] {
  return entries.filter((e) => e.file.fileName !== demoFile && bookSession(e) !== null);
}

/** Models among the loaded sessions the user has not decided about yet (counted or not). */
export function pendingModels(book: MyLogbook, entries: Entry[], demoFile: string): Entry["model"][] {
  const out = new Map<string, Entry["model"]>();
  for (const e of bookable(entries, demoFile)) if (!book.models[e.model.key]) out.set(e.model.key, e.model);
  return [...out.values()];
}

/** The user's choice for a model. */
export function decide(book: MyLogbook, key: string, name: string | null, on: boolean): MyLogbook {
  return { ...book, models: { ...book.models, [key]: { name: name ?? book.models[key]?.name ?? null, on } } };
}

export function setFileOn(book: MyLogbook, file: string, on: boolean): MyLogbook {
  const offFiles = book.offFiles.filter((f) => f !== file);
  return { ...book, offFiles: on ? offFiles : [...offFiles, file] };
}

/**
 * The logbook with the loaded sessions recorded: new ones added, known ones refreshed (a newer version
 * may count differently), and a known session that is no longer a flight or simulator session removed.
 * Only for counted models; with `addNew`, models nobody decided about count without asking.
 * Returns null when nothing changed.
 */
export function record(book: MyLogbook, entries: Entry[], demoFile: string, addNew: boolean): MyLogbook | null {
  let next = book;
  const sessions = { ...book.sessions };
  let changed = false;
  for (const e of entries) {
    if (e.file.fileName === demoFile || e.startMs === null) continue;
    const b = bookSession(e);
    const key = sessionKey(e.startMs, Math.round(e.a.session.durationS * 10) / 10);
    if (!b) {
      if (sessions[key]) { delete sessions[key]; changed = true; }
      continue;
    }
    let m = next.models[b.model];
    if (!m && addNew) { next = decide(next, b.model, e.model.name, true); m = next.models[b.model]; changed = true; }
    if (!m?.on) continue;
    if (m.name !== e.model.name && e.model.name) { next = decide(next, b.model, e.model.name, true); changed = true; }
    if (JSON.stringify(sessions[key]) !== JSON.stringify(b)) { sessions[key] = b; changed = true; }
  }
  return changed ? { ...next, sessions } : null;
}

/** The sessions that count: of counted models, from files not left out. */
export function counted(book: MyLogbook): BookSession[] {
  const off = new Set(book.offFiles);
  return Object.values(book.sessions).filter((s) => book.models[s.model]?.on !== false && !off.has(s.file));
}

export interface BookTotals {
  flights: number;
  airS: number;
  /** Part of `airS` estimated from motor and movement. */
  estS: number;
  simSessions: number;
  simActiveS: number;
  simConnectedS: number;
}

export function totals(list: BookSession[]): BookTotals {
  const t: BookTotals = { flights: 0, airS: 0, estS: 0, simSessions: 0, simActiveS: 0, simConnectedS: 0 };
  for (const s of list) {
    if (s.kind === "flight") { t.flights++; t.airS += s.s; if (s.est) t.estS += s.s; }
    else { t.simSessions++; t.simActiveS += s.s; t.simConnectedS += s.c ?? s.s; }
  }
  return t;
}

/** Totals per calendar year (local time), newest first. */
export function byYear(list: BookSession[]): { year: number; t: BookTotals }[] {
  const years = new Map<number, BookSession[]>();
  for (const s of list) {
    const y = new Date(s.start).getFullYear();
    years.set(y, [...(years.get(y) ?? []), s]);
  }
  return [...years.entries()].sort(([a], [b]) => b - a).map(([year, l]) => ({ year, t: totals(l) }));
}

/** Every model the user decided about, with the totals of its counted sessions. Counted models first, by time. */
export function byModel(book: MyLogbook): { key: string; name: string | null; on: boolean; t: BookTotals }[] {
  const off = new Set(book.offFiles);
  return Object.entries(book.models)
    .map(([key, m]) => ({ key, name: m.name, on: m.on, t: totals(Object.values(book.sessions).filter((s) => s.model === key && !off.has(s.file))) }))
    .sort((a, b) => Number(b.on) - Number(a.on) || b.t.airS + b.t.simActiveS - (a.t.airS + a.t.simActiveS) || (a.name ?? "").localeCompare(b.name ?? ""));
}

/** Every file with stored sessions, and whether it counts. */
export function byFile(book: MyLogbook): { file: string; sessions: number; on: boolean }[] {
  const n = new Map<string, number>();
  for (const s of Object.values(book.sessions)) n.set(s.file, (n.get(s.file) ?? 0) + 1);
  for (const f of book.offFiles) if (!n.has(f)) n.set(f, 0);
  return [...n.entries()].map(([file, sessions]) => ({ file, sessions, on: !book.offFiles.includes(file) })).sort((a, b) => a.file.localeCompare(b.file));
}

/** An imported backup joined with the logbook: sessions of both (the same session once), the user's own decisions first. */
export function mergeLogbook(mine: MyLogbook, other: MyLogbook): MyLogbook {
  return {
    v: 1,
    sessions: { ...other.sessions, ...mine.sessions },
    models: { ...other.models, ...mine.models },
    offFiles: [...new Set([...mine.offFiles, ...other.offFiles])],
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** tlmscope-my-logbook-2026-11-21.json */
export function backupFileName(now = new Date()): string {
  return `tlmscope-my-logbook-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export const BOOK_COLUMNS = ["model", "date", "start_time", "type", "session_s", "time_s", "connected_s", "estimated", "file", "counted"] as const;

/** All stored sessions as a CSV file, oldest first; `time_s` is the time in the air or, in the simulator, with the sticks moved. */
export function bookCsv(book: MyLogbook, locale: Locale, unknownModel: string): string {
  const sep = locale === "de" ? ";" : ",";
  const counts = new Set(counted(book));
  const rows = Object.values(book.sessions).sort((a, b) => a.start - b.start).map((s) => {
    const d = new Date(s.start);
    return [
      csvText(book.models[s.model]?.name ?? unknownModel, sep),
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
      s.kind,
      String(Math.round(s.dur)),
      String(Math.round(s.s)),
      s.c !== undefined ? String(Math.round(s.c)) : "",
      s.est ? "yes" : "",
      csvText(s.file, sep),
      counts.has(s) ? "yes" : "no",
    ].join(sep);
  });
  return `﻿${[BOOK_COLUMNS.join(sep), ...rows].join("\r\n")}\r\n`;
}
