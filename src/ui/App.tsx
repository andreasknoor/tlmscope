"use client";

import { NextIntlClientProvider } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyseLogs } from "@/core/analysis";
import type { LogFile } from "@/core/model/types";
import de from "@/i18n/de.json";
import en from "@/i18n/en.json";
import { ErrorBoundary } from "./ErrorBoundary";
import { batteryLetter } from "./format";
import { loadBuffer } from "./loader";
import { Shell } from "./Shell";
import { StoreContext, type Entry, type Settings, type Store, type Tab, type View } from "./store";

const MESSAGES = { en, de };
const DEFAULTS: Settings = { details: false, locale: "en", filter: "flights" };
const SETTINGS_KEY = "tlmscope.settings";
/** Capacity assumed for batteries that do not report one (the most common Spektrum Smart 3S size). */
const ASSUMED_CAPACITY = 2200;
export const DEMO_FILE = "demo-flight.TLM";
/** Larger files are refused: real logs are a few MB, and parsing needs several times the file size in memory. */
export const MAX_FILE_BYTES = 256 * 1024 * 1024;

/** Saved settings, each value checked: storage can hold anything, e.g. from an older version. */
function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    const saved = JSON.parse(raw) as Record<string, unknown> | null;
    if (!saved || typeof saved !== "object") return DEFAULTS;
    // Older versions stored a detail level next to the details toggle; it is now part of the toggle.
    const details = typeof saved.details === "boolean" ? saved.details : typeof saved.level === "string" ? saved.level !== "simple" : DEFAULTS.details;
    const locale = saved.locale === "en" || saved.locale === "de" ? saved.locale : DEFAULTS.locale;
    const filter = saved.filter === "flights" || saved.filter === "all" ? saved.filter : DEFAULTS.filter;
    return { details, locale, filter };
  } catch {
    return DEFAULTS;
  }
}

export interface LoadMessage { kind: "loading" | "error" | "info"; text: string; values: Record<string, string> }

export function App() {
  const [files, setFiles] = useState<LogFile[]>([]);
  const [settings, setSettingsState] = useState<Settings>(DEFAULTS);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [view, setView] = useState<View>("sessions");
  const [tab, setTab] = useState<Tab>("overview");
  const [messages, setMessages] = useState<LoadMessage[]>([]);
  const helpRef = useRef<HTMLDialogElement>(null);

  // Browser-only storage can only be read after hydration; the server render uses the defaults.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSettingsState(readSettings()), []);
  useEffect(() => {
    document.documentElement.lang = settings.locale;
    document.body.dataset.details = settings.details ? "on" : "off";
  }, [settings.locale, settings.details]);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((s) => {
      const next = { ...s, ...patch };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* storage may be blocked */ }
      return next;
    });
  }, []);

  const analysis = useMemo(() => (files.length ? analyseLogs(files, { assumedCapacityMah: ASSUMED_CAPACITY }) : null), [files]);

  const entries = useMemo<Entry[]>(() => {
    if (!analysis) return [];
    const out: Entry[] = [];
    let k = 0;
    files.forEach((file, fileIndex) => {
      for (const s of file.sessions) {
        const a = analysis.sessions[k++];
        out.push({ key: `${fileIndex}-${s.index}`, fileIndex, file, a, startMs: s.start.utcMs, batteryLetter: null });
      }
    });
    out.sort((x, y) => (x.startMs ?? 0) - (y.startMs ?? 0) || x.fileIndex - y.fileIndex);
    const letters = new Map<string, string>();
    for (const e of out) {
      const id = e.a.session.battery?.id;
      if (!id) continue;
      if (!letters.has(id)) letters.set(id, batteryLetter(letters.size));
      e.batteryLetter = letters.get(id)!;
    }
    return out;
  }, [analysis, files]);

  const hasFlights = entries.some((e) => e.a.kind === "flight");
  const visible = useMemo(() => entries.filter((e) => settings.filter === "all" || !hasFlights || e.a.kind === "flight"), [entries, settings.filter, hasFlights]);
  // Without an explicit choice: the latest flight, else the latest session.
  const selected = entries.find((e) => e.key === selectedKey) ?? (hasFlights ? entries.filter((e) => e.a.kind === "flight").at(-1) : entries.at(-1)) ?? null;

  // URL hash ↔ view and session
  const applyHash = useCallback(() => {
    const h = location.hash.slice(1);
    const m = /^s-(\d+-\d+)$/.exec(h);
    if (m) { setView("sessions"); setSelectedKey(m[1]); }
    else if (h === "batteries" || h === "inventory") setView(h);
    else if (h === "sessions") setView("sessions");
  }, []);
  useEffect(() => {
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [applyHash]);

  const select = useCallback((key: string, t?: Tab) => {
    if (t) setTab(t);
    setSelectedKey(key);
    setView("sessions");
    const entry = entries.find((e) => e.key === key);
    if (entry && entry.a.kind !== "flight") setSettings({ filter: "all" });
    history.replaceState(null, "", `#s-${key}`);
  }, [entries, setSettings]);

  const go = useCallback((v: View) => {
    setView(v);
    history.replaceState(null, "", `#${v}`);
  }, []);

  const step = useCallback((d: number) => {
    const list = visible;
    if (!list.length) return;
    const p = list.findIndex((e) => e.key === selected?.key);
    const next = list[Math.max(0, Math.min(list.length - 1, (p < 0 ? 0 : p) + d))];
    if (next) select(next.key);
  }, [visible, selected, select]);

  // Names of the loaded files, for the "replaced" notice; read inside the async loader.
  const loadedNames = useRef<Set<string>>(new Set());
  useEffect(() => { loadedNames.current = new Set(files.map((f) => f.fileName)); }, [files]);

  const addLogs = useCallback(async (items: { name: string; size?: number; buffer: () => Promise<ArrayBuffer> }[]) => {
    const error = (text: string, values: Record<string, string>) => setMessages((m) => [...m.filter((x) => x.kind !== "loading"), { kind: "error", text, values }]);
    for (const item of items) {
      if (item.size !== undefined && item.size > MAX_FILE_BYTES) {
        error("app.tooLarge", { name: item.name, max: String(MAX_FILE_BYTES / 1024 / 1024) });
        continue;
      }
      setMessages((m) => [...m.filter((x) => x.kind !== "loading"), { kind: "loading", text: "app.loading", values: { name: item.name } }]);
      try {
        const r = await loadBuffer(await item.buffer(), item.name);
        setMessages((m) => m.filter((x) => x.kind !== "loading"));
        if (r.ok) {
          // The same name usually is a newer copy of the same log (Spektrum names files after the model).
          if (loadedNames.current.has(r.log.fileName)) setMessages((m) => [...m, { kind: "info", text: "app.replaced", values: { name: r.log.fileName } }]);
          loadedNames.current.add(r.log.fileName);
          setFiles((f) => [...f.filter((x) => x.fileName !== r.log.fileName), r.log]);
          applyHash();
        }
        else error(r.unsupported ? "app.unsupported" : "app.readError", { name: item.name, message: r.message });
      } catch (err) {
        // Reading the file or downloading the demo failed (file moved, offline, …).
        error("app.readError", { name: item.name, message: err instanceof Error ? err.message : String(err) });
      }
    }
  }, [applyHash]);

  const addFiles = useCallback((list: File[]) => {
    void addLogs(list.map((f) => ({ name: f.name, size: f.size, buffer: () => f.arrayBuffer() })));
  }, [addLogs]);

  const loadDemo = useCallback(() => {
    void addLogs([{
      name: DEMO_FILE,
      buffer: async () => {
        const r = await fetch(`demo/${DEMO_FILE}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      },
    }]);
  }, [addLogs]);

  // Session keys contain the file position, so any close resets the selection to the default.
  const closeFile = useCallback((fileName: string) => {
    const rest = files.filter((f) => f.fileName !== fileName);
    setFiles(rest);
    setSelectedKey(null);
    if (!rest.length) { setView("sessions"); setMessages([]); }
    history.replaceState(null, "", rest.length && view !== "sessions" ? `#${view}` : location.pathname);
  }, [files, view]);

  const closeAll = useCallback(() => {
    setFiles([]);
    setSelectedKey(null);
    setView("sessions");
    setMessages([]);
    history.replaceState(null, "", location.pathname);
  }, []);

  // keyboard: arrows step through sessions
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== "sessions" || helpRef.current?.open) return;
      if ((e.target as HTMLElement).closest("input,select,textarea")) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, step]);

  const store: Store = {
    files, analysis, entries, selected, view, tab, settings, visible,
    demo: files.some((f) => f.fileName === DEMO_FILE),
    setTab, select, step, go, setSettings, addFiles, loadDemo, closeFile, closeAll,
    openHelp: () => helpRef.current?.showModal(),
  };

  return (
    <ErrorBoundary fallback={() => <PageError />}>
      <NextIntlClientProvider locale={settings.locale} messages={MESSAGES[settings.locale]} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>
        <StoreContext.Provider value={store}>
          <Shell helpRef={helpRef} messages={messages} dismiss={(i) => setMessages((m) => m.filter((_, k) => k !== i))} />
        </StoreContext.Provider>
      </NextIntlClientProvider>
    </ErrorBoundary>
  );
}

/** Last resort when the page frame itself fails. Both languages, because translations may be what failed. */
function PageError() {
  return (
    <div className="welcome">
      <div className="errorbox stack">
        <b>Something went wrong. · Etwas ist schiefgelaufen.</b>
        <span>Reload the page and open your files again. · Lade die Seite neu und öffne deine Dateien erneut.</span>
        <div><button className="btn" onClick={() => location.reload()}>Reload · Neu laden</button></div>
      </div>
    </div>
  );
}
