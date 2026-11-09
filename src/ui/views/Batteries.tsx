"use client";

import { useTranslations } from "next-intl";
import { medianOf } from "@/core/analysis/grid";
import { rate, THRESHOLDS } from "@/core/analysis";
import { Meter, RatingCard, Tile, useLevelWord } from "../bits";
import { dateShort, num, timeLabel } from "../format";
import { useStore, type Entry } from "../store";

export function Batteries() {
  const t = useTranslations();
  const word = useLevelWord();
  const { entries, settings, select } = useStore();
  const loc = settings.locale;
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
            <div className="scroll"><table className="tbl">
              <thead><tr><th>{t("batteries.date")}</th><th>{t("app.session")}</th><th className="r">{t("batteries.chargeCycles")}</th><th className="r">{t("energy.chargeUsed")}</th><th className="r lv-more">{t("battery.perCellStart")} → {t("battery.perCellEnd")}</th><th>{t("batteries.condition")}</th></tr></thead>
              <tbody>{list.map((e) => {
                const ch = e.a.charge.available ? e.a.charge.value : null;
                return (
                  <tr key={e.key} className="clickable" onClick={() => select(e.key, "battery")}>
                    <td className="num">{when(e)}</td>
                    <td>{t(`kind.${e.a.kind}`)}{e.a.issues.some((i) => i.kind === "frozen") && <b style={{ color: "var(--crit)" }}> · {t("batteries.dataStuck")}</b>}</td>
                    <td className="r num">{e.a.session.battery?.chargeCycles}</td>
                    <td className="r num">{used(e)}</td>
                    <td className="r num lv-more">{num(loc, ch?.startCellV, 2)} → {num(loc, ch?.endCellV, 2)} V</td>
                    <td>{condCell(e)}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          </div>
        );
      })}
      {unknown.length > 0 && (
        <div className="card">
          <h3>{t("batteries.unknownTitle")}</h3>
          <div className="hint">{t("batteries.unknownHint")}</div>
          <table className="tbl"><tbody>{unknown.map((e) => (
            <tr key={e.key} className="clickable" onClick={() => select(e.key, "battery")}><td className="num">{when(e)}</td><td className="r num">{used(e)}</td><td>{condCell(e)}</td></tr>
          ))}</tbody></table>
        </div>
      )}
      {groups.size > 0 && <p className="note">{t("batteries.note")}</p>}
    </>
  );
}
