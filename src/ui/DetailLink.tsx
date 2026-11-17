"use client";

import { useTranslations } from "next-intl";
import type { SessionAnalysis } from "@/core/analysis";
import { detailTarget, type DetailKey, type Spot } from "./detail-links";
import { clock, num, volts } from "./format";
import { useStore, useUnits } from "./store";

/**
 * A link under an overview card or tile to the page with the detail behind it, named after that page.
 * It opens the page with the cursor on the moment behind the rating. Not shown when the page has no data.
 */
export function DetailLink({ a, k }: { a: SessionAnalysis; k: DetailKey }) {
  const t = useTranslations("detail");
  const { selected: e, openDetail, settings } = useStore();
  const U = useUnits();
  const loc = settings.locale;
  const target = detailTarget(a, k, settings.details);
  if (!target || !e) return null;
  const value = (spot: Spot, v: number | null): string => {
    if (v === null) return "";
    switch (spot) {
      case "weakest": return `${num(loc, v, 0)}\u00a0dBm`;
      case "current": return `${num(loc, v, 0)}\u00a0A`;
      case "sag": return volts(loc, v);
      case "rx": return `${num(loc, v, 2)}\u00a0V`;
      case "highest": return U.fmt("height", v);
      default: return num(loc, v, 0);
    }
  };
  const open = () => openDetail(target.tab, {
    key: e.key,
    label: t(`label.${k}`),
    text: target.at !== null && target.spot ? t(`spot.${target.spot}`, { at: clock(target.at), value: value(target.spot, target.value) }) : null,
  }, target.at);
  return <button className="detaillink" onClick={open}>{t(`label.${k}`)} ›</button>;
}

/** The way back, shown at the top of a page that was opened from an overview card. */
export function DetailBack() {
  const t = useTranslations("detail");
  const { selected: e, detail, setTab, tab } = useStore();
  if (!detail || !e || detail.key !== e.key || tab === "overview") return null;
  return (
    <div className="detailback">
      <button className="btn" onClick={() => setTab("overview")}>‹ {t("back")}</button>
      <span>{detail.label}{detail.text ? `: ${detail.text}` : ""}</span>
    </div>
  );
}
