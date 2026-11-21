/**
 * What changed, one line per new feature or fix, newest first. English only (also shown in the German UI).
 * Every deployed version needs an entry: `changelog.test.ts` fails when the version in package.json has none,
 * and a failing test stops the deploy. Versions without a visible change (screenshots, site files) are left out.
 */
export type ChangeKind = "new" | "fix";
/**
 * A change worth telling another pilot about: a new analysis or value, a new chart or view, newly supported
 * data or devices, or a feature that changes how the app is used. Never fixes, wording or small handling changes.
 * Only highlights appear behind the version number; the changelog page lists everything.
 */
export type Change = [ChangeKind, string] | [ChangeKind, string, "highlight"];

export interface Release {
  /** major.minor, as in package.json. */
  version: string;
  /** YYYY-MM-DD */
  date: string;
  changes: Change[];
}

export const CHANGELOG: Release[] = [
  { version: "2.9", date: "2026-11-21", changes: [
    ["new", "My logbook (off by default, in the settings): flight and simulator time over all files.", "highlight"],
    ["new", "The logbook shows totals per year and model, leaves out other pilots' logs and saves a backup."],
  ] },
  { version: "2.8", date: "2026-11-21", changes: [
    ["new", "Simulator sessions (WS3000 dongle) are recognised; the list sums up your simulator time.", "highlight"],
    ["fix", "A receiver voltage of 0 V counts as no reading, not as a critical value."],
    ["fix", "The total flight time counts a session in two copies of a log only once."],
  ] },
  { version: "2.7", date: "2026-11-21", changes: [["new", "Help in the app shows all guides (FAQ, telemetry, radios …) without closing your logs.", "highlight"], ["new", "Help on the start page opens the help page of the website."]] },
  { version: "2.6", date: "2026-11-21", changes: [["new", "“Show details” is now “More charts & values”; each tab names what it adds until it is used once."]] },
  { version: "2.5", date: "2026-11-21", changes: [["new", "The demo 3D flight now has a remote receiver and one hold, to try out fades and holds."]] },
  { version: "2.4", date: "2026-11-21", changes: [["new", "Link tab with details: fades per receiver, holds marked, and signal against distance.", "highlight"], ["new", "With details on, the map colours the path by signal in dBm, and the replay shows the value."], ["new", "The Link tab points to the exact dBm values behind “Show details”."]] },
  { version: "2.3", date: "2026-11-20", changes: [["new", "Questions in the FAQ are folded, with “Open all” above them; a link to a question opens it."], ["new", "“Understand telemetry” adds five questions for after the flight, with screenshots."]] },
  { version: "2.2", date: "2026-11-20", changes: [["new", "GPS positions from Spektrum SkyID Remote ID modules are now read, so their flights show on the map.", "highlight"]] },
  { version: "2.1", date: "2026-11-19", changes: [["fix", "The follow view stays on when scrolling; Ctrl + wheel or two fingers zoom its camera out."]] },
  { version: "2.0", date: "2026-11-19", changes: [["new", "TLMscope has its own address: www.tlmscope.com. Settings from the old address are set again there.", "highlight"]] },
  { version: "1.99", date: "2026-11-19", changes: [["new", "Electrical power chart (W) with volts, amps and watts at the cursor, and the peak power.", "highlight"]] },
  { version: "1.98", date: "2026-11-19", changes: [["fix", "The motor current chart is always shown, not only with “Show details”."], ["fix", "The battery voltage chart shows the whole pack next to the value per cell."]] },
  { version: "1.97", date: "2026-11-18", changes: [["fix", "Fades are named per receiver (main receiver A, remote receivers B, L, R), as Spektrum counts them."], ["fix", "“Move it” only for a remote receiver far above the others, never for the main receiver."], ["fix", "A hold is described as half a second or longer without signal (45 frames in a row)."]] },
  { version: "1.96", date: "2026-11-18", changes: [["new", "Guides show when they were last updated; five new answers in the FAQ."]] },
  { version: "1.95", date: "2026-11-18", changes: [["fix", "Guides, FAQ and help describe the latest features in English and German."]] },
  { version: "1.94", date: "2026-11-18", changes: [["fix", "Total flight time written out as “6 h 28 min” instead of “6:28 h”."]] },
  { version: "1.93", date: "2026-11-18", changes: [["new", "The demo adds a 3D plane: bench run and flight with flight modes, hard loads and GPS height."]] },
  { version: "1.92", date: "2026-11-18", changes: [["new", "Total flight time of the loaded logs, shown above the session list.", "highlight"], ["new", "Export the session list as a CSV file for your own flight log.", "highlight"], ["fix", "Pauses on the ground between two flights of one session no longer count as time in the air."]] },
  { version: "1.91", date: "2026-11-18", changes: [["fix", "No battery temperature of 0 °C from batteries without a temperature sensor."], ["fix", "The stabilization text is as large as the other words on the aircraft page."]] },
  { version: "1.90", date: "2026-11-17", changes: [["new", "Links from the overview to the details, with the cursor on the moment behind the rating.", "highlight"]] },
  { version: "1.89", date: "2026-11-17", changes: [["new", "Radio link over time: click a level to show only it and step through it."]] },
  { version: "1.88", date: "2026-11-17", changes: [["new", "Map options stay the same when switching flights and on the next visit."]] },
  { version: "1.87", date: "2026-11-17", changes: [["fix", "A hold in the air rates the radio link critical, not the receiver power."], ["fix", "A single critical second stays visible in the link timeline."], ["fix", "Without height or GPS, a hold is shown as during the flight, not in the air."]] },
  { version: "1.86", date: "2026-11-17", changes: [["new", "The version number shows only the highlights; the changelog page marks them."], ["fix", "Highlights new since the last visit stay marked while the list is open."]] },
  { version: "1.85", date: "2026-11-17", changes: [["fix", "The “All changes” link stays in view in the list of recent changes."]] },
  { version: "1.84", date: "2026-11-17", changes: [["new", "Ground speed chart on the flight path page.", "highlight"], ["fix", "The mouse wheel scrolls the page over the map; Ctrl + wheel zooms it."]] },
  { version: "1.83", date: "2026-11-16", changes: [["new", "What changed in each version: click the version number, or see the changelog page."]] },
  { version: "1.82", date: "2026-11-16", changes: [["fix", "No brown-out warning from unplugging the battery after the flight."]] },
  { version: "1.81", date: "2026-11-16", changes: [["new", "The stabilization card shows the AS3X gain, and says when it was 0.", "highlight"]] },
  { version: "1.80", date: "2026-11-16", changes: [["new", "Height above ground from GPS when the model has no vario.", "highlight"], ["fix", "A wrong GPS minus sign no longer puts the flight below the ground."]] },
  { version: "1.79", date: "2026-11-16", changes: [["fix", "Sessions without receiver data count as transmitter only, not as ground tests."]] },
  { version: "1.78", date: "2026-11-16", changes: [["fix", "No update note after reloading into the new version."]] },
  { version: "1.77", date: "2026-11-16", changes: [["new", "Stabilization card: time in the air per function, including no stabilization.", "highlight"]] },
  { version: "1.76", date: "2026-11-16", changes: [["new", "The flight mode card names the functions of each mode."]] },
  { version: "1.75", date: "2026-11-16", changes: [["new", "Flight modes show AS3X, SAFE and heading hold."], ["new", "Switch positions A to H in the raw data."]] },
  { version: "1.74", date: "2026-11-15", changes: [["fix", "Correct flight mode numbers."], ["new", "Link quality from receivers that send it in a second format."]] },
  { version: "1.73", date: "2026-11-15", changes: [["new", "End voltage after landing."], ["fix", "No empty temperature rows."]] },
  { version: "1.72", date: "2026-11-15", changes: [["fix", "Numbers and their units stay on one line."]] },
  { version: "1.71", date: "2026-11-15", changes: [["fix", "No “battery data stuck” at 65.535 V without cell data."]] },
  { version: "1.70", date: "2026-11-15", changes: [["fix", "The follow view shows the model again with the relief on."]] },
  { version: "1.69", date: "2026-11-15", changes: [["fix", "The update note no longer comes back right after reloading."]] },
  { version: "1.68", date: "2026-11-15", changes: [["new", "Simpler map tools: 3D, map and follow view as one choice, options in a panel."]] },
  { version: "1.67", date: "2026-11-15", changes: [["fix", "The flight path no longer disappears when switching between 3D and map view."]] },
  { version: "1.66", date: "2026-11-14", changes: [["new", "Relief and follow view in the 3D map (beta).", "highlight"]] },
  { version: "1.65", date: "2026-11-14", changes: [["new", "The ground test can start over or begin a new setup."]] },
  { version: "1.64", date: "2026-11-14", changes: [["new", "The ground test starts with a three-step setup."]] },
  { version: "1.63", date: "2026-11-14", changes: [["new", "Transmitter ground test at /debug.", "highlight"]] },
  { version: "1.62", date: "2026-11-14", changes: [["new", "Transmitter stick values named from flight data."]] },
  { version: "1.61", date: "2026-11-14", changes: [["fix", "GPS values count the flight only."], ["new", "Clearer battery and signal texts."]] },
  { version: "1.60", date: "2026-11-14", changes: [["fix", "Smaller fixes in times, medians, gains and the session list."]] },
  { version: "1.59", date: "2026-11-14", changes: [["fix", "Feedback form readable in dark mode."]] },
  { version: "1.58", date: "2026-11-14", changes: [["new", "Feedback form."]] },
  { version: "1.57", date: "2026-11-13", changes: [["new", "Easier to read FAQ answers."]] },
  { version: "1.56", date: "2026-11-13", changes: [["new", "FAQ “How do I install TLMscope”, every question can be linked."]] },
  { version: "1.53", date: "2026-11-13", changes: [["new", "Add and close files on phones."]] },
  { version: "1.52", date: "2026-11-13", changes: [["new", "Works offline after the first visit.", "highlight"]] },
  { version: "1.51", date: "2026-11-12", changes: [["fix", "Thermal circles go one way."], ["fix", "LiHV packs count right."]] },
  { version: "1.50", date: "2026-11-12", changes: [["new", "Ratings need enough flights; dives are not glides."]] },
  { version: "1.49", date: "2026-11-12", changes: [["new", "Fairer comparisons, and ratings that cover the flight only."]] },
  { version: "1.46", date: "2026-11-11", changes: [["fix", "Charts no longer cut off values beyond their usual range."]] },
  { version: "1.45", date: "2026-11-11", changes: [["new", "Own names for smart batteries, and their ID."]] },
  { version: "1.44", date: "2026-11-11", changes: [["new", "Model groups on the Batteries page fold away."]] },
  { version: "1.43", date: "2026-11-11", changes: [["new", "Hints link straight to the place they name."]] },
  { version: "1.42", date: "2026-11-11", changes: [["new", "Batteries grouped by model."]] },
  { version: "1.41", date: "2026-11-11", changes: [["new", "Replay trail on the flight map."]] },
  { version: "1.40", date: "2026-11-11", changes: [["new", "Metric or imperial units.", "highlight"]] },
  { version: "1.39", date: "2026-11-11", changes: [["new", "My settings, with a light, dark or system colour choice.", "highlight"]] },
  { version: "1.38", date: "2026-11-11", changes: [["new", "Battery capacity per model instead of an assumed 2200 mAh."]] },
  { version: "1.32", date: "2026-11-10", changes: [["new", "New start page with English and German guides."]] },
  { version: "1.29", date: "2026-11-09", changes: [["new", "Link previews for social networks and messengers."]] },
  { version: "1.26", date: "2026-11-09", changes: [["new", "Smoother replay; map tools above the map on phones."]] },
  { version: "1.25", date: "2026-11-09", changes: [["fix", "Dashed flight path lines; a thin solid line by default."]] },
  { version: "1.24", date: "2026-11-09", changes: [["new", "Aircraft in the replay, line style and ground shadow options."]] },
  { version: "1.23", date: "2026-11-09", changes: [["new", "Battery session list collapsed by default."]] },
  { version: "1.22", date: "2026-11-09", changes: [["new", "Newest session first."]] },
  { version: "1.21", date: "2026-11-09", changes: [["new", "The session list scrolls on its own."]] },
  { version: "1.20", date: "2026-11-09", changes: [["new", "Loading card with progress."]] },
  { version: "1.19", date: "2026-11-09", changes: [["new", "Flights without a height sensor; full-screen map."]] },
  { version: "1.18", date: "2026-11-09", changes: [["fix", "Model name found in any model slot."]] },
  { version: "1.17", date: "2026-11-09", changes: [["new", "Model name in every session list row."]] },
  { version: "1.16", date: "2026-11-09", changes: [["new", "Model name as session title, filter by model."]] },
  { version: "1.13", date: "2026-11-09", changes: [["new", "Footer, legal notice and privacy policy."]] },
  { version: "1.12", date: "2026-11-09", changes: [["fix", "Sturdier with damaged files."]] },
  { version: "1.10", date: "2026-11-09", changes: [["new", "Lowest and highest values per session."]] },
  { version: "1.9", date: "2026-11-09", changes: [["new", "Flight replay.", "highlight"]] },
  { version: "1.8", date: "2026-11-09", changes: [["new", "Thermal analysis.", "highlight"]] },
  { version: "1.7", date: "2026-11-09", changes: [["new", "Battery ageing trend per pack.", "highlight"]] },
  { version: "1.6", date: "2026-11-09", changes: [["new", "Drag the chart cursor with a finger."]] },
  { version: "1.5", date: "2026-11-09", changes: [["new", "Two-row header on phones."]] },
  { version: "1.3", date: "2026-11-09", changes: [["fix", "No warning before reloading or closing."]] },
  { version: "1.2", date: "2026-11-09", changes: [["new", "One “Show details” toggle for more values."]] },
  { version: "1.1", date: "2026-11-09", changes: [["new", "App version in the header."]] },
];

/** Compares "major.minor" versions; negative when a is older. */
export function compareVersions(a: string, b: string): number {
  const [am, an] = a.split(".").map(Number), [bm, bn] = b.split(".").map(Number);
  return am - bm || an - bn;
}

/** The latest highlights, newest first, with the version they came in. */
export function highlights(count: number): { version: string; date: string; text: string }[] {
  return CHANGELOG.flatMap((r) => r.changes.filter((c) => c[2] === "highlight").map((c) => ({ version: r.version, date: r.date, text: c[1] }))).slice(0, count);
}
