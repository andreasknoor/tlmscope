/**
 * Format-neutral log model.
 *
 * Every input format is turned into this model by an adapter. Views, analyses and
 * exports only ever read this model, never format-specific structures.
 */

/** A canonical channel id from the catalogue, e.g. "altitude", "cell_voltage.2", or "raw:<adapter>.<field>". */
export type ChannelId = string;

/** Units used by channels. SI where it exists, plus a few domain units. */
export type Unit =
  | "m" | "m/s" | "V" | "A" | "mAh" | "%" | "°C" | "dBm" | "g" | "°/s" | "°" | "1/min"
  | "s" | "count" | "" | "?";

export type ChannelKind =
  /** A measured or derived number per sample. */
  | "numeric"
  /** A label per sample; `v` holds an index into `categories`. */
  | "categorical"
  /** A count since the start of the session (starts at 0, never decreases). */
  | "counter";

/** Per-sample quality flags (bit set). A sample without flags is a normal measurement. */
export const Q = {
  /** The sensor reported "no data" for this sample. `v` is NaN. */
  NO_DATA: 1,
  /** Value filled in between real samples. */
  INTERPOLATED: 2,
  /** The value did not change although it should have (stuck sensor). */
  FROZEN: 4,
  /** Calculated from other channels, not measured. */
  DERIVED: 8,
  /** Measured, but known to be unreliable. */
  SUSPECT: 16,
} as const;

export interface Channel {
  id: ChannelId;
  unit: Unit;
  kind: ChannelKind;
  /** Seconds since the session start, ascending. May be shared between channels. */
  t: Float64Array;
  /** Values. NaN where the sample has the NO_DATA flag. */
  v: Float64Array;
  /** Quality flags per sample, see `Q`. */
  q: Uint8Array;
  /** Labels for categorical channels. */
  categories?: string[];
  /** Typical sample rate, if the format has one. */
  nominalRateHz?: number;
  origin: "measured" | "derived";
  /** Where the values came from, for the expert view. */
  source: { sensor: string; field: string; note?: string };
  /** For counters: the original cumulative values as recorded by the device. */
  rawCounter?: { t: Float64Array; v: Float64Array };
}

/** Identity of a battery that reports itself (e.g. Spektrum Smart batteries). */
export interface BatteryIdentity {
  /** Stable unique id, as hex or text. */
  id: string;
  chemistry?: string;
  cells?: number;
  chargeCycles?: number;
  capacityMah?: number;
  /** Maximum continuous discharge in C, if reported. */
  dischargeRatingC?: number;
  fullCellV?: number;
  emptyCellV?: number;
  minTempC?: number;
  maxTempC?: number;
}

/** Statistics for one decoded field of a raw stream, used by the data inventory. */
export interface RawFieldStat {
  name: string;
  unit: Unit | string;
  /** Channel this field feeds, if it is mapped. */
  channel?: ChannelId;
  count: number;
  noData: number;
  min: number | null;
  max: number | null;
}

/**
 * Everything one source (a sensor, a packet type, a CSV column) delivered,
 * whether it is mapped to channels or not. Nothing is silently dropped.
 */
export interface RawStream {
  /** Adapter-specific key, e.g. "0x20" or "0x42/0x10". */
  key: string;
  label: string;
  understood: "full" | "partial" | "none";
  note?: string;
  count: number;
  /** Records where every field was "no data". */
  noDataCount: number;
  firstT: number;
  lastT: number;
  fields: RawFieldStat[];
  /** Most common raw records, for the expert view. */
  samples: { hex: string; count: number }[];
}

export interface ParseWarning {
  code: string;
  message: string;
  session?: number;
  offset?: number;
}

export interface Session {
  /** Position in the file, starting at 0. */
  index: number;
  start: {
    /** Wall-clock start in milliseconds since 1970 (UTC), if known. */
    utcMs: number | null;
    /** "utc" if the format gives absolute time, "local-unknown" if only a local time without zone. */
    zone: "utc" | "local-unknown";
  };
  /** Seconds from the first to the last sample. */
  durationS: number;
  modelName: string | null;
  source: { format: string; device?: string };
  channels: Map<ChannelId, Channel>;
  raw: RawStream[];
  battery?: BatteryIdentity;
  /** Adapter extras that have no place in the model, e.g. header blocks. Shown in the expert view. */
  meta: Record<string, unknown>;
}

export interface LogFile {
  fileName: string;
  sizeBytes: number;
  adapterId: string;
  sessions: Session[];
  warnings: ParseWarning[];
}

export interface LogAdapter {
  id: string;
  label: string;
  /** Cheap check on the first bytes and the file name. */
  canRead(head: Uint8Array, fileName: string): boolean;
  /** `onProgress` gets the share done (0…1) now and then; large files take seconds. */
  parse(data: Uint8Array, fileName: string, onProgress?: (share: number) => void): LogFile;
}
