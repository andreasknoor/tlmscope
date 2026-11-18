/**
 * Writes the synthetic demo file (glider, 3D bench run and 3D flight) to public/demo/demo-flight.TLM.
 * Usage: npm run demo
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { demoFileTlm } from "../src/core/demo/demo-file.ts";

const dir = join(import.meta.dirname, "../public/demo");
mkdirSync(dir, { recursive: true });
const data = demoFileTlm();
writeFileSync(join(dir, "demo-flight.TLM"), data);
console.log(`public/demo/demo-flight.TLM: ${(data.length / 1e6).toFixed(2)} MB`);
