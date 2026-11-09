import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGUE, isKnownChannelId } from "./catalogue.ts";
import { catalogueMarkdown, replaceGenerated } from "./catalogue-doc.ts";
import { hasSamples, loadSample, sampleNames } from "../test-helpers.ts";

describe("channel catalogue", () => {
  it("has unique ids", () => {
    expect(new Set(CATALOGUE.map((c) => c.id)).size).toBe(CATALOGUE.length);
  });

  it("is documented in the README (run `npm run docs` if this fails)", () => {
    const readme = readFileSync(join(import.meta.dirname, "../../../README.md"), "utf8");
    expect(replaceGenerated(readme, catalogueMarkdown())).toBe(readme);
  });

  it.skipIf(!hasSamples)("covers every channel the adapters produce", () => {
    for (const name of sampleNames())
      for (const s of loadSample(name).sessions)
        for (const id of s.channels.keys()) expect(isKnownChannelId(id), id).toBe(true);
  }, 60_000); // parses every sample, including the 36 MB Supra log
});
