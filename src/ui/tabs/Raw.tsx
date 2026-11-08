"use client";

import { useTranslations } from "next-intl";
import { Fragment, useState } from "react";
import { catalogue } from "@/core/model/catalogue";
import type { RawStream } from "@/core/model/types";
import { num } from "../format";
import { useStore } from "../store";

const LEVEL_COLOR = { full: "var(--good)", partial: "var(--warn)", none: "var(--crit)" };

/** Sensor streams with decoded fields and raw records. Used per session and for whole files. */
export function StreamTable({ streams, seconds }: { streams: RawStream[]; seconds: Map<string, number> }) {
  const t = useTranslations("raw");
  const { settings } = useStore();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const loc = settings.locale;
  const isOpen = (k: string) => settings.details !== open.has(k);
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <div className="card scroll">
      <table className="tbl">
        <thead><tr><th>{t("sensor")}</th><th>ID</th><th>{t("status")}</th><th className="r">{t("records")}</th><th className="r">{t("perSecond")}</th><th className="r">{t("noData")}</th></tr></thead>
        <tbody>
          {streams.map((s) => {
            const secs = seconds.get(s.key) ?? 0;
            return (
              <Fragment key={s.key}>
                <tr className="clickable" onClick={() => toggle(s.key)} aria-expanded={isOpen(s.key)}>
                  <td><b>{s.label}</b>{s.note ? <><br /><span className="hint">{s.note}</span></> : null}</td>
                  <td className="mono">{s.key}</td>
                  <td><span className="pill"><span className="kdot" style={{ background: LEVEL_COLOR[s.understood] }} />{t(`understood.${s.understood}`)}</span></td>
                  <td className="r">{s.count}</td>
                  <td className="r">{secs > 0 ? num(loc, s.count / secs, 2) : "–"}</td>
                  <td className="r">{num(loc, (s.noDataCount / s.count) * 100, 0)} %</td>
                </tr>
                {isOpen(s.key) && (
                  <tr><td colSpan={6} style={{ background: "var(--sunken)" }}>
                    {s.fields.length ? (
                      <table className="tbl"><thead><tr><th>{t("field")}</th><th className="r">Min</th><th className="r">Max</th><th>{t("unit")}</th><th className="r">{t("noData")}</th><th>{t("channel")}</th></tr></thead>
                        <tbody>{s.fields.map((f) => (
                          <tr key={f.name}><td>{f.name}</td><td className="r">{f.min ?? "–"}</td><td className="r">{f.max ?? "–"}</td><td>{f.unit}</td>
                            <td className="r">{num(loc, (f.noData / f.count) * 100, 0)} %</td><td className="mono">{f.channel ?? ""}</td></tr>
                        ))}</tbody></table>
                    ) : <div className="hint">{t("noDecoder")}</div>}
                    <div className="hint" style={{ marginTop: 8 }}>{t("samples")}</div>
                    <div className="scroll"><div className="hex">{s.samples.map((x) => `${String(x.count).padStart(7)}×  ${x.hex}`).join("\n")}</div></div>
                  </td></tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RawTab() {
  const t = useTranslations("raw");
  const { selected: e, settings } = useStore();
  const s = e!.a.session;
  const secs = new Map(s.raw.map((r) => [r.key, s.durationS]));
  const headers = (s.meta.headerBlocks as string[] | undefined) ?? [];
  return (
    <>
      <div className="sectionhead"><h2>{t("title")}</h2><p>{t("hint")}</p></div>
      <StreamTable streams={s.raw} seconds={secs} />
      <div className="card">
        <h3>{t("channels")}</h3>
        <div className="hint">{t("channelsHint")}</div>
        <div className="scroll"><table className="tbl">
          <thead><tr><th>{t("channel")}</th><th>{t("unit")}</th><th className="r">{t("records")}</th><th className="r">Hz</th><th>{t("sensor")}</th></tr></thead>
          <tbody>{[...s.channels.values()].map((c) => (
            <tr key={c.id}><td><span className="mono">{c.id}</span>{catalogue(c.id) ? <> · {catalogue(c.id)!.label[settings.locale]}</> : null}</td><td>{c.unit}</td>
              <td className="r">{c.t.length}</td><td className="r">{c.nominalRateHz ?? "–"}</td><td className="hint">{c.origin === "derived" ? "derived: " : ""}{c.source.sensor} · {c.source.field}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
      {headers.length > 0 && (
        <div className="card">
          <h3>{t("headers")}</h3>
          <div className="hint">{t("headersHint")}</div>
          <div className="scroll"><div className="hex">{headers.join("\n")}</div></div>
        </div>
      )}
    </>
  );
}
