"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Whether the browser thinks it has a network connection. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
    },
    () => navigator.onLine,
    () => true,
  );
}

/** How often an open page asks whether a new version was deployed. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/** Longest wait for a newer version that is still being stored before the reload goes ahead anyway. */
const INSTALL_WAIT_MS = 30_000;

export interface OfflineState {
  /** The app is stored in the browser and opens without a network. */
  ready: boolean;
  /** A new version is stored and waits for a reload. */
  update: boolean;
  /** The reload was asked for and waits until the newest version is stored. */
  applying: boolean;
  /** Switches to the newest version and reloads the page. */
  applyUpdate(): void;
}

/** Resolves when the worker has finished installing (or failed), at the latest after `ms`. */
function installed(worker: ServiceWorker, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => { worker.removeEventListener("statechange", on); clearTimeout(timer); resolve(); };
    const on = () => { if (worker.state !== "installing") done(); };
    const timer = setTimeout(done, ms);
    worker.addEventListener("statechange", on);
    on();
  });
}

/**
 * Registers the service worker (`/sw.js`, written by `cli/make-sw.ts` after the build) in production
 * builds and reports when the app works offline and when a new version is waiting.
 *
 * A waiting version can be older than the deployed one (installed in a tab that stayed open while the
 * next version was deployed). So the note only shows while nothing newer is being installed, and the
 * reload first checks for the newest version and waits until it is stored; otherwise the page would
 * switch to the older one and offer the update again a moment later.
 */
export function useServiceWorker(): OfflineState {
  const [ready, setReady] = useState(false);
  const [update, setUpdate] = useState(false);
  const [applying, setApplying] = useState(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const sw = navigator.serviceWorker;
    // A worker that finished installing while another one controls the page is a new version.
    const check = (reg: ServiceWorkerRegistration) => { if (!cancelled) setUpdate(!!reg.waiting && !reg.installing && !!sw.controller); };
    const watch = (reg: ServiceWorkerRegistration) => {
      const follow = (w: ServiceWorker | null) => w?.addEventListener("statechange", () => check(reg));
      follow(reg.installing);
      reg.addEventListener("updatefound", () => { follow(reg.installing); check(reg); });
      check(reg);
    };
    sw.register("/sw.js").then((reg) => {
      if (cancelled) return;
      regRef.current = reg;
      watch(reg);
      timer = setInterval(() => { reg.update().catch(() => { /* offline */ }); }, UPDATE_CHECK_MS);
    }).catch((err: unknown) => console.warn("Offline use not available", err));
    // Ready resolves once a worker is active, i.e. all files are stored.
    sw.ready.then(() => {
      if (cancelled) return;
      setReady(true);
      // Ask the browser not to clear the stored app when space runs low (granted silently or not at all).
      navigator.storage?.persist?.().catch(() => { /* not supported */ });
    });
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const applyUpdate = useCallback(async () => {
    const reg = regRef.current;
    if (!reg || applying) return;
    setApplying(true);
    // Fetch the newest worker script first; a newer version then starts installing.
    await reg.update().catch(() => { /* offline: use what is waiting */ });
    if (reg.installing) await installed(reg.installing, INSTALL_WAIT_MS);
    const next = reg.waiting;
    if (!next) { setApplying(false); setUpdate(false); return; }
    navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
    next.postMessage("skip-waiting");
  }, [applying]);

  return { ready, update, applying, applyUpdate: () => { void applyUpdate(); } };
}
