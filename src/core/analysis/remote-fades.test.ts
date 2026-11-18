import { describe, expect, it } from "vitest";
import { remoteToMove } from "./link.ts";

describe("which remote receiver to move", () => {
  it("never names the main receiver, which is usually the highest", () => {
    expect(remoteToMove({ a: 5000 })).toEqual([]);
    expect(remoteToMove({ a: 5000, b: 300 })).toEqual([]);
  });

  it("names a remote receiver far above the other remote ones", () => {
    expect(remoteToMove({ a: 900, b: 600, l: 100, r: 120 })).toEqual(["b"]);
    expect(remoteToMove({ a: 900, b: 150, l: 100, r: 120 })).toEqual([]);
  });

  it("compares a single remote receiver with the main one", () => {
    expect(remoteToMove({ a: 100, b: 300 })).toEqual(["b"]);
  });

  it("ignores small counts", () => {
    expect(remoteToMove({ a: 2, b: 60, l: 3 })).toEqual([]);
  });
});
