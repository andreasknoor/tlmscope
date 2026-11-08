/**
 * Prints sessions and the sensor inventory of one or more log files.
 * Usage: npm run inspect -- <file> [more files] [--fields] [--samples]
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { parseLog } from "../src/core/adapters/registry.ts";
import { Q, type Session } from "../src/core/model/types.ts";

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith("--"));
const showFields = args.includes("--fields");
const showSamples = args.includes("--samples");

const fmtTime = (ms: number | null) =>
  ms === null ? "unknown time" : new Date(ms).toLocaleString("en-GB", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "medium" });
const pad = (s: string | number, n: number) => String(s).padEnd(n);
const num = (v: number | null) => (v === null ? "–" : Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/0+$/, "").replace(/\.$/, ""));

function maxOf(s: Session, id: string): number | null {
  const ch = s.channels.get(id);
  if (!ch) return null;
  let m = -Infinity;
  for (const v of ch.v) if (!Number.isNaN(v) && v > m) m = v;
  return m === -Infinity ? null : m;
}
const last = (s: Session, id: string) => {
  const ch = s.channels.get(id);
  return ch ? ch.v[ch.v.length - 1] : null;
};

if (!files.length) {
  console.error("Usage: npm run inspect -- <file.TLM> [--fields] [--samples]");
  process.exit(1);
}

for (const file of files) {
  const data = new Uint8Array(readFileSync(file));
  const log = parseLog(data, basename(file));
  console.log(`\n${log.fileName}  ·  ${(log.sizeBytes / 1e6).toFixed(2)} MB  ·  ${log.adapterId}  ·  ${log.sessions.length} sessions`);
  for (const w of log.warnings) console.log(`  warning: ${w.message}`);

  console.log(`\n  ${pad("#", 4)}${pad("start (Europe/Berlin)", 24)}${pad("duration", 10)}${pad("max alt", 9)}${pad("max A", 8)}${pad("mAh", 7)}${pad("frame losses", 14)}${pad("holds", 7)}battery`);
  for (const s of log.sessions) {
    const frozen = (s.meta.frozenChannels as string[] | undefined)?.length ? "  FROZEN: " + (s.meta.frozenChannels as string[]).join(", ") : "";
    console.log(
      `  ${pad(s.index, 4)}${pad(fmtTime(s.start.utcMs), 24)}${pad(s.durationS.toFixed(1) + " s", 10)}${pad(num(maxOf(s, "altitude")), 9)}${pad(num(maxOf(s, "motor_current")), 8)}${pad(num(last(s, "consumed_mah") === null ? null : Math.round(last(s, "consumed_mah")!)), 7)}${pad(num(last(s, "frame_losses")), 14)}${pad(num(last(s, "holds")), 7)}${s.battery ? `${s.battery.id} (${s.battery.chargeCycles} cycles)` : "–"}${frozen}`,
    );
  }

  // file-wide inventory
  const inv = new Map<string, { label: string; understood: string; count: number; noData: number; seconds: number; fields: Map<string, { unit: string; channel?: string; min: number | null; max: number | null; count: number; noData: number }>; samples: Map<string, number>; note?: string }>();
  for (const s of log.sessions) {
    for (const r of s.raw) {
      let e = inv.get(r.key);
      if (!e) inv.set(r.key, (e = { label: r.label, understood: r.understood, count: 0, noData: 0, seconds: 0, fields: new Map(), samples: new Map(), note: r.note }));
      e.count += r.count;
      e.noData += r.noDataCount;
      e.seconds += s.durationS;
      for (const f of r.fields) {
        const g = e.fields.get(f.name) ?? { unit: String(f.unit), channel: f.channel, min: null, max: null, count: 0, noData: 0 };
        g.count += f.count;
        g.noData += f.noData;
        if (f.min !== null) g.min = g.min === null ? f.min : Math.min(g.min, f.min);
        if (f.max !== null) g.max = g.max === null ? f.max : Math.max(g.max, f.max);
        e.fields.set(f.name, g);
      }
      for (const smp of r.samples) e.samples.set(smp.hex, (e.samples.get(smp.hex) ?? 0) + smp.count);
    }
  }
  console.log(`\n  ${pad("sensor", 11)}${pad("records", 10)}${pad("per s", 8)}${pad("no data", 9)}${pad("status", 10)}label`);
  for (const [key, e] of [...inv.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const rate = e.seconds > 0 ? (e.count / e.seconds).toFixed(2) : "–";
    console.log(`  ${pad(key, 11)}${pad(e.count, 10)}${pad(rate, 8)}${pad(((e.noData / e.count) * 100).toFixed(0) + " %", 9)}${pad(e.understood, 10)}${e.label}`);
    if (showFields) {
      for (const [name, f] of e.fields) {
        console.log(`      ${pad(name, 44)}${pad(`${num(f.min)} … ${num(f.max)}`, 26)}${pad(f.unit, 7)}${pad(((f.noData / f.count) * 100).toFixed(0) + " % no data", 16)}${f.channel ?? ""}`);
      }
    }
    if (showSamples || e.understood !== "full") {
      for (const [h, c] of [...e.samples.entries()].sort((a, b) => b[1] - a[1]).slice(0, showSamples ? 6 : 3)) console.log(`      ${String(c).padStart(7)}×  ${h}`);
    }
  }
  const frozenSamples = log.sessions.reduce((n, s) => n + [...s.channels.values()].reduce((m, c) => m + c.q.filter((f) => f & Q.FROZEN).length, 0), 0);
  if (frozenSamples) console.log(`\n  ${frozenSamples} samples flagged as frozen.`);
}
