import { describe, expect, it } from "vitest";
import de from "./de.json";
import en from "./en.json";

/** All message keys, with array lengths, so both languages stay in step. */
function keys(o: unknown, prefix = ""): string[] {
  if (Array.isArray(o)) return [`${prefix}[${o.length}]`];
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

describe("translations", () => {
  it("have the same keys in English and German", () => {
    expect(keys(de).sort()).toEqual(keys(en).sort());
  });

  it("use the same placeholders in both languages", () => {
    // Placeholders, not plural branches such as "one {once}".
    const placeholders = (s: string) => [...s.matchAll(/(?<!(?:one|other|zero|two|few|many|=\d+)\s)\{(\w+)/g)].map((m) => m[1]).sort();
    const flat = (o: Record<string, unknown>, p = ""): [string, string][] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[p + k, v] as [string, string]] : v && typeof v === "object" && !Array.isArray(v) ? flat(v as Record<string, unknown>, `${p}${k}.`) : []));
    const deMap = new Map(flat(de));
    for (const [k, v] of flat(en)) expect(placeholders(deMap.get(k) ?? ""), k).toEqual(placeholders(v));
  });
});

describe("German sensor texts", () => {
  it("cover every Spektrum sensor the adapter knows", async () => {
    const { SENSORS, KNOWN_UNDECODED } = await import("../core/adapters/spektrum-tlm/sensors.ts");
    const { default: streams } = await import("./streams.de.json");
    expect(Object.keys(streams).sort()).toEqual([...Object.keys(SENSORS), ...Object.keys(KNOWN_UNDECODED)].sort());
  });
});
