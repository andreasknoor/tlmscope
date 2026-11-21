import type { Channel, Session } from "../model/types.ts";

/**
 * A flight simulator flown with the transmitter through a wireless dongle (Spektrum WS3000).
 * The dongle binds like a receiver and sends a link report, but nothing from a model: no
 * receiver voltage (0, read as no reading), no fades, frame losses or holds, a link quality
 * of 100 % throughout and no signal strength, or a very strong one (it sits next to the transmitter).
 */
export const SIMULATOR = {
  /** A real receiver in the air or on the field reads weaker than this (dBm); a dongle centimetres away reads stronger. */
  minDbm: -35,
  /** Stick activity is judged in windows of this length (s). */
  windowS: 10,
  /** A window counts as flown when a stick moves over at least this share of its range in it. */
  activeSpan: 0.05,
} as const;

/** Channels a dongle sends: the link report and the signal block, nothing measured on a model. */
const LINK_ONLY = new Set(["fades.a", "fades.b", "fades.l", "fades.r", "frame_losses", "holds", "rx_voltage", "signal_dbm", "signal_quality"]);
const DONGLE_NAME = /\bWS ?3000/i;

const values = (c: Channel | undefined) => (c ? Array.from(c.v).filter(Number.isFinite) : []);

/** True for a session recorded with a simulator dongle instead of a model. */
export function isSimulator(session: Session): boolean {
  const fromModel = [...session.channels.values()].filter((c) => !c.source.transmitter && !c.id.startsWith("raw:") && values(c).length > 0);
  if (!fromModel.length || fromModel.some((c) => !LINK_ONLY.has(c.id))) return false;
  const ch = (id: string) => values(session.channels.get(id));
  if (ch("rx_voltage").length) return false;
  if (["fades.a", "fades.b", "fades.l", "fades.r", "frame_losses", "holds"].some((id) => ch(id).some((v) => v > 0))) return false;
  const quality = ch("signal_quality");
  if (quality.some((v) => v < 100)) return false;
  if (ch("signal_dbm").some((v) => v < SIMULATOR.minDbm)) return false;
  return quality.length > 0 || DONGLE_NAME.test(session.modelName ?? "");
}

export interface SimulatorTime {
  /** Seconds the transmitter was connected to the simulator (the whole session). */
  connectedS: number;
  /** Seconds with the sticks moved (windows of `windowS`); null when the log has no stick positions. */
  activeS: number | null;
}

/** Connected and actively flown time of a simulator session. */
export function simulatorTime(session: Session): SimulatorTime {
  const connectedS = session.durationS;
  const sticks = [...session.channels.values()].filter((c) => c.id.startsWith("stick.") || c.id === "throttle_command");
  const t0 = Math.min(...sticks.map((c) => c.t[0] ?? Infinity));
  if (!sticks.length || !Number.isFinite(t0)) return { connectedS, activeS: null };
  const active = new Set<number>();
  for (const c of sticks) {
    const v = values(c);
    let lo = Infinity, hi = -Infinity;
    for (const x of v) { if (x < lo) lo = x; if (x > hi) hi = x; }
    if (!(hi > lo)) continue;
    const need = (hi - lo) * SIMULATOR.activeSpan;
    // Smallest and largest position per window.
    const span = new Map<number, [number, number]>();
    for (let i = 0; i < c.t.length; i++) {
      const x = c.v[i];
      if (!Number.isFinite(x)) continue;
      const w = Math.floor((c.t[i] - t0) / SIMULATOR.windowS);
      const s = span.get(w);
      if (!s) span.set(w, [x, x]);
      else { if (x < s[0]) s[0] = x; if (x > s[1]) s[1] = x; }
    }
    for (const [w, [a, b]] of span) if (b - a >= need) active.add(w);
  }
  return { connectedS, activeS: Math.min(connectedS, active.size * SIMULATOR.windowS) };
}
