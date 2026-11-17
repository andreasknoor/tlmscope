import type { SessionAnalysis } from "@/core/analysis";
import type { Tab } from "./store";

/** Cards and tiles in the overview that can lead to the page with the detail behind them. */
export type DetailKey = "link" | "signal" | "used" | "condition" | "highest" | "lift" | "motor" | "rx" | "data";

/** What the moment behind a rating is, so the text can say it. */
export type Spot = "hold" | "losses" | "weakest" | "sag" | "current" | "highest" | "lift" | "motor" | "rx";

export interface DetailTarget {
  tab: Tab;
  /** Second to put the cursor on; null when the page has no single moment to show. */
  at: number | null;
  spot: Spot | null;
  /** Number for the text (dBm, A, m, V, frame losses), in SI units. */
  value: number | null;
}

/** Index of the largest (or smallest) value within seconds from..to, or null without values. */
function extreme(data: (number | null)[], from: number, to: number, largest: boolean, ok: (i: number) => boolean = () => true): number | null {
  let best: number | null = null;
  for (let i = from; i <= to && i < data.length; i++) {
    const v = data[i];
    if (v === null || !ok(i)) continue;
    if (best === null || (largest ? v > data[best]! : v < data[best]!)) best = i;
  }
  return best;
}

/**
 * Where an overview value has its detail: the tab and the moment behind the rating.
 * Null when that page has nothing more to show (no data), so no link is offered.
 */
export function detailTarget(a: SessionAnalysis, key: DetailKey, details: boolean): DetailTarget | null {
  const g = a.grid;
  const p = a.profile.available ? a.profile.value : null;
  const [from, to] = p && p.airStart !== null ? [p.airStart, p.airEnd!] : [0, g.n - 1];
  const TABS: Record<DetailKey, Tab> = { link: "link", signal: "link", used: "energy", condition: "battery", highest: "height", lift: "height", motor: "energy", rx: "aircraft", data: "raw" };
  const at = (i: number | null, spot: Spot, data: (number | null)[]): DetailTarget => ({ tab: TABS[key], at: i, spot: i === null ? null : spot, value: i === null ? null : data[i] });

  switch (key) {
    case "signal": {
      if (!a.signal.available || a.signal.value.minAt === null) return null;
      return { tab: "link", at: a.signal.value.minAt, spot: "weakest", value: a.signal.value.minDbm };
    }
    case "link": {
      if (!a.link.available) return null;
      const holds = g.has("holds") ? g.get("holds", "increase") : [];
      const hold = a.link.value.holdsAirborne ? holds.findIndex((v, i) => i >= from && i <= to && (v ?? 0) > 0) : -1;
      if (hold >= 0) return { tab: "link", at: hold, spot: "hold", value: null };
      const w = a.link.value.worstSecond;
      return w ? { tab: "link", at: w.at, spot: "losses", value: w.frameLosses } : { tab: "link", at: null, spot: null, value: null };
    }
    case "used": {
      if (!a.batteryUse.available || !g.has("motor_current")) return null;
      const amps = g.get("motor_current");
      return at(extreme(amps, from, to, true), "current", amps);
    }
    case "condition": {
      if (!a.batteryCondition.available || !g.has("pack_voltage")) return null;
      const volts = g.get("pack_voltage"), amps = g.has("motor_current") ? g.get("motor_current") : null;
      // The lowest voltage while the motor draws current: the deepest sag.
      return at(extreme(volts, from, to, false, (i) => amps === null || (amps[i] ?? 0) > 1), "sag", volts);
    }
    case "highest": {
      if (!p || p.maxAltitudeM === null || !g.has("altitude")) return null;
      const alt = g.get("altitude");
      return at(extreme(alt, from, to, true), "highest", alt);
    }
    case "lift": {
      if (!p || !p.lifts.length) return null;
      return { tab: "height", at: p.lifts[0].start, spot: "lift", value: null };
    }
    case "motor": {
      if (!p || !g.has("motor_current") && !g.has("throttle_output") && !g.has("throttle_command")) return null;
      const run = p.phases.find((x) => x.kind === "motor");
      return run ? { tab: "energy", at: run.start, spot: "motor", value: null } : null;
    }
    case "rx": {
      if (!a.receiverPower.available || !g.has("rx_voltage") || a.receiverPower.value.rxMinV === null) return null;
      const min = a.receiverPower.value.rxMinV, rx = g.get("rx_voltage", "min");
      // The second of the steady minimum the card shows (not a collapse while unplugging).
      const i = rx.findIndex((v, k) => k >= from && k <= to && v !== null && Math.abs(v - min) < 0.006);
      return { tab: "aircraft", at: i >= 0 ? i : null, spot: i >= 0 ? "rx" : null, value: i >= 0 ? rx[i] : null };
    }
    case "data":
      return a.issues.length && details ? { tab: "raw", at: null, spot: null, value: null } : null;
  }
}
