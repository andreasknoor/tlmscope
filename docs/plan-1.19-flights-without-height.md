# Plan 1.19: flights without a height sensor

Status: implemented in 1.19 (9 Nov 2026). Decisions and deviations at the end.

## Problem

A session counts as a flight only if the vario climbs above 10 m, or, without an altitude channel, if the GPS ground speed exceeds 5 m/s. Everything that explains a flight (airtime, phases, motor climbs, moments, comparisons) comes from `flightProfile()`, which needs the `altitude` channel.

The Supra log shows where this fails:

- Sessions 21–106 (Mar 2025 to Nov 2025) have neither vario nor GPS. 66 of them are real flights (6–10 min, 2,000–4,700 mAh, up to 144 A) and are shown as "ground test".
- Session 0 has an altitude channel that stays at 0 m while the GPS measures 48 m/s. It is a flight, also shown as "ground test".

So 67 flights of this model are missing from flight lists, comparisons and battery history.

## What the data allows

Gyro (`0x1a`) and G-meter (`0x14`) are present in every session of both models. Rule tested: a second is "moving" when any rotation rate exceeds 20 °/s; a session with at least 30 moving seconds is a flight.

| Check | Result |
|---|---|
| All 28 sessions with a working height sensor (Supra + Easy Glider, main log and AutoLog) | Rule agrees with the height-based result in 28 of 28 |
| Supra sessions 0–106 | 67 flights; every other session has 5 or fewer moving seconds (no borderline cases) |
| Ground tests while the model is handled (Supra #118, 15 s) | stays a ground test |

The span from the first to the last moving second is longer than the real airtime by 10–84 s (handling before the launch, carrying after landing), and once by 30 min in an AutoLog session. So motion is good to detect a flight, but airtime from motion alone is only approximate.

## Proposal

### 1. Detection (`classify`)

In this order:

1. Height: a usable altitude channel (present and varying by more than 2 m) above 10 m → flight. A flat altitude channel counts as missing (fixes session 0).
2. GPS: ground speed above 5 m/s for at least 10 s → flight.
3. Motion: at least 30 s with a rotation rate above 20 °/s → flight.
4. Motor ran → ground test; otherwise powered on.

All limits go to `FLIGHT` with a note on how they were found.

### 2. Flight profile without height

`flightProfile()` no longer requires `altitude`; it requires a motor channel plus one of height, GPS speed or gyro. A new field says where the airborne time comes from:

```ts
basis: "height" | "gps" | "motion";
```

- Airborne time: height (as today) → GPS speed above 5 m/s → motion. For motion, the airborne window starts at the first 10 s window with at least 6 moving seconds and ends at the last such window, which cuts most of the handling before and after.
- Phases without height: "motor" and "motor off". No climbs, lift or glide (they need height). `maxAltitudeM`, `climbs`, `lifts`, `glideSinkRate` and `mPer100mAh` stay empty.
- Everything that already works without height keeps working and now also runs for these flights: link and signal ratings (rating window = airborne time), battery use and condition, loads, temperatures, circling (gyro only), moments that do not need height.

### 3. Data issue: height sensor without values

If a session has an altitude channel that stays flat although the session is a flight, show an issue: "The height sensor sent no usable values." (Session 0.)

### 4. UI

- Session header and list: these flights are normal flights. The airtime shows as "about 7:40 min" when the basis is motion.
- Overview: summary sentence without height ("7.7 minutes in the air, the motor ran 6:10 min. Battery: 72 % used."), plus a short note: "No height sensor in this session: height, climbs and lift are not available."
- Height & lift tab: the existing "not available" message, naming the missing height sensor.
- Energy tab: motor time and runs instead of climbs; the efficiency card says it needs height.
- Map, if GPS without height: track in 2D, coloured by motor on/off.

### 5. Tests

- Supra reference values: flight count (87 flights in 130 sessions), session 0 = flight with the height issue, sessions 16 and 118 stay ground tests, airtime of a few flights against the GPS-based airtime of the same plane.
- Easy Glider reference values stay unchanged (height basis).
- The 28-session agreement check as a test.
- Synthetic: the demo flight without its altitude channel is still a flight (basis "motion" or "gps").

### Risk

The analysis results of all existing height-based flights must stay identical; the reference tests in `analysis.test.ts` guard that. The main change is in `classify()` and `flightProfile()`, plus the UI branches for missing height. Estimate: one version, roughly the size of 1.16.

## Decisions (owner, 9 Nov 2026) and what was built

1. **Phases:** "Motor climb" only while the model climbs with the motor (9 s average above 0.5 m/s); otherwise "Motor on". Without height: "Motor on" and "Motor off". The motor runs behind the climb count and the climb efficiency stay whole runs, so efficiency values are unchanged from 1.18 (splitting them would have moved the Easy Glider's usual value from 50 to 93 m per 100 mAh). The tiles now say "motor runs".
2. **Approximate airtime:** shown as "about 7:40" when it comes from motion. The motion window was set to 4 moving seconds in 10 (not 6): against the height-based airtime of 25 flights of two models it stays within −48 … +76 s; with 6, a calm glider flight came out 133 s short.
3. **Use per minute:** "mAh per minute in the air" for every flight, compared per model (`consumptionRatio`).
4. **Map:** the camera fits the track, leaving a third of the height free at the top in 3D. New full-screen mode: map and replay fill the browser window (no height or distance chart), Esc closes.

Found while building: the Supra vario leaves its 1 s climb-rate field at 0 (only the 0.25 s field is filled). `normaliseSession` now derives the climb rate from the height when the field is missing or always 0.
