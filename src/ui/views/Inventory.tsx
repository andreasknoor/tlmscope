"use client";

import { useTranslations } from "next-intl";
import type { RawFieldStat, RawStream } from "@/core/model/types";
import { Tile } from "../bits";
import { dateShort, duration, num, timeLabel } from "../format";
import { useStore } from "../store";
import { StreamTable } from "../tabs/Raw";

/** Merges the raw streams of all sessions of a file into one inventory. */
function merge(streams: RawStream[][], durations: number[]) {
  const out = new Map<string, RawStream>();
  const seconds = new Map<string, number>();
  streams.forEach((list, si) => {
    for (const r of list) {
      seconds.set(r.key, (seconds.get(r.key) ?? 0) + durations[si]);
      const e = out.get(r.key);
      if (!e) { out.set(r.key, { ...r, fields: r.fields.map((f) => ({ ...f })), samples: [...r.samples] }); continue; }
      e.count += r.count;
      e.noDataCount += r.noDataCount;
      for (const f of r.fields) {
        const g = e.fields.find((x) => x.name === f.name);
        if (!g) { e.fields.push({ ...f }); continue; }
        const m = (a: number | null, b: number | null, fn: (x: number, y: number) => number) => (a === null ? b : b === null ? a : fn(a, b));
        Object.assign(g, { count: g.count + f.count, noData: g.noData + f.noData, min: m(g.min, f.min, Math.min), max: m(g.max, f.max, Math.max) } satisfies Partial<RawFieldStat>);
      }
      for (const s of r.samples) {
        const x = e.samples.find((y) => y.hex === s.hex);
        if (x) x.count += s.count; else e.samples.push({ ...s });
      }
    }
  });
  for (const e of out.values()) e.samples = e.samples.sort((a, b) => b.count - a.count).slice(0, 8);
  return { streams: [...out.values()].sort((a, b) => b.count - a.count), seconds };
}

export function Inventory() {
  const t = useTranslations();
  const { files, entries, settings, select } = useStore();
  const loc = settings.locale;
  return (
    <>
      <div className="sectionhead"><h2 style={{ fontSize: 28 }}>{t("inv.title")}</h2><p>{t("inv.hint")}</p></div>
      {files.map((f, fi) => {
        const es = entries.filter((e) => e.fileIndex === fi);
        const count = (k: string) => es.filter((e) => e.a.kind === k).length;
        const { streams, seconds } = merge(f.sessions.map((s) => s.raw), f.sessions.map((s) => s.durationS));
        const gps = f.sessions.some((s) => s.channels.has("gps.lat"));
        return (
          <div key={f.fileName} className="stack">
            <div className="grid g4">
              <Tile label={t("inv.file")} value={<span style={{ fontSize: 20, wordBreak: "break-all" }}>{f.fileName}</span>} sub={`${num(loc, f.sizeBytes / 1e6, 1)} MB · ${f.adapterId}`} />
              <Tile label={t("inv.sessions")} value={f.sessions.length} sub={t("inv.kinds", { flight: count("flight"), ground: count("ground-test"), power: count("powered-on"), tx: count("transmitter-only") })} />
              <Tile label={t("inv.streams")} value={streams.length} sub={t("inv.notFully", { n: streams.filter((s) => s.understood !== "full").length })} />
              <Tile label={t("inv.gps")} value={gps ? t("inv.gpsFound") : t("inv.gpsNone")} sub={gps ? undefined : t("inv.gpsHint")} />
            </div>
            {f.warnings.length > 0 && <div className="card"><h3>{t("inv.warnings")}</h3><ul>{f.warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul></div>}
            <StreamTable streams={streams} seconds={seconds} />
            <div className="card">
              <h3>{t("inv.allSessions")}</h3>
              <div className="scroll"><table className="tbl">
                <thead><tr><th>#</th><th>{t("height.start")}</th><th>{t("inv.kind")}</th><th className="r">{t("height.duration")}</th><th className="r">{t("inv.maxHeight")}</th><th className="r">{t("raw.records")}</th></tr></thead>
                <tbody>{es.sort((a, b) => a.a.session.index - b.a.session.index).map((e) => {
                  const p = e.a.profile.available ? e.a.profile.value : null;
                  return (
                    <tr key={e.key} className="clickable" onClick={() => select(e.key, "overview")}>
                      <td className="num">{e.a.session.index}</td>
                      <td className="num">{e.startMs !== null ? `${dateShort(loc, e.startMs)} ${timeLabel(loc, e.startMs)}` : "–"}</td>
                      <td>{t(`kind.${e.a.kind}`)}</td>
                      <td className="r num">{duration(loc, e.a.session.durationS)}</td>
                      <td className="r num">{p?.maxAltitudeM != null ? `${num(loc, p.maxAltitudeM, 1)} m` : "–"}</td>
                      <td className="r num">{String(e.a.session.meta.records ?? "–")}</td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            </div>
          </div>
        );
      })}
    </>
  );
}
