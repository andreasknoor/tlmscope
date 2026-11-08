import type { ChannelKind, Unit } from "./types.ts";

/**
 * The channel catalogue: every canonical channel id an adapter may produce.
 * Adapters map their fields to these ids. Channels a format does not have are simply absent.
 * Ids not listed here must start with "raw:".
 */
export interface CatalogueEntry {
  id: string;
  unit: Unit;
  kind: ChannelKind;
  group: "flight" | "power" | "motor" | "battery" | "link" | "motion" | "gps" | "controls" | "status";
  label: { en: string; de: string };
  description: string;
  /**
   * The value must change while `whileVarying` changes by at least `minDelta`.
   * If it stays bit-for-bit identical for at least `minSeconds` and for at least `minShare`
   * of the channel's time span meanwhile, the samples are flagged FROZEN.
   * (Some sensors report in coarse steps, so short constant stretches are normal.)
   */
  frozenCheck?: { whileVarying: string; minDelta: number; minSeconds: number; minShare: number };
}

const loadCheck = { whileVarying: "motor_current", minDelta: 5, minSeconds: 60, minShare: 0.8 };

const e = (
  id: string, unit: Unit, group: CatalogueEntry["group"], en: string, de: string, description: string,
  extra: Partial<CatalogueEntry> = {},
): CatalogueEntry => ({ id, unit, kind: "numeric", group, label: { en, de }, description, ...extra });

const cells = [1, 2, 3, 4, 5, 6].map((n) =>
  e(`cell_voltage.${n}`, "V", "battery", `Cell ${n}`, `Zelle ${n}`, `Voltage of cell ${n}.`, { frozenCheck: loadCheck }));

export const CATALOGUE: CatalogueEntry[] = [
  // flight
  e("altitude", "m", "flight", "Height", "Höhe", "Height above the power-on point (barometric)."),
  e("climb_rate", "m/s", "flight", "Climb rate", "Steigrate", "Vertical speed, about 1 s average. Positive = climbing."),
  e("climb_rate.0_25s", "m/s", "flight", "Climb rate (0.25 s)", "Steigrate (0,25 s)", "Vertical speed over 0.25 s."),
  e("climb_rate.0_5s", "m/s", "flight", "Climb rate (0.5 s)", "Steigrate (0,5 s)", "Vertical speed over 0.5 s."),
  e("climb_rate.1_5s", "m/s", "flight", "Climb rate (1.5 s)", "Steigrate (1,5 s)", "Vertical speed over 1.5 s."),
  e("climb_rate.2_0s", "m/s", "flight", "Climb rate (2 s)", "Steigrate (2 s)", "Vertical speed over 2 s."),
  e("climb_rate.3_0s", "m/s", "flight", "Climb rate (3 s)", "Steigrate (3 s)", "Vertical speed over 3 s."),
  // power
  e("pack_voltage", "V", "power", "Battery voltage", "Akkuspannung", "Voltage of the flight battery, as measured by the motor controller.", { frozenCheck: loadCheck }),
  e("rx_voltage", "V", "power", "Receiver voltage", "Empfängerspannung", "Supply voltage at the receiver."),
  e("bec_voltage", "V", "power", "BEC voltage", "BEC-Spannung", "Output voltage of the receiver power supply (BEC)."),
  e("bec_current", "A", "power", "BEC current", "BEC-Strom", "Current drawn from the BEC."),
  // motor
  e("motor_current", "A", "motor", "Motor current", "Motorstrom", "Current drawn by the motor."),
  e("consumed_mah", "mAh", "motor", "Charge used", "Verbrauchte Ladung", "Charge used since the session start. Derived from motor current unless a sensor measures it."),
  e("throttle_output", "%", "motor", "Throttle", "Gas", "Throttle as seen by the motor controller."),
  e("power_output", "%", "motor", "Power output", "Ausgangsleistung", "Output power of the motor controller in percent."),
  e("rpm_electrical", "1/min", "motor", "Motor speed (electrical)", "Motordrehzahl (elektrisch)", "Electrical rpm. Shaft rpm = electrical rpm / (poles / 2)."),
  e("temperature.esc", "°C", "motor", "Controller temperature", "Reglertemperatur", "Temperature of the motor controller (FETs)."),
  e("temperature.bec", "°C", "motor", "BEC temperature", "BEC-Temperatur", "Temperature of the BEC."),
  // battery
  ...cells,
  e("cell_voltage_min", "V", "battery", "Lowest cell", "Niedrigste Zelle", "Lowest cell voltage reported by the battery.", { frozenCheck: loadCheck }),
  e("cell_voltage_max", "V", "battery", "Highest cell", "Höchste Zelle", "Highest cell voltage reported by the battery.", { frozenCheck: loadCheck }),
  e("temperature.battery", "°C", "battery", "Battery temperature", "Akkutemperatur", "Temperature reported by the battery."),
  // link
  e("signal_dbm", "dBm", "link", "Signal strength", "Signalstärke", "Received signal strength at the receiver."),
  e("signal_quality", "%", "link", "Signal quality", "Signalqualität", "Signal quality in percent as reported by the receiver (meaning differs per system)."),
  e("link_quality", "%", "link", "Link quality", "Verbindungsqualität", "Share of packets received (e.g. CRSF/ELRS LQ)."),
  e("frame_losses", "count", "link", "Frame losses", "Frame Losses", "Frames lost on all antennas, counted since the session start.", { kind: "counter" }),
  e("holds", "count", "link", "Holds", "Holds", "Failsafe events (about 1 s without signal), counted since the session start.", { kind: "counter" }),
  e("fades.a", "count", "link", "Fades antenna A", "Fades Antenne A", "Signal fades on antenna A since the session start.", { kind: "counter" }),
  e("fades.b", "count", "link", "Fades antenna B", "Fades Antenne B", "Signal fades on antenna B since the session start.", { kind: "counter" }),
  e("fades.l", "count", "link", "Fades left", "Fades links", "Signal fades on the left remote receiver since the session start.", { kind: "counter" }),
  e("fades.r", "count", "link", "Fades right", "Fades rechts", "Signal fades on the right remote receiver since the session start.", { kind: "counter" }),
  // motion
  e("accel.x", "g", "motion", "Acceleration x", "Beschleunigung x", "Acceleration along the receiver's x axis."),
  e("accel.y", "g", "motion", "Acceleration y", "Beschleunigung y", "Acceleration along the receiver's y axis."),
  e("accel.z", "g", "motion", "Acceleration z", "Beschleunigung z", "Acceleration along the receiver's z axis."),
  e("accel.max_x", "g", "motion", "Max acceleration x", "Max. Beschleunigung x", "Peak acceleration x as tracked by the sensor."),
  e("accel.max_y", "g", "motion", "Max acceleration y", "Max. Beschleunigung y", "Peak acceleration y as tracked by the sensor."),
  e("accel.max_z", "g", "motion", "Max acceleration z", "Max. Beschleunigung z", "Peak acceleration z as tracked by the sensor."),
  e("accel.min_z", "g", "motion", "Min acceleration z", "Min. Beschleunigung z", "Lowest acceleration z as tracked by the sensor."),
  e("rotation_rate.roll", "°/s", "motion", "Roll rate", "Rollrate", "Rotation about the longitudinal axis."),
  e("rotation_rate.pitch", "°/s", "motion", "Pitch rate", "Nickrate", "Rotation about the lateral axis."),
  e("rotation_rate.yaw", "°/s", "motion", "Yaw rate", "Gierrate", "Rotation about the vertical axis. The sign gives the turn direction."),
  e("rotation_rate.max_roll", "°/s", "motion", "Max roll rate", "Max. Rollrate", "Peak roll rate as tracked by the sensor."),
  e("rotation_rate.max_pitch", "°/s", "motion", "Max pitch rate", "Max. Nickrate", "Peak pitch rate as tracked by the sensor."),
  e("rotation_rate.max_yaw", "°/s", "motion", "Max yaw rate", "Max. Gierrate", "Peak yaw rate as tracked by the sensor."),
  e("attitude.pitch", "°", "motion", "Pitch angle", "Nickwinkel", "Pitch angle from a flight controller."),
  e("attitude.roll", "°", "motion", "Roll angle", "Rollwinkel", "Roll angle from a flight controller."),
  e("attitude.yaw", "°", "motion", "Yaw angle", "Gierwinkel", "Heading-like yaw angle from a flight controller."),
  // gps
  e("gps.lat", "°", "gps", "Latitude", "Breitengrad", "Latitude, WGS84, north positive."),
  e("gps.lon", "°", "gps", "Longitude", "Längengrad", "Longitude, WGS84, east positive."),
  e("gps.altitude", "m", "gps", "GPS altitude", "GPS-Höhe", "Altitude above sea level from GPS."),
  e("gps.satellites", "count", "gps", "Satellites", "Satelliten", "Number of satellites in use."),
  e("gps.fix", "", "gps", "GPS fix", "GPS-Fix", "Fix state.", { kind: "categorical" }),
  e("gps.hdop", "", "gps", "HDOP", "HDOP", "Horizontal dilution of precision. Lower is better."),
  e("ground_speed", "m/s", "gps", "Ground speed", "Geschwindigkeit über Grund", "Speed over ground from GPS."),
  e("heading", "°", "gps", "Course", "Kurs", "Course over ground from GPS, 0 = north."),
  // controls and status
  e("throttle_command", "%", "controls", "Throttle stick", "Gasknüppel", "Throttle stick position at the transmitter."),
  e("flight_mode", "", "status", "Flight mode", "Flugmodus", "Flight mode reported by the receiver or flight controller.", { kind: "categorical" }),
];

const byId = new Map(CATALOGUE.map((c) => [c.id, c]));

/** Catalogue entry for a channel id, or undefined for raw or unknown ids. */
export function catalogue(id: string): CatalogueEntry | undefined {
  return byId.get(id);
}

/** True for ids an adapter may use: catalogue ids, "stick.*", "switch.*" and "raw:*". */
export function isKnownChannelId(id: string): boolean {
  return byId.has(id) || id.startsWith("raw:") || id.startsWith("stick.") || id.startsWith("switch.");
}
