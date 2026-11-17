"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CHANGELOG, compareVersions } from "@/changelog";

/** Last version whose changes this browser has seen (opened the list, or first visit). */
const SEEN_KEY = "tlmscope.changelogSeen";
const SHOWN = 8;
const noSubscribe = () => () => {};

function readSeen(): string | null {
  try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
}
function writeSeen(v: string) {
  try { localStorage.setItem(SEEN_KEY, v); } catch { /* private mode: the dot just stays */ }
}

/** The version in the header: opens the latest changes; a dot marks changes since the last look. */
export function WhatsNew({ version }: { version: string }) {
  const t = useTranslations("whatsNew");
  const [open, setOpen] = useState(false);
  // Read once on the client; null on the server and on a first visit (nothing to mark).
  const seen = useSyncExternalStore(noSubscribe, readSeen, () => null);
  // Opened once: the dot goes, the rows stay marked until the next visit.
  const [looked, setLooked] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const known = CHANGELOG.some((r) => r.version === version);

  useEffect(() => {
    if (!known) return;
    // A first visit has nothing "new": everything is.
    if (readSeen() === null) writeSeen(version);
  }, [known, version]);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!known) return <span className="version" title={`TLMscope ${version}`}>v{version}</span>;
  const unseen = (v: string) => seen !== null && compareVersions(v, seen) > 0;
  const toggle = () => {
    setOpen((o) => !o);
    if (!open) { writeSeen(version); setLooked(true); }
  };

  return (
    <span className="whatsnew" ref={ref}>
      <button className="version link" aria-expanded={open} aria-haspopup="dialog" title={t("title")} onClick={toggle}>
        v{version}{!looked && unseen(version) && <i className="dot" aria-label={t("unseen")} />}
      </button>
      {open && (
        <div className="wn-pop" role="dialog" aria-label={t("title")}>
          <h3>{t("title")}</h3>
          {/* The list scrolls; the link to all changes always stays in view below it. */}
          <div className="wn-list">
          {CHANGELOG.slice(0, SHOWN).map((r) => r.changes.map(([kind, text], i) => (
            <div key={`${r.version}-${i}`} className={`wn-row${unseen(r.version) ? " unseen" : ""}`}>
              <span className="wn-v">{i ? "" : r.version}</span>
              <span className={`wn-tag ${kind}`}>{kind === "new" ? "New" : "Fix"}</span>
              <span>{text}</span>
            </div>
          )))}
          </div>
          <Link className="wn-more" href="/changelog">{t("all")} ›</Link>
        </div>
      )}
    </span>
  );
}
