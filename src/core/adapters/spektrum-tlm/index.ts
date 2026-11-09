import { ChannelSet } from "../../model/builder.ts";
import { normaliseSession, toSessionCounter } from "../../model/normalise.ts";
import type { BatteryIdentity, LogAdapter, LogFile, ParseWarning, RawFieldStat, RawStream, Session } from "../../model/types.ts";
import { readBlocks, PACKET_SIZE, type RawSession } from "./blocks.ts";
import { ascii, bcdLe, hex, u16le } from "./bytes.ts";
import { GPS_FIX_CATEGORIES, GPS_FLAG, KNOWN_UNDECODED, SENSORS, streamKey, type Field } from "./sensors.ts";

const FORMAT = "Spektrum TLM";
const MAX_UNIQUE_SAMPLES = 4000;

interface StreamAcc {
  key: string;
  count: number;
  noData: number;
  firstT: number;
  lastT: number;
  fields: Map<string, RawFieldStat>;
  samples: Map<string, number>;
}

/**
 * The model block: byte 1 = 0x00 and bytes 4–5 = 10 27. Byte 0 differs between models
 * (0x01 for a model in slot 2, 0x08 in another log), so it is most likely the model slot.
 * The name starts at byte 6, sometimes after a few control bytes (02 20 in NX8 logs).
 */
export function isModelHeader(h: Uint8Array): boolean {
  return h[1] === 0x00 && h[4] === 0x10 && h[5] === 0x27;
}

/** Model name, probable model slot and declared sensors from the header blocks of one session. */
export function readHeaders(headers: Uint8Array[]) {
  let modelName: string | null = null;
  let modelSlot: number | null = null;
  const declared: { id: string; secondary: string; bytes: string }[] = [];
  for (const h of headers) {
    if (isModelHeader(h)) {
      let start = 6;
      while (start < h.length && h[start] !== 0 && h[start] <= 0x20) start++;
      const end = h.indexOf(0, start);
      const name = ascii(h.subarray(start, end < 0 ? h.length : end)).trim();
      if (name) modelName = name;
      modelSlot = h[0] + 1;
    } else {
      declared.push({ id: `0x${h[0].toString(16).padStart(2, "0")}`, secondary: `0x${h[1].toString(16).padStart(2, "0")}`, bytes: hex(h) });
    }
  }
  return { modelName, modelSlot, declared };
}

function parseSession(data: Uint8Array, rs: RawSession, warnings: ParseWarning[]): Session {
  const { modelName, modelSlot, declared } = readHeaders(rs.headers);
  const n = rs.ticks.length;

  // Time base: the first record that is not the wall-clock record.
  // The end is the latest record, not the last one: records can step back in time.
  let firstTick: number | null = null;
  let lastTick: number | null = null;
  for (let i = 0; i < n; i++) {
    if (data[rs.packetOffsets[i]] === 0x7c) continue;
    if (firstTick === null) firstTick = rs.ticks[i];
    lastTick = Math.max(lastTick ?? -Infinity, rs.ticks[i]);
  }
  const base = firstTick ?? (n ? rs.ticks[0] : 0);

  const set = new ChannelSet();
  const streams = new Map<string, StreamAcc>();
  let clock: { unix: number; tick: number } | null = null;
  const text: Record<number, string> = {};
  const identities = new Map<string, { count: number; p: Uint8Array }>();
  let limits: Uint8Array | null = null;
  let gpsAltHigh = 0;
  let prevTick = -Infinity;
  let backwards = 0;

  for (let i = 0; i < n; i++) {
    const tick = rs.ticks[i];
    // The clock record often carries a tick just ahead of the first data record; it is not part of the time base.
    if (data[rs.packetOffsets[i]] !== 0x7c) {
      if (tick < prevTick) backwards++;
      prevTick = tick;
    }
    const t = (tick - base) / 100;
    const p = data.subarray(rs.packetOffsets[i], rs.packetOffsets[i] + PACKET_SIZE);
    const key = streamKey(p);
    const def = SENSORS[key];
    const fields: Field[] = def ? def.decode(p) : [];

    // inventory
    let acc = streams.get(key);
    if (!acc) {
      acc = { key, count: 0, noData: 0, firstT: t, lastT: t, fields: new Map(), samples: new Map() };
      streams.set(key, acc);
    }
    acc.count++;
    acc.lastT = t;
    const allEmpty = fields.length ? fields.every((f) => f.value === null) : p.subarray(2).every((x) => x === 0);
    if (allEmpty) acc.noData++;
    const h = hex(p);
    const seen = acc.samples.get(h);
    if (seen !== undefined) acc.samples.set(h, seen + 1);
    else if (acc.samples.size < MAX_UNIQUE_SAMPLES) acc.samples.set(h, 1);
    for (const f of fields) {
      let st = acc.fields.get(f.name);
      if (!st) {
        st = { name: f.name, unit: f.unit, channel: f.channel, count: 0, noData: 0, min: null, max: null };
        acc.fields.set(f.name, st);
      }
      st.count++;
      if (f.value === null) st.noData++;
      else {
        st.min = st.min === null ? f.value : Math.min(st.min, f.value);
        st.max = st.max === null ? f.value : Math.max(st.max, f.value);
      }
    }

    // channels
    for (const f of fields) {
      if (!f.channel) continue;
      const unit = f.channel.startsWith("raw:") ? "?" : (f.unit as never);
      const kind = f.counter ? "counter" : f.categorical ? "categorical" : "numeric";
      set.get(f.channel, unit, { sensor: `${key} ${def?.label ?? ""}`.trim(), field: f.name }, kind).push(t, f.value);
    }

    // special packets
    switch (key) {
      case "0x7c":
        // Only dates between 2000 and 2100 count; anything else is a damaged clock record.
        if (!clock && fields[0].value! > 946_684_800 && fields[0].value! < 4_102_444_800) clock = { unix: fields[0].value!, tick };
        break;
      case "0x0c":
        text[p[2]] = ascii(p.subarray(3)).trimEnd();
        break;
      case "0x42/0x80":
        if (fields[0].value !== null) {
          const id = hex(p.subarray(8, 16)).replace(/ /g, "");
          const e = identities.get(id);
          if (e) e.count++;
          else identities.set(id, { count: 1, p });
        }
        break;
      case "0x42/0x90":
        if (fields[0].value !== null) limits = p;
        break;
      case "0x17": {
        const hi = bcdLe(p, 9, 1);
        if (hi !== null) gpsAltHigh = hi;
        break;
      }
      case "0x16": {
        const lo = bcdLe(p, 2, 2);
        const fix = (p[15] & GPS_FLAG.FIX_VALID) !== 0;
        const alt = lo === null || !fix ? null : (gpsAltHigh * 1000 + lo / 10) * (p[15] & GPS_FLAG.NEGATIVE_ALT ? -1 : 1);
        set.get("gps.altitude", "m", { sensor: "0x16/0x17 GPS", field: "altitude (low + high part)" }).push(t, alt);
        break;
      }
    }
  }
  if (rs.droppedRecords) warnings.push({ code: "implausible-time", message: `${rs.droppedRecords} records with impossible timestamps were skipped.`, session: rs.index });
  if (backwards) warnings.push({ code: "time-backwards", message: `${backwards} records go back in time.`, session: rs.index });

  // build channels
  const channels = set.build();
  for (const ch of channels.values()) {
    if (ch.kind === "counter") {
      ch.rawCounter = { t: ch.t, v: ch.v };
      ch.v = toSessionCounter(ch.v);
    }
  }
  const fm = channels.get("flight_mode");
  if (fm) {
    let top = 0;
    for (const v of fm.v) if (!Number.isNaN(v)) top = Math.max(top, v);
    fm.categories = Array.from({ length: top + 1 }, (_, k) => `Mode ${k + 1}`);
    fm.source.note = "Index from byte 2 of the 0x05 packet. Meaning not verified.";
  }
  const gf = channels.get("gps.fix");
  if (gf) gf.categories = GPS_FIX_CATEGORIES;

  // battery identity: the most frequent complete id in this session
  let battery: BatteryIdentity | undefined;
  const best = [...identities.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  if (best) {
    const p = best[1].p;
    battery = { id: best[0], chemistry: p[3] === 1 ? "LiPo" : `type ${p[3]}`, cells: p[4], chargeCycles: u16le(p, 6) };
    if (limits) {
      Object.assign(battery, {
        capacityMah: u16le(limits, 4),
        dischargeRatingC: u16le(limits, 6) / 10,
        emptyCellV: u16le(limits, 10) / 1000,
        fullCellV: u16le(limits, 12) / 1000,
        minTempC: (limits[14] << 24) >> 24,
        maxTempC: (limits[15] << 24) >> 24,
      });
    }
  }

  const raw: RawStream[] = [...streams.values()]
    .sort((a, b) => b.count - a.count)
    .map((a) => {
      const def = SENSORS[a.key];
      return {
        key: a.key,
        label: def?.label ?? KNOWN_UNDECODED[a.key] ?? `Unknown ${a.key}`,
        understood: def?.understood ?? "none",
        note: def?.note,
        count: a.count,
        noDataCount: a.noData,
        firstT: a.firstT,
        lastT: a.lastT,
        fields: [...a.fields.values()],
        samples: [...a.samples.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([h, c]) => ({ hex: h, count: c })),
      };
    });

  const startMs = clock ? clock.unix * 1000 - (clock.tick - base) * 10 : null;
  const session: Session = {
    index: rs.index,
    start: { utcMs: startMs, zone: "utc" },
    durationS: firstTick !== null && lastTick !== null ? Math.max(0, lastTick - firstTick) / 100 : 0,
    modelName,
    source: { format: FORMAT },
    channels,
    raw,
    battery,
    meta: {
      byteOffset: rs.offset,
      records: n,
      ...(modelSlot !== null ? { modelSlot } : {}),
      headerBlocks: rs.headers.map(hex),
      declaredSensors: declared,
      ...(Object.keys(text).length ? { textScreen: Object.entries(text).sort((a, b) => +a[0] - +b[0]).map(([, l]) => l) } : {}),
    },
  };
  normaliseSession(session);
  return session;
}

export const spektrumTlm: LogAdapter = {
  id: "spektrum-tlm",
  label: "Spektrum telemetry log (.TLM)",
  canRead(head, fileName) {
    const startsWithHeader = head.length >= 4 && head[0] === 0xff && head[1] === 0xff && head[2] === 0xff && head[3] === 0xff;
    return startsWithHeader || /\.tlm$/i.test(fileName);
  },
  parse(data, fileName, onProgress): LogFile {
    const warnings: ParseWarning[] = [];
    const blocks = readBlocks(data);
    if (blocks.trailingBytes) warnings.push({ code: "trailing-bytes", message: `${blocks.trailingBytes} bytes at the end are not a complete block.`, offset: data.length - blocks.trailingBytes });
    if (blocks.orphanRecords) warnings.push({ code: "orphan-records", message: `${blocks.orphanRecords} records before the first header block.` });
    if (blocks.falseHeaders) warnings.push({ code: "damaged-records", message: `${blocks.falseHeaders} damaged records were read as data, not as a new session.` });
    if (!blocks.sessions.some((s) => s.headers.length || s.ticks.length)) throw new Error("The file contains no telemetry records.");
    // Progress by records: splitting the file into blocks is quick, decoding the records takes the time.
    const total = blocks.sessions.reduce((s, rs) => s + rs.ticks.length, 0) || 1;
    let done = 0;
    onProgress?.(0.05);
    const sessions = blocks.sessions.map((rs) => {
      const s = parseSession(data, rs, warnings);
      done += rs.ticks.length;
      onProgress?.(0.05 + 0.95 * (done / total));
      return s;
    });
    return { fileName, sizeBytes: data.length, adapterId: "spektrum-tlm", sessions, warnings };
  },
};
