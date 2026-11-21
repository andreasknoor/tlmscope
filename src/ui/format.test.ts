import { describe, expect, it } from "vitest";
import { longDuration, splitFileName } from "./format";

const plain = (s: string) => s.replace(/ /g, " ");

describe("long durations", () => {
  it("writes hours and minutes out, without a colon", () => {
    expect(plain(longDuration(6 * 3600 + 28 * 60))).toBe("6 h 28 min");
    expect(plain(longDuration(6 * 3600 + 5 * 60))).toBe("6 h 5 min");
    expect(plain(longDuration(2 * 3600))).toBe("2 h");
  });

  it("stays in minutes below an hour, rounded", () => {
    expect(plain(longDuration(45 * 60 + 20))).toBe("45 min");
    expect(plain(longDuration(59 * 60 + 40))).toBe("1 h");
    expect(plain(longDuration(0))).toBe("0 min");
  });
});

describe("file names shortened in the middle", () => {
  it("keeps the date a transmitter adds and the extension whole", () => {
    expect(splitFileName("002~Easy Glider 4_20261003.TLM")).toEqual({ head: "002~Easy Glider 4", tail: "_20261003.TLM" });
    expect(splitFileName("simulator.TLM")).toEqual({ head: "simulator", tail: ".TLM" });
    expect(splitFileName("no extension")).toEqual({ head: "no extension", tail: "" });
  });
});
