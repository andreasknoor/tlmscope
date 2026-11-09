"use client";

import type uPlot from "uplot";

/** Charts of one session, so a moment can be shown in all of them at once. */
const groups = new Map<string, Set<uPlot>>();

/**
 * Adds a chart to its session group. Also lets a finger drag the cursor sideways:
 * uPlot only follows the mouse, so on touch screens a tap set the line but a drag did not move it.
 * Vertical swipes still scroll the page.
 */
export function register(key: string, u: uPlot): () => void {
  let g = groups.get(key);
  if (!g) groups.set(key, (g = new Set()));
  g.add(u);

  const over = u.over;
  over.style.touchAction = "pan-y";
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const r = over.getBoundingClientRect();
    const left = Math.max(0, Math.min(r.width, e.clientX - r.left));
    const i = u.posToIdx(left);
    if (i !== null && i !== undefined) moveAll(key, i);
  };
  over.addEventListener("pointerdown", onPointer);
  over.addEventListener("pointermove", onPointer);

  return () => {
    over.removeEventListener("pointerdown", onPointer);
    over.removeEventListener("pointermove", onPointer);
    g!.delete(u);
  };
}

/** Listeners for cursor moves in a group, e.g. the replay following a hovered chart. */
const listeners = new Map<string, Set<(i: number) => void>>();

export function onCursorMove(key: string, fn: (i: number) => void): () => void {
  let l = listeners.get(key);
  if (!l) listeners.set(key, (l = new Set()));
  l.add(fn);
  return () => l!.delete(fn);
}

/** Called by charts when their cursor lands on second `i`. */
export function notifyCursor(key: string, i: number): void {
  for (const fn of listeners.get(key) ?? []) fn(i);
}

/** Puts the cursor of every chart in the group on second `i`. */
export function moveAll(key: string, i: number): void {
  for (const u of groups.get(key) ?? []) {
    if (!u.data?.[0] || u.data[0].length <= i) continue;
    u.setCursor({ left: u.valToPos(i, "x"), top: Math.max(1, u.bbox.height / devicePixelRatio / 2) });
  }
}

/** Moves the cursor of every chart in the group to second `i` and scrolls the first chart into view. */
export function jumpTo(key: string, i: number): void {
  moveAll(key, i);
  const first = [...(groups.get(key) ?? [])][0];
  first?.root.scrollIntoView({ behavior: "smooth", block: "center" });
}
