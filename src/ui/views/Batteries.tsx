"use client";

import { useTranslations } from "next-intl";
import { medianOf } from "@/core/analysis/grid";
import { AGEING, batteryAgeing, rate, THRESHOLDS, type AgeingPoint } from "@/core/analysis";
import { AgeingChart } from "../charts/AgeingChart";
import { Meter, RatingCard, Tile, useLevelWord } from "../bits";
import { dateShort, num, timeLabel } from "../format";
import { ModelBadge, useModelName } from "../Shell";
import { useStore, useUnits, type Entry } from "../store";

export function Batteries() {
  const t = useTranslations();
  const word = useLevelWord();
  const { entries, settings, select, models } = useStore();
  const modelName = useModelName();
  const loc = settings.locale;
  const U = useUnits();
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const id = e.a.session.battery?.id;
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(e);
  }
  const unknown = entries.filter((e) => e.a.kind === "flight" && !e.a.session.battery);
  const resPerCell = (e: Entry) => (e.a.batteryCondition.available ? e.a.batteryCondition.value.resistancePerCellMilliOhm : null);
  const when = (e: Entry) => (e.startMs !== null ? `${dateShort(loc, e.startMs)} ${timeLabel(loc, e.startMs)}` : "–");
  const condCell = (e: Entry) => {
    const r = resPerCell(e);
    const l = rate(r, THRESHOLDS.resistancePerCellMilliOhm);
    return l ? <><Meter level={l} /> {word("condition", l)}</> : "–";
  };
  /** One trend point per flight with a resistance estimate; the battery temperature decides whether it counts. */
  const ageingPoint = (e: Entry): AgeingPoint | null => {
    const r = resPerCell(e);
    // Flights with stuck sensor data give unreliable estimates and stay out of the trend.
    if (r === null || e.startMs === null || e.a.issues.some((i) => i.kind === "frozen")) return null;
    const temp = e.a.grid.has("temperature.battery") ? medianOf(e.a.grid.get("temperature.battery")) : null;
    return { timeMs: e.startMs, cycles: e.a.session.battery?.chargeCycles ?? null, resistance: r, tempC: temp };
  };
  const used = (e: Entry) => (e.a.batteryUse.available ? `${num(loc, e.a.batteryUse.value.usedMah, 0)} mAh` : "–");

  return (
    <>
      <div className="sectionhead"><h2 style={{ fontSize: 28 }}>{t("batteries.title")}</h2><p>{t("batteries.hint")}</p></div>
      {groups.size === 0 && <div className="card empty">{t("batteries.none")}</div>}
      {groups.size > 0 && <p className="note">{t("batteries.naming")}</p>}
      {[...groups.values()].map((list) => {
        const b = list[0].a.session.battery!;
        const flights = list.filter((e) => e.a.kind === "flight");
        const cond = rate(medianOf(flights.map((e) => resPerCell(e))), THRESHOLDS.resistancePerCellMilliOhm);
        const stuck = list.some((e) => e.a.issues.some((i) => i.kind === "frozen"));
        const noCells = list.every((e) => !e.a.session.channels.has("cell_voltage.1"));
        const ageing = batteryAgeing(flights.map(ageingPoint).filter((p): p is AgeingPoint => p !== null));
        const ageingText = !ageing.enough
          ? t("batteries.ageingNotEnough", { points: ageing.missing!.points, days: ageing.missing!.days })
          : ageing.cyclesToRetire === 0 ? t("batteries.ageingRetire")
          : ageing.cyclesToRetire !== null ? t("batteries.ageingForecast", { n: ageing.cyclesToRetire })
          : t("batteries.ageingStable");
        const dq = stuck ? { l: 1 as const, w: t("batteries.stuck"), h: t("batteries.stuckHint") } : noCells ? { l: 2 as const, w: t("batteries.partial"), h: t("batteries.partialHint") } : { l: 4 as const, w: t("batteries.reliable"), h: t("batteries.reliableHint") };
        return (
          <div className="card" key={b.id}>
            <div className="sectionhead"><h3 style={{ fontSize: 22 }}>{t("battery.name", { letter: list[0].batteryLetter! })}</h3>
              <span className="pill">{b.chemistry} · {b.cells}S · {b.capacityMah ?? "?"} mAh</span></div>
            <div className="grid g4">
              <Tile label={t("batteries.chargeCycles")} value={Math.max(...list.map((e) => e.a.session.battery?.chargeCycles ?? 0))} sub={t("batteries.asReported")} />
              <Tile label={t("batteries.flights")} value={flights.length} sub={t("batteries.sessionsTotal", { n: list.length })} />
              <RatingCard name={t("batteries.condition")} level={cond} word={word("condition", cond)} hint={cond ? t("batteries.medianOfFlights") : t("batteries.notEnough")} />
              <RatingCard name={t("batteries.dataQuality")} level={dq.l} word={dq.w} hint={dq.h} />
            </div>
            <div className="ageing">
              <p><b>{ageingText}</b>{ageing.enough && ageing.current !== null && <span className="lv-more"> {t("batteries.ageingNow", { now: num(loc, ageing.current, 1), change: ageing.perTenCycles === null ? "–" : num(loc, ageing.perTenCycles, 2) })}</span>}</p>
              {ageing.points.length >= 2 && <AgeingChart ageing={ageing} title={t("batteries.ageingTitle")} note={t("batteries.ageingNote")} />}
              {ageing.points.some((p) => !p.used) && <p className="hint">{t("batteries.ageingCold", { t: U.fmt("temp", AGEING.minTempC) })}</p>}
            </div>
            <details className="more sessionlist">
              <summary>{t("batteries.sessionList", { n: list.length })}</summary>
              <div className="scroll"><table className="tbl">
              <thead><tr><th>{t("batteries.date")}</th><th>{t("app.session")}</th><th className="r">{t("batteries.chargeCycles")}</th><th className="r">{t("energy.chargeUsed")}</th><th className="r lv-more">{t("battery.perCellStart")} → {t("battery.perCellEnd")}</th><th className="r lv-more">{t("batteries.resistance")}</th><th>{t("batteries.condition")}</th></tr></thead>
              <tbody>{[...list].reverse().map((e) => {
                const ch = e.a.charge.available ? e.a.charge.value : null;
                return (
                  <tr key={e.key} className="clickable" onClick={() => select(e.key, "battery")}>
                    <td className="num">{when(e)}</td>
                    <td>{models.length > 1 && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ModelBadge model={e.model} />{modelName(e.model)} · </span>}{t(`kind.${e.a.kind}`)}{e.a.issues.some((i) => i.kind === "frozen") && <b style={{ color: "var(--crit)" }}> · {t("batteries.dataStuck")}</b>}</td>
                    <td className="r num">{e.a.session.battery?.chargeCycles}</td>
                    <td className="r num">{used(e)}</td>
                    <td className="r num lv-more">{num(loc, ch?.startCellV, 2)} → {num(loc, ch?.endCellV, 2)} V</td>
                    <td className="r num lv-more">{resPerCell(e) === null ? "–" : `${num(loc, resPerCell(e), 1)} mΩ`}</td>
                    <td>{condCell(e)}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
            </details>
          </div>
        );
      })}
      {unknown.length > 0 && (
        <div className="card">
          <h3>{t("batteries.unknownTitle")}</h3>
          <div className="hint">{t("batteries.unknownHint")}</div>
          <table className="tbl"><tbody>{[...unknown].reverse().map((e) => (
            <tr key={e.key} className="clickable" onClick={() => select(e.key, "battery")}><td className="num">{when(e)}</td><td className="r num">{used(e)}</td><td>{condCell(e)}</td></tr>
          ))}</tbody></table>
        </div>
      )}
      {groups.size > 0 && <p className="note">{t("batteries.note")}</p>}
    </>
  );
}
