/**
 * Metric or imperial display. Analyses and thresholds stay in SI units; values are converted only here,
 * for showing them. Vertical speed is ft/s in imperial, so it keeps the precision of m/s.
 */
import { num, type Locale } from "./format";

export type UnitSystem = "metric" | "imperial";
export const UNIT_SYSTEMS: UnitSystem[] = ["metric", "imperial"];

/** What a number measures, in SI: m (height, distance), m (long distance, shown in km / mi), m/s (speed, vspeed), °C. */
export type Quantity = "height" | "distance" | "longDistance" | "speed" | "vspeed" | "temp";

interface Conv { unit: string; factor: number; offset?: number }

const FT = 3.28084;
const TABLE: Record<UnitSystem, Record<Quantity, Conv>> = {
  metric: {
    height: { unit: "m", factor: 1 },
    distance: { unit: "m", factor: 1 },
    longDistance: { unit: "km", factor: 1 / 1000 },
    speed: { unit: "km/h", factor: 3.6 },
    vspeed: { unit: "m/s", factor: 1 },
    temp: { unit: "°C", factor: 1 },
  },
  imperial: {
    height: { unit: "ft", factor: FT },
    distance: { unit: "ft", factor: FT },
    longDistance: { unit: "mi", factor: 1 / 1609.344 },
    speed: { unit: "mph", factor: 3600 / 1609.344 },
    vspeed: { unit: "ft/s", factor: FT },
    temp: { unit: "°F", factor: 1.8, offset: 32 },
  },
};

/** Catalogue units that have an imperial counterpart (min / max table). */
const BY_SI_UNIT: Record<string, Quantity> = { m: "height", "m/s": "vspeed", "°C": "temp" };
/** Channels whose unit alone does not say what they measure: a speed over ground is not a climb rate. */
const BY_CHANNEL: Record<string, Quantity> = { ground_speed: "speed" };

/** Default for first-time visitors: imperial only for US English. */
export function defaultUnits(lang: string | undefined): UnitSystem {
  return lang === "en-US" ? "imperial" : "metric";
}

export interface Units {
  system: UnitSystem;
  /** Unit label, e.g. "ft". */
  u(q: Quantity): string;
  /** Converted value; null stays null. */
  v(q: Quantity, si: number | null | undefined): number | null;
  /** Converted series (for charts). */
  series(q: Quantity, si: readonly (number | null)[]): (number | null)[];
  /** Formatted value with its unit, e.g. "1.2 ft/s"; "–" without a value. */
  fmt(q: Quantity, si: number | null | undefined, digits?: number): string;
  /** Formatted value without the unit. */
  n(q: Quantity, si: number | null | undefined, digits?: number): string;
  /** A value of channel `id` in its catalogue `unit`, shown like the same quantity elsewhere in the app. */
  byChannel(id: string, unit: string, si: number | null): { value: number | null; unit: string };
}

export function makeUnits(system: UnitSystem, locale: Locale): Units {
  const t = TABLE[system];
  const v = (q: Quantity, si: number | null | undefined) => (si === null || si === undefined || Number.isNaN(si) ? null : si * t[q].factor + (t[q].offset ?? 0));
  const n = (q: Quantity, si: number | null | undefined, digits = 0) => num(locale, v(q, si), digits);
  return {
    system,
    u: (q) => t[q].unit,
    v,
    series: (q, si) => si.map((x) => v(q, x)),
    n,
    fmt: (q, si, digits = 0) => { const s = n(q, si, digits); return s === "–" ? s : `${s} ${t[q].unit}`; },
    byChannel: (id, unit, si) => {
      const q = BY_CHANNEL[id] ?? BY_SI_UNIT[unit];
      return q ? { value: v(q, si), unit: t[q].unit } : { value: si, unit };
    },
  };
}
