import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseLog } from "../core/adapters/registry.ts";
import { analyseLogs } from "../core/analysis/index.ts";
import { detailTarget, type DetailKey } from "./detail-links";

const demo = analyseLogs([parseLog(new Uint8Array(readFileSync("public/demo/demo-flight.TLM")), "demo-flight.TLM")]).sessions[0];

describe("links from the overview to the details", () => {
  it("names the page and a moment inside the flight for every value of the demo flight", () => {
    const keys: DetailKey[] = ["signal", "link", "used", "condition", "highest", "lift", "motor", "rx"];
    const tabs = { signal: "link", link: "link", used: "energy", condition: "battery", highest: "height", lift: "height", motor: "energy", rx: "aircraft" };
    for (const k of keys) {
      const t = detailTarget(demo, k, false);
      expect(t, k).not.toBeNull();
      expect(t!.tab, k).toBe(tabs[k as keyof typeof tabs]);
      if (t!.at !== null) expect(t!.at, k).toBeLessThan(demo.grid.n);
    }
  });

  it("points at the weakest signal and the highest point", () => {
    const sig = demo.signal.available ? demo.signal.value : null;
    expect(detailTarget(demo, "signal", false)!.at).toBe(sig!.minAt);
    const alt = demo.grid.get("altitude"), at = detailTarget(demo, "highest", false)!.at!;
    expect(alt[at]).toBe(Math.max(...alt.filter((x): x is number => x !== null)));
  });

  it("offers the raw data only when there are problems and the details are on", () => {
    expect(detailTarget(demo, "data", true)).toBeNull();
    const bad = { ...demo, issues: [{ kind: "frozen", level: 2 }] } as unknown as typeof demo;
    expect(detailTarget(bad, "data", false)).toBeNull();
    expect(detailTarget(bad, "data", true)!.tab).toBe("raw");
  });

  it("offers no link without the data behind it", () => {
    const none = { ...demo, signal: { available: false }, profile: { available: false } } as unknown as typeof demo;
    expect(detailTarget(none, "signal", false)).toBeNull();
    expect(detailTarget(none, "highest", false)).toBeNull();
    expect(detailTarget(none, "lift", false)).toBeNull();
  });
});
