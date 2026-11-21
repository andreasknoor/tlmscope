import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseLog } from "../core/adapters/registry.ts";
import { analyseLogs } from "../core/analysis/index.ts";
import { flightTotal, simulatorTotal } from "./flight-total";
import { csvText, LOGBOOK_COLUMNS, logbookCsv, logbookFileName } from "./logbook";
import type { Entry } from "./store";

const log = parseLog(new Uint8Array(readFileSync("public/demo/demo-flight.TLM")), "demo-flight.TLM");
const a = analyseLogs([log]).sessions[0];
const entry = (over: Partial<Entry> = {}): Entry => ({ key: "0-0", fileIndex: 0, file: log, a, startMs: Date.UTC(2026, 5, 14, 14, 4, 30), batteryLetter: "A", model: { key: "demo", name: "Demo Glider", color: "", sessions: 1 }, ...over });
const p = a.profile.available ? a.profile.value : null;

describe("CSV text cells", () => {
  it("quotes what needs it", () => {
    expect(csvText("plain", ",")).toBe("plain");
    expect(csvText("a,b", ",")).toBe('"a,b"');
    expect(csvText("a;b", ";")).toBe('"a;b"');
    expect(csvText('say "hi"', ",")).toBe('"say ""hi"""');
    expect(csvText("two\nlines", ",")).toBe('"two\nlines"');
  });

  it("makes a leading formula character harmless", () => {
    expect(csvText("=HYPERLINK(\"x\")", ",")).toBe(`"'=HYPERLINK(""x"")"`);
    for (const c of ["+", "-", "@"]) expect(csvText(`${c}1`, ",").startsWith("'")).toBe(true);
  });
});

describe("logbook CSV", () => {
  const csv = logbookCsv([entry()], "en");
  const lines = csv.replace(/^\uFEFF/, "").trimEnd().split("\r\n");
  const row = Object.fromEntries(LOGBOOK_COLUMNS.map((c, i) => [c, lines[1].split(",")[i]]));

  it("starts with a byte order mark and the fixed header", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(lines[0]).toBe(LOGBOOK_COLUMNS.join(","));
  });

  it("has one row per entry with the flight's values", () => {
    expect(lines).toHaveLength(2);
    expect(row.model).toBe("Demo Glider");
    expect(row.type).toBe("flight");
    expect(Number(row.air_time_s)).toBe(p!.airtimeS);
    expect(row.air_time_source).toBe(p!.basis);
    expect(row.date).toMatch(/^2026-06-1\d$/);
    expect(row.start_time).toMatch(/^\d\d:\d\d:\d\d$/);
    expect(row.file).toBe("demo-flight.TLM");
  });

  it("uses a semicolon and a decimal comma for German", () => {
    const de = logbookCsv([entry()], "de").replace(/^\uFEFF/, "").split("\r\n");
    expect(de[0]).toBe(LOGBOOK_COLUMNS.join(";"));
    const rx = de[1].split(";")[LOGBOOK_COLUMNS.indexOf("min_receiver_voltage_v")];
    expect(rx).toMatch(/^\d,\d\d$/);
  });

  it("leaves the time empty when the file has none, and keeps hostile names harmless", () => {
    const hostile = entry({ startMs: null, model: { key: "x", name: "=cmd|' /C calc'!A0", color: "", sessions: 1 } });
    const cells = logbookCsv([hostile], "en").replace(/^\uFEFF/, "").split("\r\n")[1];
    expect(cells.startsWith(`'=cmd`)).toBe(true);
    expect(cells.split(",")[LOGBOOK_COLUMNS.indexOf("date")]).toBe("");
  });

  it("fills the flight metrics for flights only", () => {
    const ground = entry({ a: { ...a, kind: "ground-test" } as typeof a });
    const r = logbookCsv([ground], "en").replace(/^\uFEFF/, "").split("\r\n")[1].split(",");
    for (const c of ["air_time_s", "air_time_source", "frame_losses", "holds", "min_receiver_voltage_v"] as const) expect(r[LOGBOOK_COLUMNS.indexOf(c)], c).toBe("");
    expect(r[LOGBOOK_COLUMNS.indexOf("type")]).toBe("ground-test");
  });

  it("names the file by date only", () => {
    expect(logbookFileName(new Date(2026, 10, 18))).toBe("tlmscope-logbook-2026-11-18.csv");
  });
});

describe("total flight time", () => {
  it("sums the time in the air of the flights only", () => {
    const t = flightTotal([entry(), entry({ key: "0-1", startMs: Date.UTC(2026, 5, 15, 10) }), entry({ key: "0-2", startMs: Date.UTC(2026, 5, 16, 10), a: { ...a, kind: "ground-test" } as typeof a })]);
    expect(t.flights).toBe(2);
    expect(t.seconds).toBe(2 * p!.airtimeS);
    expect(t.estimatedSeconds).toBe(p!.basis === "motion" ? t.seconds : 0);
  });

  it("marks time estimated from motion", () => {
    const motion = { ...a, profile: { available: true, value: { ...p!, basis: "motion", airtimeS: 300 } } } as typeof a;
    expect(flightTotal([entry({ a: motion })])).toEqual({ flights: 1, seconds: 300, estimatedSeconds: 300 });
  });

  it("is empty without flights", () => {
    expect(flightTotal([])).toEqual({ flights: 0, seconds: 0, estimatedSeconds: 0 });
  });

  it("counts a session found in two copies of a log once", () => {
    const copy = { ...log, fileName: "copy.TLM" };
    expect(flightTotal([entry(), entry({ key: "1-0", fileIndex: 1, file: copy })]).flights).toBe(1);
    expect(flightTotal([entry({ startMs: null }), entry({ key: "1-0", startMs: null })]).flights).toBe(2);
  });
});

describe("total simulator time", () => {
  const sim = (activeS: number | null, startMs: number) =>
    entry({ key: `s-${startMs}`, startMs, a: { ...a, kind: "simulator", simulator: { connectedS: 600, activeS } } as typeof a });

  it("sums the time with the sticks moved apart from the flights", () => {
    const entries = [entry(), sim(500, 1), sim(null, 2), sim(500, 1)];
    expect(simulatorTotal(entries)).toEqual({ sessions: 2, activeSeconds: 1100, connectedSeconds: 1200 });
    expect(flightTotal(entries).flights).toBe(1);
  });
});
