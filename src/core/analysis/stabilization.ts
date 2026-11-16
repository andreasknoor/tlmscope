import type { FlightProfile } from "./flight.ts";
import type { Grid } from "./grid.ts";

export const STABILIZATION = {
  /** Flight modes used for less time are left out: flicking a three-position switch from 0 to 2 passes position 1 for about a second. */
  minModeS: 3,
  /** The receiver reports about three times a second; a gap up to this long keeps the last mode. */
  maxGapS: 5,
} as const;

/** Time with one set of stabilization functions, over all flight modes that use it. */
export interface StabilizationUse {
  /** Bit field from the receiver: 1 = AS3X, 2 = SAFE, 4 = heading hold, 0 = off; null when only the mode is known. */
  bits: number | null;
  /** Flight mode indices (0 = mode 1), ascending. */
  modes: number[];
  seconds: number;
  /** Typical AS3X gain (median of roll, pitch, yaw) over this time; null without AS3X or without gain data. */
  gain: [number, number, number] | null;
}

export interface Stabilization {
  /** False when the log has no flight mode from the receiver: nothing is known about stabilization. */
  reported: boolean;
  /** True when only the time in the air was counted. */
  inAir: boolean;
  /** Most time first. */
  uses: StabilizationUse[];
}

const AXES = ["roll", "pitch", "yaw"] as const;
const median = (a: number[]) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

/** Gaps of up to `maxGap` seconds between two values take the value before the gap; longer gaps and the ends stay empty. */
function fillShortGaps(s: (number | null)[], maxGap: number): (number | null)[] {
  const out = s.slice();
  let lastK = -1;
  for (let k = 0; k < out.length; k++) {
    if (out[k] === null) continue;
    if (lastK >= 0 && k - lastK - 1 <= maxGap) for (let j = lastK + 1; j < k; j++) out[j] = out[lastK];
    lastK = k;
  }
  return out;
}

/** Seconds per set of stabilization functions, in the air when the session is a flight. */
export function stabilization(g: Grid, profile: FlightProfile | null): Stabilization {
  if (!g.has("flight_mode")) return { reported: false, inAir: false, uses: [] };
  const fm = fillShortGaps(g.get("flight_mode", "last"), STABILIZATION.maxGapS);
  const st = g.has("stabilization") ? fillShortGaps(g.get("stabilization", "last"), STABILIZATION.maxGapS) : null;
  const inAir = profile !== null && profile.airStart !== null && profile.airEnd !== null;
  const from = inAir ? profile.airStart! : 0;
  const to = inAir ? profile.airEnd! : g.n - 1;

  const gains = AXES.map((a) => (g.has(`as3x_gain.${a}`) ? fillShortGaps(g.get(`as3x_gain.${a}`, "last"), STABILIZATION.maxGapS) : null));
  const gainSecs = new Map<number, number[][]>();
  const secs = new Map<number, number>();
  const bitCounts = new Map<number, Map<number, number>>();
  for (let k = from; k <= to; k++) {
    const m = fm[k];
    if (m === null) continue;
    secs.set(m, (secs.get(m) ?? 0) + 1);
    if (gains.every((a) => a?.[k] != null)) {
      const list = gainSecs.get(m) ?? [];
      list.push(gains.map((a) => a![k]!));
      gainSecs.set(m, list);
    }
    const b = st?.[k];
    if (b === null || b === undefined) continue;
    const c = bitCounts.get(m) ?? new Map<number, number>();
    c.set(b, (c.get(b) ?? 0) + 1);
    bitCounts.set(m, c);
  }

  const groups = new Map<string, StabilizationUse>();
  for (const [m, s] of [...secs].sort((a, b) => a[0] - b[0])) {
    if (s < STABILIZATION.minModeS) continue;
    const c = bitCounts.get(m);
    const bits = c ? [...c].sort((a, b) => b[1] - a[1])[0][0] : null;
    // Modes with the same functions are one entry; without the functions each mode stands alone.
    const key = bits === null ? `mode ${m}` : `bits ${bits}`;
    const u = groups.get(key) ?? { bits, modes: [], seconds: 0, gain: null };
    u.modes.push(m);
    u.seconds += s;
    groups.set(key, u);
  }
  for (const u of groups.values()) {
    const list = u.modes.flatMap((m) => gainSecs.get(m) ?? []);
    if (u.bits !== null && u.bits & 1 && list.length) u.gain = [0, 1, 2].map((a) => median(list.map((x) => x[a]))) as [number, number, number];
  }
  return { reported: true, inAir, uses: [...groups.values()].sort((a, b) => b.seconds - a.seconds) };
}
