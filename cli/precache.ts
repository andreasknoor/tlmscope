/**
 * The files the service worker stores for offline use, read from the static export in `out/`.
 * Only what the app itself needs: the two app pages and all bundled code, fonts and styles
 * (including the chunks loaded later for the map and 3D view), the MapLibre worker, the demo
 * flight and the icons. Content pages, screenshots and the MapLibre development builds stay out.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** App pages, by the address they are opened with (Vercel serves `index.html` and `de.html` there). */
export const APP_PAGES: Record<string, string> = { "/": "index.html", "/de": "de.html" };

/** Single files outside `_next/static` the app loads at run time. */
const EXTRA = [
  "maplibre/maplibre-gl-worker.mjs",
  "maplibre/maplibre-gl-shared.mjs",
  "demo/demo-flight.TLM",
  "manifest.webmanifest",
  "favicon.ico",
  "icon.svg",
  "icon1.png",
  "apple-icon",
  "icon-512.png",
];

/** MapLibre also ships unminified development builds; the app never loads them. */
const SKIP = /-dev\.[^/]*$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Paths relative to `out/` (forward slashes), sorted. Pages are listed by their file, not their address. */
export function precacheFiles(outDir: string): string[] {
  const statics = walk(join(outDir, "_next/static")).map((p) => relative(outDir, p).split(sep).join("/")).filter((p) => !SKIP.test(p));
  const missing = [...Object.values(APP_PAGES), ...EXTRA].filter((p) => !exists(join(outDir, p)));
  if (missing.length) throw new Error(`Missing in ${outDir}: ${missing.join(", ")}`);
  return [...Object.values(APP_PAGES), ...EXTRA, ...statics].sort();
}

function exists(p: string): boolean {
  try { return statSync(p).isFile(); } catch { return false; }
}

/** Changes whenever any stored file changes, so each build with new content gets its own cache. */
export function cacheVersion(outDir: string, files: string[]): string {
  const h = createHash("sha256");
  for (const f of files) h.update(f).update("\0").update(readFileSync(join(outDir, f)));
  return h.digest("hex").slice(0, 12);
}

/** The addresses the worker requests: pages by address, everything else by its path. */
export function precacheUrls(files: string[]): string[] {
  const byFile = new Map(Object.entries(APP_PAGES).map(([url, file]) => [file, url]));
  return files.map((f) => byFile.get(f) ?? `/${f}`);
}
