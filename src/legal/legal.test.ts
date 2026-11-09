import { describe, expect, it } from "vitest";
import { OPERATOR } from "./contact.ts";

describe("legal notice", () => {
  it("has every operator detail filled in (a placeholder blocks the deploy)", () => {
    const values = Object.entries(OPERATOR).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : Object.entries(v).map(([l, x]) => [`${k}.${l}`, x])));
    for (const [key, value] of values) expect(value, key).not.toMatch(/TODO|^\s*$/);
    expect(OPERATOR.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
  });
});
