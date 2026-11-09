"use client";

import { createContext, useContext } from "react";
import type { LogsAnalysis, SessionAnalysis } from "@/core/analysis";
import type { LogFile } from "@/core/model/types";
import type { Locale } from "./format";

export type View = "sessions" | "batteries" | "inventory";
export type Tab = "overview" | "height" | "path" | "energy" | "battery" | "link" | "aircraft" | "raw";

/** One session of one file, as shown in the list. */
export interface Entry {
  key: string;
  fileIndex: number;
  file: LogFile;
  a: SessionAnalysis;
  startMs: number | null;
  /** Battery letter (A, B, …) by first use, if the session has a battery identity. */
  batteryLetter: string | null;
}

export interface Settings {
  details: boolean;
  locale: Locale;
  filter: "flights" | "all";
}

export interface Store {
  files: LogFile[];
  analysis: LogsAnalysis | null;
  entries: Entry[];
  selected: Entry | null;
  view: View;
  tab: Tab;
  settings: Settings;
  /** True when the loaded files include the synthetic demo. */
  demo: boolean;
  setTab(t: Tab): void;
  select(key: string, tab?: Tab): void;
  step(delta: number): void;
  go(view: View): void;
  setSettings(patch: Partial<Settings>): void;
  addFiles(files: File[]): void;
  loadDemo(): void;
  /** Closes one file; closing the last one returns to the start screen. */
  closeFile(fileName: string): void;
  /** Closes all files and returns to the start screen. */
  closeAll(): void;
  openHelp(): void;
  visible: Entry[];
}

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore outside of StoreContext");
  return s;
}
