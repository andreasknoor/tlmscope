import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHANGELOG, compareVersions } from "./changelog.ts";

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "../package.json"), "utf8")) as { version: string };

describe("changelog", () => {
  it("has an entry for the version being deployed (add one line per change to src/changelog.ts)", () => {
    const current = pkg.version.split(".").slice(0, 2).join(".");
    expect(CHANGELOG[0]?.version).toBe(current);
  });

  it("lists every version once, newest first, with dates that never go forward", () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(compareVersions(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBeGreaterThan(0);
      expect(CHANGELOG[i - 1].date >= CHANGELOG[i].date).toBe(true);
    }
    for (const r of CHANGELOG) expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps each change to one short sentence", () => {
    for (const r of CHANGELOG) {
      expect(r.changes.length).toBeGreaterThan(0);
      for (const [, text] of r.changes) {
        expect(text).toMatch(/^[A-Z0-9“/].*\.$/);
        expect(text.length).toBeLessThanOrEqual(100);
        expect(text).not.toContain("\n");
      }
    }
  });
});
