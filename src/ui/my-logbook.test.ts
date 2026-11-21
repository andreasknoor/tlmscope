import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseLog } from "../core/adapters/registry.ts";
import { analyseLogs } from "../core/analysis/index.ts";
import {
  BOOK_COLUMNS, bookable, bookCsv, byFile, byModel, byYear, counted, decide, EMPTY_LOGBOOK, mergeLogbook, parseLogbook, pendingModels, record, sessionKey, setFileOn, totals,
} from "./my-logbook";
import { SESSION_COLUMNS } from "./session-csv";
import type { Entry, Model } from "./store";

const log = parseLog(new Uint8Array(readFileSync("public/demo/demo-flight.TLM")), "mine.TLM");
const a = analyseLogs([log]).sessions[0];
const p = a.profile.available ? a.profile.value : null;
const GLIDER: Model = { key: "glider", name: "Glider", color: "", sessions: 1 };
const OTHER: Model = { key: "other", name: "Other", color: "", sessions: 1 };
const at = (d: number) => Date.UTC(2026, 5, d, 12);
const entry = (over: Partial<Entry> = {}): Entry => ({ key: "0-0", fileIndex: 0, file: log, a, startMs: at(1), batteryLetter: null, model: GLIDER, ...over });
const sim = (startMs: number, activeS: number | null): Entry =>
  entry({ key: `s${startMs}`, startMs, a: { ...a, kind: "simulator", simulator: { connectedS: 600, activeS } } as typeof a });
const DEMO = "demo-flight.TLM";

describe("my logbook", () => {
  it("keeps flights and simulator sessions with a start time, never the demo", () => {
    const ground = entry({ startMs: at(2), a: { ...a, kind: "ground-test" } as typeof a });
    const demo = entry({ startMs: at(3), file: { ...log, fileName: DEMO } });
    expect(bookable([entry(), sim(at(4), 300), ground, demo, entry({ startMs: null })], DEMO)).toHaveLength(2);
  });

  it("asks about each new model once, and records only counted models", () => {
    const entries = [entry(), entry({ startMs: at(2), model: OTHER })];
    expect(pendingModels(EMPTY_LOGBOOK, entries, DEMO).map((m) => m.key)).toEqual(["glider", "other"]);
    expect(record(EMPTY_LOGBOOK, entries, DEMO, false)).toBeNull();
    const book = decide(decide(EMPTY_LOGBOOK, "glider", "Glider", true), "other", "Other", false);
    expect(pendingModels(book, entries, DEMO)).toEqual([]);
    const next = record(book, entries, DEMO, false)!;
    expect(Object.keys(next.sessions)).toEqual([sessionKey(at(1), Math.round(a.session.durationS * 10) / 10)]);
  });

  it("adds new models without asking when the user chose so", () => {
    const next = record(EMPTY_LOGBOOK, [entry(), sim(at(5), 300)], DEMO, true)!;
    expect(next.models.glider).toEqual({ name: "Glider", on: true });
    expect(totals(counted(next))).toEqual({ flights: 1, airS: p!.airtimeS, estS: p!.basis === "motion" ? p!.airtimeS : 0, simSessions: 1, simActiveS: 300, simConnectedS: 600 });
  });

  it("counts a session once, however often its log is opened, and changes nothing the second time", () => {
    const once = record(EMPTY_LOGBOOK, [entry()], DEMO, true)!;
    const copy = { ...log, fileName: "copy.TLM" };
    const twice = record(once, [entry({ file: copy })], DEMO, true)!;
    expect(counted(twice)).toHaveLength(1);
    expect(counted(twice)[0].file).toBe("copy.TLM");
    expect(record(twice, [entry({ file: copy })], DEMO, true)).toBeNull();
  });

  it("removes a known session that is no longer a flight", () => {
    const once = record(EMPTY_LOGBOOK, [entry()], DEMO, true)!;
    const now = record(once, [entry({ a: { ...a, kind: "ground-test" } as typeof a })], DEMO, true)!;
    expect(Object.keys(now.sessions)).toHaveLength(0);
  });

  it("leaves out files and models the user switched off, and takes them back", () => {
    const book = record(EMPTY_LOGBOOK, [entry(), sim(at(6), 100)], DEMO, true)!;
    const noFile = setFileOn(book, "mine.TLM", false);
    expect(counted(noFile)).toHaveLength(0);
    expect(byFile(noFile)).toEqual([{ file: "mine.TLM", sessions: 2, on: false }]);
    expect(counted(setFileOn(noFile, "mine.TLM", true))).toHaveLength(2);
    expect(counted(decide(book, "glider", null, false))).toHaveLength(0);
    expect(byModel(book)[0]).toMatchObject({ key: "glider", name: "Glider", on: true });
  });

  it("sums up per year, newest first", () => {
    const book = record(EMPTY_LOGBOOK, [sim(Date.UTC(2025, 6, 1, 12), 100), sim(Date.UTC(2026, 6, 1, 12), 200), sim(Date.UTC(2026, 7, 1, 12), 300)], DEMO, true)!;
    expect(byYear(counted(book)).map((y) => [y.year, y.t.simActiveS])).toEqual([[2026, 500], [2025, 100]]);
  });

  it("reads back what it stores and drops anything that does not fit", () => {
    const book = record(EMPTY_LOGBOOK, [entry(), sim(at(7), null)], DEMO, true)!;
    expect(parseLogbook(JSON.parse(JSON.stringify(book)))).toEqual(book);
    const bad = { sessions: { x: { start: "soon", dur: 1, model: "m", kind: "flight", s: 1, file: "f" }, y: { start: at(1), dur: 5, model: "m", kind: "rocket", s: 1, file: "f" } }, models: { m: { on: "yes" } }, offFiles: [1, "f"] };
    expect(parseLogbook(bad)).toEqual({ v: 1, sessions: {}, models: {}, offFiles: ["f"] });
    expect(parseLogbook(null)).toEqual(EMPTY_LOGBOOK);
  });

  it("joins a backup without counting a session twice, keeping the user's own decisions", () => {
    const mine = decide(record(EMPTY_LOGBOOK, [entry()], DEMO, true)!, "other", "Other", false);
    const backup = record(EMPTY_LOGBOOK, [entry(), sim(at(8), 50), entry({ startMs: at(9), model: OTHER })], DEMO, true)!;
    const joined = mergeLogbook(mine, backup);
    expect(Object.keys(joined.sessions)).toHaveLength(3);
    expect(joined.models.other.on).toBe(false);
    expect(counted(joined)).toHaveLength(2);
  });

  it("writes all stored sessions as CSV, marking what counts", () => {
    const book = setFileOn(record(EMPTY_LOGBOOK, [sim(at(10), 100)], DEMO, true)!, "mine.TLM", false);
    const lines = bookCsv(book, "en", "Unknown").replace(/^﻿/, "").trimEnd().split("\r\n");
    expect(lines[0]).toBe("model,date,start_time,type,session_s,air_time_s,air_time_source,file,sim_active_s,sim_connected_s,counted");
    const row = Object.fromEntries(BOOK_COLUMNS.map((c, i) => [c, lines[1].split(",")[i]]));
    expect(row).toMatchObject({ model: "Glider", type: "simulator", air_time_s: "", sim_active_s: "100", sim_connected_s: "600", file: "mine.TLM", counted: "no" });
  });

  it("names the columns it shares with the session list export the same", () => {
    for (const c of BOOK_COLUMNS) if (c !== "counted") expect(SESSION_COLUMNS, c).toContain(c);
    const flight = bookCsv(record(EMPTY_LOGBOOK, [entry()], DEMO, true)!, "en", "Unknown").replace(/^\uFEFF/, "").split("\r\n")[1].split(",");
    expect(flight[BOOK_COLUMNS.indexOf("air_time_s")]).toBe(String(Math.round(p!.airtimeS)));
    expect(flight[BOOK_COLUMNS.indexOf("air_time_source")]).toBe(p!.basis);
  });
});
