/** How the flight path is drawn, chosen in the map tools. */
export type LineStyle = "thin" | "thinDashed" | "thick" | "thickDashed";
export const LINE_STYLES: LineStyle[] = ["thin", "thinDashed", "thick", "thickDashed"];
/** How much of the path is drawn during the replay: all of it, only the part flown so far, or that part with the rest faint. */
export type PathMode = "full" | "trail" | "trailRest";
export const PATH_MODES: PathMode[] = ["full", "trail", "trailRest"];
/** How the model is shown in the replay. */
export type MarkerStyle = "plane" | "dot" | "stork";
export const MARKER_STYLES: MarkerStyle[] = ["plane", "dot", "stork"];

/** How the flight path is coloured on the map. */
export type ColourBy = "phase" | "height" | "signal";
const COLOUR_BY: ColourBy[] = ["phase", "height", "signal"];

/**
 * Map options kept between flights and visits. The follow view is not kept (it starts the replay),
 * nor is relief that only the follow view switched on.
 */
export interface MapPrefs {
  colourBy: ColourBy;
  view: "3d" | "map";
  line: LineStyle;
  path: PathMode;
  marker: MarkerStyle;
  shadow: boolean;
  relief: boolean;
}

export const MAP_DEFAULTS: MapPrefs = { colourBy: "phase", view: "3d", line: "thin", path: "full", marker: "plane", shadow: true, relief: false };

const oneOf = <T,>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

/** Saved map options, each value checked; anything unknown falls back to the default. */
export function readMapPrefs(saved: unknown): MapPrefs {
  if (!saved || typeof saved !== "object") return MAP_DEFAULTS;
  const s = saved as Record<string, unknown>;
  const d = MAP_DEFAULTS;
  return {
    colourBy: oneOf(COLOUR_BY, s.colourBy, d.colourBy),
    view: oneOf(["3d", "map"] as const, s.view, d.view),
    line: oneOf(LINE_STYLES, s.line, d.line),
    path: oneOf(PATH_MODES, s.path, d.path),
    marker: oneOf(MARKER_STYLES, s.marker, d.marker),
    shadow: typeof s.shadow === "boolean" ? s.shadow : d.shadow,
    relief: typeof s.relief === "boolean" ? s.relief : d.relief,
  };
}
