"use client";

import { useEffect, useRef } from "react";
import { THRESHOLDS, type Ageing } from "@/core/analysis";
import { cssVar, dateShort, withAlpha } from "../format";
import { useStore } from "../store";
import { useThemeVersion } from "./useTheme";

const H = 200;

/** Internal resistance per cell over date: one dot per flight, hollow when left out (cold), plus the trend line. */
export function AgeingChart({ ageing, title, note }: { ageing: Ageing; title: string; note: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useThemeVersion();
  const { settings } = useStore();
  const loc = settings.locale;

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !ageing.points.length) return;
    const draw = () => {
      const W = cv.clientWidth;
      if (!W) return;
      const dpr = devicePixelRatio || 1;
      cv.width = W * dpr; cv.height = H * dpr;
      const ctx = cv.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const ts = ageing.points.map((p) => p.timeMs);
      const rs = ageing.points.map((p) => p.resistance);
      const [s1, s2, s3] = THRESHOLDS.resistancePerCellMilliOhm.steps;
      const t0 = Math.min(...ts), t1 = Math.max(...ts);
      const y0 = Math.max(0, Math.floor(Math.min(...rs, s1) - 2)), y1 = Math.ceil(Math.max(...rs, s3) + 1);
      const L = 52, R = 12, T = 8, B = 26;
      const X = (t: number) => (t1 === t0 ? L + (W - L - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R));
      const Y = (v: number) => T + ((y1 - v) / (y1 - y0)) * (H - T - B);
      // level bands: excellent / acceptable / worn / retire
      const bands: [number, number, string, number][] = [[y0, s1, "--good", 0.07], [s1, s2, "--warn", 0.08], [s2, s3, "--serious", 0.08], [s3, y1, "--crit", 0.1]];
      for (const [a, b, c, o] of bands) { ctx.fillStyle = withAlpha(cssVar(c), o); ctx.fillRect(L, Y(b), W - L - R, Y(a) - Y(b)); }
      ctx.font = `12px ${getComputedStyle(document.body).fontFamily}`;
      ctx.strokeStyle = cssVar("--grid"); ctx.fillStyle = cssVar("--ink-3"); ctx.lineWidth = 1;
      const step = y1 - y0 > 10 ? 4 : 2;
      for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) {
        ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(W - R, Y(v)); ctx.stroke();
        ctx.textAlign = "right"; ctx.fillText(`${v} mΩ`, L - 6, Y(v) + 4);
      }
      ctx.textAlign = "left"; ctx.fillText(dateShort(loc, t0), L, H - 6);
      if (t1 !== t0) { ctx.textAlign = "right"; ctx.fillText(dateShort(loc, t1), W - R, H - 6); }
      const col = cssVar("--s-alt");
      if (ageing.fit) {
        ctx.strokeStyle = cssVar("--ink"); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X(ageing.fit.fromMs), Y(ageing.fit.from)); ctx.lineTo(X(ageing.fit.toMs), Y(ageing.fit.to)); ctx.stroke();
      }
      for (const p of ageing.points) {
        ctx.beginPath(); ctx.arc(X(p.timeMs), Y(p.resistance), 4, 0, 7);
        ctx.fillStyle = p.used ? col : cssVar("--surface"); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [ageing, theme, loc]);

  return (
    <div className="chart">
      <div className="ch"><b>{title}</b><span className="ro">{note}</span></div>
      <canvas ref={ref} className="scatter" style={{ height: H }} aria-label={title} />
    </div>
  );
}
