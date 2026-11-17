import { describe, expect, it } from "vitest";
import { MAP_DEFAULTS, readMapPrefs } from "./map-prefs";

describe("saved map options", () => {
  it("keeps valid choices", () => {
    const p = { colourBy: "signal", view: "map", line: "thickDashed", path: "trail", marker: "dot", shadow: false, relief: true };
    expect(readMapPrefs(p)).toEqual(p);
  });

  it("falls back per value for anything unknown, and never saves the follow view", () => {
    expect(readMapPrefs({ colourBy: "rainbow", view: "follow", shadow: "yes", relief: true })).toEqual({ ...MAP_DEFAULTS, relief: true });
    expect(readMapPrefs(null)).toEqual(MAP_DEFAULTS);
    expect(readMapPrefs("x")).toEqual(MAP_DEFAULTS);
  });
});
