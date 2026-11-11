"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { Level } from "@/core/analysis";
import type { Need } from "@/core/analysis/requirements";
import { catalogue } from "@/core/model/catalogue";
import type { FlightProfile } from "@/core/analysis/flight";
import { clock } from "./format";
import { useStore } from "./store";
import { TAB_TAGS, type LinkTarget } from "./tab-tags";

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

/** After switching tabs, scrolls to the anchor once it is rendered, focuses its first field and briefly highlights it. */
function revealAnchor(id: string) {
  let tries = 0;
  const look = () => {
    const el = document.getElementById(id);
    if (!el) { if (++tries < 60) requestAnimationFrame(look); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.querySelector<HTMLElement>("input, select, button")?.focus({ preventScroll: true });
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  };
  requestAnimationFrame(look);
}

/** Opens a place in the selected session (closing a dialog it sits in); just bold text when no session is open. */
function TabLink({ to, children }: { to: LinkTarget; children: ReactNode }) {
  const { selected, select } = useStore();
  if (!selected) return <b>{children}</b>;
  return (
    <button type="button" className="linkbtn inline" onClick={(ev) => {
      ev.currentTarget.closest("dialog")?.close();
      select(selected.key, to.tab);
      if (to.anchor) revealAnchor(to.anchor);
    }}>
      {children}
    </button>
  );
}

/** A rich message with <b>, <code> and tab links (see TAB_TAGS). */
export function useRich() {
  const t = useTranslations();
  const tabs = Object.fromEntries(Object.entries(TAB_TAGS).map(([tag, to]) => [tag, (c: ReactNode) => <TabLink to={to}>{c}</TabLink>]));
  return (key: string, values: Record<string, string | number> = {}) =>
    t.rich(key, { ...values, ...tabs, b: (c) => <b>{c}</b>, code: (c) => <code>{c}</code> });
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

/** Opens "My settings"; the gear stays, the label hides on narrow screens like the help button's. */
export function SettingsButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="helpbtn setbtn" aria-label={label} title={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.5 7.5 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.5 7.5 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)" /></svg>
      <span className="long">{label}</span>
    </button>
  );
}
