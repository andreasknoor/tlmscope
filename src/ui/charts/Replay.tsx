"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionAnalysis } from "@/core/analysis";
import { clock, cssVar, num, withAlpha } from "../format";
import { useStore } from "../store";
import { PHASE_COLOR } from "./LineChart";
import { moveAll, onCursorMove } from "./sync";
import { useThemeVersion } from "./useTheme";

const SPEEDS = [1, 10, 30, 60] as const;

/** Vario tone: beeps that rise in pitch and rate with the climb, silent below +0.2 m/s. */
class VarioTone {
  private ctx = new AudioContext();
  private osc = this.ctx.createOscillator();
  private gain = this.ctx.createGain();
  private timer: ReturnType<typeof setInterval> | null = null;
  private last: number | null = null;
  constructor() {
    this.gain.gain.value = 0;
    this.osc.connect(this.gain).connect(this.ctx.destination);
    this.osc.start();
  }
  set(climb: number | null) {
    const step = climb === null || climb < 0.2 ? null : Math.round(climb * 5) / 5;
    if (step === this.last) return;
    this.last = step;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const now = this.ctx.currentTime;
    if (step === null) { this.gain.gain.setTargetAtTime(0, now, 0.02); return; }
    this.osc.frequency.setTargetAtTime(500 + step * 160, now, 0.05);
    let on = false;
    this.timer = setInterval(() => { on = !on; this.gain.gain.setTargetAtTime(on ? 0.08 : 0, this.ctx.currentTime, 0.01); }, Math.max(120, 600 - step * 110) / 2);
  }
  close() { if (this.timer) clearInterval(this.timer); void this.ctx.close(); }
}

/**
 * Plays a session back. It moves the cursor of every chart in the session (and with it the map marker);
 * when paused, moving a chart cursor moves the replay position.
 */
export function Replay({ a, syncKey }: { a: SessionAnalysis; syncKey: string }) {
  const t = useTranslations();
  const { settings } = useStore();
  const loc = settings.locale;
  const theme = useThemeVersion();
  const g = a.grid;
  const n = g.n;
  const p = a.profile.available ? a.profile.value : null;
  const tr = a.track.available ? a.track.value : null;
  const [pos, setPos] = useState(() => Math.max(0, (p?.airStart ?? 0) - 5));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(10);
  const [vario, setVario] = useState<VarioTone | null>(null);
  const posRef = useRef(pos);
  const playingRef = useRef(playing);
  const scrubRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  // Follow chart cursors while paused.
  useEffect(() => onCursorMove(syncKey, (i) => { if (!playingRef.current) setPos(i); }), [syncKey]);

  // Play loop
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = 0;
    const tick = (ts: number) => {
      const dt = last ? (ts - last) / 1000 : 0;
      last = ts;
      const next = Math.min(n - 1, posRef.current + dt * speed);
      posRef.current = next;
      setPos(next);
      moveAll(syncKey, Math.round(next));
      if (next >= n - 1) { setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, n, syncKey]);

  const i = Math.min(n - 1, Math.max(0, Math.round(pos)));
  const climb = p?.smoothedClimb[i] ?? null;
  useEffect(() => { vario?.set(playing ? climb : null); }, [vario, climb, playing]);
  useEffect(() => () => vario?.close(), [vario]);

  const toggle = useCallback(() => {
    if (!playing && posRef.current >= n - 1) { posRef.current = 0; setPos(0); }
    setPlaying(!playing);
  }, [playing, n]);

  // Space starts and stops the replay unless the focus is in a form field.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== " " || (ev.target as HTMLElement).closest("input,select,textarea,button")) return;
      if (!rootRef.current?.offsetParent) return;
      ev.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // Timeline: phase colours, height profile and the position.
  useEffect(() => {
    const cv = scrubRef.current;
    if (!cv) return;
    const W = cv.clientWidth, H = cv.clientHeight, dpr = devicePixelRatio || 1;
    if (!W) return;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const ph of p?.phases ?? []) {
      ctx.fillStyle = withAlpha(cssVar(PHASE_COLOR[ph.kind]), ph.kind === "glide" ? 0.35 : 0.45);
      ctx.fillRect((ph.start / n) * W, 0, ((ph.end - ph.start + 1) / n) * W, H);
    }
    const alt = g.get("altitude");
    const top = Math.max(1, ...alt.map((v) => v ?? 0));
    ctx.strokeStyle = cssVar("--ink-2"); ctx.lineWidth = 1.2; ctx.beginPath();
    let started = false;
    alt.forEach((v, k) => {
      if (v === null) return;
      const x = (k / n) * W, y = H - 3 - (Math.max(0, v) / top) * (H - 8);
      if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
    });
    ctx.stroke();
    ctx.fillStyle = cssVar("--ink");
    ctx.fillRect((pos / Math.max(1, n - 1)) * W - 1, 0, 2.5, H);
  }, [pos, p, g, n, theme]);

  const seek = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const next = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * (n - 1);
    posRef.current = next;
    setPos(next);
    moveAll(syncKey, Math.round(next));
  };

  const val = (v: number | null | undefined, d: number, unit: string) => (v === null || v === undefined ? "–" : `${num(loc, v, d)} ${unit}`);
  const ph = p?.phaseAt[i];
  const hud: [string, string][] = [
    [t("overview.height"), val(g.get("altitude")[i], 0, "m")],
    [t("replay.vario"), val(climb, 1, "m/s")],
    ...(tr ? [[t("replay.speed"), val(tr.speed[i] !== null ? tr.speed[i]! * 3.6 : null, 0, "km/h")] as [string, string]] : []),
    ...(g.has("motor_current") ? [[t("replay.motor"), val(g.get("motor_current", "max")[i] ?? 0, 0, "A")] as [string, string]] : []),
    ...(g.has("signal_dbm") ? [[t("replay.signal"), val(g.get("signal_dbm", "min")[i], 0, "dBm")] as [string, string]] : []),
    [t("height.phase"), ph ? t(`phase.${ph}`) : "–"],
  ];

  const toggleVario = () => {
    if (vario) { vario.close(); setVario(null); return; }
    try { setVario(new VarioTone()); } catch { /* no audio available */ }
  };

  return (
    <div className="chart replay" ref={rootRef}>
      <div className="ch"><b>{t("replay.title")}</b><span className="ro">{t(tr ? "replay.hint" : "replay.hintNoMap")}</span></div>
      <div className="rbar">
        <button className="btn primary" onClick={toggle} aria-pressed={playing}>{playing ? `❚❚ ${t("replay.pause")}` : `▶ ${t("replay.play")}`}</button>
        <div className="seg" role="group" aria-label={t("replay.speedLabel")}>
          {SPEEDS.map((s) => <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}×</button>)}
        </div>
        <canvas ref={scrubRef} className="scrub" aria-label={t("replay.timeline")} onPointerDown={(ev) => { ev.currentTarget.setPointerCapture(ev.pointerId); seek(ev); }}
          onPointerMove={(ev) => { if (ev.buttons) seek(ev); }} />
        <span className="num rclock">{clock(pos)} / {clock(n - 1)}</span>
        <button className="btn" aria-pressed={vario !== null} onClick={toggleVario}>{t("replay.varioTone")}: {vario ? t("replay.on") : t("replay.off")}</button>
      </div>
      <div className="rhud">
        {hud.map(([k, v]) => <div key={k}><span>{k}</span><b className="num">{v}</b></div>)}
      </div>
    </div>
  );
}
