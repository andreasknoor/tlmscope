"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Level } from "@/core/analysis";
import { Legend, useLevelWord } from "../bits";
import { LineChart } from "../charts/LineChart";
import { Scatter } from "../charts/Scatter";
import { Strip } from "../charts/Strip";
import { axisNum, cssVar, withAlpha } from "../format";
import { useStore } from "../store";
import { LinkCard, SignalCard } from "./ratings";

export function levelColor(l: Level | null): string | null {
  if (l === null) return null;
  if (l === 3) return withAlpha(cssVar("--good"), 0.45);
  return cssVar(l === 4 ? "--good" : l === 2 ? "--warn" : "--crit");
}

export function LinkTab() {
  const t = useTranslations();
  const word = useLevelWord();
  const { selected: e, settings } = useStore();
  const a = e!.a;
  const loc = settings.locale;
  const g = a.grid;
  const p = a.profile.available ? a.profile.value : null;
  const link = a.link.available ? a.link.value : null;
  const sig = a.signal.available ? a.signal.value : null;
  const dbm = useMemo(() => [{ data: g.get("signal_dbm"), color: "--s-alt", unit: "dBm", digits: 0, width: 1.5 }], [g]);
  const fl = useMemo(() => [{ data: g.get("frame_losses", "increase"), color: "--s-motor", unit: "/s", digits: 0, bars: true, fill: 0.9, width: 0 }], [g]);
  const alt = useMemo(() => [{ data: g.get("altitude"), color: "--s-alt", unit: "m", fill: 0.1 }], [g]);
  const linkColor = useCallback((i: number) => levelColor(link?.levels[i] ?? null), [link]);
  const sigColor = useCallback((i: number) => levelColor(sig?.levels[i] ?? null), [sig]);
  const sigVsHeight = useMemo(() => {
    const h = g.get("altitude"), s = g.get("signal_dbm");
    const out: [number, number][] = [];
    if (!p || p.airStart === null) return out;
    for (let i = p.airStart; i <= p.airEnd!; i++) if (h[i] !== null && s[i] !== null) out.push([h[i]!, s[i]!]);
    return out;
  }, [g, p]);
  const lw = (l: Level) => word("signal", l);

  return (
    <>
      <div className="grid g2"><LinkCard a={a} /><SignalCard a={a} /></div>
      <div className="sectionhead"><h2>{t("link.overTime")}</h2><p>{t("link.overTimeHint")}</p></div>
      {link && <Strip syncKey={e!.key} label={t("rating.link")} n={g.n} colorAt={linkColor} />}
      {sig && <Strip syncKey={e!.key} label={t("rating.signal")} n={g.n} colorAt={sigColor} />}
      <Legend items={[[cssVar("--good"), lw(4)], [withAlpha(cssVar("--good"), 0.45), lw(3)], [cssVar("--warn"), lw(2)], [cssVar("--crit"), lw(1)]]} />
      {sig && <div className="lv-std"><LineChart syncKey={e!.key} title={t("link.dbm")} series={dbm} height={160} yMin={-100} yMax={-30}
        bands={[{ from: -100, to: -85, color: "--crit" }, { from: -85, to: -80, color: "--warn" }]} /></div>}
      {g.has("frame_losses") && <div className="lv-std"><LineChart syncKey={e!.key} title={t("link.fl")} series={fl} height={130} /></div>}
      {g.has("altitude") && <LineChart syncKey={e!.key} title={t("link.heightCompare")} series={alt} phases={a.kind === "flight" ? p?.phases : null} height={130} yFormat={(x) => `${axisNum(loc, x)} m`} />}
      {sigVsHeight.length > 0 && <div className="lv-exp"><Scatter title={t("link.sigVsHeight")} note={t("link.dot")} points={sigVsHeight} xLabel={`${t("overview.height")} (m)`} yLabel="dBm" color="--s-alt" /></div>}
      <p className="note">{t("link.note")}</p>
    </>
  );
}
