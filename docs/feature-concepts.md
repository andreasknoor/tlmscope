# Feature concepts: alarm settings, thermals, replay, battery ageing

Status: concept for review, nothing built yet. The working prototype is `prototype/features.html`. It uses the synthetic demo flight plus invented example rows, which are marked as such.

All four features follow the rules of the app:
- analyses read canonical channels only,
- results say what they need (`withNeeds`) and degrade gracefully,
- plain language first, numbers on "Show details".

---

## 1. Recommended alarm settings

**Question:** "Where should I set the telemetry alarms on my radio so they warn in time but don't sound on every climb?"

**Placement:** a new section on the Batteries page ("Alarm settings for this model"). It is per model, because the values depend on the setup and not on one flight. A short link from the Battery tab of a flight leads there.

**Inputs:**
- All loaded flights of the model.
- Motor climbs with mAh: `Climb.mah` exists.
- Resistance per cell and highest current: `BatteryCondition`, `motor_current`.
- Peak temperatures and receiver voltage: `Temperatures`, `ReceiverPower`.
- Battery capacity.

**Rules (never riskier than common practice):**

| Alarm | Formula | Floor / ceiling | Confidence |
|---|---|---|---|
| Battery used (mAh) | `80 % × capacity − 2 × median mAh per motor climb`, rounded down to 50 mAh | never above 80 % | high |
| Lowest cell under load | 3.5 V; check that `V_rest(SoC) − I_max × R` stays above it while ≥ 20 % is left | never below 3.3 V | medium: uses an extrapolation below the lowest charge seen |
| Receiver voltage | 5.2 V for a 6 V BEC; 4.6 V for 4.8–5 V systems | above the receiver's 4.8 V load limit | high |
| Battery temperature | 55 °C, or 5 °C below the battery's own reported max | ≤ 60 °C | high |
| Controller temperature | 70 °C unless the manufacturer publishes a limit | – | medium |
| Frame losses / holds | no suggestion | – | not offered by the NX8 per manual |

**Data sufficiency:**
- Fewer than 3 flights with motor climbs: show only the common rule (80 %, 3.5 V) and say why.
- Each card shows "seen" against "alarm" and a "Where the number comes from" list.

**Facts checked (NX8 manual, SPM8200):**
- p. 22: telemetry alarms per sensor; types "Inh and Tone"; "Adjust the sensor alert values as necessary". There are no per-sensor details.
- p. 22 and p. 39: do not change telemetry settings with the model powered, because it can cause a hold.
- p. 13: up to 100 frame losses per minute in the air is normal; any hold must be resolved.

**Open:**
- Exact menu names and value ranges per sensor need a look on the NX8+ itself. The manual does not list them.

**Effort:** small. All inputs already exist; the work is one analysis function plus a card list.

---

## 2. Thermal analysis

**Question:** "How good was the lift, did I centre it well, and where does it usually stand at my field?"

**Placement:**
- In a flight, the Height & lift tab gets a "Thermals" section.
- Across flights, a new "Thermals" page next to Batteries.

**Per thermal** (from the existing lift phases and circling periods):
- start, duration, height gain,
- average climb (gain / duration) and best 10 s climb,
- circles: count, direction, seconds per circle, climb per circle. A circle is split at every 360° of integrated turn rate (`Circling.turnRate`),
- saved motor: `gain / motor climb rate` in seconds and `gain / (m per 100 mAh)` in mAh, using the flight's own climbs or the pilot median.

**With GPS:**
- the circle plot from above,
- drift: the centre of the first circle to the centre of the last, as distance, direction and implied wind speed,
- the field map: thermal centres of all flights around the launch point, sized by average climb.

**Without GPS:** everything except the circle plot, drift and the map.

**Plain-language summary:** "One thermal: +117 m in 1:38, 1.2 m/s on average, best 10 s 1.6 m/s. 7 right-hand circles, 14 s each. It saved about 34 s of motor (191 mAh)."

**Open:**
- Thresholds for "weak / usable / strong" thermals (e.g. < 0.5, 0.5–1.5, > 1.5 m/s) need research before they become ratings. The prototype shows numbers only.

**Effort:** medium. Per-circle splitting and drift are new; the map layer reuses the existing map.

---

## 5. Flight replay

**Question:** "What exactly happened, and when?"

**Placement:** the Flight path tab gets a play bar under the map. Without GPS, the Height & lift tab gets the same bar over the height chart (side view).

**Behaviour:**
- Controls:
  - Play/pause,
  - speed 1×, 10×, 30×, 60× (default 10×),
  - scrub bar in phase colours with the height profile,
  - Space toggles play; ← and → step 5 s.
- The model marker moves along the 3D path; the trail behind it is drawn stronger for the last minute.
- The numbers of the moment: height, vario, ground speed, motor current, signal, phase.
- The time position is shared with the existing chart cursor group (`sync.ts`):
  - the replay moves every chart cursor,
  - moving a chart cursor moves the replay.
- Optional vario tone (Web Audio): beeps rise in pitch and rate with the climb, and the tone is silent below +0.2 m/s. It starts only from a button press (browser rule).

**Implementation note:** the prototype draws its own 3D canvas. In the app, the marker and trail become deck.gl layers on the existing MapLibre view, so the map stays.

**Effort:** medium.

---

## 6. Battery ageing

**Question:** "Which pack is wearing out, and how long until I should retire it?"

**Placement:** the Batteries page. It gets a card per pack and a chart of resistance per cell over date.

**Method:**
- One point per flight with a smart battery ID and a valid `BatteryCondition`.
- Temperature correction: cold packs read high. Below 20 °C subtract `k × (20 − T)` with k ≈ 0.09 mΩ/°C as a first estimate. The prototype marks these points hollow. The factor needs research or calibration from the user's own data (same pack, different temperatures).
- Trend: least squares over the last 10 points against cycle count.
- Forecast "reaches 15 mΩ in about N cycles":
  - shown only with ≥ 5 points over ≥ 14 days and a rising trend,
  - above 150 cycles it reads "no wear worth noting".
- Status: Good / Wearing (< 40 cycles left) / Retire (≥ 15 mΩ). This uses the existing resistance thresholds 10 / 12 / 15 mΩ.

**Caveat shown in the UI:** the in-flight estimate includes wires and plugs. It compares a pack with itself, not with a charger reading.

**Dependency:** it is only useful when many flights are loaded together, which needs the planned browser storage (IndexedDB) or a folder drop. Without a smart battery ID, packs cannot be told apart. A later option is manual assignment.

**Effort:** small for the analysis and chart; the storage is the real work and is planned separately.

---

## Suggested order

1. **Alarm settings.** Small, and useful from the first loaded log.
2. **Battery ageing chart and forecast.** Small. Its full value comes with storage, so consider building storage alongside.
3. **Thermals.** Medium, and the best fit for gliders.
4. **Replay.** Medium, the most visual feature.
