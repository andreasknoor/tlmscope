import { describe, expect, it } from "vitest";
import { parseLog } from "../core/adapters/registry.ts";
import { demoFlightTlm } from "../core/demo/demo-flight.ts";
import type { RawStream } from "../core/model/types.ts";
import { FEEDBACK_FORMS, feedbackContext, feedbackUrl, sensorCodes } from "./feedback.ts";

const log = () => parseLog(demoFlightTlm(), "Secret Model 2026-06-14.TLM");
const ctxOf = (files = [log()], entry: "tab" | "error" = "tab", detail?: string) =>
  feedbackContext({ files, locale: "de", device: "phone", place: "sessions/link", from: { entry, detail }, version: "1.58" });

describe("feedback", () => {
  it("opens one form per language", () => {
    expect(FEEDBACK_FORMS.en).not.toBe(FEEDBACK_FORMS.de);
    expect(feedbackUrl("en", null)).toContain(`/embed/${FEEDBACK_FORMS.en}?`);
    expect(feedbackUrl("de", null)).toContain(`/embed/${FEEDBACK_FORMS.de}?`);
  });

  it("passes exactly the five agreed fields and no content of a log", () => {
    const url = new URL(feedbackUrl("de", ctxOf()));
    expect([...url.searchParams.keys()].sort()).toEqual(["alignLeft", "device", "hideTitle", "locale", "sensors", "transparentBackground", "version", "where"]);
    expect(url.searchParams.get("version")).toBe("1.58");
    expect(url.searchParams.get("where")).toBe("sessions/link · tab");
    // The demo log has a model name, a file name and a GPS track: none of them may be in the address.
    const l = log();
    const text = decodeURIComponent(url.search);
    expect(text).not.toContain("Secret");
    expect(text).not.toContain(l.sessions[0].modelName!);
    expect(text).not.toMatch(/tlm|\.TLM/i);
    expect(url.searchParams.get("sensors")).toMatch(/^0x[0-9a-f]{2}(\/0x[0-9a-f]{2})?(,0x[0-9a-f]{2}(\/0x[0-9a-f]{2})?)*$/);
  });

  it("sends no context at all when the user switched it off", () => {
    const url = new URL(feedbackUrl("en", null));
    expect([...url.searchParams.keys()].sort()).toEqual(["alignLeft", "hideTitle", "transparentBackground"]);
  });

  it("passes on only sensor type codes, never other source keys", () => {
    const l = log();
    const stream = (key: string): RawStream => ({ key, label: key, understood: "none", count: 1, noDataCount: 0, firstT: 0, lastT: 0, fields: [], samples: [] });
    l.sessions[0].raw.push(stream("My Model Name"), stream("0xZZ"), stream("column: battery 12345"), stream("0x42/0x10"));
    const codes = sensorCodes([l]);
    expect(codes).toContain("0x42/0x10");
    expect(codes.every((c) => /^0x[0-9a-f]{2}(\/0x[0-9a-f]{2})?$/.test(c))).toBe(true);
    expect(codes.join()).not.toMatch(/Model|battery|ZZ/);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("names the entry point, and an error kind only from a fixed word", () => {
    expect(ctxOf([], "error", "unsupported").where).toBe("sessions/link · error:unsupported");
    expect(ctxOf([], "error", "My file.TLM").where).toBe("sessions/link · error");
    expect(ctxOf([]).sensors).toBe("");
  });
});
