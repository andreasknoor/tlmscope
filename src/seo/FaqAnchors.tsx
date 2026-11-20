"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Behaviour of the folded questions of a guide:
 * - opens the question a link points to (on arrival with #id, on a hash change, on links within the page);
 * - opens all questions for printing and restores them afterwards;
 * - with `toggle`, a link above the questions that opens or closes all of them. It stays hidden without JavaScript.
 */
export function FaqAnchors({ toggle }: { toggle?: { open: string; close: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    const section = ref.current?.parentElement;
    if (!section) return;
    const items = () => Array.from(section.querySelectorAll<HTMLDetailsElement>("details.qa"));
    const sync = () => setAllOpen(items().every((d) => d.open));

    const openTarget = (hash: string) => {
      const id = decodeURIComponent(hash.replace(/^#/, ""));
      const el = id ? document.getElementById(id) : null;
      if (el instanceof HTMLDetailsElement) el.open = true;
    };
    openTarget(location.hash);
    const onHash = () => openTarget(location.hash);
    // Links handled by the router change the address without a hashchange event.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href*='#']");
      if (a instanceof HTMLAnchorElement && a.pathname === location.pathname) openTarget(a.hash);
    };

    let beforePrint: boolean[] = [];
    const onBeforePrint = () => {
      beforePrint = items().map((d) => d.open);
      for (const d of items()) d.open = true;
    };
    const onAfterPrint = () => items().forEach((d, k) => (d.open = beforePrint[k] ?? d.open));

    ref.current?.removeAttribute("hidden");
    // "toggle" does not bubble, so it is caught on the way down.
    section.addEventListener("toggle", sync, true);
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      section.removeEventListener("toggle", sync, true);
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onClick);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, []);

  const setAll = (open: boolean) => {
    for (const d of ref.current?.parentElement?.querySelectorAll<HTMLDetailsElement>("details.qa") ?? []) d.open = open;
  };

  return (
    <div ref={ref} className="qa-tools" hidden>
      {toggle && (
        <button type="button" className="qa-all" aria-expanded={allOpen} onClick={() => setAll(!allOpen)}>
          {allOpen ? toggle.close : toggle.open}
        </button>
      )}
    </div>
  );
}
