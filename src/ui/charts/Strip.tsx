"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import type uPlot from "uplot";
import { axis } from "./LineChart";
import { register } from "./sync";
import { useThemeVersion } from "./useTheme";

interface Props {
  syncKey: string;
  label: ReactNode;
  right?: ReactNode;
  n: number;
  /** Colour for second i, or null for nothing. */
  colorAt: (i: number) => string | null;
  height?: number;
}

/** A thin band coloured per second (levels, phases, circling), aligned with the line charts. */
export function Strip({ syncKey, label, right, n, colorAt, height = 22 }: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef(colorAt);
  useLayoutEffect(() => {
    colorRef.current = colorAt;
  });
  const theme = useThemeVersion();

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    let u: uPlot | null = null;
    let unregister = () => {};
    let ro: ResizeObserver | null = null;
    let cancelled = false;
    import("uplot").then(({ default: UPlot }) => {
      if (cancelled) return;
      const x = Array.from({ length: n }, (_, i) => i);
      u = new UPlot(
        {
          width: el.clientWidth || 600,
          height,
          padding: [0, 8, 0, 0],
          legend: { show: false },
          cursor: { sync: { key: syncKey }, points: { show: false }, drag: { x: false, y: false }, y: false },
          scales: { x: { time: false }, y: { range: [0, 1] } },
          axes: [axis(null, { show: false }), axis(null, { size: 50, grid: false })],
          series: [{}, { show: false }],
          hooks: {
            drawClear: [
              (uu) => {
                const ctx = uu.ctx;
                const { top, height: h } = uu.bbox;
                let i = 0;
                while (i < n) {
                  const c = colorRef.current(i);
                  let j = i;
                  while (j + 1 < n && colorRef.current(j + 1) === c) j++;
                  if (c) {
                    ctx.fillStyle = c;
                    const x0 = uu.valToPos(i - 0.5, "x", true);
                    const x1 = uu.valToPos(j + 0.5, "x", true);
                    ctx.fillRect(x0, top, x1 - x0, h);
                  }
                  i = j + 1;
                }
              },
            ],
          },
        },
        [x, x.map(() => 0)],
        el,
      );
      unregister = register(syncKey, u);
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
  }, [syncKey, n, height, theme, colorAt]);

  return (
    <div className="chart" style={{ paddingTop: 4 }}>
      <div className="striplabel"><span>{label}</span><span>{right}</span></div>
      <div className="plot" ref={plotRef} />
    </div>
  );
}
