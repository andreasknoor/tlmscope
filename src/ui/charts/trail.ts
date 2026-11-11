/** The flown part of the path for the replay trail. Kept apart from the map so it can be tested without the map libraries. */

export type Rgba = [number, number, number] | [number, number, number, number];
/** One stretch of the path with a GPS fix: points, their colours and their seconds. */
export interface PathLine { path: [number, number, number][]; colors: Rgba[]; secs: number[] }

/** The path flown up to and including second `sec`. */
export function trailUpTo(lines: PathLine[], sec: number): PathLine[] {
  const out: PathLine[] = [];
  for (const l of lines) {
    if (l.secs[0] > sec) break;
    let n = l.secs.length;
    if (l.secs[n - 1] > sec) { n = 0; while (l.secs[n] <= sec) n++; }
    if (n > 1) out.push(n === l.secs.length ? l : { path: l.path.slice(0, n), colors: l.colors.slice(0, n), secs: l.secs.slice(0, n) });
  }
  return out;
}

