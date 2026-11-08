"use client";

import type uPlot from "uplot";

/** Charts of one session, so a moment can be shown in all of them at once. */
const groups = new Map<string, Set<uPlot>>();

export function register(key: string, u: uPlot): () => void {
  let g = groups.get(key);
  if (!g) groups.set(key, (g = new Set()));
  g.add(u);
  return () => g!.delete(u);
}

/** Moves the cursor of every chart in the group to second `i`. */
export function jumpTo(key: string, i: number): void {
  for (const u of groups.get(key) ?? []) {
    if (!u.data?.[0] || u.data[0].length <= i) continue;
    u.setCursor({ left: u.valToPos(i, "x"), top: Math.max(1, u.bbox.height / devicePixelRatio / 2) });
  }
  const first = [...(groups.get(key) ?? [])][0];
  first?.root.scrollIntoView({ behavior: "smooth", block: "center" });
}
