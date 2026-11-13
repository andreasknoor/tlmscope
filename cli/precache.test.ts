import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { cacheVersion, precacheFiles, precacheUrls } from "./precache.ts";

/** A small fake static export with the files the app needs and some it must not store. */
function fakeOut(): string {
  const dir = mkdtempSync(join(tmpdir(), "tlmscope-out-"));
  const files = [
    "index.html", "de.html", "faq.html", "de/faq.html", "legal.html", "img/overview-en.jpg", "index.txt",
    "maplibre/maplibre-gl-worker.mjs", "maplibre/maplibre-gl-shared.mjs", "demo/demo-flight.TLM",
    "manifest.webmanifest", "favicon.ico", "icon.svg", "icon1.png", "apple-icon", "icon-512.png",
    "_next/static/chunks/main.abc.js", "_next/static/chunks/map.lazy.js", "_next/static/media/font.woff2",
    "_next/static/media/maplibre-gl.x.mjs", "_next/static/media/maplibre-gl-dev.y.mjs", "_next/static/chunks/main.abc.js.map", "_next/static/build1/_buildManifest.js",
  ];
  for (const f of files) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), f);
  }
  return dir;
}

describe("offline precache", () => {
  it("stores the app pages, all bundled code and the run-time files, nothing else", () => {
    const files = precacheFiles(fakeOut());
    expect(files).toContain("index.html");
    expect(files).toContain("de.html");
    expect(files).toContain("_next/static/chunks/map.lazy.js");
    expect(files).toContain("_next/static/media/maplibre-gl.x.mjs");
    expect(files).toContain("_next/static/build1/_buildManifest.js");
    expect(files).toContain("maplibre/maplibre-gl-worker.mjs");
    expect(files).toContain("demo/demo-flight.TLM");
    // Content pages, screenshots and the MapLibre development builds stay out.
    for (const f of ["faq.html", "de/faq.html", "legal.html", "img/overview-en.jpg", "index.txt", "_next/static/media/maplibre-gl-dev.y.mjs", "_next/static/chunks/main.abc.js.map"]) expect(files).not.toContain(f);
  });

  it("requests the app pages by their address", () => {
    const urls = precacheUrls(precacheFiles(fakeOut()));
    expect(urls).toContain("/");
    expect(urls).toContain("/de");
    expect(urls).not.toContain("/index.html");
    expect(urls).toContain("/_next/static/chunks/main.abc.js");
  });

  it("gets a new version when a stored file changes", () => {
    const dir = fakeOut();
    const files = precacheFiles(dir);
    const before = cacheVersion(dir, files);
    expect(cacheVersion(dir, files)).toBe(before);
    writeFileSync(join(dir, "_next/static/chunks/main.abc.js"), "changed");
    expect(cacheVersion(dir, files)).not.toBe(before);
  });

  it("fails the build when a needed file is missing", () => {
    const dir = fakeOut();
    rmSync(join(dir, "demo/demo-flight.TLM"));
    expect(() => precacheFiles(dir)).toThrow(/demo-flight/);
  });
});
