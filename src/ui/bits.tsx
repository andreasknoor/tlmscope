"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { Level } from "@/core/analysis";
import type { Need } from "@/core/analysis/requirements";
import { catalogue } from "@/core/model/catalogue";
import type { FlightProfile } from "@/core/analysis/flight";
import { clock } from "./format";
import { useStore } from "./store";

export const LEVEL_COLOR: Record<Level, string> = { 4: "var(--good)", 3: "var(--good)", 2: "var(--warn)", 1: "var(--crit)" };

/** Four bars like a phone signal meter. Neutral meters are grey (not a quality rating). */
export function Meter({ level, neutral = false }: { level: Level; neutral?: boolean }) {
  return (
    <span className="meter" aria-hidden="true">
      {[1, 2, 3, 4].map((k) => (
        <i key={k} style={k <= level ? { background: neutral ? "var(--ink-2)" : LEVEL_COLOR[level], opacity: !neutral && level === 3 ? 0.55 : 1 } : undefined} />
      ))}
    </span>
  );
}

/** A rich message with <b> and <code> tags. */
export function useRich() {
  const t = useTranslations();
  return (key: string, values: Record<string, string | number> = {}) =>
    t.rich(key, { ...values, b: (c) => <b>{c}</b>, code: (c) => <code>{c}</code> });
}

/** Word for a level on one of the scales in the messages ("levels.link" etc.). */
/** Airtime as m:ss; marked as approximate when it comes from the model's movement only. */
export function useAirtime() {
  const t = useTranslations();
  return (p: FlightProfile) => (p.basis === "motion" ? t("app.approx", { time: clock(p.airtimeS) }) : clock(p.airtimeS));
}

export function useLevelWord() {
  const t = useTranslations();
  return (scale: string, level: Level | null) => (level ? (t.raw(`levels.${scale}`) as string[])[level - 1] : "");
}

export function DetailRows({ rows }: { rows: [ReactNode, ReactNode][] | null }) {
  const { settings } = useStore();
  const t = useTranslations("app");
  if (!rows?.length) return null;
  return (
    <details className="more" open={settings.details} key={String(settings.details)}>
      <summary>{t("details")}</summary>
      <dl className="kv">
        {rows.map(([k, v], i) => (
          <div key={i} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function RatingCard(props: {
  name: string;
  level: Level | null;
  word?: string;
  hint: ReactNode;
  rows?: [ReactNode, ReactNode][] | null;
  neutral?: boolean;
}) {
  const t = useTranslations("app");
  if (!props.level) {
    return (
      <div className="card rating">
        <div className="lbl">{props.name}</div>
        <div className="word" style={{ color: "var(--ink-3)" }}>{t("noData")}</div>
        <div className="hint">{props.hint || t("noReadings")}</div>
      </div>
    );
  }
  return (
    <div className="card rating">
      <div className="top3">
        <span className="lbl">{props.name}</span>
        <Meter level={props.level} neutral={props.neutral} />
      </div>
      <div className="word">{props.word}</div>
      <div className="hint">{props.hint}</div>
      <DetailRows rows={props.rows ?? null} />
    </div>
  );
}

export function Tile({ label, value, unit, sub }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div className="card tile">
      <div className="lbl">{label}</div>
      <div className="v num">{value}{unit ? <small>{unit}</small> : null}</div>
      {sub ? <div className="hint">{sub}</div> : null}
    </div>
  );
}

export function Legend({ items, style }: { items: [color: string, label: string, line?: boolean][]; style?: React.CSSProperties }) {
  return (
    <div className="legend" style={style}>
      {items.map(([c, l, line]) => (
        <span key={l}><i className={line ? "ln" : ""} style={{ background: c }} />{l}</span>
      ))}
    </div>
  );
}

export function Alert({ level, title, children }: { level: Level | "info"; title: ReactNode; children: ReactNode }) {
  const color = level === "info" ? "var(--ink-3)" : LEVEL_COLOR[level];
  return (
    <div className="alert" style={{ borderColor: level === "info" ? "var(--line)" : color }}>
      <span className="ic" style={{ background: color }}>{level === "info" ? "i" : "!"}</span>
      <div><b>{title}</b><span className="hint">{children}</span></div>
    </div>
  );
}

/** Explains which channels a view would need. */
export function Missing({ missing }: { missing: Need[] }) {
  const t = useTranslations("app");
  const { settings } = useStore();
  const name = (id: string) => catalogue(id)?.label[settings.locale] ?? id;
  const parts = missing.map((n) => (Array.isArray(n) ? n.map(name).join(` ${t("or")} `) : name(n)));
  return <div className="card empty">{t("missingNeeds", { channels: parts.join(", ") })}</div>;
}
