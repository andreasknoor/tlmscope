/**
 * Copies MapLibre's web worker next to the app, because the bundler cannot resolve it
 * from inside the library. Runs before `dev` and `build`.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const from = join(import.meta.dirname, "../node_modules/maplibre-gl/dist");
const to = join(import.meta.dirname, "../public/maplibre");
mkdirSync(to, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(join(from, f), join(to, f));
