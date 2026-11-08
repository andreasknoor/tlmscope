/**
 * Regenerates the channel catalogue table in README.md from src/core/model/catalogue.ts.
 * Usage: npm run docs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { catalogueMarkdown, replaceGenerated } from "../src/core/model/catalogue-doc.ts";

const path = join(import.meta.dirname, "../README.md");
const before = readFileSync(path, "utf8");
const after = replaceGenerated(before, catalogueMarkdown());
if (after !== before) {
  writeFileSync(path, after);
  console.log("README.md: channel catalogue updated.");
} else console.log("README.md: channel catalogue already up to date.");
