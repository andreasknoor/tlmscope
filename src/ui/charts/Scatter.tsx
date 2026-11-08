"use client";

import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { cssVar, num, withAlpha } from "../format";
import { useThemeVersion } from "./useTheme";

interface Props {
  title: string;
  note: string;
  points: [number, number][];
  xLabel: string;
  yLabel: string;
  color: string;
  /** Slope of a fitted line in y-units per x-unit, drawn through the mean. */
  slope?: number;
}

export function Scatter({ title, note, points, xLabel, yLabel, color, slope }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useThemeVersion();
  const { settings } = useStore();

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !points.length) return;
    const draw = () => {
      const W = cv.clientWidth;
      const H = 220;
      if (!W) return;
      const dpr = devicePixelRatio || 1;
      cv.width = W * dpr;
      cv.height = H * dpr;
      const ctx = cv.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const L = 50, R = 10, T = 8, B = 34;
      const X = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R);
      const Y = (v: number) => H - B - ((v - y0) / (y1 - y0 || 1)) * (H - T - B);
      ctx.strokeStyle = cssVar("--grid");
      ctx.fillStyle = cssVar("--ink-3");
      ctx.font = `12px ${getComputedStyle(document.body).fontFamily}`;
      ctx.lineWidth = 1;
      for (let k = 0; k <= 4; k++) {
        const yv = y0 + ((y1 - y0) * k) / 4;
        const xv = x0 + ((x1 - x0) * k) / 4;
        ctx.beginPath(); ctx.moveTo(L, Y(yv)); ctx.lineTo(W - R, Y(yv)); ctx.stroke();
        ctx.textAlign = "right"; ctx.fillText(num(settings.locale, yv, 1), L - 6, Y(yv) + 4);
        ctx.textAlign = "center"; ctx.fillText(num(settings.locale, xv, 0), X(xv), H - B + 16);
      }
      ctx.textAlign = "center";
      ctx.fillText(xLabel, L + (W - L - R) / 2, H - 4);
      ctx.fillStyle = withAlpha(cssVar(color), 0.35);
      for (const [px, py] of points) { ctx.beginPath(); ctx.arc(X(px), Y(py), 2.2, 0, 7); ctx.fill(); }
      if (slope !== undefined) {
        const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const my = ys.reduce((a, b) => a + b, 0) / ys.length;
        ctx.strokeStyle = cssVar("--ink"); ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(X(x0), Y(my + slope * (x0 - mx))); ctx.lineTo(X(x1), Y(my + slope * (x1 - mx))); ctx.stroke();
      }
      ctx.save(); ctx.translate(12, T + (H - T - B) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = cssVar("--ink-3"); ctx.textAlign = "center"; ctx.fillText(yLabel, 0, 0); ctx.restore();
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [points, xLabel, yLabel, color, slope, theme, settings.locale]);

  return (
    <div className="chart">
      <div className="ch"><b>{title}</b><span className="ro">{note}</span></div>
      <canvas ref={ref} className="scatter" aria-label={title} />
    </div>
  );
}
