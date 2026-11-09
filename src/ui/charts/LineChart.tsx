"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import type uPlot from "uplot";
import type { Phase } from "@/core/analysis/flight";
import { useStore } from "../store";
import { axisNum, clock, cssVar, withAlpha } from "../format";
import { notifyCursor, register } from "./sync";
import { useThemeVersion } from "./useTheme";

export const PHASE_COLOR: Record<string, string> = { ground: "--s-ground", motor: "--s-motor", glide: "--s-glide", lift: "--s-lift" };

export interface ChartSeries {
  data: (number | null)[];
  /** CSS variable name, e.g. "--s-alt". */
  color: string;
  unit: string;
  label?: string;
  digits?: number;
  fill?: number;
  bars?: boolean;
  width?: number;
}

export interface Band { from: number; to: number; color: string; alpha?: number }

interface Props {
  syncKey: string;
  title: string;
  extra?: ReactNode;
  series: ChartSeries[];
  height?: number;
  phases?: Phase[] | null;
  bands?: Band[];
  yMin?: number;
  yMax?: number;
  yFormat?: (v: number) => string;
  rest?: string;
  readout?: (i: number) => string;
  onCursor?: (i: number | null) => void;
}

/** Shared uPlot setup for line charts and strips. */
export function axis(fmt: ((v: number) => string) | null, opts: { size?: number; show?: boolean; grid?: boolean } = {}): uPlot.Axis {
  return {
    stroke: cssVar("--ink-3"),
    font: `12px ${getComputedStyle(document.body).fontFamily}`,
    size: opts.size ?? 30,
    gap: 4,
    show: opts.show !== false,
    grid: { stroke: cssVar("--grid"), width: 1, show: opts.grid !== false },
    ticks: { stroke: cssVar("--grid"), width: 1, size: 3, show: opts.grid !== false },
    values: fmt ? (_u: uPlot, v: number[]) => v.map(fmt) : () => [],
  };
}

export function LineChart(props: Props) {
  const { settings } = useStore();
  const plotRef = useRef<HTMLDivElement>(null);
  const roRef = useRef<HTMLSpanElement>(null);
  const propsRef = useRef(props);
  useLayoutEffect(() => {
    propsRef.current = props;
  });
  const theme = useThemeVersion();
  const loc = settings.locale;

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    let u: uPlot | null = null;
    let unregister = () => {};
    let ro: ResizeObserver | null = null;
    let cancelled = false;
    const p = propsRef.current;
    const n = p.series[0]?.data.length ?? 0;
    const x = Array.from({ length: n }, (_, i) => i);
    const rest = p.rest ?? " ";
    if (roRef.current) roRef.current.textContent = rest;

    import("uplot").then(({ default: UPlot }) => {
      if (cancelled) return;
      const yfmt = p.yFormat ?? ((v: number) => axisNum(loc, v));
      const opts: uPlot.Options = {
        width: el.clientWidth || 600,
        height: p.height ?? 170,
        padding: [8, 8, 0, 0],
        legend: { show: false },
        cursor: { sync: { key: p.syncKey }, points: { size: 7, width: 2, fill: cssVar("--surface") }, drag: { x: false, y: false } },
        scales: {
          x: { time: false },
          y: { range: (_u, lo, hi) => (lo == null || hi == null ? [p.yMin ?? 0, p.yMax ?? 1] : [p.yMin ?? (lo < 0 ? lo : 0), p.yMax ?? (hi === lo ? hi + 1 : hi + (hi - lo) * 0.06)]) },
        },
        axes: [axis((v) => clock(v), { size: 26 }), axis(yfmt, { size: 50 })],
        series: [
          {},
          ...p.series.map((s): uPlot.Series => ({
            stroke: cssVar(s.color),
            width: s.width ?? 2,
            spanGaps: true,
            fill: s.fill ? withAlpha(cssVar(s.color), s.fill) : undefined,
            points: { show: false },
            paths: s.bars ? UPlot.paths.bars!({ size: [1, 6], gap: 0 }) : undefined,
          })),
        ],
        hooks: {
          drawClear: [
            (uu) => {
              const ctx = uu.ctx;
              const { top, height, left, width } = uu.bbox;
              const cur = propsRef.current;
              for (const ph of cur.phases ?? []) {
                if (ph.kind === "glide") continue;
                const x0 = uu.valToPos(ph.start - 0.5, "x", true);
                const x1 = uu.valToPos(ph.end + 0.5, "x", true);
                ctx.fillStyle = withAlpha(cssVar(PHASE_COLOR[ph.kind]), ph.kind === "ground" ? 0.35 : 0.16);
                ctx.fillRect(x0, top, x1 - x0, height);
              }
              for (const b of cur.bands ?? []) {
                const y0 = Math.max(top, uu.valToPos(b.to, "y", true));
                const y1 = Math.min(top + height, uu.valToPos(b.from, "y", true));
                ctx.fillStyle = withAlpha(cssVar(b.color), b.alpha ?? 0.08);
                ctx.fillRect(left, y0, width, y1 - y0);
              }
            },
          ],
          setCursor: [
            (uu) => {
              const i = uu.cursor.idx;
              const cur = propsRef.current;
              if (roRef.current) {
                roRef.current.textContent =
                  i == null ? rest : `${clock(i)} · ` + (cur.readout ? cur.readout(i) : cur.series.map((s) => `${s.label ? s.label + " " : ""}${s.data[i] == null ? "–" : s.data[i]!.toLocaleString(loc === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: s.digits ?? 1, minimumFractionDigits: s.digits ?? 1 })} ${s.unit}`).join(" · "));
              }
              cur.onCursor?.(i ?? null);
              if (i != null) notifyCursor(cur.syncKey, i);
            },
          ],
        },
      };
      u = new UPlot(opts, [x, ...p.series.map((s) => s.data)] as uPlot.AlignedData, el);
      unregister = register(p.syncKey, u);
      ro = new ResizeObserver(() => {
        const w = el.clientWidth;
        if (u && w && Math.abs(w - u.width) > 2) u.setSize({ width: w, height: u.height });
      });
      ro.observe(el);
    });
    return () => {
      cancelled = true;
      ro?.disconnect();
      unregister();
      u?.destroy();
    };
    // Data identity changes when the session changes; theme and locale need a redraw too.
  }, [props.series, props.syncKey, theme, loc]);

  return (
    <div className="chart">
      <div className="ch"><b>{props.title}</b><span className="ro" ref={roRef}> </span></div>
      {props.extra}
      <div className="plot" ref={plotRef} role="img" aria-label={props.title} />
    </div>
  );
}
