"use client";

import { useTranslations } from "next-intl";
import type { Thermal, Thermals } from "@/core/analysis";
import { jumpTo } from "../charts/sync";
import { clock, num } from "../format";
import { useStore, useUnits } from "../store";

const DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;

/** Height gained per circle as tiny bars. */
function CircleBars({ th }: { th: Thermal }) {
  if (!th.circles.length) return null;
  const max = Math.max(1, ...th.circles.map((c) => c.gainM));
  const w = th.circles.length * 7;
  return (
    <svg width={w} height={18} viewBox={`0 0 ${w} 18`} aria-hidden="true" style={{ verticalAlign: "middle", marginLeft: 8 }}>
      {th.circles.map((c, i) => {
        const h = Math.max(1, (Math.max(0, c.gainM) / max) * 16);
        return <rect key={i} x={i * 7} y={18 - h} width={5} height={h} rx={1} fill="var(--s-lift)" />;
      })}
    </svg>
  );
}

/** Thermals of one flight: a summary in words and one row per thermal. */
export function ThermalsCard({ thermals }: { thermals: Thermals }) {
  const t = useTranslations("thermals");
  const { selected: e, settings } = useStore();
  const loc = settings.locale;
  const U = useUnits();
  const list = thermals.list;
  if (!list.length) return null;
  const strongest = list.reduce((a, b) => (b.avgClimb > a.avgClimb ? b : a));
  const circles = list.flatMap((x) => x.circles);
  const secsPerCircle = list.filter((x) => x.secsPerCircle !== null);
  const hasDrift = list.some((x) => x.drift);
  const avgSecs = secsPerCircle.length ? secsPerCircle.reduce((s, x) => s + x.secsPerCircle! * x.circles.length, 0) / circles.length : null;

  return (
    <div className="card">
      <h3>{t("title")}</h3>
      <p className="sentence">
        {t("summary", { n: list.length, gain: U.fmt("height", thermals.totalGainM), time: clock(thermals.totalSecs) })}{" "}
        {t("strongest", { n: list.length, avg: U.fmt("vspeed", strongest.avgClimb, 1), best: U.fmt("vspeed", strongest.best10s, 1) })}{" "}
        {circles.length > 0 && avgSecs !== null && <>{t("circles", { n: circles.length, secs: num(loc, avgSecs, 0) })} </>}
        {thermals.savedMotorS !== null && (thermals.savedMah !== null
          ? t("saved", { secs: num(loc, thermals.savedMotorS, 0), mah: num(loc, thermals.savedMah, 0) })
          : t("savedNoMah", { secs: num(loc, thermals.savedMotorS, 0) }))}
      </p>
      <div className="scroll"><table className="tbl">
        <thead><tr>
          <th>{t("start")}</th><th className="r">{t("gain")}</th><th className="r">{t("time")}</th><th className="r">{t("avg")}</th>
          <th className="r lv-more">{t("best")}</th><th>{t("circlesCol")}</th>{hasDrift && <th className="lv-more">{t("drift")}</th>}<th className="r">{t("savedCol")}</th>
        </tr></thead>
        <tbody>{list.map((x) => (
          <tr key={x.start} className="clickable" onClick={() => jumpTo(e!.key, x.start)}>
            <td className="num">{clock(x.start)}</td>
            <td className="r num">{x.gainM >= 0 ? "+" : ""}{U.fmt("height", x.gainM)}</td>
            <td className="r num">{clock(x.durationS)}</td>
            <td className="r num">{U.fmt("vspeed", x.avgClimb, 1)}</td>
            <td className="r num lv-more">{U.fmt("vspeed", x.best10s, 1)}</td>
            <td className="num">{x.circles.length || "–"}<span className="lv-more"><CircleBars th={x} /></span></td>
            {hasDrift && <td className="num lv-more">{x.drift ? t("driftValue", { d: U.fmt("distance", x.drift.distanceM), dir: t(DIRS[Math.round(x.drift.bearingDeg / 45) % 8]) }) : "–"}</td>}
            <td className="r num">{x.savedMah !== null ? `${num(loc, x.savedMah, 0)} mAh` : x.savedMotorS !== null ? `${num(loc, x.savedMotorS, 0)} s` : "–"}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <p className="hint lv-more">{t("perCircleHint")} {t("savedHint")}</p>
    </div>
  );
}
