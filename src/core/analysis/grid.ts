import type { Session } from "../model/types.ts";

export type Series = (number | null)[];
export type Aggregate = "mean" | "min" | "max" | "last" | "increase";

/**
 * Resamples channels onto a 1-second grid (bin k = samples with k ≤ t < k + 1).
 * Analyses work on this grid, so they behave the same for every input format,
 * whatever the original sample rates are.
 */
export class Grid {
  readonly n: number;
  private cache = new Map<string, Series>();
  private readonly session: Session;

  constructor(session: Session) {
    this.session = session;
    let end = session.durationS;
    for (const ch of session.channels.values()) if (ch.t.length) end = Math.max(end, ch.t[ch.t.length - 1]);
    this.n = Math.floor(end) + 1;
  }

  has(id: string): boolean {
    return this.session.channels.has(id);
  }

  /** Per-second aggregate of a channel; null where the channel had no valid sample in that second. */
  get(id: string, how: Aggregate = "mean"): Series {
    const key = `${id}|${how}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const out: Series = new Array(this.n).fill(null);
    const ch = this.session.channels.get(id);
    if (ch) {
      const sum = new Float64Array(this.n);
      const cnt = new Uint32Array(this.n);
      let prev = NaN;
      for (let i = 0; i < ch.t.length; i++) {
        const k = Math.floor(ch.t[i]);
        if (k < 0 || k >= this.n) continue;
        const v = ch.v[i];
        if (Number.isNaN(v)) continue;
        if (how === "increase") {
          const d = Number.isNaN(prev) ? 0 : Math.max(0, v - prev);
          prev = v;
          out[k] = (out[k] ?? 0) + d;
          continue;
        }
        if (how === "mean") { sum[k] += v; cnt[k]++; continue; }
        const cur = out[k];
        if (how === "last" || cur === null) out[k] = v;
        else if (how === "min") out[k] = Math.min(cur, v);
        else if (how === "max") out[k] = Math.max(cur, v);
      }
      if (how === "mean") for (let k = 0; k < this.n; k++) if (cnt[k]) out[k] = sum[k] / cnt[k];
    }
    this.cache.set(key, out);
    return out;
  }

  /** Like `get`, with gaps filled by the last known value (for slow signals). */
  filled(id: string, how: Aggregate = "mean"): Series {
    const key = `${id}|${how}|filled`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const src = this.get(id, how);
    const out: Series = new Array(this.n);
    let last: number | null = null;
    for (let k = 0; k < this.n; k++) {
      if (src[k] !== null) last = src[k];
      out[k] = last;
    }
    this.cache.set(key, out);
    return out;
  }

  /** Per-second maximum of the vector length of several channels (e.g. accel x/y/z). */
  magnitudeMax(ids: string[]): Series {
    const key = `|mag|${ids.join(",")}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const chs = ids.map((id) => this.session.channels.get(id));
    const out: Series = new Array(this.n).fill(null);
    if (chs.every(Boolean)) {
      const [a, ...rest] = chs as NonNullable<(typeof chs)[number]>[];
      // samples of one sensor arrive together, so the same index belongs to the same packet
      for (let i = 0; i < a.t.length; i++) {
        const k = Math.floor(a.t[i]);
        if (k < 0 || k >= this.n) continue;
        let s = a.v[i] ** 2;
        for (const c of rest) s += (c.v[i] ?? NaN) ** 2;
        if (Number.isNaN(s)) continue;
        const m = Math.sqrt(s);
        if (out[k] === null || m > out[k]!) out[k] = m;
      }
    }
    this.cache.set(key, out);
    return out;
  }
}

export const valid = (a: Series): number[] => a.filter((v): v is number => v !== null);
export const maxOf = (a: Series): number | null => { const v = valid(a); return v.length ? Math.max(...v) : null; };
export const minOf = (a: Series): number | null => { const v = valid(a); return v.length ? Math.min(...v) : null; };
export const sumOf = (a: Series): number => a.reduce<number>((s, v) => s + (v ?? 0), 0);
export const medianOf = (a: Series): number | null => {
  const v = valid(a).sort((x, y) => x - y);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};
