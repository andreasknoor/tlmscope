import type { Session } from "../model/types.ts";
import type { FlightProfile } from "./flight.ts";
import { Grid, medianOf, minOf } from "./grid.ts";
import { withNeeds, type Result } from "./requirements.ts";
import { overall, rate, THRESHOLDS, type Level, type Overall } from "./thresholds.ts";

export interface LinkAnalysis {
  /** Which channel the rating is based on. */
  basis: "frame_losses" | "link_quality";
  levels: (Level | null)[];
  overall: Overall | null;
  /** Frame losses in the rating window (airborne time of a flight, else the whole session); so are the fades. */
  frameLosses: number | null;
  frameLossesPerMinute: number | null;
  /** Holds while airborne. Holds on the ground (e.g. switching the transmitter off) do not count. */
  holdsAirborne: number | null;
  holdsTotal: number | null;
  fades: Partial<Record<"a" | "b" | "l" | "r", number>>;
  /** Second with the most frame losses, in the rating window. */
  worstSecond: { at: number; frameLosses: number } | null;
}

export interface SignalAnalysis {
  levels: (Level | null)[];
  overall: Overall | null;
  medianDbm: number | null;
  /** Weakest signal in the rating window. */
  minDbm: number | null;
  minAt: number | null;
}

/** Window the rating looks at: the airborne part of a flight, else the whole session. */
function ratingWindow(profile: FlightProfile | null, n: number): [number, number] {
  return profile && profile.airStart !== null ? [profile.airStart, profile.airEnd!] : [0, n - 1];
}

/** Increase of a counter channel within seconds w0…w1; null without the channel. */
const increase = (g: Grid, id: string, w0: number, w1: number): number | null => {
  if (!g.has(id)) return null;
  const inc = g.get(id, "increase");
  let s = 0;
  for (let i = w0; i <= w1; i++) s += inc[i] ?? 0;
  return s;
};

const last = (session: Session, id: string): number | null => {
  const ch = session.channels.get(id);
  if (!ch) return null;
  for (let i = ch.v.length - 1; i >= 0; i--) if (!Number.isNaN(ch.v[i])) return ch.v[i];
  return null;
};

export function linkQuality(session: Session, profile: FlightProfile | null, g = new Grid(session)): Result<LinkAnalysis> {
  return withNeeds(session, [["frame_losses", "link_quality"]], () => {
    const n = g.n;
    const [w0, w1] = ratingWindow(profile, n);
    const holdsInc = g.get("holds", "increase");
    let holdsAirborne: number | null = null;
    if (g.has("holds")) {
      holdsAirborne = 0;
      if (profile && profile.airStart !== null) for (let i = w0; i <= w1; i++) holdsAirborne += holdsInc[i] ?? 0;
    }
    let levels: (Level | null)[];
    let basis: LinkAnalysis["basis"];
    let worstSecond: LinkAnalysis["worstSecond"] = null;
    if (g.has("frame_losses")) {
      basis = "frame_losses";
      const fl = g.get("frame_losses", "increase");
      levels = Array.from({ length: n }, (_, i) => {
        if (profile?.airStart != null && i >= w0 && i <= w1 && (holdsInc[i] ?? 0) > 0) return 1;
        if (fl[i] === null) return null;
        let c = 0;
        for (let k = Math.max(0, i - 59); k <= i; k++) c += fl[k] ?? 0;
        return rate(c, THRESHOLDS.frameLossesPerMinute);
      });
      for (let i = w0; i <= w1; i++) if ((fl[i] ?? 0) > (worstSecond?.frameLosses ?? 0)) worstSecond = { at: i, frameLosses: fl[i]! };
    } else {
      basis = "link_quality";
      levels = g.get("link_quality").map((v) => rate(v, THRESHOLDS.linkQualityPct));
    }
    // Counts, rate and fades all cover the rating window, like the holds: losses while the
    // transmitter is switched off after landing are not part of the flight.
    const frameLosses = increase(g, "frame_losses", w0, w1);
    const minutes = profile && profile.airStart !== null ? (w1 - w0 + 1) / 60 : session.durationS / 60;
    return {
      basis,
      levels,
      overall: overall(levels.slice(w0, w1 + 1)),
      frameLosses,
      frameLossesPerMinute: frameLosses !== null && minutes > 0 ? frameLosses / minutes : null,
      holdsAirborne,
      holdsTotal: last(session, "holds"),
      fades: Object.fromEntries((["a", "b", "l", "r"] as const).map((k) => [k, increase(g, `fades.${k}`, w0, w1)]).filter(([, v]) => v !== null)),
      worstSecond,
    };
  });
}

export function signalStrength(session: Session, profile: FlightProfile | null, g = new Grid(session)): Result<SignalAnalysis> {
  return withNeeds(session, ["signal_dbm"], () => {
    const dbm = g.get("signal_dbm");
    const [w0, w1] = ratingWindow(profile, g.n);
    const levels = dbm.map((v) => rate(v, THRESHOLDS.signalDbm));
    const win = dbm.slice(w0, w1 + 1);
    const minDbm = minOf(win);
    return {
      levels,
      overall: overall(levels.slice(w0, w1 + 1)),
      medianDbm: medianOf(win),
      minDbm,
      minAt: minDbm === null ? null : w0 + win.indexOf(minDbm),
    };
  });
}

