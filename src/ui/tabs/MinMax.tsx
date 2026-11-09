"use client";

import { useTranslations } from "next-intl";
import type { SessionAnalysis } from "@/core/analysis";
import { CATALOGUE } from "@/core/model/catalogue";
import type { Unit } from "@/core/model/types";
import { jumpTo } from "../charts/sync";
import { clock, num } from "../format";
import { useStore } from "../store";

const DIGITS: Partial<Record<Unit, number>> = { V: 2, A: 1, "°C": 0, m: 1, "m/s": 1, dBm: 0, "%": 0, g: 1, "1/min": 0, mAh: 0, count: 0, "°/s": 0, "°": 0 };

/** Lowest and highest value of every measured channel, like the min/max screen on the transmitter. */
export function MinMaxCard({ a, syncKey }: { a: SessionAnalysis; syncKey: string }) {
  const t = useTranslations("minmax");
  const { settings } = useStore();
  const loc = settings.locale;
  const g = a.grid;
  const rows = CATALOGUE.filter((c) => c.kind !== "categorical" && g.has(c.id)).map((c) => {
    const lo = g.get(c.id, "min"), hi = g.get(c.id, "max");
    let min: number | null = null, max: number | null = null, minAt = 0, maxAt = 0;
    for (let i = 0; i < g.n; i++) {
      if (lo[i] !== null && (min === null || lo[i]! < min)) { min = lo[i]; minAt = i; }
      if (hi[i] !== null && (max === null || hi[i]! > max)) { max = hi[i]; maxAt = i; }
    }
    return { c, min, max, minAt, maxAt };
  }).filter((r) => r.max !== null);
  if (!rows.length) return null;
  const unit = (u: Unit) => (u === "count" || u === "" || u === "?" ? "" : ` ${u}`);
  const cell = (v: number | null, at: number, u: Unit) => (v === null ? <td className="r">–</td> : (
    <td className="r num clickable" onClick={() => jumpTo(syncKey, at)} title={clock(at)}>
      {num(loc, v, DIGITS[u] ?? 1)}{unit(u)} <span className="hint">{clock(at)}</span>
    </td>
  ));

  return (
    <div className="card lv-more">
      <h3>{t("title")}</h3>
      <div className="hint">{t("hint")}</div>
      <div className="scroll"><table className="tbl">
        <thead><tr><th>{t("value")}</th><th className="r">{t("min")}</th><th className="r">{t("max")}</th></tr></thead>
        <tbody>{rows.map(({ c, min, max, minAt, maxAt }) => (
          <tr key={c.id}>
            <td>{c.label[loc]}</td>
            {c.kind === "counter" ? <td className="r">–</td> : cell(min, minAt, c.unit)}
            {cell(max, maxAt, c.unit)}
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
