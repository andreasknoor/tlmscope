/** Locale-aware number and time formatting for the UI. */
export type Locale = "en" | "de";

const tag = (l: Locale) => (l === "de" ? "de-DE" : "en-GB");

export function num(locale: Locale, v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  return v.toLocaleString(tag(locale), { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });
}

/** Axis-friendly number: no decimals for whole numbers. */
export function axisNum(locale: Locale, v: number): string {
  return num(locale, v, Number.isInteger(v) ? 0 : Math.abs(v) < 1 ? 2 : 1);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** m:ss */
export const clock = (s: number) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;

export function duration(locale: Locale, s: number): string {
  return s >= 60 ? `${clock(s)} min` : `${num(locale, s, 1)} s`;
}

export function dayLabel(locale: Locale, ms: number): string {
  return new Date(ms).toLocaleDateString(tag(locale), { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function timeLabel(locale: Locale, ms: number): string {
  return new Date(ms).toLocaleTimeString(tag(locale), { hour: "2-digit", minute: "2-digit" });
}

export function dateShort(locale: Locale, ms: number): string {
  return new Date(ms).toLocaleDateString(tag(locale), { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Reads a CSS custom property, for canvas drawing. */
export function cssVar(name: string): string {
  if (typeof window === "undefined") return "#888";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}

export function withAlpha(color: string, alpha: number): string {
  const h = color.replace("#", "");
  if (!/^[0-9a-f]{3,6}$/i.test(h)) return color;
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const x = p(a), y = p(b);
  return `rgb(${x.map((v, k) => Math.round(v + (y[k] - v) * t)).join(",")})`;
}

/** Battery names by order of first use: A, B, …, Z, then AA, AB, … */
export function batteryLetter(k: number): string {
  let s = "";
  for (let n = k + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
