"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

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

export interface OfflineState {
  /** The app is stored in the browser and opens without a network. */
  ready: boolean;
  /** A new version is stored and waits for a reload. */
  update: boolean;
  /** Switches to the new version and reloads the page. */
  applyUpdate(): void;
}

/**
 * Registers the service worker (`/sw.js`, written by `cli/make-sw.ts` after the build) in production
 * builds and reports when the app works offline and when a new version is waiting.
 */
export function useServiceWorker(): OfflineState {
  const [ready, setReady] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const sw = navigator.serviceWorker;
    // A worker that finished installing while another one controls the page is a new version.
    const watch = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && sw.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        next?.addEventListener("statechange", () => {
          if (next.state === "installed" && sw.controller && !cancelled) setWaiting(next);
        });
      });
    };
    sw.register("/sw.js").then((reg) => {
      if (cancelled) return;
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

  const applyUpdate = useCallback(() => {
    if (!waiting) return;
    navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
    waiting.postMessage("skip-waiting");
  }, [waiting]);

  return { ready, update: waiting !== null, applyUpdate };
}
