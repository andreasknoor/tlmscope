import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dark colour scheme", () => {
  it("has the same colours from the system setting and from the user's choice", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const fromSystem = css.match(/:root:not\(\[data-theme="light"\]\) \{([^}]*)\}/)?.[1];
    const chosen = css.match(/:root\[data-theme="dark"\] \{([^}]*)\}/)?.[1];
    const norm = (s?: string) => s?.split(";").map((d) => d.trim()).filter(Boolean);
    expect(norm(fromSystem)?.length).toBeGreaterThan(10);
    expect(norm(chosen)).toEqual(norm(fromSystem));
  });
});
