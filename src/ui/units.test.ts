import { describe, expect, it } from "vitest";
import { defaultUnits, makeUnits } from "./units";

describe("units", () => {
  const m = makeUnits("metric", "en");
  const i = makeUnits("imperial", "en");

  it("shows SI values unchanged in metric, except speed in km/h and long distances in km", () => {
    expect(m.fmt("height", 123.4)).toBe("123 m");
    expect(m.fmt("vspeed", 1.25, 1)).toBe("1.3 m/s");
    expect(m.fmt("speed", 10)).toBe("36 km/h");
    expect(m.fmt("longDistance", 2500, 2)).toBe("2.50 km");
  });

  it("converts to feet, ft/s, mph, miles and °F", () => {
    expect(i.fmt("height", 100)).toBe("328 ft");
    expect(i.fmt("vspeed", 1, 1)).toBe("3.3 ft/s");
    expect(i.fmt("speed", 10)).toBe("22 mph");
    expect(i.fmt("longDistance", 1609.344, 2)).toBe("1.00 mi");
    expect(i.fmt("temp", 0)).toBe("32 °F");
    expect(i.fmt("temp", 100)).toBe("212 °F");
  });

  it("keeps missing values missing", () => {
    expect(i.fmt("height", null)).toBe("–");
    expect(i.series("height", [null, 1])).toEqual([null, 3.28084]);
  });

  it("converts catalogue units it knows and leaves the rest", () => {
    expect(i.byChannel("altitude", "m", 10)).toEqual({ value: 32.8084, unit: "ft" });
    expect(i.byChannel("rx_voltage", "V", 4.2)).toEqual({ value: 4.2, unit: "V" });
    // ground speed is a speed (mph), not a vertical speed (ft/s), although both are m/s in the catalogue
    expect(i.byChannel("ground_speed", "m/s", 10).unit).toBe("mph");
    expect(i.byChannel("climb_rate", "m/s", 1).unit).toBe("ft/s");
  });

  it("uses imperial by default only for US English", () => {
    expect(defaultUnits("en-US")).toBe("imperial");
    expect(defaultUnits("en-GB")).toBe("metric");
    expect(defaultUnits("de-DE")).toBe("metric");
    expect(defaultUnits(undefined)).toBe("metric");
  });
});
