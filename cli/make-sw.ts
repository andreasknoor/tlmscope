/**
 * Writes the service worker `out/sw.js` after the build: the template from `sw.template.js`
 * with the list of stored files and a version that changes with their content. Runs as `postbuild`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cacheVersion, precacheFiles, precacheUrls } from "./precache.ts";

const out = join(import.meta.dirname, "../out");
const files = precacheFiles(out);
const version = cacheVersion(out, files);
const sw = readFileSync(join(import.meta.dirname, "sw.template.js"), "utf8")
  .replace("__VERSION__", version)
  .replace("__URLS__", JSON.stringify(precacheUrls(files)));
writeFileSync(join(out, "sw.js"), sw);
const bytes = files.reduce((s, f) => s + readFileSync(join(out, f)).length, 0);
console.log(`sw.js: ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB, version ${version}`);
