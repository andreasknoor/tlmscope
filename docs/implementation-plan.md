# tlmscope: implementation plan

Status: decisions D1–D9 made, plan ready for final review, 2026-11-08. Nothing in here is built yet, apart from the HTML prototype (`prototype/`).

## 1. Goal and scope

A web app that reads RC telemetry logs in the browser and explains each flight in plain language, with exact values one click away. The first input format is Spektrum `.TLM`. The data model is format-neutral, so other formats (EdgeTX/OpenTX CSV first) can be added as adapters later.

In scope for this plan:
- Spektrum TLM adapter, tested against all six sample files.
- Format-neutral model, channel catalogue and analysis library, all framework-free and unit-tested.
- Next.js app with the views from the prototype: sessions, session tabs, batteries, data inventory, help.
- English and German UI, three detail levels, a global details toggle.
- Flight path view: circling analysis without GPS; map and 3D path with GPS.

Out of scope (see section 8): the EdgeTX adapter (until a real EdgeTX log is available), cloud storage, accounts, live telemetry, editing transmitter settings.

## 2. Decisions to confirm before Phase 1

| # | Decision | Proposal | Why |
|---|---|---|---|
| D1 | Framework | **Decided:** Next.js (App Router) + TypeScript, static export where possible, hosted on Vercel | Your default. No server code is needed, because files are parsed in the browser. |
| D2 | Charts | **Decided:** uPlot | Fast with tens of thousands of points, small (~50 kB), synced cursors. Proven in the prototype. |
| D3 | Map and 3D path | **Decided:** MapLibre GL JS for the map, deck.gl for the 3D path layer | Open source, no API key required. Tiles from a free provider first, switchable later. |
| D4 | Tests | **Decided:** Vitest (already installed) | Fast, TypeScript-native, also runs the decoder outside the browser. |
| D5 | i18n | **Decided:** next-intl with `en` and `de` message files | Standard for the App Router. Plural forms and number/date formats per locale. |
| D6 | Parsing location | **Decided:** Web Worker | Keeps the UI responsive on the 9.5 MB AutoLog files (≈ 470 000 records). |
| D7 | Persistence | **Decided:** none in v1. Files are dropped again each visit. | Matches “data stays local” and keeps v1 small. Battery names and history across visits come later (IndexedDB). |
| D8 | Name and logo | **Decided:** spelling “TLMscope” with logo A (climb trace) | Readable at 16 px, fits gliders and powered models alike. |
| D9 | Rating thresholds | **Decided:** researched values in section 2.1, all in one config file | No reference data from other pilots yet. Easy to tune. |

### 2.1 Rating thresholds (D9)

Every rating uses four levels. The overall rating of a flight is the level held for at least 75 % of the airtime, shown together with the share of weak time (e.g. “Normal, 21 % weak”).

| Rating | Levels | Basis |
|---|---|---|
| Signal strength | high ≥ −70 · normal ≥ −80 · weak ≥ −85 · below: critical (dBm) | Your own flights: frame losses rise from ≈ 0.2/s at −75…−80 dBm to ≈ 1/s at −80…−85 and ≈ 4/s below −85. Spektrum publishes no dBm limits. |
| Radio link | high ≤ 20 · normal ≤ 100 frame losses per minute · weak above · critical = any hold while airborne | Spektrum receiver manuals: up to ~100 frame losses per minute in the air are normal. Any hold in flight needs action. |
| Antenna fades | hint “move this antenna” above 500 per flight | Spektrum receiver manuals: 50–100 per flight typical. |
| Receiver power | steady ≥ 5.2 · OK ≥ 4.8 · dips ≥ 4.0 · below: brown-out risk (V) | AR8360T manual: stay above 4.8 V under load. DSM receivers drop out below ~3.5 V. |
| Battery used | plenty ≤ 50 · fine ≤ 70 · land soon ≤ 80 · over-drawn above (% of capacity) | Common 80 % rule (hobby practice, not a manufacturer value). |
| Charge estimate | resting-voltage table, 3.84 V ≈ 50 % | Matches published 3.80–3.85 V ≈ 40–50 %. Marked as an estimate. |
| Battery condition | per cell: good ≤ 10 · OK ≤ 12 · tired ≤ 15 · check above (mΩ), plus the trend per battery | LiPo primers: < 10 excellent, 10–12 acceptable, > 15 retire. The in-flight estimate includes wiring, so it reads slightly high. |
| Battery temperature | cool ≤ 45 · warm ≤ 55 · hot ≤ 60 · too hot above (°C); the pack's own limit wins | 35–45 °C after a flight is normal; 60 °C is the common ceiling. |
| Controller temperature | cool ≤ 50 · warm ≤ 70 · hot ≤ 85 · too hot above (°C) | No Avian limit published. Shown with that note. |
| Cell balance | ≤ 10 · ≤ 20 · ≤ 40 mV spread | Not researched yet. |

## 3. Architecture

```
src/
  core/                    framework-free, no DOM, no React
    model/                 LogFile, Session, Channel, quality flags, units
    catalogue/             canonical channel ids, units, labels (en/de keys)
    adapters/
      registry.ts          list of adapters, detect + parse
      spektrum-tlm/        block reader, packet decoders, channel mapping, raw store
    analysis/              session kind, phases, climbs, lift, circling, link, battery, ratings
      thresholds.ts        all rating thresholds in one place
    units.ts               conversions (km/h → m/s, °F → °C, ft → m, …)
  worker/                  Web Worker entry: files in, LogFile + analysis out
  app/                     Next.js routes and components
  i18n/                    en.json, de.json
cli/
  inspect.ts               `npm run inspect <file>`: prints sessions and the sensor inventory
```

Rule: everything in `app/` reads only `core/model` and `core/analysis` output. Nothing outside `core/adapters/spektrum-tlm/` knows about Spektrum packets.

### 3.1 Normalised model (TypeScript sketch)

```ts
interface LogAdapter {
  id: string;                              // "spektrum-tlm"
  label: string;                           // "Spektrum telemetry log"
  canRead(head: Uint8Array, fileName: string): boolean;
  parse(data: Uint8Array, fileName: string): LogFile;
}

interface LogFile {
  fileName: string;
  sizeBytes: number;
  adapterId: string;
  sessions: Session[];
  warnings: ParseWarning[];                // e.g. trailing bytes, unclosed file
}

interface Session {
  id: string;                              // stable within the file
  index: number;
  start: { utcMs: number | null; zone: "utc" | "local-unknown" };
  durationS: number;
  modelName: string | null;
  source: { format: string; device?: string };   // device = transmitter or receiver, if known
  channels: Map<ChannelId, Channel>;
  raw: RawStream[];                        // everything the adapter could not map, plus original packets on demand
  meta: Record<string, unknown>;           // adapter extras, e.g. header blocks, battery identity
}

type ChannelId = string;                   // from the catalogue, e.g. "altitude", "cell_voltage.2", "raw:7e@14"

interface Channel {
  id: ChannelId;
  unit: Unit;                              // SI or a defined unit such as "dBm", "%", "mAh"
  kind: "numeric" | "categorical" | "counter";
  t: Float64Array;                         // seconds since session start; may be shared between channels
  v: Float64Array;                         // values (categorical channels: index into `categories`)
  q: Uint8Array;                           // quality flags per sample (bit set)
  categories?: string[];
  nominalRateHz?: number;
  origin: "measured" | "derived";
  source: { sensor: string; field: string };    // e.g. { sensor: "0x20 ESC", field: "motor current" }
  rawCounter?: { t: Float64Array; v: Float64Array }; // original cumulative values for counters
}

// quality flags
const Q_NO_DATA = 1, Q_INTERPOLATED = 2, Q_FROZEN = 4, Q_DERIVED = 8, Q_SUSPECT = 16;
```

Session `kind` (flight, ground test, powered on, transmitter only) is an **analysis result**, not an adapter output. Adapters only split the log into sessions. This keeps the classification identical for every format.

### 3.2 Channel catalogue (first version)

| Id | Unit | Spektrum source |
|---|---|---|
| `altitude` | m | 0x40 vario |
| `climb_rate` | m/s | 0x40 (1.0 s value; others as `climb_rate.0_25s` …) |
| `pack_voltage` | V | 0x20 ESC input |
| `cell_voltage.1…6` | V | 0x42/0x10 smart battery |
| `cell_voltage_min`, `cell_voltage_max` | V | 0x42/0x00 |
| `motor_current` | A | 0x20 |
| `consumed_mah` | mAh | derived from `motor_current` (flag `derived`), or measured where a sensor sends it |
| `throttle_output` | % | 0x20 throttle |
| `power_output` | % | 0x20 |
| `rpm_electrical` | 1/min | 0x20 |
| `temperature.esc`, `temperature.bec`, `temperature.battery` | °C | 0x20, 0x42 |
| `bec_voltage`, `bec_current` | V, A | 0x20 |
| `rx_voltage` | V | 0x7F |
| `signal_dbm` | dBm | 0x7E |
| `signal_quality` | % | 0x7E (unverified meaning) |
| `link_quality` | % | none in Spektrum (EdgeTX: RQly) |
| `frame_losses`, `holds`, `fades.a/b/l/r` | count (per-session delta) | 0x7F |
| `accel.x/y/z`, `accel.max_*` | g | 0x14 |
| `rotation_rate.x/y/z` | °/s | 0x1A |
| `attitude.pitch/roll/yaw` | ° | none in Spektrum yet (EdgeTX/CRSF) |
| `flight_mode` | categorical | 0x05 byte 2 (unverified) |
| `gps.lat`, `gps.lon` | ° | 0x16 |
| `gps.altitude` | m | 0x16 + 0x17 |
| `ground_speed` | m/s | 0x17 |
| `heading` | ° | 0x16 |
| `gps.satellites`, `gps.fix` | count, categorical | 0x17, 0x16 flags |
| `stick.*`, `switch.*`, `throttle_command` | % / categorical | none in Spektrum logs we have (EdgeTX logs them) |

Battery identity (ID, chemistry, cell count, cycles, capacity, limits) is session metadata, not a channel.

### 3.3 Analyses and their requirements

Each analysis declares what it needs, with alternatives where formats differ:

| Analysis | Requires | Optional |
|---|---|---|
| Session kind | `altitude` or `ground_speed` | `motor_current`, `throttle_output` |
| Flight phases (motor, glide, lift, ground) | `altitude`, (`motor_current` or `throttle_output` or `throttle_command`) | `climb_rate` |
| Climb efficiency | phases, `motor_current` | `consumed_mah` |
| Circling | `rotation_rate.*` or `attitude.yaw` or `heading` | |
| Link rating | `frame_losses` or `link_quality` | `holds` |
| Signal rating | `signal_dbm` | |
| Battery used | `consumed_mah` or `motor_current` | battery capacity (metadata) |
| Battery condition (sag) | `pack_voltage`, `motor_current` | |
| Charge estimate | `pack_voltage` or `cell_voltage.*` | cell count |
| Frozen-data check | any channel marked “should vary” | |
| Distance, speed, map | `gps.lat`, `gps.lon` | `gps.altitude` |

The UI shows an analysis only when its requirements are met. Otherwise it says what is missing (“No GPS: distance unavailable”).

## 4. EdgeTX/OpenTX CSV check

EdgeTX writes one CSV per model and day: one row per sample, a `Date` and `Time` column, then one column per telemetry sensor (`Alt(m)`, `RxBt(V)`, `1RSS(dB)`, `RQly(%)`, `GPS`, …) and the stick and switch positions. Checked against the model above:

| Point | Effect on the design | Handled by |
|---|---|---|
| No power-up markers; logging can be stopped and started by a switch | Sessions must be split by the adapter (time gaps). | `kind` comes from analysis, not from the adapter. |
| Sensor names and units are user-defined (renamed sensors, `Alt(ft)`) | Mapping needs heuristics and, later, a user mapping. | Unit parser in `core/units.ts`. Unmapped columns stay available as `raw:<column>` channels. |
| `GPS` holds lat and lon in one cell | The adapter splits it. | Covered by `gps.lat` and `gps.lon`. |
| Flight mode is text (`ANGL`, `AIR`) | Channels need a categorical type. | `kind: "categorical"` with `categories`. |
| Link data is LQ % and RSSI per antenna, no frame-loss counters | The link rating must accept alternatives. | “Requires … or …” in section 3.3. |
| Stick and switch positions | New channel family. | `stick.*`, `switch.*`, `throttle_command`. |
| Local time without a time zone | Start time cannot be converted reliably. | `start.zone = "local-unknown"`. |
| One timestamp for all columns | Many channels share one time base. | Channels may share the same `t` array. |
| No smart-battery identity | Battery history is unavailable. | The batteries page lists only formats that provide an identity. |

Result: nothing in the model blocks an EdgeTX adapter, provided four things are built in from the start:
- categorical channels;
- analyses that accept alternative channels;
- adapter-driven session splitting;
- raw passthrough for unmapped data.

All four are part of Phase 1 and Phase 2.

## 5. Phases

Every phase ends with passing tests, a short demo, small focused commits and your review.

### Phase 1: Model and Spektrum adapter
- Model types, quality flags, unit helpers, channel catalogue.
- Spektrum adapter:
  - block reader with session splitting and header blocks;
  - decoders for 0x20, 0x40, 0x42 (all four types), 0x7F, 0x7E, 0x14, 0x1A, 0x05, 0x0C, 0x7C, 0x16, 0x17;
  - per-session deltas for counters;
  - raw passthrough for 0x00, 0x76, 0x7A and anything unknown.
- Frozen-sample flagging inside the adapter where a value repeats bit-for-bit.
- `npm run inspect <file>` CLI.
- Tests against all six samples:
  - reference values from the brief: 5 flights, 35.0 min airtime, 656 frame losses, 0 holds, about 1921 mAh, and the numbers for the 10 Oct flight;
  - session counts per file and no unparsed trailing bytes;
  - inventory snapshots;
  - frozen cells on 7 Nov 09:33.
- README v1:
  - what the app is for and who can use it (from the help text);
  - supported and unsupported devices;
  - the file format;
  - the model and the channel catalogue, so new adapters can be written against it.

- Add the five AutoLog samples to the repository (≈ 19 MB) and push to GitHub (`andreasknoor/tlmscope`), so Vercel previews can build from Phase 3 on.

**Done when:** all tests pass on all six files and the CLI prints a complete inventory for each.

### Phase 2: Analysis library
- Session kind, phases, motor climbs, lift, glide sink rate, circling, link and signal levels, battery used, sag/resistance, charge estimate, cell balance, temperatures, receiver power, flying style, data check, moments.
- Requirement declarations per analysis (section 3.3).
- All thresholds in `thresholds.ts`.
- Tests: the prototype's results for the five flights become fixtures. Synthetic channel sets check that missing channels lead to “unavailable”, not to errors.

**Done when:** every number shown in the prototype comes out of `core/analysis` with a test behind it.

### Phase 3: App shell and overview
- Next.js app, file drop for several files, parsing in a Web Worker, loading and error states (corrupt file, wrong format).
- Session list with flights/all filter, keyboard navigation, URL per session.
- Header controls: detail level (Simple default), details toggle, EN/DE, help dialog.
- Overview tab: summary sentence, tiles, height chart with phases, health check cards, moments.
- Data inventory page and the Raw data tab (Expert).
- Vercel preview deployment.

**Done when:** your sample files open in the deployed preview and the Overview matches the prototype.

### Phase 4: Session tabs and batteries
- Height & lift, Motor & energy, Battery, Radio link, Aircraft tabs.
- Batteries page with history per battery ID.
- Synced cursors across all charts, jump from tables to chart positions.

**Done when:** every prototype tab exists in the app with real analysis output, in both languages.

### Phase 5: Flight path
- Without GPS: circling statistics, circling strip, clear “needs GPS” message.
- With GPS: MapLibre map, deck.gl 3D path, colour by phase/height/signal, distance and speed tiles, signal against real distance.
- GPS decoding is tested only with a synthetic fixture until a real GPS log exists. The UI marks GPS support as “untested” until then.

**Done when:** the no-GPS view works on all samples and the GPS view works on the synthetic fixture.

### Phase 6: Polish and release
- Name and logo assets, favicon, app icon.
- Accessibility pass: keyboard, focus, contrast, screen-reader labels on charts.
- Performance check with the 9.5 MB file. Target: parse plus first render under 2 s on a recent Mac.
- README final, production deployment on Vercel.

## 6. Testing strategy
- Unit tests for every decoder and analysis (Vitest), using real samples and small synthetic fixtures.
- Snapshot of the inventory per sample file, so format changes are visible in review.
- A few component tests for rating cards and charts. No end-to-end browser suite in v1. A manual check list per phase instead.

## 7. Risks and open format questions

| Risk | Plan |
|---|---|
| 0x7A (≈ 50 Hz, only in AutoLog files), 0x05 pages, 0x76, the 0x7E counter at offset 14 are not understood | Keep as raw data with hex view. Investigate in Phase 1 and report findings before guessing. |
| GPS decoding is untested | Mark as untested in the UI and README until a real log exists. |
| Rating thresholds are guesses | One config file. Tune with your feedback after real use. |
| Older transmitter firmware may write unclosed or corrupted files (fixed in NX AirWare 4.02) | Parse what is readable, report a warning, never crash. |
| Large files | Web Worker, typed arrays, downsampling only for drawing. |

## 8. Later, not scheduled
- EdgeTX/OpenTX CSV adapter, once you provide a real log.
- Saving files, battery names and history in the browser (IndexedDB).
- Export (CSV of canonical channels, GPX/KML with GPS).
- Comparing flights side by side.
- Decoding 0x7A once its meaning is clear.
