import type { Tab } from "./store";

/** A place in a session a message can link to: a tab, and optionally an element on it (by id). */
export interface LinkTarget { tab: Tab; anchor?: string }

/**
 * Rich tags that link to such a place, e.g. `<capacityLink>Motor & energy</capacityLink>`.
 * Anchors are element ids on the tab; the link scrolls there and focuses the first field in it.
 */
export const TAB_TAGS: Record<string, LinkTarget> = {
  overviewTab: { tab: "overview" }, heightTab: { tab: "height" }, pathTab: { tab: "path" }, energyTab: { tab: "energy" },
  batteryTab: { tab: "battery" }, linkTab: { tab: "link" }, aircraftTab: { tab: "aircraft" }, rawTab: { tab: "raw" },
  /** The battery capacity field under Motor & energy. */
  capacityLink: { tab: "energy", anchor: "capacity" },
  /** The flight map. */
  mapLink: { tab: "path", anchor: "map" },
};
