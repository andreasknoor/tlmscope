/* TLMscope service worker: keeps the app available offline. Generated into out/sw.js by cli/make-sw.ts after the build. */
const VERSION = "__VERSION__";
const CACHE = `tlmscope-${VERSION}`;
const URLS = __URLS__;
/** The app pages, stored by address. Content pages (FAQ, compare, legal …) work online only. */
const PAGES = ["/", "/de"];
const STORED = new Set(URLS);
/** On a slow connection at the field, wait this long for the network before using the stored page. */
const PAGE_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(URLS.map((u) => new Request(u, { cache: "reload" })))));
  // The first worker takes over right away; later versions wait until the page asks (see "skip-waiting").
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("tlmscope-") && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

/**
 * App pages: the network first (so an online visit always sees the latest version), the stored page
 * when offline or when the network takes too long. The stored page is never replaced from the network:
 * it must match the stored code, and a new version brings its own worker and pages.
 */
async function page(request, path) {
  const network = fetch(request);
  const timeout = new Promise((resolve) => setTimeout(resolve, PAGE_TIMEOUT_MS, null));
  try {
    const r = await Promise.race([network, timeout]);
    if (r) return r;
  } catch { /* offline: use the stored page */ }
  const stored = await caches.match(path, { cacheName: CACHE });
  return stored ?? network;
}

/** Bundled files have a hash in their name and never change: the stored copy first, else the network (and keep it). */
async function asset(request, path) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  // A worker takes its address from the response. The stored response has the address without the query,
  // but the bundler's worker reads its settings from it (`?params=…`), so return a copy without its own
  // address: the browser then uses the requested one.
  if (hit) return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers: hit.headers });
  const r = await fetch(request);
  if (r.ok && path.startsWith("/_next/static/")) cache.put(request, r.clone());
  return r;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Map images, page-view counting and other hosts are left to the browser.
  if (url.origin !== self.location.origin) return;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (request.mode === "navigate") {
    if (PAGES.includes(path)) event.respondWith(page(request, path));
    return;
  }
  if (STORED.has(url.pathname) || url.pathname.startsWith("/_next/static/")) event.respondWith(asset(request, url.pathname));
});
