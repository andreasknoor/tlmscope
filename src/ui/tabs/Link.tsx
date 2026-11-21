"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import type { Level } from "@/core/analysis";
import { Legend, useLevelWord } from "../bits";
import { LineChart } from "../charts/LineChart";
import { Scatter } from "../charts/Scatter";
import { Strip } from "../charts/Strip";
import { moveAll } from "../charts/sync";
import { axisNum, cssVar, duration, withAlpha } from "../format";
import { useStore, useUnits } from "../store";
import { LinkCard, SignalCard } from "./ratings";

/** Fade counters with their chart colour and label (receiver letters as on the receiver). */
const FADES: [id: string, color: string, label: string][] = [
  ["fades.a", "--s-alt", "A"], ["fades.b", "--s-motor", "B"], ["fades.l", "--s-lift", "L"], ["fades.r", "--s-4", "R"],
];

export function levelColor(l: Level | null): string | null {
  if (l === null) return null;
  if (l === 3) return withAlpha(cssVar("--good"), 0.45);
  return cssVar(l === 4 ? "--good" : l === 2 ? "--warn" : "--crit");
}

export function LinkTab() {
  const t = useTranslations();
  const word = useLevelWord();
  const { selected: e, settings, setSettings } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const U = useUnits();
  const g = a.grid;
  const p = a.profile.available ? a.profile.value : null;
  const link = a.link.available ? a.link.value : null;
  const sig = a.signal.available ? a.signal.value : null;
  const dbm = useMemo(() => [{ data: g.get("signal_dbm"), color: "--s-alt", unit: "dBm", digits: 0, width: 1.5 }], [g]);
  const fl = useMemo(() => [{ data: g.get("frame_losses", "increase"), color: "--s-motor", unit: "/s", digits: 0, bars: true, fill: 0.9, width: 0 }], [g]);
  // Holds are rare single events, so they are marked as lines rather than plotted as a series.
  const holds = useMemo(() => {
    const h = g.get("holds", "increase");
    const at: number[] = [];
    for (let i = 0; i < h.length; i++) if ((h[i] ?? 0) > 0) at.push(i);
    return { at, color: "--crit" };
  }, [g]);
  // Fades per receiver, each on its own line: a remote receiver or antenna that fades much more than the others stands out.
  const fades = useMemo(() => FADES
    .filter(([id]) => g.has(id) && g.get(id).some((v) => v !== null))
    .map(([id, color, label]) => ({ data: g.get(id, "increase"), color, label, unit: "/s", digits: 0, width: 1.5 })), [g]);
  const alt = useMemo(() => [{ data: U.series("height", g.get("altitude")), color: "--s-alt", unit: U.u("height"), fill: 0.1 }], [g, U]);
  // Clicking a level in the legend shows only that level in both strips; the arrows step through its stretches.
  const [only, setOnly] = useState<Level | null>(null);
  const [at, setAt] = useState(-1);
  const show = useCallback((l: Level | null) => (only === null || l === only ? levelColor(l) : l === null ? null : withAlpha(cssVar("--ink-3"), 0.18)), [only]);
  const linkColor = useCallback((i: number) => show(link?.levels[i] ?? null), [link, show]);
  const sigColor = useCallback((i: number) => show(sig?.levels[i] ?? null), [sig, show]);
  /** Per level: seconds in either strip, and the first second of each stretch. */
  const byLevel = useMemo(() => {
    const out = new Map<Level, { secs: number; starts: number[] }>();
    for (const l of [1, 2, 3, 4] as Level[]) {
      const hit = (i: number) => link?.levels[i] === l || sig?.levels[i] === l;
      let secs = 0;
      const starts: number[] = [];
      for (let i = 0; i < g.n; i++) if (hit(i)) { secs++; if (i === 0 || !hit(i - 1)) starts.push(i); }
      out.set(l, { secs, starts });
    }
    return out;
  }, [link, sig, g.n]);
  const go = (i: number | undefined) => { if (i === undefined) return; setAt(i); moveAll(e!.key, i); };
  const pick = (l: Level) => {
    if (only === l) { setOnly(null); return; }
    setOnly(l);
    go(byLevel.get(l)!.starts[0]);
  };
  const starts = only === null ? [] : byLevel.get(only)!.starts;
  const prev = starts.filter((i) => i < at).pop();
  const next = starts.find((i) => i > at);
  const sigVsHeight = useMemo(() => {
    const h = g.get("altitude"), s = g.get("signal_dbm");
    const out: [number, number][] = [];
    if (!p || p.airStart === null) return out;
    for (let i = p.airStart; i <= p.airEnd!; i++) if (h[i] !== null && s[i] !== null) out.push([U.v("height", h[i])!, s[i]!]);
    return out;
  }, [g, p, U]);
  const tr = a.track.available ? a.track.value : null;
  const sigVsDistance = useMemo(() => {
    const s = g.get("signal_dbm");
    const out: [number, number][] = [];
    if (!tr || !p || p.airStart === null) return out;
    for (let i = p.airStart; i <= p.airEnd!; i++) if (tr.distance[i] != null && s[i] !== null) out.push([U.v("distance", tr.distance[i])!, s[i]!]);
    return out;
  }, [g, p, tr, U]);
  const lw = (l: Level) => word("signal", l);

  return (
    <>
      <div className="grid g2"><LinkCard a={a} /><SignalCard a={a} /></div>
      <div className="sectionhead"><h2>{t("link.overTime")}</h2><p>{t("link.overTimeHint")}</p></div>
      {link && <Strip syncKey={e!.key} label={t("rating.link")} n={g.n} colorAt={linkColor} emphasize={cssVar("--crit")} />}
      {sig && <Strip syncKey={e!.key} label={t("rating.signal")} n={g.n} colorAt={sigColor} emphasize={cssVar("--crit")} />}
      {(link || sig) ? (
        <div className="legend filter" role="group" aria-label={t("link.filter")} title={t("link.filter")}>
          {([4, 3, 2, 1] as Level[]).map((l) => {
            const secs = byLevel.get(l)!.secs;
            return (
              <span key={l} className="lvf">
                <button aria-pressed={only === l} disabled={!secs} onClick={() => pick(l)}>
                  <i style={{ background: levelColor(l)! }} />{lw(l)}{only === l && <small> · {duration(loc, secs)}</small>}
                </button>
                {only === l && <>
                  <button className="step" aria-label={t("link.prev")} disabled={prev === undefined} onClick={() => go(prev)}>◀</button>
                  <button className="step" aria-label={t("link.next")} disabled={next === undefined} onClick={() => go(next)}>▶</button>
                </>}
              </span>
            );
          })}
        </div>
      ) : <Legend items={[[cssVar("--good"), lw(4)], [withAlpha(cssVar("--good"), 0.45), lw(3)], [cssVar("--warn"), lw(2)], [cssVar("--crit"), lw(1)]]} />}
      {(sig || g.has("frame_losses")) && !settings.details && (
        <p className="hint">{t("link.moreHint")} <button type="button" className="linkbtn inline" onClick={() => setSettings({ details: true })}>{t("app.showDetails")}</button></p>
      )}
      {sig && <div className="lv-more"><LineChart syncKey={e!.key} title={t("link.dbm")} series={dbm} height={160} yMin={-100} yMax={-30}
        bands={[{ from: -100, to: -85, color: "--crit" }, { from: -85, to: -80, color: "--warn" }]} /></div>}
      {g.has("frame_losses") && <div className="lv-more"><LineChart syncKey={e!.key} title={t("link.fl")} series={fl} height={130} marks={holds}
        extra={holds.at.length > 0 ? <Legend items={[[cssVar("--crit"), t("link.holdMark", { n: holds.at.length }), true]]} /> : undefined} /></div>}
      {fades.length > 0 && <div className="lv-more"><LineChart syncKey={e!.key} title={t("link.fades")} series={fades} height={150} marks={holds}
        extra={<Legend items={fades.map((f) => [cssVar(f.color), f.label, true] as [string, string, boolean])} />} />
        <p className="hint">{t("link.fadesHint")}</p></div>}
      {g.has("altitude") && <LineChart syncKey={e!.key} title={t("link.heightCompare")} series={alt} phases={a.kind === "flight" ? p?.phases : null} height={130} yFormat={(x) => `${axisNum(loc, x)}\u00a0${U.u("height")}`} />}
      {sigVsDistance.length > 0 && <div className="lv-more"><Scatter title={t("link.sigVsDistance")} note={t("link.dot")} points={sigVsDistance} xLabel={`${t("link.distanceAxis")} (${U.u("distance")})`} yLabel="dBm" color="--s-5" />
        <p className="hint">{t("link.distanceHint")}</p></div>}
      {sigVsHeight.length > 0 && <div className="lv-more"><Scatter title={t("link.sigVsHeight")} note={t("link.dot")} points={sigVsHeight} xLabel={`${t("overview.height")} (${U.u("height")})`} yLabel="dBm" color="--s-alt" /></div>}
      {!tr && <p className="note">{t("link.note")}</p>}
    </>
  );
}
