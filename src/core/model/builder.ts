import { Q, type Channel, type ChannelId, type ChannelKind, type Unit } from "./types.ts";

/** Collects samples for one channel and turns them into typed arrays. */
export class ChannelBuilder {
  private t: number[] = [];
  private v: number[] = [];
  private q: number[] = [];
  readonly id: ChannelId;
  readonly unit: Unit;
  readonly kind: ChannelKind;
  readonly source: Channel["source"];
  categories?: string[];

  constructor(id: ChannelId, unit: Unit, kind: ChannelKind, source: Channel["source"]) {
    this.id = id;
    this.unit = unit;
    this.kind = kind;
    this.source = source;
  }

  push(t: number, v: number | null, q = 0): void {
    this.t.push(t);
    if (v === null || Number.isNaN(v)) {
      this.v.push(NaN);
      this.q.push(q | Q.NO_DATA);
    } else {
      this.v.push(v);
      this.q.push(q);
    }
  }

  get length(): number {
    return this.t.length;
  }

  build(nominalRateHz?: number): Channel {
    return {
      id: this.id,
      unit: this.unit,
      kind: this.kind,
      t: Float64Array.from(this.t),
      v: Float64Array.from(this.v),
      q: Uint8Array.from(this.q),
      categories: this.categories,
      nominalRateHz,
      origin: "measured",
      source: this.source,
    };
  }
}

/** Keeps one builder per channel id. */
export class ChannelSet {
  private builders = new Map<ChannelId, ChannelBuilder>();

  get(id: ChannelId, unit: Unit, source: Channel["source"], kind: ChannelKind = "numeric"): ChannelBuilder {
    let b = this.builders.get(id);
    if (!b) {
      b = new ChannelBuilder(id, unit, kind, source);
      this.builders.set(id, b);
    }
    return b;
  }

  build(): Map<ChannelId, Channel> {
    const out = new Map<ChannelId, Channel>();
    for (const [id, b] of this.builders) {
      if (b.length === 0) continue;
      const ch = b.build();
      // A channel that never carried a value is treated as absent.
      if (ch.q.every((f) => (f & Q.NO_DATA) !== 0)) continue;
      if (ch.t.length > 1) {
        const span = ch.t[ch.t.length - 1] - ch.t[0];
        if (span > 0) ch.nominalRateHz = Math.round(((ch.t.length - 1) / span) * 100) / 100;
      }
      out.set(id, ch);
    }
    return out;
  }
}
