import { describe, expect, it } from "vitest";
import { Q } from "../../model/types.ts";
import { channelLast, channelMax, hasSamples, loadSample, MAIN_SAMPLE, sampleNames } from "../../test-helpers.ts";

const main = () => loadSample(MAIN_SAMPLE);
/** Sessions where the vario climbs above 10 m (the definition used in the project brief). */
const flights = () => main().sessions.filter((s) => (channelMax(s, "altitude") ?? 0) > 10);

describe.skipIf(!hasSamples)("Spektrum TLM: reference values from the project brief", () => {
  it("finds 34 header runs: 29 power-ups with data and 5 with only the clock record", () => {
    const sessions = main().sessions;
    expect(sessions).toHaveLength(34);
    expect(sessions.filter((s) => s.channels.size > 0)).toHaveLength(29);
    expect(main().warnings).toEqual([]);
  });

  it("finds 5 flights with 35.0 min in total", () => {
    const f = flights();
    expect(f.map((s) => s.index)).toEqual([3, 15, 29, 31, 32]);
    const minutes = f.reduce((sum, s) => sum + s.durationS, 0) / 60;
    expect(minutes.toFixed(1)).toBe("35.0");
  });

  it("matches the 10 Oct flight", () => {
    const s = main().sessions[15];
    // 11:54:04 Europe/Berlin. The clock record comes 20 ms after the first sample, hence the rounding.
    expect(new Date(Math.round(s.start.utcMs! / 1000) * 1000).toISOString()).toBe("2026-10-10T09:54:04.000Z");
    expect(s.durationS.toFixed(1)).toBe("815.3");
    expect(channelMax(s, "altitude")).toBe(119.0);
    expect(channelMax(s, "motor_current")).toBe(20.83);
    expect(channelLast(s, "frame_losses")).toBe(317);
    expect(channelLast(s, "holds")).toBe(0);
    expect(s.modelName).toBe("Easy Glider 4");
  });

  it("sums 656 frame losses, 0 holds and about 1921 mAh over all flights", () => {
    const f = flights();
    expect(f.reduce((n, s) => n + channelLast(s, "frame_losses")!, 0)).toBe(656);
    expect(f.reduce((n, s) => n + channelLast(s, "holds")!, 0)).toBe(0);
    const mah = f.reduce((n, s) => n + channelLast(s, "consumed_mah")!, 0);
    expect(mah).toBeGreaterThan(1919);
    expect(mah).toBeLessThan(1923);
  });

  it("flags the frozen battery data of the 7 Nov 09:33 flight and nothing else", () => {
    const s = main().sessions[29];
    const cells = [1, 2, 3].map((k) => s.channels.get(`cell_voltage.${k}`)!);
    expect(cells.map((c) => c.v[0])).toEqual([4.18, 4.179, 4.176]);
    for (const c of cells) expect(c.q.every((q) => (q & Q.FROZEN) !== 0)).toBe(true);
    const withFrozen = main().sessions.filter((x) => (x.meta.frozenChannels as string[] | undefined)?.length);
    expect(withFrozen.map((x) => x.index)).toEqual([29]);
  });

  it("has no smart battery data in the flights after the frozen one", () => {
    for (const i of [31, 32]) {
      expect(main().sessions[i].battery).toBeUndefined();
      expect(main().sessions[i].channels.has("cell_voltage.1")).toBe(false);
    }
  });

  it("identifies two smart batteries with their charge cycles", () => {
    const ids = new Map<string, Set<number>>();
    for (const s of main().sessions) if (s.battery) {
      if (!ids.has(s.battery.id)) ids.set(s.battery.id, new Set());
      ids.get(s.battery.id)!.add(s.battery.chargeCycles!);
    }
    expect([...ids.keys()]).toEqual(["8300ba2b319b2501", "8300ba45319b2501"]);
    expect([...ids.get("8300ba45319b2501")!]).toEqual([4, 5, 6]);
    expect(main().sessions[15].battery).toMatchObject({ chemistry: "LiPo", cells: 3, capacityMah: 2200, fullCellV: 4.2, maxTempC: 60 });
  });

  it("turns cumulative link counters into counts since the session start", () => {
    const s = main().sessions[32]; // receiver was not power-cycled before this flight: raw counter starts at 180
    const fl = s.channels.get("frame_losses")!;
    expect(fl.rawCounter!.v[0]).toBe(180);
    expect(fl.v[0]).toBe(0);
    expect(channelLast(s, "frame_losses")).toBe(25);
  });
});

describe.skipIf(!hasSamples)("Spektrum TLM: all sample files", () => {
  const expectedSessions: Record<string, number> = {
    "002~Easy Glider 4_20260917.TLM": 3,
    "002~Easy Glider 4_20260919.TLM": 1,
    "002~Easy Glider 4_20260926.TLM": 2,
    "002~Easy Glider 4_20261002.TLM": 5,
    "002~Easy Glider 4_20261003.TLM": 4,
    "Easy_Glider_4.TLM": 34,
  };

  it("covers every sample in the folder", () => {
    expect(sampleNames()).toEqual(Object.keys(expectedSessions).sort());
  });

  for (const [name, count] of Object.entries(expectedSessions)) {
    it(`parses ${name} completely`, () => {
      const log = loadSample(name);
      expect(log.sessions).toHaveLength(count);
      expect(log.warnings).toEqual([]);
      // Every record is accounted for in the raw streams: nothing is dropped silently.
      for (const s of log.sessions) {
        expect(s.raw.reduce((n, r) => n + r.count, 0)).toBe(s.meta.records);
        for (const ch of s.channels.values()) {
          expect(ch.t.length).toBe(ch.v.length);
          for (let i = 1; i < ch.t.length; i++) expect(ch.t[i]).toBeGreaterThanOrEqual(ch.t[i - 1]);
        }
      }
    });
  }

  it("reads the throttle stick from the 0x7A stream of the AutoLog files", () => {
    const s = loadSample("002~Easy Glider 4_20261003.TLM").sessions[2];
    const stick = s.channels.get("throttle_command")!;
    const esc = s.channels.get("throttle_output")!;
    expect(stick.t.length).toBeGreaterThan(100_000);
    // At full throttle the stick and the ESC agree.
    const iEsc = esc.v.findIndex((v) => v > 99);
    const iStick = stick.t.findIndex((t) => t >= esc.t[iEsc]);
    expect(stick.v[iStick]).toBeGreaterThan(95);
    // The status bits page stays raw.
    expect(s.raw.find((x) => x.key === "0x7a/0")!.understood).toBe("none");
  });

  it("finds the 3 Oct morning flight that only the AutoLog file contains", () => {
    const s = loadSample("002~Easy Glider 4_20261003.TLM").sessions[2];
    expect(channelMax(s, "altitude")).toBe(80.5);
    expect(channelLast(s, "frame_losses")).toBe(535);
  });

  it("produces the same sensor inventory as before", () => {
    const inventory = Object.fromEntries(
      sampleNames().map((name) => {
        const counts: Record<string, number> = {};
        for (const s of loadSample(name).sessions) for (const r of s.raw) counts[r.key] = (counts[r.key] ?? 0) + r.count;
        return [name, counts];
      }),
    );
    expect(inventory).toMatchSnapshot();
  });
});
